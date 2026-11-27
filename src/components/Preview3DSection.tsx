import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Camera,
  Paintbrush,
  RotateCcw,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  ALL_VEHICLES,
  CHANGE_COLOR_PRICE,
  LOCOLOW_VEHICLES,
  NON_WAA_LOCOLOW_VEHICLES,
  PAINTJOB_PRICE,
  WAA_VEHICLES,
  WHEELS,
  getVehicleSlotsWithParts,
  isTwoColorLocolowVehicle,
  isVelgNitroOnlyVehicle,
  type BodyPartSlot,
  type ModStyle,
} from '../data/workshopData';
import {
  VEHICLE_3D_ASSETS,
  WHEEL_3D_ASSETS,
  getVehiclePaintjobs,
  resolveModPart3DAsset,
} from '../data/gta3Assets';
import { getGtaVehicleColorHex } from '../data/gtaVehicleColors';
import { GtaColorPalettePicker } from './GtaColorPalettePicker';
import { parseDff, parseTxd, type RwClump, type RwTxd } from '../utils/rwParser';
import {
  createSharedVehicleTextureBank,
  type SharedVehicleTextureBank,
} from '../utils/gtaFallbackTextures';
import {
  applyPaintAndPaintjobToTargets,
  buildBaseVehicleAssembly,
  buildUpgradePartObject,
  createPaintjobDataTexture,
  createTxdDataTextures,
  type BuiltAttachmentObject,
  type BuiltVehicleAssembly,
  type PaintColors,
} from '../utils/carSceneBuilder';
import {
  calculateOrder,
  formatChangeColorLabel,
  formatSecondaryChangeColorLabel,
  formatUSD,
  type SelectedBodyParts,
} from '../utils/calculator';

interface Preview3DSectionProps {
  vehicleId: string;
  wheelId: string | null;
  bodyParts: SelectedBodyParts;
  paintjobId: number | null;
  changeColor: boolean;
  primaryColorId: number | null;
  secondaryColorId: number | null;
  onChangeVehicle: (vehicleId: string) => void;
  onToggleBodyPart: (partId: string) => void;
  onSelectFullSet: (style: ModStyle) => void;
  onClearBodyParts: () => void;
  onChangeWheel: (wheelId: string | null) => void;
  onChangePaintjob: (paintjobId: number | null) => void;
  onChangeColor: (enabled: boolean) => void;
  onSelectPrimaryColorId: (colorId: number) => void;
  onSelectSecondaryColorId: (colorId: number) => void;
  onJumpToCalculator: () => void;
}

type CameraPresetId = 'front-34' | 'side' | 'wheel-focus' | 'rear-34' | 'top';

interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'front-34', label: '3/4 Depan', position: [6.05, 2.25, 6.75], target: [0, 0.52, 0] },
  { id: 'side', label: 'Samping', position: [7.2, 1.55, 0.1], target: [0, 0.52, 0] },
  { id: 'wheel-focus', label: 'Fokus Velg', position: [4.35, 0.85, 2.55], target: [0.35, 0.44, 0.9] },
  { id: 'rear-34', label: '3/4 Belakang', position: [-6.05, 2.25, -6.75], target: [0, 0.55, 0] },
  { id: 'top', label: 'Atas', position: [0.05, 8.2, 2.5], target: [0, 0.35, 0] },
];

// Module-level parsed asset caches so toggling parts & cars is instant
const dffCache = new Map<string, Promise<RwClump>>();
const txdCache = new Map<string, Promise<RwTxd>>();

function loadDffCached(url: string): Promise<RwClump> {
  let promise = dffCache.get(url);
  if (!promise) {
    promise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
        return res.arrayBuffer();
      })
      .then((buf) => parseDff(buf));
    dffCache.set(url, promise);
  }
  return promise;
}

