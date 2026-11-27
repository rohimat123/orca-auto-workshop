import * as THREE from 'three';

/**
 * Generates crisp procedural fallback textures for GTA: San Andreas shared
 * generic vehicle textures (`models/generic/vehicle.txd`) that are not bundled
 * inside `gta3.img` (such as headlights, tire treads, license plates, dashboard,
 * chassis grunge, and wheel hub textures).
 */

function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  options?: { repeat?: boolean; srgb?: boolean }
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    draw(ctx, width, height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false; // Match RenderWare D3D top-left UV origin
  tex.wrapS = options?.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.wrapT = options?.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.colorSpace = options?.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * GTA:SA `vehiclelights128` atlas layout:
 * Top-left quadrant: clear/white front headlights
 * Top-right quadrant: amber turn signals
 * Bottom-left quadrant: red tail/brake lights
 * Bottom-right quadrant: clear/white reverse & fog lights
 */
function createVehicleLightsTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1d2129';
    ctx.fillRect(0, 0, w, h);

    const drawLens = (
      x: number,
      y: number,
      lw: number,
      lh: number,
      base: string,
      highlight: string,
      ribColor: string
    ) => {
      const grad = ctx.createRadialGradient(
        x + lw * 0.5,
        y + lh * 0.5,
        lw * 0.08,
        x + lw * 0.5,
        y + lh * 0.5,
        lw * 0.65
      );
      grad.addColorStop(0, highlight);
      grad.addColorStop(0.65, base);
      grad.addColorStop(1, '#1a1d24');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, lw, lh);

      // Reflector ribs
      ctx.strokeStyle = ribColor;
      ctx.lineWidth = 1.5;
      for (let rx = x + 6; rx < x + lw; rx += 8) {
        ctx.beginPath();
        ctx.moveTo(rx, y + 2);
        ctx.lineTo(rx, y + lh - 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.strokeRect(x + 2, y + 2, lw - 4, lh - 4);
    };

    // Front headlights (top-left)
    drawLens(2, 2, 124, 124, '#cbd5e1', '#f8fafc', 'rgba(148,163,184,0.35)');
    // Amber indicators (top-right)
    drawLens(130, 2, 124, 124, '#d97706', '#fde68a', 'rgba(120,53,15,0.32)');
    // Red tail lights (bottom-left)
    drawLens(2, 130, 124, 124, '#b91c1c', '#fca5a5', 'rgba(69,10,10,0.38)');
    // Reverse / auxiliary (bottom-right)
    drawLens(130, 130, 124, 124, '#94a3b8', '#e2e8f0', 'rgba(51,65,85,0.35)');
  });
}

function createVehicleTyresTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      // Dark vulcanized rubber base
      ctx.fillStyle = '#24272d';
      ctx.fillRect(0, 0, w, h);

      // Circumferential grooves
      ctx.fillStyle = '#14161a';
      ctx.fillRect(w * 0.22, 0, 10, h);
      ctx.fillRect(w * 0.48, 0, 10, h);
      ctx.fillRect(w * 0.74, 0, 10, h);

      // Angled tread sipes
      ctx.strokeStyle = '#111317';
      ctx.lineWidth = 6;
      for (let y = -32; y < h + 32; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w * 0.48, y + 14);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(w, y);
        ctx.lineTo(w * 0.52, y + 14);
        ctx.stroke();
      }

      // Subtle rubber highlight noise
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      for (let y = 0; y < h; y += 6) {
        ctx.fillRect(0, y, w, 2);
      }
    },
    { repeat: true }
  );
}

function createVehicleGenericTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      // Neutral metallic undercarriage / trim atlas used across interiors & engine bay
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#5a606c');
      grad.addColorStop(0.5, '#3f444e');
      grad.addColorStop(1, '#2c3038');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle panel seams & grille mesh hints
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2;
      for (let i = 0; i < w; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
      }
      for (let j = 0; j < h; j += 32) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(w, j);
        ctx.stroke();
      }
    },
    { repeat: true }
  );
}

function createVehicleGrungeTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      // Clean showroom clearcoat map (near-white so car paint stays vivid and crisp!)
      ctx.fillStyle = '#f5f6f8';
      ctx.fillRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(255,255,255,0.04)');
      grad.addColorStop(1, 'rgba(200,206,216,0.08)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    { repeat: true }
  );
}

function createLicensePlateTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, w - 10, h - 10);

    // Top banner
    ctx.fillStyle = '#d93025';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAN ANDREAS', w / 2, 34);

    // Plate code
    ctx.fillStyle = '#111317';
    ctx.font = 'bold 46px monospace';
    ctx.fillText('ORCA-WS', w / 2, 92);
  });
}

function createDashboardTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#161920';
    ctx.fillRect(0, 0, w, h);
    const drawDial = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#0f1116';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#64748b';
      ctx.stroke();

      // Needle
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * 0.65, cy - r * 0.45);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    };
    drawDial(72, 64, 42);
    drawDial(184, 64, 42);
  });
}

function createAlloyRimTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, 256, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.55);
    grad.addColorStop(0, '#eef2f6');
    grad.addColorStop(0.55, '#cbd5e1');
    grad.addColorStop(1, '#64748b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle machined concentric rings
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    for (let r = 18; r < 120; r += 16) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

export interface SharedVehicleTextureBank {
  get: (textureName: string) => THREE.Texture | null;
  ready: Promise<void>;
  dispose: () => void;
}

const GENERIC_ASSET_BASE = '/assets/gta3/generic';

interface GenericImageSpec {
  url: string;
  aliases: string[];
  fallback: () => THREE.CanvasTexture;
}

export function createSharedVehicleTextureBank(
  onTextureLoaded?: () => void
): SharedVehicleTextureBank {
  const cache = new Map<string, THREE.Texture>();
  const created: THREE.Texture[] = [];
  const loadPromises: Promise<void>[] = [];

  const register = (tex: THREE.Texture, aliases: string[]) => {
    created.push(tex);
    for (const alias of aliases) {
      cache.set(alias.toLowerCase(), tex);
    }
  };

  const loader = new THREE.TextureLoader();

  const registerAuthenticPng = (spec: GenericImageSpec) => {
    let settled = false;
    const p = new Promise<void>((resolve) => {
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      const tex = loader.load(
        spec.url,
        (loadedTex) => {
          loadedTex.flipY = false; // Exact RenderWare D3D top-left UV origin
          loadedTex.wrapS = THREE.RepeatWrapping;
          loadedTex.wrapT = THREE.RepeatWrapping;
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          loadedTex.magFilter = THREE.LinearFilter;
          loadedTex.minFilter = THREE.LinearMipmapLinearFilter;
          loadedTex.generateMipmaps = true;
          loadedTex.anisotropy = 4;
          loadedTex.needsUpdate = true;
          onTextureLoaded?.();
          done();
        },
        undefined,
        () => {
          // Graceful fallback to procedural texture if PNG fails to load
          const fb = spec.fallback();
          created.push(fb);
          for (const alias of spec.aliases) {
            cache.set(alias.toLowerCase(), fb);
          }
          onTextureLoaded?.();
          done();
        }
      );

      tex.flipY = false;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = 4;
      register(tex, spec.aliases);
    });
    loadPromises.push(p);
  };

  // Authentic GTA:SA `models/generic/vehicle.txd` textures (wheels, tires, lights, dash, steering)
  registerAuthenticPng({
    url: `${GENERIC_ASSET_BASE}/vehiclegeneric256.png`,
    aliases: [
      'vehiclegeneric256',
      'vehiclepoldecals128',
      'interior128',
      'veh_interior',
    ],
    fallback: createVehicleGenericTexture,
  });

  registerAuthenticPng({
    url: `${GENERIC_ASSET_BASE}/vehicletyres128.png`,
    aliases: [
      'vehicletyres128',
      'vehicletire64',
      'tire',
      'tyre',
      'wheel_tyre',
      'j2_tyre',
    ],
    fallback: createVehicleTyresTexture,
  });

  registerAuthenticPng({
    url: `${GENERIC_ASSET_BASE}/vehiclelights128.png`,
    aliases: ['vehiclelights128', 'lights'],
    fallback: createVehicleLightsTexture,
  });

  registerAuthenticPng({
    url: `${GENERIC_ASSET_BASE}/vehiclelightson128.png`,
    aliases: ['vehiclelightson128'],
    fallback: createVehicleLightsTexture,
  });

  registerAuthenticPng({
    url: `${GENERIC_ASSET_BASE}/vehiclesteering128.png`,
    aliases: ['vehiclesteering128'],
    fallback: createVehicleGenericTexture,
  });

  registerAuthenticPng({
    url: `${GENERIC_ASSET_BASE}/vehicledash32.png`,
    aliases: ['vehicledash32', 'dashboard'],
    fallback: createDashboardTexture,
  });

  // Procedural clean showroom clearcoat & custom ORCA-WS license plate
  register(createVehicleGrungeTexture(), [
    'vehiclegrunge256',
    'vehiclescratch64',
    'vehicleshatter128',
    'xvehicleenv128',
    'vehiclespecdot64',
  ]);
  register(createLicensePlateTexture(), [
    'plateback1',
    'plateback2',
    'plateback3',
    'carpback',
    'carplate',
    'platecharset',
  ]);
  register(createAlloyRimTexture(), ['alloy_fallback']);

  const ready = Promise.all(loadPromises).then(() => undefined);

  return {
    get(textureName: string): THREE.Texture | null {
      const key = textureName.toLowerCase();
      const exact = cache.get(key);
      if (exact) return exact;
      if (key.includes('tyre') || key.includes('tire') || key.includes('rubber')) {
        return cache.get('vehicletyres128') ?? null;
      }
      if (key.includes('light')) {
        return cache.get('vehiclelights128') ?? null;
      }
      if (key.includes('plate')) {
        return cache.get('plateback1') ?? null;
      }
      if (key.includes('grunge') || key.includes('env') || key.includes('spec')) {
        return cache.get('vehiclegrunge256') ?? null;
      }
      if (key.includes('dash')) {
        return cache.get('vehicledash32') ?? null;
      }
      if (key.includes('wheel') || key.includes('rim')) {
        return cache.get('alloy_fallback') ?? null;
      }
      return null;
    },
    ready,
    dispose() {
      for (const tex of created) {
        tex.dispose();
      }
      cache.clear();
    },
  };
}
