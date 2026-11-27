/**
 * Pure TypeScript RenderWare binary parser for GTA: San Andreas `.dff` (Clump)
 * and `.txd` (Texture Dictionary) archives.
 *
 * Supports RW 3.6.0.3 (0x1803FFFF) PC format including:
 * - Frame hierarchy + 0x0253F2FE Frame Name extensions
 * - Geometry positions, normals, UVs, vertex colors, BinMeshPLG (lists & strips)
 * - Materials (RGBA color, diffuse texture name, reflection/spec hints)
 * - Atomics linking frames to geometries
 * - TXD textures: DXT1, DXT3, DXT5, BGRA32, BGRX32, BGR24, PAL8, RGB565, ARGB1555, ARGB4444
 */

export const RW_SECTION = {
  STRUCT: 0x0001,
  STRING: 0x0002,
  EXTENSION: 0x0003,
  TEXTURE: 0x0006,
  MATERIAL: 0x0007,
  MATERIAL_LIST: 0x0008,
  FRAME_LIST: 0x000e,
  GEOMETRY: 0x000f,
  CLUMP: 0x0010,
  ATOMIC: 0x0014,
  TEXTURE_NATIVE: 0x0015,
  TEXTURE_DICTIONARY: 0x0016,
  GEOMETRY_LIST: 0x001a,
  BIN_MESH_PLG: 0x050e,
  SPECULAR_MATERIAL: 0x0253f2f6,
  REFLECTION_MATERIAL: 0x0253f2fc,
  FRAME_NAME: 0x0253f2fe,
} as const;

export interface RwFrame {
  index: number;
  name: string;
  /** 3x3 rotation matrix in RW row-major order [r0..r8] */
  rotationMatrix: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  position: [number, number, number];
  parentIndex: number;
}

export interface RwMaterial {
  color: [number, number, number, number]; // 0-255 RGBA
  ambient: number;
  specular: number;
  diffuse: number;
  textureName: string | null;
  maskName: string | null;
  reflectionIntensity: number;
  specularLevel: number;
}

export interface RwMeshSplit {
  materialIndex: number;
  indices: Uint32Array;
}

export interface RwGeometry {
  flags: number;
  vertices: Float32Array;
  normals: Float32Array | null;
  uvs: Float32Array | null;
  vertexColors: Uint8Array | null;
  materials: RwMaterial[];
  splits: RwMeshSplit[];
}

export interface RwAtomic {
  frameIndex: number;
  geometryIndex: number;
  flags: number;
}

export interface RwClump {
  frames: RwFrame[];
  geometries: RwGeometry[];
  atomics: RwAtomic[];
}

export interface RwTexture {
  name: string;
  maskName: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  /** Tightly packed RGBA8888 pixels (length = width * height * 4) */
  rgba: Uint8Array;
}

export interface RwTxd {
  textures: Map<string, RwTexture>;
}

interface SectionHeader {
  type: number;
  size: number;
  version: number;
  dataOffset: number;
  endOffset: number;
}

function readSectionHeader(view: DataView, offset: number): SectionHeader {
  if (offset + 12 > view.byteLength) {
    throw new Error(`Unexpected EOF reading RW header at offset ${offset}`);
  }
  const type = view.getUint32(offset, true);
  const size = view.getUint32(offset + 4, true);
  const version = view.getUint32(offset + 8, true);
  const dataOffset = offset + 12;
  const endOffset = Math.min(dataOffset + size, view.byteLength);
  return { type, size, version, dataOffset, endOffset };
}

function decodeRwVersion(version: number): number {
  if (version & 0xffff0000) {
    return ((((version >> 14) & 0x3ff00) + 0x30000) | ((version >> 16) & 0x3f));
  }
  return version << 8;
}