function loadTxdCached(url: string): Promise<RwTxd> {
  let promise = txdCache.get(url);
  if (!promise) {
    promise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
        return res.arrayBuffer();
      })
      .then((buf) => parseTxd(buf));
    txdCache.set(url, promise);
  }
  return promise;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl =
      probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return false;
    const rendererStr = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '');
    return /swiftshader|llvmpipe|softpipe|software|mesa offscreen|basic render driver/i.test(
      rendererStr
    );
  } catch {
    return false;
  }
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    const grad = ctx.createRadialGradient(128, 128, 22, 128, 128, 122);
    grad.addColorStop(0, 'rgba(5, 7, 11, 0.72)');
    grad.addColorStop(0.55, 'rgba(8, 10, 16, 0.36)');
    grad.addColorStop(1, 'rgba(8, 10, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createStudioFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
    grad.addColorStop(0, '#2c3240');
    grad.addColorStop(0.55, '#1e232d');
    grad.addColorStop(1, '#151820');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle concentric showroom turntable lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(256, 256, 172, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(217, 48, 37, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(256, 256, 184, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

interface SceneController {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  sharedBank: SharedVehicleTextureBank;
  isSoftwareGl: boolean;
  vehicleStage: THREE.Group;
  contactShadow: THREE.Mesh;
  requestRender: () => void;
  setCameraPreset: (preset: CameraPreset, distanceScale?: number) => void;
  dispose: () => void;
}

export function Preview3DSection({
  vehicleId,
  wheelId,
  bodyParts,
  paintjobId,
  changeColor,
  primaryColorId,
  secondaryColorId,
  onChangeVehicle,
  onToggleBodyPart,
  onSelectFullSet,
  onClearBodyParts,
  onChangeWheel,
  onChangePaintjob,
  onChangeColor,
  onSelectPrimaryColorId,
  onSelectSecondaryColorId,
  onJumpToCalculator,
}: Preview3DSectionProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SceneController | null>(null);

  const baseAssemblyRef = useRef<BuiltVehicleAssembly | null>(null);
  const carTxdTexturesRef = useRef<Map<string, THREE.DataTexture>>(new Map());
  const paintjobTextureRef = useRef<THREE.DataTexture | null>(null);
  const mountedModAttachmentsRef = useRef<BuiltAttachmentObject[]>([]);
  const mountedWheelAttachmentsRef = useRef<BuiltAttachmentObject[]>([]);
  const hiddenBaseFramesRef = useRef<Set<string>>(new Set());

  const [activePreset, setActivePreset] = useState<CameraPresetId>('front-34');
  const [isLoadingPaintjob, setIsLoadingPaintjob] = useState(false);

  const [isLoadingVehicle, setIsLoadingVehicle] = useState(true);
  const [isUpdatingParts, setIsUpdatingParts] = useState(false);
  const [loadedVehicleId, setLoadedVehicleId] = useState<string>('');
  const [mountedModCount, setMountedModCount] = useState<number>(0);
  const [renderCount, setRenderCount] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const vehicleCameraScaleRef = useRef<number>(1);
  const activePresetRef = useRef<CameraPresetId>(activePreset);
  activePresetRef.current = activePreset;

  const selectedVehicle =
    ALL_VEHICLES.find((v) => v.id === vehicleId) ?? ALL_VEHICLES[0];
  const isVelgNitroOnly = isVelgNitroOnlyVehicle(selectedVehicle.id);
  const canCombineSecondaryWithPaintjob = isTwoColorLocolowVehicle(selectedVehicle.id);
  const vehicleAsset = VEHICLE_3D_ASSETS[selectedVehicle.id] ?? VEHICLE_3D_ASSETS.sultan;
  const availablePaintjobs = useMemo(
    () => (isVelgNitroOnly ? [] : getVehiclePaintjobs(selectedVehicle.id)),
    [selectedVehicle.id, isVelgNitroOnly]
  );
  const isWaa = selectedVehicle.category === 'WAA';
  const primaryStyle: ModStyle = isWaa ? 'X-FLOW' : 'SLAMIN';
  const secondaryStyle: ModStyle = isWaa ? 'ALIEN' : 'CHROMER';

  const vehicleSlots = useMemo(
    () => (isVelgNitroOnly ? [] : getVehicleSlotsWithParts(selectedVehicle.id)),
    [selectedVehicle.id, isVelgNitroOnly]
  );

  // Derive 3D paint hexes strictly from the official 0-255 GTA:SA palette
  const hasActivePaintjob =
    !isVelgNitroOnly &&
    paintjobId !== null &&
    availablePaintjobs.some((pj) => pj.id === paintjobId);

  const isSecondaryWithPaintjobMode =
    hasActivePaintjob && canCombineSecondaryWithPaintjob;

  const paint: PaintColors = useMemo(
    () => ({
      primary: hasActivePaintjob
        ? '#FFFFFF'
        : changeColor && primaryColorId !== null
          ? getGtaVehicleColorHex(primaryColorId, vehicleAsset.defaultPrimaryColor)
          : vehicleAsset.defaultPrimaryColor,
      secondary:
        changeColor &&
        (!hasActivePaintjob || canCombineSecondaryWithPaintjob) &&
        secondaryColorId !== null
          ? getGtaVehicleColorHex(secondaryColorId, vehicleAsset.defaultSecondaryColor)
          : vehicleAsset.defaultSecondaryColor,
    }),
    [
      hasActivePaintjob,
      canCombineSecondaryWithPaintjob,
      changeColor,
      primaryColorId,
      secondaryColorId,
      vehicleAsset.defaultPrimaryColor,
      vehicleAsset.defaultSecondaryColor,
    ]
  );

  const paintRef = useRef(paint);
  paintRef.current = paint;

  const orderBreakdown = useMemo(
    () =>
      calculateOrder({
        vehicleId: selectedVehicle.id,
        nitroId: null,
        wheelId,
        bodyParts,
        paintjobId,
        changeColor,
        primaryColorId,
        secondaryColorId,
      }),
    [
      selectedVehicle.id,
      wheelId,
      bodyParts,
      paintjobId,
      changeColor,
      primaryColorId,
      secondaryColorId,
    ]
  );

  const bodyPartsKey = useMemo(
    () =>
      Object.entries(bodyParts)
        .filter(([, v]) => Boolean(v))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('|'),
    [bodyParts]
  );

  // Initialize isolated Three.js WebGL stage once on mount
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
        preserveDrawingBuffer: true,
      });
    } catch {
      setWebglUnavailable(true);
      setIsLoadingVehicle(false);
      return;
    }

    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    if (!isSoftwareGl) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    const width = Math.max(mount.clientWidth, 320);
    const height = Math.max(mount.clientHeight, 320);
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#171B24');
    scene.fog = new THREE.Fog('#171B24', 12, 26);

    // Image-Based Lighting via RoomEnvironment (runs on GPU and software WebGL)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 80);
    const initialPreset = CAMERA_PRESETS[0];
    camera.position.set(...initialPreset.position);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initialPreset.target);
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.2;
    controls.maxDistance = 17.5;
    controls.minPolarAngle = 0.18;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.update();

    // Balanced 3-point automotive studio lighting
    const hemiLight = new THREE.HemisphereLight('#eef4ff', '#272c38', 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff5e8', 2.35);
    keyLight.position.set(5.5, 8.5, 6.5);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 22;
      keyLight.shadow.camera.left = -4.2;
      keyLight.shadow.camera.right = 4.2;
      keyLight.shadow.camera.top = 4.2;
      keyLight.shadow.camera.bottom = -4.2;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.025;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#b7d5ff', 1.3);
    rimLight.position.set(-6.0, 4.8, -5.5);
    scene.add(rimLight);

    const frontFill = new THREE.DirectionalLight('#f8fafc', 0.65);
    frontFill.position.set(0.5, 2.0, 6.5);
    scene.add(frontFill);

    // Studio turntable floor
    const floorTex = createStudioFloorTexture();
    const floorGeom = new THREE.CircleGeometry(9.5, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.72,
      metalness: 0.18,
    });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Grounded radial contact shadow disc directly beneath the vehicle
    const shadowTex = createContactShadowTexture();
    const shadowGeom = new THREE.PlaneGeometry(3.2, 6.1);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.92,
    });
    const contactShadow = new THREE.Mesh(shadowGeom, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.005;
    scene.add(contactShadow);

    const vehicleStage = new THREE.Group();
    vehicleStage.name = 'orca_vehicle_stage';
    scene.add(vehicleStage);

    // Coalesced on-demand renderer with WebGL2 fence sync under software WebGL
    let rafId = 0;
    let disposed = false;
    let renderPending = false;
    let fenceWaitInFlight = false;
    let dirtyDuringFence = false;

    const afterDraw = (cb: () => void) => {
      if (!isSoftwareGl) {
        cb();
        return;
      }
      const gl = renderer.getContext();
      if (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (sync) {
          gl.flush();
          const poll = () => {
            if (disposed) {
              gl.deleteSync(sync);
              return;
            }
            const status = gl.clientWaitSync(sync, 0, 0);
            if (
              status === gl.ALREADY_SIGNALED ||
              status === gl.CONDITION_SATISFIED ||
              status === gl.WAIT_FAILED
            ) {
              gl.deleteSync(sync);
              cb();
            } else {
              rafId = requestAnimationFrame(poll);
            }
          };
          rafId = requestAnimationFrame(poll);
          return;
        }
      }
      rafId = requestAnimationFrame(cb);
    };

    const drawFrame = () => {
      if (disposed) return;
      renderPending = false;
      if (controls.enableDamping) {
        controls.update();
      }
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        fenceWaitInFlight = true;
        afterDraw(() => {
          fenceWaitInFlight = false;
          if (!disposed) {
            setRenderCount((c) => c + 1);
            if (dirtyDuringFence) {
              dirtyDuringFence = false;
              requestRender();
            }
          }
        });
      } else {
        setRenderCount((c) => c + 1);
      }
    };

    const requestRender = () => {
      if (disposed) return;
      if (fenceWaitInFlight) {
        dirtyDuringFence = true;
        return;
      }
      if (!renderPending) {
        renderPending = true;
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    const sharedBank = createSharedVehicleTextureBank(requestRender);

    const handleControlChange = () => {
      requestRender();
    };
    controls.addEventListener('change', handleControlChange);

    const resizeObserver = new ResizeObserver((entries) => {
      if (disposed) return;
      for (const entry of entries) {
        const w = Math.max(Math.floor(entry.contentRect.width), 300);
        const h = Math.max(Math.floor(entry.contentRect.height), 300);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        requestRender();
      }
    });
    resizeObserver.observe(mount);

    const setCameraPreset = (preset: CameraPreset, distanceScale = 1) => {
      const s = Math.max(0.65, Math.min(1.75, distanceScale));
      camera.position.set(
        preset.position[0] * s,
        Math.max(0.65, preset.position[1] * s),
        preset.position[2] * s
      );
      controls.target.set(
        preset.target[0] * s,
        preset.target[1] * Math.min(1.25, Math.max(0.75, s)),
        preset.target[2] * s
      );
      controls.update();
      requestRender();
    };

    controllerRef.current = {
      scene,
      camera,
      renderer,
      controls,
      sharedBank,
      isSoftwareGl,
      vehicleStage,
      contactShadow,
      requestRender,
      setCameraPreset,
      dispose() {
        disposed = true;
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        controls.removeEventListener('change', handleControlChange);
        controls.dispose();
        sharedBank.dispose();
        floorGeom.dispose();
        floorMat.dispose();
        floorTex.dispose();
        shadowGeom.dispose();
        shadowMat.dispose();
        shadowTex.dispose();
        envTex.dispose();
        pmrem.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      },
    };

    requestRender();

    return () => {
      // Clean up any loaded vehicle resources before tearing down renderer
      for (const att of mountedModAttachmentsRef.current) att.dispose();
      mountedModAttachmentsRef.current = [];
      for (const wAtt of mountedWheelAttachmentsRef.current) wAtt.dispose();
      mountedWheelAttachmentsRef.current = [];
      baseAssemblyRef.current?.dispose();
      baseAssemblyRef.current = null;
      for (const dt of carTxdTexturesRef.current.values()) dt.dispose();
      carTxdTexturesRef.current.clear();
      paintjobTextureRef.current?.dispose();
      paintjobTextureRef.current = null;

      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, []);

  // Helper to tear down active mod attachments & restore stock frames
  const clearMountedMods = () => {
    for (const att of mountedModAttachmentsRef.current) {
      att.group.parent?.remove(att.group);
      att.dispose();
    }
    mountedModAttachmentsRef.current = [];

    const assembly = baseAssemblyRef.current;
    if (assembly) {
      for (const frameName of hiddenBaseFramesRef.current) {
        const meshes = assembly.baseFrameMeshes.get(frameName);
        if (meshes) {
          for (const m of meshes) m.visible = true;
        }
      }
    }
    hiddenBaseFramesRef.current.clear();
  };

  const clearMountedWheels = () => {
    for (const wAtt of mountedWheelAttachmentsRef.current) {
      wAtt.group.parent?.remove(wAtt.group);
      wAtt.dispose();
    }
    mountedWheelAttachmentsRef.current = [];

    const assembly = baseAssemblyRef.current;
    if (assembly) {
      for (const stockWheel of assembly.stockWheelInstances) {
        stockWheel.visible = true;
      }
    }
  };

  // Load authentic GTA:SA base vehicle DFF + TXD whenever vehicleId changes
  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl || webglUnavailable) return;

    const asset = VEHICLE_3D_ASSETS[vehicleId];
    if (!asset) return;

    let cancelled = false;
    setIsLoadingVehicle(true);
    setLoadError(null);

    Promise.all([
      loadDffCached(asset.dffUrl),
      loadTxdCached(asset.txdUrl),
      ctrl.sharedBank.ready,
    ])
      .then(([clump, txd]) => {
        if (cancelled || !controllerRef.current) return;

        // Dispose previous car & its attachments
        clearMountedMods();
        clearMountedWheels();
        if (baseAssemblyRef.current) {
          ctrl.vehicleStage.remove(baseAssemblyRef.current.root);
          baseAssemblyRef.current.dispose();
          baseAssemblyRef.current = null;
        }
        for (const dt of carTxdTexturesRef.current.values()) {
          dt.dispose();
        }
        carTxdTexturesRef.current.clear();
        paintjobTextureRef.current?.dispose();
        paintjobTextureRef.current = null;

        const dataTextures = createTxdDataTextures(txd);
        carTxdTexturesRef.current = dataTextures;

        const assembly = buildBaseVehicleAssembly(
          clump,
          dataTextures,
          ctrl.sharedBank,
          paintRef.current,
          {
            isSoftwareGl: ctrl.isSoftwareGl,
            paintjobTexture: null,
          }
        );
        baseAssemblyRef.current = assembly;
        ctrl.vehicleStage.add(assembly.root);

        // Size contact shadow and camera framing to vehicle footprint
        assembly.root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(assembly.root);
        const size = new THREE.Vector3();
        box.getSize(size);
        ctrl.contactShadow.scale.set(
          Math.max(0.55, (size.x * 1.25) / 3.2),
          Math.max(0.45, (size.z * 1.15) / 6.1),
          1
        );

        const maxSpan = Math.max(size.x, size.z, size.y * 1.45);
        const nextScale =
          maxSpan > 5.4 || maxSpan < 3.6
            ? Math.max(0.68, Math.min(1.72, maxSpan / 4.15))
            : 1;
        vehicleCameraScaleRef.current = nextScale;
        const presetObj =
          CAMERA_PRESETS.find((p) => p.id === activePresetRef.current) ?? CAMERA_PRESETS[0];
        ctrl.setCameraPreset(presetObj, nextScale);

        setLoadedVehicleId(vehicleId);
        setIsLoadingVehicle(false);
        ctrl.requestRender();
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : 'Gagal memuat model 3D kendaraan.'
        );
        setIsLoadingVehicle(false);
      });

    return () => {
      cancelled = true;
    };
  }, [vehicleId, webglUnavailable]);

  // Attach/update selected body mods & custom wheels whenever loaded car, bodyParts, or wheelId changes
  useEffect(() => {
    const ctrl = controllerRef.current;
    const assembly = baseAssemblyRef.current;
    if (!ctrl || !assembly || loadedVehicleId !== vehicleId) return;

    let cancelled = false;
    setIsUpdatingParts(true);

    const activeEntries = isVelgNitroOnlyVehicle(vehicleId)
      ? []
      : (Object.entries(bodyParts).filter(([, partId]) => Boolean(partId)) as [
          BodyPartSlot,
          string,
        ][]);

    const resolvedMods = activeEntries
      .map(([slot, partId]) => ({
        slot,
        partId,
        asset: resolveModPart3DAsset(vehicleId, partId, slot),
      }))
      .filter((item): item is { slot: BodyPartSlot; partId: string; asset: NonNullable<ReturnType<typeof resolveModPart3DAsset>> } =>
        Boolean(item.asset)
      );

    const wheelAsset = wheelId ? WHEEL_3D_ASSETS[wheelId] ?? null : null;

    const modLoadPromises = resolvedMods.map(async (item) => {
      const clumps = await Promise.all(
        item.asset.attachments.map(async (att) => ({
          att,
          clump: await loadDffCached(att.dffUrl),
        }))
      );
      return { item, clumps };
    });

    const wheelLoadPromise = wheelAsset
      ? loadDffCached(wheelAsset.dffUrl)
      : Promise.resolve<RwClump | null>(null);

    Promise.all([Promise.all(modLoadPromises), wheelLoadPromise])
      .then(([loadedMods, loadedWheelClump]) => {
        if (cancelled || baseAssemblyRef.current !== assembly) return;

        // 1. Replace body modification parts
        clearMountedMods();
        const nextHidden = new Set<string>();

        for (const { item, clumps } of loadedMods) {
          if (item.asset.hideBaseFrames) {
            for (const fname of item.asset.hideBaseFrames) {
              nextHidden.add(fname.toLowerCase());
            }
          }

          for (const { att, clump } of clumps) {
            const targetNode =
              assembly.frameNodes.get(att.targetDummy.toLowerCase()) ??
              (att.fallbackDummy
                ? assembly.frameNodes.get(att.fallbackDummy.toLowerCase())
                : undefined);
            if (!targetNode) continue;

            const built = buildUpgradePartObject(
              clump,
              carTxdTexturesRef.current,
              ctrl.sharedBank,
              paintRef.current,
              {
                isSoftwareGl: ctrl.isSoftwareGl,
                paintjobTexture: paintjobTextureRef.current,
              }
            );
            targetNode.add(built.group);
            mountedModAttachmentsRef.current.push(built);
          }
        }

        for (const frameName of nextHidden) {
          const meshes = assembly.baseFrameMeshes.get(frameName);
          if (meshes) {
            for (const m of meshes) m.visible = false;
          }
        }
        hiddenBaseFramesRef.current = nextHidden;

        // 2. Replace all vehicle wheels if a custom wheel is selected
        clearMountedWheels();
        if (loadedWheelClump) {
          for (const stockWheel of assembly.stockWheelInstances) {
            stockWheel.visible = false;
          }
          for (const mountNode of assembly.customWheelMounts) {
            const targetRadius =
              typeof mountNode.userData.wheelRadius === 'number'
                ? mountNode.userData.wheelRadius
                : assembly.stockWheelRadius;
            const builtWheel = buildUpgradePartObject(
              loadedWheelClump,
              carTxdTexturesRef.current,
              ctrl.sharedBank,
              paintRef.current,
              {
                isWheelPart: true,
                targetWheelRadius: targetRadius,
                isSoftwareGl: ctrl.isSoftwareGl,
              }
            );
            mountNode.add(builtWheel.group);
            mountedWheelAttachmentsRef.current.push(builtWheel);
          }
        }

        setMountedModCount(resolvedMods.length);
        setIsUpdatingParts(false);
        ctrl.requestRender();
      })
      .catch(() => {
        if (!cancelled) {
          setIsUpdatingParts(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadedVehicleId, vehicleId, bodyPartsKey, wheelId]);

  // Load & apply active GTA:SA paintjob `.txd` whenever vehicle or paintjobId changes
  useEffect(() => {
    const ctrl = controllerRef.current;
    const assembly = baseAssemblyRef.current;
    if (!ctrl || !assembly || loadedVehicleId !== vehicleId) return;

    const applyTexture = (tex: THREE.DataTexture | null) => {
      const prev = paintjobTextureRef.current;
      paintjobTextureRef.current = tex;
      applyPaintAndPaintjobToTargets(
        [assembly, ...mountedModAttachmentsRef.current],
        paintRef.current,
        tex,
        ctrl.isSoftwareGl
      );
      if (prev && prev !== tex) {
        prev.dispose();
      }
      ctrl.requestRender();
    };

    const selectedPj =
      paintjobId !== null
        ? getVehiclePaintjobs(vehicleId).find((p) => p.id === paintjobId) ?? null
        : null;

    if (!selectedPj) {
      setIsLoadingPaintjob(false);
      applyTexture(null);
      return;
    }

    let cancelled = false;
    setIsLoadingPaintjob(true);

    loadTxdCached(selectedPj.txdUrl)
      .then((txd) => {
        if (cancelled || baseAssemblyRef.current !== assembly) return;
        const pjTex = createPaintjobDataTexture(txd);
        applyTexture(pjTex);
        setIsLoadingPaintjob(false);
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoadingPaintjob(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadedVehicleId, vehicleId, paintjobId]);

  // Live Primary & Secondary color update (0ms instant update across base car + mounted mods)
  useEffect(() => {
    const ctrl = controllerRef.current;
    const assembly = baseAssemblyRef.current;
    if (!ctrl || !assembly) return;

    applyPaintAndPaintjobToTargets(
      [assembly, ...mountedModAttachmentsRef.current],
      paint,
      paintjobTextureRef.current,
      ctrl.isSoftwareGl
    );
    ctrl.requestRender();
  }, [paint]);

  const handleSelectCameraPreset = (preset: CameraPreset) => {
    setActivePreset(preset.id);
    controllerRef.current?.setCameraPreset(preset, vehicleCameraScaleRef.current);
  };

  const handleSelectPaintjob = (nextId: number | null) => {
    if (nextId === paintjobId) return;
    onChangePaintjob(nextId);
  };

  const selectedWheelObj = wheelId
    ? WHEELS.find((w) => w.id === wheelId) ?? null
    : null;
  const activePaintjobObj =
    paintjobId !== null
      ? availablePaintjobs.find((p) => p.id === paintjobId) ?? null
      : null;

  return (
    <section
      id="preview-3d"
      data-testid="preview-3d-section"
      data-loaded-vehicle={loadedVehicleId}
      data-mounted-mods={mountedModCount}
      data-mounted-wheel={wheelId ?? 'stock'}
      data-paintjob={paintjobId ?? 'none'}
      data-change-color={changeColor ? 'true' : 'false'}
      data-primary-color={paint.primary}
      data-secondary-color={paint.secondary}
      data-loading={
        isLoadingVehicle || isUpdatingParts || isLoadingPaintjob ? 'true' : 'false'
      }
      data-render-count={renderCount}
      className="py-12 lg:py-16 bg-[#F6F7F9] border-b border-[#E2E6EC]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-[#D93025] mb-1.5">
              Preview 3D Interaktif (Model Asli GTA:SA)
            </p>
            <h2
              className="font-display font-bold text-[#111317] leading-[1.06] tracking-tight"
              style={{ fontSize: 'clamp(1.9rem, 3vw, 2.75rem)', textWrap: 'balance' }}
            >
              Simulasi 3D Pemasangan Modifikasi
            </h2>
          </div>
          <p className="text-sm text-[#4B5563] max-w-md">
            Pilih kendaraan, paintjob, warna cat, dan modifikasi untuk melihat
            hasil pemasangan secara langsung dalam tampilan 3D 360°.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: 3D Showroom Viewport */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="relative flex-1 min-h-[440px] sm:min-h-[520px] lg:min-h-[660px] rounded-xl overflow-hidden bg-[#171B24] border border-[#2A303D] shadow-sm">
              {/* Isolated WebGL canvas mount */}
              <div
                ref={canvasMountRef}
                data-testid="preview-3d-canvas-wrap"
                className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
              />

              {/* Top-left subtle vehicle title badge (solid dark surface, zero backdrop-blur) */}
              <div className="pointer-events-none absolute top-3.5 left-3.5 z-10 flex items-center gap-2">
                <div className="bg-[#111317] border border-[#2C3340] rounded-lg px-3 py-1.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-bold text-white tracking-wide">
                      {selectedVehicle.name}
                    </span>
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#D93025] text-white">
                      {selectedVehicle.category}
                    </span>
                    {activePaintjobObj && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#252B37] text-[#F3F4F6] border border-[#3A4252]">
                        {activePaintjobObj.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9AA4B2] mt-0.5">
                    {isVelgNitroOnly
                      ? changeColor || selectedWheelObj
                        ? [
                            changeColor
                              ? formatChangeColorLabel(primaryColorId, secondaryColorId)
                              : null,
                            selectedWheelObj ? selectedWheelObj.name : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : 'Tampilan Standar · Khusus Change Color, Velg & N2O'
                      : mountedModCount > 0 || selectedWheelObj || activePaintjobObj || changeColor
                        ? [
                            activePaintjobObj ? activePaintjobObj.label : null,
                            changeColor && (!activePaintjobObj || canCombineSecondaryWithPaintjob)
                              ? isSecondaryWithPaintjobMode
                                ? formatSecondaryChangeColorLabel(secondaryColorId)
                                : formatChangeColorLabel(primaryColorId, secondaryColorId)
                              : null,
                            mountedModCount > 0 ? `${mountedModCount} part body` : null,
                            selectedWheelObj ? selectedWheelObj.name : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : 'Tampilan Standar · Seret untuk putar 360°'}
                  </p>
                </div>
              </div>

              {/* Loading / Error overlays */}
              {(isLoadingVehicle || loadError || webglUnavailable) && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#171B24]/85 px-6 text-center">
                  {webglUnavailable ? (
                    <div className="max-w-sm">
                      <p className="text-sm font-semibold text-white">
                        Browser tidak mendukung WebGL 3D
                      </p>
                      <p className="text-xs text-[#9AA4B2] mt-1">
                        Aktifkan akselerasi hardware pada browser Anda untuk melihat preview 3D.
                      </p>
                    </div>
                  ) : loadError ? (
                    <div className="max-w-sm">
                      <p className="text-sm font-semibold text-[#F87171]">
                        Gagal Memuat Model 3D
                      </p>
                      <p className="text-xs text-[#CBD5E1] mt-1">{loadError}</p>
                    </div>
                  ) : (
                    <div className="bg-[#111317] border border-[#2C3340] rounded-lg px-4 py-3 text-xs font-medium text-[#E5E7EB]">
                      Memuat model 3D {selectedVehicle.name}...
                    </div>
                  )}
                </div>
              )}

              {/* Bottom compact camera preset dock (solid surface, zero backdrop-blur) */}
              <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col items-center pointer-events-none">
                <div className="pointer-events-auto bg-[#111317] border border-[#2C3340] rounded-lg px-2.5 py-1.5 shadow-md max-w-full">
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9AA4B2] px-1.5">
                      <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                      Sudut:
                    </span>
                    {CAMERA_PRESETS.map((preset) => {
                      const active = activePreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectCameraPreset(preset)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#D93025] text-white'
                              : 'bg-[#1D222C] text-[#D1D5DB] hover:bg-[#2A3140] hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live 3D Modification Picker Panel */}
          <div className="lg:col-span-4 bg-white border border-[#DCE1E8] rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {/* 1. Vehicle Picker */}
              <div>
                <label
                  htmlFor="preview3d-vehicle-select"
                  className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-1.5"
                >
                  1. Pilih Kendaraan
                </label>
                <select
                  id="preview3d-vehicle-select"
                  data-testid="preview3d-vehicle-select"
                  value={selectedVehicle.id}
                  onChange={(e) => onChangeVehicle(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold text-[#111317] bg-[#F6F7F9] border border-[#CBD2DC] rounded-md focus:outline-none focus:border-[#111317] cursor-pointer"
                >
                  <optgroup label="WAA (X-FLOW & ALIEN)">
                    {WAA_VEHICLES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — WAA
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Locolow (SLAMIN & CHROMER)">
                    {LOCOLOW_VEHICLES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — Locolow
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Non-WAA & Locolow (Change Color & Velg)">
                    {NON_WAA_LOCOLOW_VEHICLES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — Non-WAA/Locolow
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {isVelgNitroOnly ? (
                <>
                  <div
                    data-testid="preview3d-velg-only-notice"
                    className="border border-[#E5E9F0] rounded-lg p-3 bg-[#FAFBFD]"
                  >
                    <p className="text-xs font-bold text-[#111317]">
                      Mode Khusus Change Color &amp; Velg ({selectedVehicle.name})
                    </p>
                    <p className="text-[11px] text-[#525C6A] mt-1 leading-relaxed">
                      Kendaraan Non-WAA &amp; Locolow melayani{' '}
                      <strong className="font-semibold text-[#111317]">Change Color</strong>,{' '}
                      <strong className="font-semibold text-[#111317]">Velg</strong>, dan{' '}
                      <strong className="font-semibold text-[#111317]">Nitro (N2O)</strong>.
                    </p>
                  </div>

                  {/* 2. Official 0-255 Change Color Palette for Non-WAA & Locolow */}
                  <div className="border border-[#E5E9F0] rounded-lg p-3 bg-[#FAFBFD] space-y-3">
                    <GtaColorPalettePicker
                      label="2. Change Color (Color 1)"
                      selectedId={changeColor ? primaryColorId : null}
                      defaultId={vehicleAsset.defaultPrimaryColorId}
                      isActive={changeColor}
                      priceLabel={formatUSD(CHANGE_COLOR_PRICE)}
                      onReset={() => onChangeColor(false)}
                      onSelectColorId={onSelectPrimaryColorId}
                      theme="light"
                      testIdPrefix="preview3d-primary"
                    />

                    {vehicleAsset.supportsSecondaryColor && (
                      <div className="pt-2.5 border-t border-[#E5E9F0]">
                        <GtaColorPalettePicker
                          label="Warna Sekunder (Color 2)"
                          selectedId={changeColor ? secondaryColorId : null}
                          defaultId={vehicleAsset.defaultSecondaryColorId}
                          isActive={changeColor && secondaryColorId !== null}
                          onSelectColorId={onSelectSecondaryColorId}
                          theme="light"
                          testIdPrefix="preview3d-secondary"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Wheel Picker (Dropdown + Quick Grid for 1-click Velg preview) */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label
                        htmlFor="preview3d-wheel-select"
                        className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]"
                      >
                        3. Pilih Velg 3D
                      </label>
                      {wheelId && (
                        <button
                          type="button"
                          onClick={() => onChangeWheel(null)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B7280] hover:text-[#D93025] cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                          Velg Standar
                        </button>
                      )}
                    </div>
                    <select
                      id="preview3d-wheel-select"
                      data-testid="preview3d-wheel-select"
                      value={wheelId ?? ''}
                      onChange={(e) => onChangeWheel(e.target.value || null)}
                      className="w-full px-3 py-2 text-sm text-[#111317] bg-[#F6F7F9] border border-[#CBD2DC] rounded-md focus:outline-none focus:border-[#111317] cursor-pointer"
                    >
                      <option value="">Velg Standar ({selectedVehicle.name})</option>
                      {WHEELS.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} — {formatUSD(w.price)}
                        </option>
                      ))}
                    </select>

                    <div
                      className="mt-2.5 grid grid-cols-2 gap-1.5 max-h-[210px] overflow-y-auto pr-1"
                      role="group"
                      aria-label={`Pilihan Velg 3D ${selectedVehicle.name}`}
                    >
                      {WHEELS.map((w) => {
                        const selected = wheelId === w.id;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            data-testid={`preview3d-wheel-btn-${w.id}`}
                            aria-pressed={selected}
                            onClick={() => onChangeWheel(selected ? null : w.id)}
                            className={`px-2.5 py-2 text-[11px] font-semibold rounded border text-left transition-colors cursor-pointer ${
                              selected
                                ? 'bg-[#D93025] border-[#D93025] text-white'
                                : 'bg-white border-[#D4DAE3] text-[#1F242D] hover:border-[#111317]'
                            }`}
                          >
                            <span className="block truncate">{w.name}</span>
                            <span
                              className={`block font-mono text-[10px] mt-0.5 tabular-nums ${
                                selected ? 'text-white/90' : 'text-[#6B7280]'
                              }`}
                            >
                              {formatUSD(w.price)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
              {/* 2. Paintjob / Color (2-color Locolow can combine Paintjob + Secondary Change Color) */}
              <div className="border border-[#E5E9F0] rounded-lg p-3 bg-[#FAFBFD] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    <Paintbrush className="w-3.5 h-3.5 text-[#D93025]" aria-hidden="true" />
                    {canCombineSecondaryWithPaintjob
                      ? '2. Paintjob & Warna Cat'
                      : '2. Paintjob atau Warna Cat'}
                  </span>
                  {paintjobId !== null && (
                    <button
                      type="button"
                      onClick={() => handleSelectPaintjob(null)}
                      className="text-[11px] font-semibold text-[#6B7280] hover:text-[#D93025] cursor-pointer"
                    >
                      Reset Polos
                    </button>
                  )}
                </div>
                <p
                  data-testid="preview3d-paint-rule-hint"
                  className="text-[11px] text-[#6B7280] -mt-1.5 leading-relaxed"
                >
                  {canCombineSecondaryWithPaintjob
                    ? `Khusus ${selectedVehicle.name} (2 warna): Paintjob bisa digabung dengan Change Color pada warna sekunder (Color 2).`
                    : 'Pilih salah satu — memilih salah satu otomatis menghapus yang lain.'}
                </p>

                {/* Paintjob Selector (only rendered when this vehicle has GTA:SA paintjobs) */}
                {availablePaintjobs.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-[#111317]">
                        Paintjob ({selectedVehicle.name})
                      </span>
                      <span
                        className={`text-[11px] font-mono font-semibold tabular-nums ${
                          paintjobId !== null ? 'text-[#D93025]' : 'text-[#6B7280]'
                        }`}
                      >
                        {formatUSD(PAINTJOB_PRICE)}
                      </span>
                    </div>
                    <div
                      className="grid grid-cols-4 gap-1.5"
                      role="group"
                      aria-label={`Pilihan Paintjob ${selectedVehicle.name}`}
                    >
                      <button
                        type="button"
                        data-testid="preview3d-paintjob-none"
                        aria-pressed={paintjobId === null}
                        onClick={() => handleSelectPaintjob(null)}
                        className={`py-1.5 px-1.5 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
                          paintjobId === null
                            ? 'bg-[#111317] border-[#111317] text-white'
                            : 'bg-white border-[#D4DAE3] text-[#1F242D] hover:border-[#111317]'
                        }`}
                      >
                        Polos
                      </button>
                      {availablePaintjobs.map((pj) => {
                        const active = paintjobId === pj.id;
                        return (
                          <button
                            key={pj.id}
                            type="button"
                            data-testid={`preview3d-paintjob-${pj.id}`}
                            aria-pressed={active}
                            onClick={() => handleSelectPaintjob(pj.id)}
                            className={`py-1.5 px-1.5 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#D93025] border-[#D93025] text-white'
                                : 'bg-white border-[#D4DAE3] text-[#1F242D] hover:border-[#111317]'
                            }`}
                          >
                            PJ {pj.id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Primary Color (Color 1 — Official 0-255 Palette) */}
                {isSecondaryWithPaintjobMode ? (
                  <div
                    data-testid="preview3d-primary-paintjob-note"
                    className="rounded-md border border-[#E5E9F0] bg-white px-2.5 py-2 text-[11px] text-[#525C6A] leading-relaxed"
                  >
                    Warna Utama (Color 1) memakai{' '}
                    <strong className="font-semibold text-[#111317]">
                      Paintjob {paintjobId}
                    </strong>
                    . Klik <strong className="font-semibold text-[#111317]">Polos</strong> jika
                    ingin mengubah Color 1.
                  </div>
                ) : (
                  <GtaColorPalettePicker
                    label="Change Color (Color 1)"
                    selectedId={paintjobId === null && changeColor ? primaryColorId : null}
                    defaultId={vehicleAsset.defaultPrimaryColorId}
                    isActive={paintjobId === null && changeColor}
                    priceLabel={formatUSD(CHANGE_COLOR_PRICE)}
                    onReset={() => onChangeColor(false)}
                    onSelectColorId={onSelectPrimaryColorId}
                    theme="light"
                    testIdPrefix="preview3d-primary"
                  />
                )}

                {/* Secondary Color (Color 2 — Official 0-255 Palette) */}
                {vehicleAsset.supportsSecondaryColor && (
                  <div className="pt-2.5 border-t border-[#E5E9F0]">
                    <GtaColorPalettePicker
                      label={
                        isSecondaryWithPaintjobMode
                          ? 'Change Color — Warna Sekunder (Color 2)'
                          : 'Warna Sekunder (Color 2 / Interior & Atap)'
                      }
                      selectedId={
                        changeColor &&
                        (paintjobId === null || canCombineSecondaryWithPaintjob)
                          ? secondaryColorId
                          : null
                      }
                      defaultId={vehicleAsset.defaultSecondaryColorId}
                      isActive={
                        changeColor &&
                        (isSecondaryWithPaintjobMode || secondaryColorId !== null)
                      }
                      priceLabel={
                        isSecondaryWithPaintjobMode
                          ? formatUSD(CHANGE_COLOR_PRICE)
                          : undefined
                      }
                      onReset={
                        isSecondaryWithPaintjobMode
                          ? () => onChangeColor(false)
                          : undefined
                      }
                      resetLabel="Reset Sekunder"
                      onSelectColorId={onSelectSecondaryColorId}
                      theme="light"
                      testIdPrefix="preview3d-secondary"
                    />
                  </div>
                )}
              </div>

              {/* 3. Quick Full Set & Body Parts */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    3. Pasang Modifikasi Body
                  </span>
                  {mountedModCount > 0 && (
                    <button
                      type="button"
                      onClick={onClearBodyParts}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B7280] hover:text-[#D93025] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      Lepas Semua
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    data-testid="preview3d-fullset-primary"
                    onClick={() => onSelectFullSet(primaryStyle)}
                    className="py-1.5 px-2.5 text-xs font-semibold rounded-md border border-[#CBD2DC] bg-[#F6F7F9] text-[#111317] hover:border-[#111317] hover:bg-[#111317] hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    Full {primaryStyle}
                  </button>
                  <button
                    type="button"
                    data-testid="preview3d-fullset-secondary"
                    onClick={() => onSelectFullSet(secondaryStyle)}
                    className="py-1.5 px-2.5 text-xs font-semibold rounded-md border border-[#CBD2DC] bg-[#F6F7F9] text-[#111317] hover:border-[#D93025] hover:bg-[#D93025] hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    Full {secondaryStyle}
                  </button>
                </div>

                {/* Per-slot toggle list */}
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {vehicleSlots.map(({ slot, label, parts }) => {
                    const activePartId = bodyParts[slot];
                    return (
                      <div
                        key={slot}
                        className="border border-[#E5E9F0] rounded-lg p-2.5 bg-[#FAFBFD]"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-[#111317]">
                            {label}
                          </span>
                          <span className="text-[11px] font-mono text-[#6B7280]">
                            {activePartId ? 'Terpasang' : 'Standar'}
                          </span>
                        </div>
                        <div
                          className={`grid gap-1.5 ${
                            parts.length === 1
                              ? 'grid-cols-1'
                              : parts.length === 3
                                ? 'grid-cols-3'
                                : 'grid-cols-2'
                          }`}
                        >
                          {parts.map((part) => {
                            const selected = activePartId === part.id;
                            return (
                              <button
                                key={part.id}
                                type="button"
                                data-testid={`preview3d-part-${part.id}`}
                                aria-pressed={selected}
                                onClick={() => onToggleBodyPart(part.id)}
                                className={`px-2 py-1.5 text-[11px] font-semibold rounded border text-left transition-colors cursor-pointer ${
                                  selected
                                    ? 'bg-[#D93025] border-[#D93025] text-white'
                                    : 'bg-white border-[#D4DAE3] text-[#1F242D] hover:border-[#111317]'
                                }`}
                              >
                                <span className="block truncate">
                                  {part.badgeLabel ?? part.partName}
                                </span>
                                <span
                                  className={`block font-mono text-[10px] mt-0.5 ${
                                    selected ? 'text-white/90' : 'text-[#6B7280]'
                                  }`}
                                >
                                  {formatUSD(part.price)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Wheel Picker */}
              <div>
                <label
                  htmlFor="preview3d-wheel-select"
                  className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-1.5"
                >
                  4. Pilih Velg 3D
                </label>
                <select
                  id="preview3d-wheel-select"
                  data-testid="preview3d-wheel-select"
                  value={wheelId ?? ''}
                  onChange={(e) => onChangeWheel(e.target.value || null)}
                  className="w-full px-3 py-2 text-sm text-[#111317] bg-[#F6F7F9] border border-[#CBD2DC] rounded-md focus:outline-none focus:border-[#111317] cursor-pointer"
                >
                  <option value="">Velg Standar ({selectedVehicle.name})</option>
                  {WHEELS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {formatUSD(w.price)}
                    </option>
                  ))}
                </select>
              </div>
                </>
              )}
            </div>

            {/* Footer summary + jump to calculator */}
            <div className="pt-3 border-t border-[#E5E9F0] flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-[#6B7280]">Estimasi Mod Terpasang</p>
                <p
                  data-testid="preview3d-estimate-total"
                  className="font-mono text-lg font-bold text-[#111317] tabular-nums"
                >
                  {formatUSD(orderBreakdown.total)}
                </p>
              </div>
              <button
                type="button"
                onClick={onJumpToCalculator}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white bg-[#111317] hover:bg-[#D93025] rounded-md transition-colors cursor-pointer shrink-0"
              >
                <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
                Ke Kalkulator
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
