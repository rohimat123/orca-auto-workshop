import * as THREE from 'three';
import type { RwClump, RwFrame, RwGeometry, RwMaterial, RwTxd } from './rwParser';
import type { SharedVehicleTextureBank } from './gtaFallbackTextures';

export interface PaintColors {
  primary: string;
  secondary: string;
}

export interface BuiltVehicleAssembly {
  /** Outer Y-up grounded wrapper (`box.min.y === 0`) to add to the scene */
  root: THREE.Group;
  /** Map of lowercase GTA:SA frame names -> Three.js Object3D in RW Z-up space */
  frameNodes: Map<string, THREE.Object3D>;
  /** Meshes belonging to base vehicle frames (indexed by lowercase frame name) */
  baseFrameMeshes: Map<string, THREE.Object3D[]>;
  /** Stock wheel radius in meters (used to auto-scale custom upgrade wheels) */
  stockWheelRadius: number;
  /** Stock wheel meshes across all 4 wheel dummies (hidden when custom wheel mounted) */
  stockWheelInstances: THREE.Object3D[];
  /** Custom wheel anchor groups (one per wheel dummy, pre-mirrored for left side) */
  customWheelMounts: THREE.Group[];
  /** Live references to primary & secondary paint materials for instant color swaps */
  primaryPaintMaterials: THREE.MeshStandardMaterial[];
  secondaryPaintMaterials: THREE.MeshStandardMaterial[];
  /** Live references to `remap*body*` materials that receive GTA:SA paintjob textures */
  remapBodyMaterials: THREE.MeshStandardMaterial[];
  /** Dispose all GPU resources created specifically for this base vehicle */
  dispose: () => void;
}

export interface MaterialBuildContext {
  txdTextures: Map<string, THREE.DataTexture>;
  sharedBank: SharedVehicleTextureBank;
  paint: PaintColors;
  paintjobTexture?: THREE.DataTexture | null;
  primaryPaintMaterials: THREE.MeshStandardMaterial[];
  secondaryPaintMaterials: THREE.MeshStandardMaterial[];
  remapBodyMaterials: THREE.MeshStandardMaterial[];
  createdMaterials: THREE.Material[];
  createdGeometries: THREE.BufferGeometry[];
  isWheelPart?: boolean;
  isSoftwareGl?: boolean;
}

const WHEEL_DUMMIES = [
  { name: 'wheel_rf_dummy', isLeft: false },
  { name: 'wheel_lf_dummy', isLeft: true },
  { name: 'wheel_rm_dummy', isLeft: false },
  { name: 'wheel_lm_dummy', isLeft: true },
  { name: 'wheel_rb_dummy', isLeft: false },
  { name: 'wheel_lb_dummy', isLeft: true },
] as const;

function isPrimaryPaintSentinel(c: [number, number, number, number]): boolean {
  return c[0] === 60 && c[1] === 255 && c[2] === 0;
}

function isSecondaryPaintSentinel(c: [number, number, number, number]): boolean {
  return c[0] === 255 && c[1] === 0 && c[2] === 175;
}

function isHiddenBaseFrame(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('_dam') ||
    lower.endsWith('_vlo') ||
    lower.includes('_vlo') ||
    lower === 'chassis_vlo' ||
    lower === 'extra1' ||
    lower === 'extra2' ||
    lower === 'extra3'
  );
}

/**
 * Converts an `RwTxd` dictionary into Three.js `DataTexture`s ready for WebGL.
 */
export function createTxdDataTextures(txd: RwTxd): Map<string, THREE.DataTexture> {
  const out = new Map<string, THREE.DataTexture>();
  for (const [name, tex] of txd.textures.entries()) {
    // Copy into fresh Uint8Array so buffer ownership is clean
    const data = new Uint8Array(tex.rgba);
    const dt = new THREE.DataTexture(data, tex.width, tex.height, THREE.RGBAFormat);
    dt.flipY = false; // Match RenderWare D3D top-left UV origin
    dt.wrapS = THREE.RepeatWrapping;
    dt.wrapT = THREE.RepeatWrapping;
    dt.colorSpace = THREE.SRGBColorSpace;
    dt.magFilter = THREE.LinearFilter;
    dt.minFilter = THREE.LinearMipmapLinearFilter;
    dt.generateMipmaps = true;
    dt.anisotropy = 4;
    dt.needsUpdate = true;
    out.set(name.toLowerCase(), dt);
  }
  return out;
}