function readNullTerminatedAscii(bytes: Uint8Array, offset: number, maxLen: number): string {
  let end = offset;
  const limit = Math.min(offset + maxLen, bytes.length);
  while (end < limit && bytes[end] !== 0) {
    end++;
  }
  let out = '';
  for (let i = offset; i < end; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out.trim();
}

function parseFrameList(view: DataView, bytes: Uint8Array, start: number, end: number): RwFrame[] {
  let cursor = start;
  const structHdr = readSectionHeader(view, cursor);
  if (structHdr.type !== RW_SECTION.STRUCT) {
    throw new Error('Expected STRUCT inside FrameList');
  }

  let sOff = structHdr.dataOffset;
  const frameCount = view.getUint32(sOff, true);
  sOff += 4;

  const frames: RwFrame[] = [];
  for (let i = 0; i < frameCount; i++) {
    const r0 = view.getFloat32(sOff, true);
    const r1 = view.getFloat32(sOff + 4, true);
    const r2 = view.getFloat32(sOff + 8, true);
    const r3 = view.getFloat32(sOff + 12, true);
    const r4 = view.getFloat32(sOff + 16, true);
    const r5 = view.getFloat32(sOff + 20, true);
    const r6 = view.getFloat32(sOff + 24, true);
    const r7 = view.getFloat32(sOff + 28, true);
    const r8 = view.getFloat32(sOff + 32, true);
    const px = view.getFloat32(sOff + 36, true);
    const py = view.getFloat32(sOff + 40, true);
    const pz = view.getFloat32(sOff + 44, true);
    const parentIndex = view.getInt32(sOff + 48, true);
    // +52 is uint32 flags
    sOff += 56;

    frames.push({
      index: i,
      name: `frame_${i}`,
      rotationMatrix: [r0, r1, r2, r3, r4, r5, r6, r7, r8],
      position: [px, py, pz],
      parentIndex,
    });
  }

  cursor = structHdr.endOffset;
  let extIndex = 0;
  while (cursor + 12 <= end && extIndex < frameCount) {
    const extHdr = readSectionHeader(view, cursor);
    if (extHdr.type === RW_SECTION.EXTENSION) {
      let inner = extHdr.dataOffset;
      while (inner + 12 <= extHdr.endOffset) {
        const sub = readSectionHeader(view, inner);
        if (sub.type === RW_SECTION.FRAME_NAME) {
          const name = readNullTerminatedAscii(bytes, sub.dataOffset, sub.size);
          if (name.length > 0) {
            frames[extIndex].name = name;
          }
        }
        inner = sub.endOffset;
      }
      extIndex++;
    }
    cursor = extHdr.endOffset;
  }

  return frames;
}

function parseTextureChunk(
  view: DataView,
  bytes: Uint8Array,
  start: number,
  end: number
): { textureName: string | null; maskName: string | null } {
  let cursor = start;
  const strings: string[] = [];
  while (cursor + 12 <= end) {
    const hdr = readSectionHeader(view, cursor);
    if (hdr.type === RW_SECTION.STRING) {
      strings.push(readNullTerminatedAscii(bytes, hdr.dataOffset, hdr.size));
    }
    cursor = hdr.endOffset;
  }
  return {
    textureName: strings[0] ? strings[0].toLowerCase() : null,
    maskName: strings[1] ? strings[1].toLowerCase() : null,
  };
}

function parseMaterial(view: DataView, bytes: Uint8Array, start: number, end: number): RwMaterial {
  let cursor = start;
  const structHdr = readSectionHeader(view, cursor);
  const sOff = structHdr.dataOffset;
  const r = view.getUint8(sOff + 4);
  const g = view.getUint8(sOff + 5);
  const b = view.getUint8(sOff + 6);
  const a = view.getUint8(sOff + 7);
  const isTextured = view.getUint32(sOff + 12, true);
  const ambient = structHdr.size >= 28 ? view.getFloat32(sOff + 16, true) : 1;
  const specular = structHdr.size >= 28 ? view.getFloat32(sOff + 20, true) : 0;
  const diffuse = structHdr.size >= 28 ? view.getFloat32(sOff + 24, true) : 1;

  let textureName: string | null = null;
  let maskName: string | null = null;
  let reflectionIntensity = 0;
  let specularLevel = 0;

  cursor = structHdr.endOffset;
  while (cursor + 12 <= end) {
    const hdr = readSectionHeader(view, cursor);
    if (hdr.type === RW_SECTION.TEXTURE && isTextured) {
      const tex = parseTextureChunk(view, bytes, hdr.dataOffset, hdr.endOffset);
      textureName = tex.textureName;
      maskName = tex.maskName;
    } else if (hdr.type === RW_SECTION.EXTENSION) {
      let inner = hdr.dataOffset;
      while (inner + 12 <= hdr.endOffset) {
        const sub = readSectionHeader(view, inner);
        if (sub.type === RW_SECTION.REFLECTION_MATERIAL && sub.size >= 20) {
          reflectionIntensity = view.getFloat32(sub.dataOffset + 16, true);
        } else if (sub.type === RW_SECTION.SPECULAR_MATERIAL && sub.size >= 4) {
          specularLevel = view.getFloat32(sub.dataOffset, true);
        }
        inner = sub.endOffset;
      }
    }
    cursor = hdr.endOffset;
  }

  return {
    color: [r, g, b, a],
    ambient,
    specular,
    diffuse,
    textureName,
    maskName,
    reflectionIntensity,
    specularLevel,
  };
}

function parseMaterialList(view: DataView, bytes: Uint8Array, start: number, end: number): RwMaterial[] {
  let cursor = start;
  const structHdr = readSectionHeader(view, cursor);
  const matCount = view.getUint32(structHdr.dataOffset, true);
  const refIndices: number[] = [];
  for (let i = 0; i < matCount; i++) {
    refIndices.push(view.getInt32(structHdr.dataOffset + 4 + i * 4, true));
  }

  const parsedMaterials: RwMaterial[] = [];
  cursor = structHdr.endOffset;
  while (cursor + 12 <= end) {
    const hdr = readSectionHeader(view, cursor);
    if (hdr.type === RW_SECTION.MATERIAL) {
      parsedMaterials.push(parseMaterial(view, bytes, hdr.dataOffset, hdr.endOffset));
    }
    cursor = hdr.endOffset;
  }

  const resolved: RwMaterial[] = [];
  let parsedCursor = 0;
  for (let i = 0; i < matCount; i++) {
    const ref = refIndices[i];
    if (ref === -1) {
      resolved.push(
        parsedMaterials[parsedCursor++] ?? {
          color: [255, 255, 255, 255],
          ambient: 1,
          specular: 0,
          diffuse: 1,
          textureName: null,
          maskName: null,
          reflectionIntensity: 0,
          specularLevel: 0,
        }
      );
    } else {
      resolved.push(resolved[ref] ?? parsedMaterials[0]);
    }
  }
  return resolved;
}

function parseBinMeshPlg(view: DataView, start: number, end: number): RwMeshSplit[] {
  if (start + 12 > end) return [];
  const flags = view.getUint32(start, true);
  const numSplits = view.getUint32(start + 4, true);
  // +8 totalIndices
  const isStrip = (flags & 1) !== 0;

  let off = start + 12;
  const splits: RwMeshSplit[] = [];

  for (let s = 0; s < numSplits; s++) {
    if (off + 8 > end) break;
    const indexCount = view.getUint32(off, true);
    const materialIndex = view.getUint32(off + 4, true);
    off += 8;

    if (off + indexCount * 4 > end) break;

    if (!isStrip) {
      const indices = new Uint32Array(indexCount);
      for (let i = 0; i < indexCount; i++) {
        indices[i] = view.getUint32(off + i * 4, true);
      }
      splits.push({ materialIndex, indices });
    } else {
      // Convert triangle strip to triangle list, skipping degenerate triangles
      const triList: number[] = [];
      for (let i = 0; i + 2 < indexCount; i++) {
        const a = view.getUint32(off + i * 4, true);
        const b = view.getUint32(off + (i + 1) * 4, true);
        const c = view.getUint32(off + (i + 2) * 4, true);
        if (a === b || b === c || a === c) continue;
        if (i % 2 === 0) {
          triList.push(a, b, c);
        } else {
          triList.push(a, c, b);
        }
      }
      splits.push({ materialIndex, indices: new Uint32Array(triList) });
    }
    off += indexCount * 4;
  }

  return splits;
}

function parseGeometry(view: DataView, bytes: Uint8Array, start: number, end: number): RwGeometry {
  let cursor = start;
  const structHdr = readSectionHeader(view, cursor);
  const rwVer = decodeRwVersion(structHdr.version);

  let off = structHdr.dataOffset;
  const format = view.getUint32(off, true);
  off += 4;
  const numTriangles = view.getUint32(off, true);
  off += 4;
  const numVertices = view.getUint32(off, true);
  off += 4;
  // numMorphTargets
  off += 4;

  if (rwVer < 0x34000) {
    off += 12; // ambient, specular, diffuse floats
  }

  const flags = format & 0xffff;
  let numTexSets = (format >> 16) & 0xff;
  if (numTexSets === 0) {
    if (flags & 0x80) numTexSets = 2;
    else if (flags & 0x04) numTexSets = 1;
  }

  let vertexColors: Uint8Array | null = null;
  let uvs: Float32Array | null = null;
  const fallbackTrisByMat = new Map<number, number[]>();

  const isNative = (format & 0x01000000) !== 0;
  if (!isNative) {
    if (flags & 0x08) {
      // PRELIT vertex colors
      vertexColors = new Uint8Array(numVertices * 4);
      vertexColors.set(bytes.subarray(off, off + numVertices * 4));
      off += numVertices * 4;
    }

    for (let t = 0; t < numTexSets; t++) {
      if (t === 0) {
        uvs = new Float32Array(numVertices * 2);
        for (let i = 0; i < numVertices; i++) {
          uvs[i * 2] = view.getFloat32(off, true);
          uvs[i * 2 + 1] = view.getFloat32(off + 4, true);
          off += 8;
        }
      } else {
        off += numVertices * 8;
      }
    }

    // Triangles: uint16 v2, uint16 v1, uint16 matId, uint16 v3
    for (let i = 0; i < numTriangles; i++) {
      const v2 = view.getUint16(off, true);
      const v1 = view.getUint16(off + 2, true);
      const matId = view.getUint16(off + 4, true);
      const v3 = view.getUint16(off + 6, true);
      off += 8;
      let list = fallbackTrisByMat.get(matId);
      if (!list) {
        list = [];
        fallbackTrisByMat.set(matId, list);
      }
      list.push(v1, v2, v3);
    }
  }

  // Morph target 0
  // Bounding sphere (16 bytes)
  off += 16;
  const hasVertices = view.getUint32(off, true);
  off += 4;
  const hasNormals = view.getUint32(off, true);
  off += 4;

  const vertices = new Float32Array(numVertices * 3);
  if (hasVertices) {
    for (let i = 0; i < numVertices * 3; i++) {
      vertices[i] = view.getFloat32(off, true);
      off += 4;
    }
  }

  let normals: Float32Array | null = null;
  if (hasNormals) {
    normals = new Float32Array(numVertices * 3);
    for (let i = 0; i < numVertices * 3; i++) {
      normals[i] = view.getFloat32(off, true);
      off += 4;
    }
  }

  let materials: RwMaterial[] = [];
  let splits: RwMeshSplit[] = [];

  cursor = structHdr.endOffset;
  while (cursor + 12 <= end) {
    const hdr = readSectionHeader(view, cursor);
    if (hdr.type === RW_SECTION.MATERIAL_LIST) {
      materials = parseMaterialList(view, bytes, hdr.dataOffset, hdr.endOffset);
    } else if (hdr.type === RW_SECTION.EXTENSION) {
      let inner = hdr.dataOffset;
      while (inner + 12 <= hdr.endOffset) {
        const sub = readSectionHeader(view, inner);
        if (sub.type === RW_SECTION.BIN_MESH_PLG) {
          splits = parseBinMeshPlg(view, sub.dataOffset, sub.endOffset);
        }
        inner = sub.endOffset;
      }
    }
    cursor = hdr.endOffset;
  }

  if (splits.length === 0 && fallbackTrisByMat.size > 0) {
    for (const [materialIndex, idxArr] of fallbackTrisByMat.entries()) {
      splits.push({ materialIndex, indices: new Uint32Array(idxArr) });
    }
  }

  return {
    flags,
    vertices,
    normals,
    uvs,
    vertexColors,
    materials,
    splits,
  };
}

/**
 * Parses a RenderWare `.dff` binary buffer into a structured `RwClump`.
 */
export function parseDff(buffer: ArrayBuffer): RwClump {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  const rootHdr = readSectionHeader(view, 0);
  if (rootHdr.type !== RW_SECTION.CLUMP) {
    throw new Error(`Expected CLUMP (0x10) root section, got 0x${rootHdr.type.toString(16)}`);
  }

  let frames: RwFrame[] = [];
  const geometries: RwGeometry[] = [];
  const atomics: RwAtomic[] = [];

  let cursor = rootHdr.dataOffset;
  while (cursor + 12 <= rootHdr.endOffset) {
    const hdr = readSectionHeader(view, cursor);
    if (hdr.type === RW_SECTION.FRAME_LIST) {
      frames = parseFrameList(view, bytes, hdr.dataOffset, hdr.endOffset);
    } else if (hdr.type === RW_SECTION.GEOMETRY_LIST) {
      let gCur = hdr.dataOffset;
      while (gCur + 12 <= hdr.endOffset) {
        const gHdr = readSectionHeader(view, gCur);
        if (gHdr.type === RW_SECTION.GEOMETRY) {
          geometries.push(parseGeometry(view, bytes, gHdr.dataOffset, gHdr.endOffset));
        }
        gCur = gHdr.endOffset;
      }
    } else if (hdr.type === RW_SECTION.ATOMIC) {
      const aStruct = readSectionHeader(view, hdr.dataOffset);
      if (aStruct.type === RW_SECTION.STRUCT && aStruct.size >= 12) {
        atomics.push({
          frameIndex: view.getUint32(aStruct.dataOffset, true),
          geometryIndex: view.getUint32(aStruct.dataOffset + 4, true),
          flags: view.getUint32(aStruct.dataOffset + 8, true),
        });
      }
    }
    cursor = hdr.endOffset;
  }

  return { frames, geometries, atomics };
}

// ============================================================================
// TXD Texture Dictionary Parser + Software DXT1 / DXT3 / DXT5 Decoder
// ============================================================================

function rgb565ToRgba(c: number): [number, number, number] {
  const r = ((c >> 11) & 0x1f) * 255 / 31;
  const g = ((c >> 5) & 0x3f) * 255 / 63;
  const b = (c & 0x1f) * 255 / 31;
  return [Math.round(r), Math.round(g), Math.round(b)];
}

function decodeDxt1(
  src: Uint8Array,
  srcOffset: number,
  width: number,
  height: number,
  allowPunchThroughAlpha: boolean
): Uint8Array {
  const dst = new Uint8Array(width * height * 4);
  const blocksX = Math.max(1, (width + 3) >> 2);
  const blocksY = Math.max(1, (height + 3) >> 2);
  let off = srcOffset;

  const colors = new Uint8Array(16);

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      if (off + 8 > src.length) return dst;
      const c0 = src[off] | (src[off + 1] << 8);
      const c1 = src[off + 2] | (src[off + 3] << 8);
      const bits =
        src[off + 4] |
        (src[off + 5] << 8) |
        (src[off + 6] << 16) |
        (src[off + 7] << 24);
      off += 8;

      const [r0, g0, b0] = rgb565ToRgba(c0);
      const [r1, g1, b1] = rgb565ToRgba(c1);

      colors[0] = r0;
      colors[1] = g0;
      colors[2] = b0;
      colors[3] = 255;

      colors[4] = r1;
      colors[5] = g1;
      colors[6] = b1;
      colors[7] = 255;

      if (c0 > c1 || !allowPunchThroughAlpha) {
        colors[8] = Math.round((2 * r0 + r1) / 3);
        colors[9] = Math.round((2 * g0 + g1) / 3);
        colors[10] = Math.round((2 * b0 + b1) / 3);
        colors[11] = 255;

        colors[12] = Math.round((r0 + 2 * r1) / 3);
        colors[13] = Math.round((g0 + 2 * g1) / 3);
        colors[14] = Math.round((b0 + 2 * b1) / 3);
        colors[15] = 255;
      } else {
        colors[8] = (r0 + r1) >> 1;
        colors[9] = (g0 + g1) >> 1;
        colors[10] = (b0 + b1) >> 1;
        colors[11] = 255;

        colors[12] = 0;
        colors[13] = 0;
        colors[14] = 0;
        colors[15] = 0;
      }

      for (let py = 0; py < 4; py++) {
        const y = by * 4 + py;
        if (y >= height) continue;
        for (let px = 0; px < 4; px++) {
          const x = bx * 4 + px;
          if (x >= width) continue;
          const code = (bits >>> (2 * (py * 4 + px))) & 0x3;
          const di = (y * width + x) * 4;
          const ci = code * 4;
          dst[di] = colors[ci];
          dst[di + 1] = colors[ci + 1];
          dst[di + 2] = colors[ci + 2];
          dst[di + 3] = colors[ci + 3];
        }
      }
    }
  }
  return dst;
}

function decodeDxt3(src: Uint8Array, srcOffset: number, width: number, height: number): Uint8Array {
  const dst = new Uint8Array(width * height * 4);
  const blocksX = Math.max(1, (width + 3) >> 2);
  const blocksY = Math.max(1, (height + 3) >> 2);
  let off = srcOffset;
  const colors = new Uint8Array(12);

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      if (off + 16 > src.length) return dst;
      const alphaOff = off;
      const colOff = off + 8;
      off += 16;

      const c0 = src[colOff] | (src[colOff + 1] << 8);
      const c1 = src[colOff + 2] | (src[colOff + 3] << 8);
      const bits =
        src[colOff + 4] |
        (src[colOff + 5] << 8) |
        (src[colOff + 6] << 16) |
        (src[colOff + 7] << 24);

      const [r0, g0, b0] = rgb565ToRgba(c0);
      const [r1, g1, b1] = rgb565ToRgba(c1);

      colors[0] = r0;
      colors[1] = g0;
      colors[2] = b0;
      colors[3] = r1;
      colors[4] = g1;
      colors[5] = b1;
      colors[6] = Math.round((2 * r0 + r1) / 3);
      colors[7] = Math.round((2 * g0 + g1) / 3);
      colors[8] = Math.round((2 * b0 + b1) / 3);
      colors[9] = Math.round((r0 + 2 * r1) / 3);
      colors[10] = Math.round((g0 + 2 * g1) / 3);
      colors[11] = Math.round((b0 + 2 * b1) / 3);

      for (let py = 0; py < 4; py++) {
        const y = by * 4 + py;
        if (y >= height) continue;
        const rowAlpha = src[alphaOff + py * 2] | (src[alphaOff + py * 2 + 1] << 8);
        for (let px = 0; px < 4; px++) {
          const x = bx * 4 + px;
          if (x >= width) continue;
          const code = (bits >>> (2 * (py * 4 + px))) & 0x3;
          const a4 = (rowAlpha >>> (px * 4)) & 0xf;
          const di = (y * width + x) * 4;
          dst[di] = colors[code * 3];
          dst[di + 1] = colors[code * 3 + 1];
          dst[di + 2] = colors[code * 3 + 2];
          dst[di + 3] = (a4 << 4) | a4;
        }
      }
    }
  }
  return dst;
}