/**
 * Converts a GTA:SA paintjob `.txd` (e.g., `sultan1.txd`, `blade2.txd`) into a
 * ready-to-bind Three.js `DataTexture`.
 */
export function createPaintjobDataTexture(txd: RwTxd): THREE.DataTexture | null {
  const first = txd.textures.values().next().value;
  if (!first) return null;
  const data = new Uint8Array(first.rgba);
  const dt = new THREE.DataTexture(data, first.width, first.height, THREE.RGBAFormat);
  dt.flipY = false; // Match RenderWare D3D top-left UV origin
  dt.wrapS = THREE.RepeatWrapping;
  dt.wrapT = THREE.RepeatWrapping;
  dt.colorSpace = THREE.SRGBColorSpace;
  dt.magFilter = THREE.LinearFilter;
  dt.minFilter = THREE.LinearMipmapLinearFilter;
  dt.generateMipmaps = true;
  dt.anisotropy = 4;
  dt.needsUpdate = true;
  return dt;
}

function resolveTexture(
  texName: string | null,
  ctx: MaterialBuildContext
): { map: THREE.Texture | null; isRemapBody: boolean } {
  if (!texName) return { map: null, isRemapBody: false };
  const lower = texName.toLowerCase();

  // GTA:SA `remap*body*` textures are blank white canvases replaced by the active
  // paintjob `.txd` texture (or kept null for clean solid automotive paint).
  if (lower.startsWith('remap') && lower.includes('body')) {
    return { map: ctx.paintjobTexture ?? null, isRemapBody: true };
  }

  const fromTxd = ctx.txdTextures.get(lower);
  if (fromTxd) return { map: fromTxd, isRemapBody: false };

  const fromShared = ctx.sharedBank.get(lower);
  if (fromShared) return { map: fromShared, isRemapBody: false };

  return { map: null, isRemapBody: false };
}