function decodeDxt5(src: Uint8Array, srcOffset: number, width: number, height: number): Uint8Array {
  const dst = new Uint8Array(width * height * 4);
  const blocksX = Math.max(1, (width + 3) >> 2);
  const blocksY = Math.max(1, (height + 3) >> 2);
  let off = srcOffset;
  const alphas = new Uint8Array(8);
  const colors = new Uint8Array(12);

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      if (off + 16 > src.length) return dst;
      const a0 = src[off];
      const a1 = src[off + 1];
      alphas[0] = a0;
      alphas[1] = a1;
      if (a0 > a1) {
        alphas[2] = Math.round((6 * a0 + 1 * a1) / 7);
        alphas[3] = Math.round((5 * a0 + 2 * a1) / 7);
        alphas[4] = Math.round((4 * a0 + 3 * a1) / 7);
        alphas[5] = Math.round((3 * a0 + 4 * a1) / 7);
        alphas[6] = Math.round((2 * a0 + 5 * a1) / 7);
        alphas[7] = Math.round((1 * a0 + 6 * a1) / 7);
      } else {
        alphas[2] = Math.round((4 * a0 + 1 * a1) / 5);
        alphas[3] = Math.round((3 * a0 + 2 * a1) / 5);
        alphas[4] = Math.round((2 * a0 + 3 * a1) / 5);
        alphas[5] = Math.round((1 * a0 + 4 * a1) / 5);
        alphas[6] = 0;
        alphas[7] = 255;
      }

      // 48 bits of 3-bit alpha indices stored little-endian in bytes [off+2..off+7]
      const ab0 = src[off + 2] | (src[off + 3] << 8) | (src[off + 4] << 16);
      const ab1 = src[off + 5] | (src[off + 6] << 8) | (src[off + 7] << 16);

      const colOff = off + 8;
      off += 16;

      const c0 = src[colOff] | (src[colOff + 1] << 8);
      const c1 = src[colOff + 2] | (src[colOff + 3] << 8);
      const bits =
        src[colOff + 4] |
        (src[colOff + 5] << 8) |
        (src[colOff + 6] << 16) |
        (src[colOff + 7] << 24);

      const [r0, g0, b0] = rgb565ToRgba(c0);
      const [r1, g1, b1] = rgb565ToRgba(c1);

      colors[0] = r0;
      colors[1] = g0;
      colors[2] = b0;
      colors[3] = r1;
      colors[4] = g1;
      colors[5] = b1;
      colors[6] = Math.round((2 * r0 + r1) / 3);
      colors[7] = Math.round((2 * g0 + g1) / 3);
      colors[8] = Math.round((2 * b0 + b1) / 3);
      colors[9] = Math.round((r0 + 2 * r1) / 3);
      colors[10] = Math.round((g0 + 2 * g1) / 3);
      colors[11] = Math.round((b0 + 2 * b1) / 3);

      for (let py = 0; py < 4; py++) {
        const y = by * 4 + py;
        if (y >= height) continue;
        for (let px = 0; px < 4; px++) {
          const x = bx * 4 + px;
          if (x >= width) continue;
          const pIdx = py * 4 + px;
          const code = (bits >>> (2 * pIdx)) & 0x3;
          const aCode =
            pIdx < 8 ? (ab0 >>> (pIdx * 3)) & 0x7 : (ab1 >>> ((pIdx - 8) * 3)) & 0x7;
          const di = (y * width + x) * 4;
          dst[di] = colors[code * 3];
          dst[di + 1] = colors[code * 3 + 1];
          dst[di + 2] = colors[code * 3 + 2];
          dst[di + 3] = alphas[aCode];
        }
      }
    }
  }
  return dst;
}

const FOURCC_DXT1 = 0x31545844;
const FOURCC_DXT3 = 0x33545844;
const FOURCC_DXT5 = 0x35545844;

function parseTextureNative(
  view: DataView,
  bytes: Uint8Array,
  start: number,
  end: number
): RwTexture | null {
  const structHdr = readSectionHeader(view, start);
  if (structHdr.type !== RW_SECTION.STRUCT) return null;

  let off = structHdr.dataOffset;
  if (off + 88 > end) return null;

  const platformId = view.getUint32(off, true);
  off += 4;
  // filterFlags (4 bytes)
  off += 4;
  const name = readNullTerminatedAscii(bytes, off, 32).toLowerCase();
  off += 32;
  const maskName = readNullTerminatedAscii(bytes, off, 32).toLowerCase();
  off += 32;

  const rasterFormat = view.getUint32(off, true);
  off += 4;
  const d3dOrHasAlpha = view.getUint32(off, true);
  off += 4;
  const width = view.getUint16(off, true);
  off += 2;
  const height = view.getUint16(off, true);
  off += 2;
  const depth = view.getUint8(off++);
  // numLevels
  off++;
  // rasterType
  off++;
  const compressionOrFlags = view.getUint8(off++);

  if (width === 0 || height === 0) return null;

  const isD3D9 = platformId === 9;
  const hasAlpha = isD3D9
    ? (compressionOrFlags & 1) !== 0 || maskName.length > 0
    : d3dOrHasAlpha !== 0 || maskName.length > 0;

  let palette: Uint8Array | null = null;
  if (rasterFormat & 0x2000) {
    // PAL8: 256 RGBA entries (1024 bytes)
    palette = bytes.subarray(off, off + 1024);
    off += 1024;
  } else if (rasterFormat & 0x4000) {
    // PAL4: 16 RGBA entries (64 bytes, or 128 in some files)
    palette = bytes.subarray(off, off + 64);
    off += 64;
  }

  if (off + 4 > end) return null;
  const dataSize = view.getUint32(off, true);
  off += 4;
  if (off + dataSize > bytes.length) return null;

  let rgba: Uint8Array;
  const pixelCount = width * height;

  const isDxt1 =
    (isD3D9 && d3dOrHasAlpha === FOURCC_DXT1) || (!isD3D9 && compressionOrFlags === 1);
  const isDxt3 =
    (isD3D9 && d3dOrHasAlpha === FOURCC_DXT3) || (!isD3D9 && compressionOrFlags === 3);
  const isDxt5 =
    (isD3D9 && d3dOrHasAlpha === FOURCC_DXT5) || (!isD3D9 && compressionOrFlags === 5);

  if (isDxt1) {
    rgba = decodeDxt1(bytes, off, width, height, hasAlpha);
  } else if (isDxt3) {
    rgba = decodeDxt3(bytes, off, width, height);
  } else if (isDxt5) {
    rgba = decodeDxt5(bytes, off, width, height);
  } else if (palette && depth === 8) {
    rgba = new Uint8Array(pixelCount * 4);
    for (let i = 0; i < pixelCount; i++) {
      const idx = bytes[off + i] * 4;
      rgba[i * 4] = palette[idx];
      rgba[i * 4 + 1] = palette[idx + 1];
      rgba[i * 4 + 2] = palette[idx + 2];
      rgba[i * 4 + 3] = hasAlpha ? palette[idx + 3] : 255;
    }
  } else if (depth === 32) {
    rgba = new Uint8Array(pixelCount * 4);
    const fmt = rasterFormat & 0x0f00;
    const opaque = fmt === 0x0600 && !hasAlpha; // FORMAT_888
    for (let i = 0; i < pixelCount; i++) {
      // D3D stores BGRA
      rgba[i * 4] = bytes[off + i * 4 + 2];
      rgba[i * 4 + 1] = bytes[off + i * 4 + 1];
      rgba[i * 4 + 2] = bytes[off + i * 4];
      rgba[i * 4 + 3] = opaque ? 255 : bytes[off + i * 4 + 3];
    }
  } else if (depth === 24) {
    rgba = new Uint8Array(pixelCount * 4);
    for (let i = 0; i < pixelCount; i++) {
      rgba[i * 4] = bytes[off + i * 3 + 2];
      rgba[i * 4 + 1] = bytes[off + i * 3 + 1];
      rgba[i * 4 + 2] = bytes[off + i * 3];
      rgba[i * 4 + 3] = 255;
    }
  } else if (depth === 16) {
    rgba = new Uint8Array(pixelCount * 4);
    const fmt = rasterFormat & 0x0f00;
    for (let i = 0; i < pixelCount; i++) {
      const val = bytes[off + i * 2] | (bytes[off + i * 2 + 1] << 8);
      if (fmt === 0x0300) {
        // ARGB4444
        const b = (val & 0xf) * 17;
        const g = ((val >> 4) & 0xf) * 17;
        const r = ((val >> 8) & 0xf) * 17;
        const a = ((val >> 12) & 0xf) * 17;
        rgba[i * 4] = r;
        rgba[i * 4 + 1] = g;
        rgba[i * 4 + 2] = b;
        rgba[i * 4 + 3] = a;
      } else if (fmt === 0x0100) {
        // ARGB1555
        const b = Math.round(((val & 0x1f) * 255) / 31);
        const g = Math.round((((val >> 5) & 0x1f) * 255) / 31);
        const r = Math.round((((val >> 10) & 0x1f) * 255) / 31);
        const a = val & 0x8000 ? 255 : 0;
        rgba[i * 4] = r;
        rgba[i * 4 + 1] = g;
        rgba[i * 4 + 2] = b;
        rgba[i * 4 + 3] = a;
      } else {
        // RGB565
        const [r, g, b] = rgb565ToRgba(val);
        rgba[i * 4] = r;
        rgba[i * 4 + 1] = g;
        rgba[i * 4 + 2] = b;
        rgba[i * 4 + 3] = 255;
      }
    }
  } else {
    // Fallback solid gray
    rgba = new Uint8Array(pixelCount * 4).fill(200);
  }

  return {
    name,
    maskName,
    width,
    height,
    hasAlpha,
    rgba,
  };
}

/**
 * Parses a RenderWare `.txd` binary buffer into a `Map<lowercaseName, RwTexture>`.
 */
export function parseTxd(buffer: ArrayBuffer): RwTxd {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const textures = new Map<string, RwTexture>();

  const rootHdr = readSectionHeader(view, 0);
  if (rootHdr.type !== RW_SECTION.TEXTURE_DICTIONARY) {
    throw new Error(
      `Expected TEXTURE_DICTIONARY (0x16) root section, got 0x${rootHdr.type.toString(16)}`
    );
  }

  let cursor = rootHdr.dataOffset;
  while (cursor + 12 <= rootHdr.endOffset) {
    const hdr = readSectionHeader(view, cursor);
    if (hdr.type === RW_SECTION.TEXTURE_NATIVE) {
      const tex = parseTextureNative(view, bytes, hdr.dataOffset, hdr.endOffset);
      if (tex && tex.name) {
        textures.set(tex.name, tex);
      }
    }
    cursor = hdr.endOffset;
  }

  return { textures };
}