function createMaterialFromRw(rwMat: RwMaterial, ctx: MaterialBuildContext): THREE.Material {
  const [r, g, b, a] = rwMat.color;
  const opacity = a / 255;
  const isPrimary = isPrimaryPaintSentinel(rwMat.color);
  const isSecondary = isSecondaryPaintSentinel(rwMat.color);
  const { map, isRemapBody } = resolveTexture(rwMat.textureName, ctx);
  const texLower = rwMat.textureName?.toLowerCase() ?? '';
  const soft = Boolean(ctx.isSoftwareGl);

  // Semi-transparent glass / windscreen / light covers
  if (!isPrimary && !isSecondary && opacity < 0.92) {
    const baseColor = new THREE.Color(r / 255, g / 255, b / 255).lerp(
      new THREE.Color('#1a2230'),
      0.55
    );
    const mat = soft
      ? new THREE.MeshStandardMaterial({
          color: baseColor,
          transparent: true,
          opacity: Math.max(0.32, Math.min(opacity, 0.72)),
          roughness: 0.1,
          metalness: 0.25,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      : new THREE.MeshPhysicalMaterial({
          color: baseColor,
          transparent: true,
          opacity: Math.max(0.32, Math.min(opacity, 0.72)),
          roughness: 0.08,
          metalness: 0.1,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
    ctx.createdMaterials.push(mat);
    return mat;
  }

  // Primary/Secondary car paint OR remap body panels (including Savanna Chromer front bumper remap)
  if (isPrimary || isSecondary || isRemapBody) {
    const usesPrimary = isPrimary || isRemapBody;
    const hex = usesPrimary ? ctx.paint.primary : ctx.paint.secondary;
    const activeMap = isRemapBody ? (ctx.paintjobTexture ?? null) : map;
    const hasPaintjobMap = isRemapBody && Boolean(activeMap);
    const mat = soft
      ? new THREE.MeshStandardMaterial({
          color: new THREE.Color(hex),
          map: activeMap,
          roughness: hasPaintjobMap ? 0.28 : 0.22,
          metalness: hasPaintjobMap ? 0.14 : 0.34,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(hex),
          map: activeMap,
          roughness: hasPaintjobMap ? 0.28 : 0.24,
          metalness: hasPaintjobMap ? 0.12 : 0.22,
          clearcoat: 0.92,
          clearcoatRoughness: 0.1,
          side: THREE.DoubleSide,
        });
    if (usesPrimary) {
      ctx.primaryPaintMaterials.push(mat);
    } else {
      ctx.secondaryPaintMaterials.push(mat);
    }
    if (isRemapBody) {
      ctx.remapBodyMaterials.push(mat);
    }
    ctx.createdMaterials.push(mat);
    return mat;
  }

  // Tires: authentic GTA:SA tire & lowrider whitewall texture (`vehicletyres128`)
  if (texLower.includes('tyre') || texLower.includes('tire')) {
    const mat = new THREE.MeshStandardMaterial({
      color: map
        ? new THREE.Color(r / 255, g / 255, b / 255)
        : new THREE.Color('#2d3138'),
      map,
      roughness: 0.86,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    ctx.createdMaterials.push(mat);
    return mat;
  }

  // Wheels alloy/gold/chrome metal using authentic GTA:SA `vehiclegeneric256` UVs
  if (ctx.isWheelPart) {
    const isDarkBack = r < 40 && g < 40 && b < 40;
    const isHighReflect = rwMat.reflectionIntensity > 0.25;
    const mat = new THREE.MeshStandardMaterial({
      color: isDarkBack
        ? new THREE.Color('#1c2026')
        : new THREE.Color(r / 255, g / 255, b / 255),
      map,
      roughness: isDarkBack ? 0.85 : isHighReflect ? 0.24 : 0.34,
      metalness: isDarkBack ? 0.12 : isHighReflect ? 0.48 : 0.26,
      side: THREE.DoubleSide,
    });
    ctx.createdMaterials.push(mat);
    return mat;
  }

  // Headlights / Tail lights
  if (texLower.includes('light')) {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(r / 255, g / 255, b / 255),
      map,
      roughness: 0.16,
      metalness: 0.22,
      emissive: new THREE.Color('#1c222d'),
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    });
    ctx.createdMaterials.push(mat);
    return mat;
  }

  // Chrome bumpers, bullbars, exhausts, Locolow trim (`vehiclegeneric256`)
  const isBrightGeneric =
    texLower === 'vehiclegeneric256' &&
    (rwMat.reflectionIntensity > 0.08 || (r > 210 && g > 210 && b > 210));
  if (isBrightGeneric) {
    const mat = new THREE.MeshStandardMaterial({
      color: map ? new THREE.Color(r / 255, g / 255, b / 255) : new THREE.Color('#e8eef6'),
      map,
      roughness: rwMat.reflectionIntensity > 0.2 ? 0.2 : 0.34,
      metalness: rwMat.reflectionIntensity > 0.2 ? 0.62 : 0.32,
      side: THREE.DoubleSide,
    });
    ctx.createdMaterials.push(mat);
    return mat;
  }

  // General interior / badges / plates / stickers
  const hasTransparency =
    texLower.includes('sticker') || texLower.includes('badge') || texLower.includes('decal');
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(r / 255, g / 255, b / 255),
    map,
    roughness: rwMat.reflectionIntensity > 0.1 ? 0.3 : 0.62,
    metalness: rwMat.reflectionIntensity > 0.1 ? 0.45 : 0.12,
    transparent: hasTransparency,
    alphaTest: hasTransparency ? 0.15 : 0,
    side: THREE.DoubleSide,
  });
  ctx.createdMaterials.push(mat);
  return mat;
}

function buildGeometryMesh(rwGeom: RwGeometry, ctx: MaterialBuildContext): THREE.Mesh | null {
  if (rwGeom.vertices.length === 0 || rwGeom.splits.length === 0) return null;

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(rwGeom.vertices, 3));

  if (rwGeom.normals && rwGeom.normals.length === rwGeom.vertices.length) {
    geom.setAttribute('normal', new THREE.BufferAttribute(rwGeom.normals, 3));
  }

  if (rwGeom.uvs && rwGeom.uvs.length === (rwGeom.vertices.length / 3) * 2) {
    geom.setAttribute('uv', new THREE.BufferAttribute(rwGeom.uvs, 2));
  }

  const materials = rwGeom.materials.map((m) => createMaterialFromRw(m, ctx));

  // Merge split index arrays and record geometry groups per material
  let totalIndices = 0;
  for (const split of rwGeom.splits) {
    totalIndices += split.indices.length;
  }
  if (totalIndices === 0) {
    geom.dispose();
    return null;
  }

  const mergedIndices = new Uint32Array(totalIndices);
  let cursor = 0;
  for (const split of rwGeom.splits) {
    if (split.indices.length === 0) continue;
    mergedIndices.set(split.indices, cursor);
    const matIdx = Math.min(split.materialIndex, Math.max(0, materials.length - 1));
    geom.addGroup(cursor, split.indices.length, matIdx);
    cursor += split.indices.length;
  }

  geom.setIndex(new THREE.BufferAttribute(mergedIndices, 1));
  if (!rwGeom.normals) {
    geom.computeVertexNormals();
  }
  geom.computeBoundingBox();
  geom.computeBoundingSphere();

  ctx.createdGeometries.push(geom);

  const mesh = new THREE.Mesh(geom, materials.length === 1 ? materials[0] : materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function applyRwFrameTransform(obj: THREE.Object3D, frame: RwFrame) {
  const [r0, r1, r2, r3, r4, r5, r6, r7, r8] = frame.rotationMatrix;
  const [px, py, pz] = frame.position;
  // RW row-vector matrix maps to Three.js column-vector Matrix4 by placing RW rows in Matrix4 columns
  const m = new THREE.Matrix4();
  m.set(
    r0, r3, r6, px,
    r1, r4, r7, py,
    r2, r5, r8, pz,
    0, 0, 0, 1
  );
  m.decompose(obj.position, obj.quaternion, obj.scale);
}

function computeWheelRadius(geom: RwGeometry): number {
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const v = geom.vertices;
  for (let i = 0; i < v.length; i += 3) {
    const y = v[i + 1];
    const z = v[i + 2];
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  if (!Number.isFinite(minY)) return 0.35;
  return Math.max((maxY - minY) * 0.5, (maxZ - minZ) * 0.5, 0.2);
}

/**
 * Builds an entire interactive GTA:SA base vehicle (chassis, doors, bumpers,
 * 4 mirrored stock wheels, and all upgrade dummy nodes) grounded cleanly on Y = 0.
 */
export function buildBaseVehicleAssembly(
  clump: RwClump,
  txdTextures: Map<string, THREE.DataTexture>,
  sharedBank: SharedVehicleTextureBank,
  paint: PaintColors,
  options?: { isSoftwareGl?: boolean; paintjobTexture?: THREE.DataTexture | null }
): BuiltVehicleAssembly {
  const ctx: MaterialBuildContext = {
    txdTextures,
    sharedBank,
    paint,
    paintjobTexture: options?.paintjobTexture ?? null,
    primaryPaintMaterials: [],
    secondaryPaintMaterials: [],
    remapBodyMaterials: [],
    createdMaterials: [],
    createdGeometries: [],
    isSoftwareGl: options?.isSoftwareGl,
  };

  // Outer grounded wrapper in Three.js Y-up space, rotated so car front faces +Z
  const root = new THREE.Group();
  root.name = 'vehicle_grounded_root';

  const rwContainer = new THREE.Group();
  rwContainer.name = 'vehicle_rw_zup';
  // RW Z-up (+Y forward, +Z up, +X right) -> Three.js Y-up (+Z forward, +Y up)
  rwContainer.rotation.set(-Math.PI / 2, 0, Math.PI);
  root.add(rwContainer);

  const frameObjects: THREE.Group[] = [];
  const frameNodes = new Map<string, THREE.Object3D>();
  const baseFrameMeshes = new Map<string, THREE.Object3D[]>();

  for (const frame of clump.frames) {
    const node = new THREE.Group();
    node.name = frame.name;
    applyRwFrameTransform(node, frame);
    frameObjects.push(node);

    const lower = frame.name.toLowerCase();
    if (!frameNodes.has(lower)) {
      frameNodes.set(lower, node);
    }
  }

  for (let i = 0; i < clump.frames.length; i++) {
    const pIdx = clump.frames[i].parentIndex;
    if (pIdx >= 0 && pIdx < frameObjects.length) {
      frameObjects[pIdx].add(frameObjects[i]);
    } else {
      rwContainer.add(frameObjects[i]);
    }
  }

  let stockWheelGeom: RwGeometry | null = null;
  let stockWheelRadius = 0.35;
  let stockWheelLocalOffset = new THREE.Vector3(0, 0, 0);

  for (const atomic of clump.atomics) {
    const frame = clump.frames[atomic.frameIndex];
    const geom = clump.geometries[atomic.geometryIndex];
    if (!frame || !geom) continue;

    const lower = frame.name.toLowerCase();
    if (isHiddenBaseFrame(lower)) continue;

    if (lower === 'wheel') {
      stockWheelGeom = geom;
      stockWheelRadius = computeWheelRadius(geom);
      stockWheelLocalOffset.set(frame.position[0], frame.position[1], frame.position[2]);
      // Don't attach directly here — we instantiate onto all wheel dummies below
      continue;
    }

    // Some GTA:SA vehicles (e.g., Yosemite) include a secondary `wheel01` template under `wheel_rf_dummy`
    if (lower === 'wheel01') {
      continue;
    }

    const mesh = buildGeometryMesh(geom, ctx);
    if (!mesh) continue;
    mesh.name = `${frame.name}_mesh`;
    frameObjects[atomic.frameIndex].add(mesh);

    const arr = baseFrameMeshes.get(lower) ?? [];
    arr.push(mesh);
    baseFrameMeshes.set(lower, arr);
  }

  // Instantiate stock wheel on all 4 wheel dummies + create custom wheel mount points
  const stockWheelInstances: THREE.Object3D[] = [];
  const customWheelMounts: THREE.Group[] = [];

  const wheelBuildCtx: MaterialBuildContext = {
    ...ctx,
    isWheelPart: true,
  };

  const frontRefDummy = frameNodes.get('wheel_rf_dummy');
  const frontRefZ = frontRefDummy ? frontRefDummy.position.z : 0;

  for (const dummySpec of WHEEL_DUMMIES) {
    const dummyNode = frameNodes.get(dummySpec.name);
    if (!dummyNode) continue;

    // For uneven-axle vehicles (e.g., Tractor, Mower, Bandito), rear wheel dummies sit higher
    // in RW Z-up space; scale that axle's tire radius so every tire contacts the same ground plane.
    const axleElevationDelta = frontRefDummy ? dummyNode.position.z - frontRefZ : 0;
    const axleWheelRadius =
      axleElevationDelta > 0.015
        ? stockWheelRadius + axleElevationDelta
        : stockWheelRadius;
    const axleScale = axleWheelRadius / Math.max(stockWheelRadius, 0.1);

    const wheelPivot = new THREE.Group();
    wheelPivot.name = `${dummySpec.name}_pivot`;
    wheelPivot.position.copy(stockWheelLocalOffset);
    if (dummySpec.isLeft) {
      // Mirror left wheels around Z (vertical in RW) so rim face points outward
      wheelPivot.rotation.z = Math.PI;
    }
    dummyNode.add(wheelPivot);

    if (stockWheelGeom) {
      const wheelMesh = buildGeometryMesh(stockWheelGeom, wheelBuildCtx);
      if (wheelMesh) {
        wheelMesh.name = `stock_wheel_${dummySpec.name}`;
        if (Math.abs(axleScale - 1) > 0.01) {
          wheelMesh.scale.setScalar(axleScale);
        }
        wheelPivot.add(wheelMesh);
        stockWheelInstances.push(wheelMesh);
      }
    }

    const customMount = new THREE.Group();
    customMount.name = `custom_wheel_mount_${dummySpec.name}`;
    customMount.userData.wheelRadius = axleWheelRadius;
    wheelPivot.add(customMount);
    customWheelMounts.push(customMount);
  }

  // Ground the vehicle so the bottom of the tires rests flush on y = 0
  root.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(root);
  if (Number.isFinite(bbox.min.y)) {
    rwContainer.position.y = -bbox.min.y;
  }
  // Center X/Z horizontally around origin so orbit camera pivots cleanly on the car
  if (Number.isFinite(bbox.min.x) && Number.isFinite(bbox.max.x)) {
    const cx = (bbox.min.x + bbox.max.x) * 0.5;
    const cz = (bbox.min.z + bbox.max.z) * 0.5;
    rwContainer.position.x -= cx;
    rwContainer.position.z -= cz;
  }

  return {
    root,
    frameNodes,
    baseFrameMeshes,
    stockWheelRadius,
    stockWheelInstances,
    customWheelMounts,
    primaryPaintMaterials: ctx.primaryPaintMaterials,
    secondaryPaintMaterials: ctx.secondaryPaintMaterials,
    remapBodyMaterials: ctx.remapBodyMaterials,
    dispose() {
      for (const g of ctx.createdGeometries) g.dispose();
      for (const m of ctx.createdMaterials) m.dispose();
    },
  };
}

export interface BuiltAttachmentObject {
  group: THREE.Group;
  primaryPaintMaterials: THREE.MeshStandardMaterial[];
  secondaryPaintMaterials: THREE.MeshStandardMaterial[];
  remapBodyMaterials: THREE.MeshStandardMaterial[];
  dispose: () => void;
}

/**
 * Builds a single GTA:SA upgrade part `.dff` (bumper, spoiler, skirt, roof,
 * exhaust, bullbar, misc, or wheel) ready to be mounted at identity onto a
 * base car's dummy node.
 *
 * Per GTA:SA `CAutomobile::AddUpgrade`, undamaged upgrade atomics are mounted
 * directly onto the target dummy at local `(0,0,0)` (ignoring the standalone
 * DFF's export pivot offset) while `_dam` atomics are skipped.
 */
export function buildUpgradePartObject(
  clump: RwClump,
  txdTextures: Map<string, THREE.DataTexture>,
  sharedBank: SharedVehicleTextureBank,
  paint: PaintColors,
  options?: {
    isWheelPart?: boolean;
    targetWheelRadius?: number;
    isSoftwareGl?: boolean;
    paintjobTexture?: THREE.DataTexture | null;
  }
): BuiltAttachmentObject {
  const ctx: MaterialBuildContext = {
    txdTextures,
    sharedBank,
    paint,
    paintjobTexture: options?.paintjobTexture ?? null,
    primaryPaintMaterials: [],
    secondaryPaintMaterials: [],
    remapBodyMaterials: [],
    createdMaterials: [],
    createdGeometries: [],
    isWheelPart: options?.isWheelPart,
    isSoftwareGl: options?.isSoftwareGl,
  };

  const group = new THREE.Group();
  group.name = 'upgrade_part_group';

  for (const atomic of clump.atomics) {
    const frame = clump.frames[atomic.frameIndex];
    const geom = clump.geometries[atomic.geometryIndex];
    if (!frame || !geom) continue;
    if (frame.name.toLowerCase().endsWith('_dam')) continue;

    const mesh = buildGeometryMesh(geom, ctx);
    if (!mesh) continue;
    mesh.name = `${frame.name}_upgrade`;
    group.add(mesh);

    if (options?.isWheelPart && options.targetWheelRadius) {
      const customRadius = computeWheelRadius(geom);
      const scale = options.targetWheelRadius / customRadius;
      mesh.scale.setScalar(scale);
    }
  }

  return {
    group,
    primaryPaintMaterials: ctx.primaryPaintMaterials,
    secondaryPaintMaterials: ctx.secondaryPaintMaterials,
    remapBodyMaterials: ctx.remapBodyMaterials,
    dispose() {
      for (const g of ctx.createdGeometries) g.dispose();
      for (const m of ctx.createdMaterials) m.dispose();
    },
  };
}

export interface PaintableMaterialTarget {
  primaryPaintMaterials: THREE.MeshStandardMaterial[];
  secondaryPaintMaterials: THREE.MeshStandardMaterial[];
  remapBodyMaterials: THREE.MeshStandardMaterial[];
}

/**
 * Applies Primary Color, Secondary Color, and active GTA:SA Paintjob texture
 * across the base vehicle and all mounted modification parts in-place.
 */
export function applyPaintAndPaintjobToTargets(
  targets: PaintableMaterialTarget[],
  paint: PaintColors,
  paintjobTexture: THREE.DataTexture | null,
  isSoftwareGl: boolean
): void {
  const primaryColor = new THREE.Color(paint.primary);
  const secondaryColor = new THREE.Color(paint.secondary);
  const hasPaintjob = Boolean(paintjobTexture);

  for (const target of targets) {
    for (const mat of target.primaryPaintMaterials) {
      mat.color.copy(primaryColor);
    }
    for (const mat of target.secondaryPaintMaterials) {
      mat.color.copy(secondaryColor);
    }
    for (const mat of target.remapBodyMaterials) {
      const prevMap = mat.map;
      if (prevMap !== paintjobTexture) {
        mat.map = paintjobTexture;
        mat.needsUpdate = true;
      }
      mat.roughness = hasPaintjob ? 0.28 : isSoftwareGl ? 0.22 : 0.24;
      mat.metalness = hasPaintjob
        ? isSoftwareGl
          ? 0.14
          : 0.12
        : isSoftwareGl
          ? 0.34
          : 0.22;
    }
  }
}
