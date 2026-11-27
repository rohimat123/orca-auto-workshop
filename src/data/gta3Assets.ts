import type { BodyPartSlot } from './workshopData';
import { getGtaVehicleColorHex } from './gtaVehicleColors';

export interface VehiclePaintjob {
  id: number;
  label: string;
  txdUrl: string;
}

export interface Vehicle3DAsset {
  vehicleId: string;
  dffUrl: string;
  txdUrl: string;
  /** Default primary & secondary showroom color IDs (official 0-255 GTA:SA palette) */
  defaultPrimaryColorId: number;
  defaultSecondaryColorId: number;
  /** Default primary & secondary showroom paint hex derived from the 0-255 palette */
  defaultPrimaryColor: string;
  defaultSecondaryColor: string;
  /** Whether the vehicle model / mods expose GTA:SA secondary color (Color 2) zones */
  supportsSecondaryColor: boolean;
  /** Official GTA:SA paintjobs available for this vehicle (empty if vehicle has none) */
  paintjobs: VehiclePaintjob[];
}

export interface ModPartAttachment {
  /** Path to `.dff` under `/assets/gta3/` */
  dffUrl: string;
  /** Target dummy frame name inside the base vehicle `.dff` */
  targetDummy: string;
  /** Optional fallback dummy frame name if primary dummy is absent */
  fallbackDummy?: string;
}

export interface ModPart3DAsset {
  attachments: ModPartAttachment[];
  /** Base vehicle frame names to hide while this mod is equipped */
  hideBaseFrames?: string[];
}

export interface Wheel3DAsset {
  wheelId: string;
  dffUrl: string;
}

const GTA3_BASE = '/assets/gta3';

function makeStandardPaintjobs(txdPrefix: string): VehiclePaintjob[] {
  return [1, 2, 3].map((id) => ({
    id,
    label: `Paintjob ${id}`,
    txdUrl: `${GTA3_BASE}/${txdPrefix}${id}.txd`,
  }));
}

function makeVehicleAsset(
  vehicleId: string,
  modelPrefix: string,
  defaultPrimaryColorId: number,
  defaultSecondaryColorId: number,
  supportsSecondaryColor: boolean,
  paintjobs: VehiclePaintjob[] = []
): Vehicle3DAsset {
  return {
    vehicleId,
    dffUrl: `${GTA3_BASE}/${modelPrefix}.dff`,
    txdUrl: `${GTA3_BASE}/${modelPrefix}.txd`,
    defaultPrimaryColorId,
    defaultSecondaryColorId,
    defaultPrimaryColor: getGtaVehicleColorHex(defaultPrimaryColorId),
    defaultSecondaryColor: getGtaVehicleColorHex(defaultSecondaryColorId),
    supportsSecondaryColor,
    paintjobs,
  };
}

export const VEHICLE_3D_ASSETS: Record<string, Vehicle3DAsset> = {
  // WAA (6)
  elegy: makeVehicleAsset('elegy', 'elegy', 152, 1, false, makeStandardPaintjobs('elegy')),
  flash: makeVehicleAsset('flash', 'flash', 3, 0, false, makeStandardPaintjobs('flash')),
  jester: makeVehicleAsset('jester', 'jester', 6, 0, false, makeStandardPaintjobs('jester')),
  stratum: makeVehicleAsset('stratum', 'stratum', 155, 8, false, makeStandardPaintjobs('stratum')),
  sultan: makeVehicleAsset('sultan', 'sultan', 7, 1, false, makeStandardPaintjobs('sultan')),
  uranus: makeVehicleAsset('uranus', 'uranus', 175, 1, false, makeStandardPaintjobs('uranus')),

  // Locolow (5)
  blade: makeVehicleAsset('blade', 'blade', 135, 1, true, makeStandardPaintjobs('blade')),
  remington: makeVehicleAsset('remington', 'remingtn', 3, 1, true, makeStandardPaintjobs('remingtn')),
  savanna: makeVehicleAsset('savanna', 'savanna', 136, 1, true, makeStandardPaintjobs('savanna')),
  slamvan: makeVehicleAsset('slamvan', 'slamvan', 2, 1, false, makeStandardPaintjobs('slamvan')),
  tornado: makeVehicleAsset('tornado', 'tornado', 128, 1, true, makeStandardPaintjobs('tornado')),

  // Non-WAA & Locolow (25 — authentic GTA:SA gta3.img models, Change Color, Velg & N2O)
  bandito: makeVehicleAsset('bandito', 'bandito', 6, 0, false),
  benson: makeVehicleAsset('benson', 'benson', 1, 152, true),
  'bf-injection': makeVehicleAsset('bf-injection', 'bfinject', 158, 1, true),
  boxville: makeVehicleAsset('boxville', 'boxville', 14, 24, true),
  burrito: makeVehicleAsset('burrito', 'burrito', 25, 3, false),
  camper: makeVehicleAsset('camper', 'camper', 155, 1, true),
  duneride: makeVehicleAsset('duneride', 'duneride', 6, 0, true),
  flatbed: makeVehicleAsset('flatbed', 'flatbed', 44, 24, false),
  hotring: makeVehicleAsset('hotring', 'hotring', 175, 1, true),
  journey: makeVehicleAsset('journey', 'journey', 1, 13, false),
  linerunner: makeVehicleAsset('linerunner', 'linerun', 79, 1, false),
  mower: makeVehicleAsset('mower', 'mower', 175, 0, false),
  mule: makeVehicleAsset('mule', 'mule', 14, 24, false),
  patriot: makeVehicleAsset('patriot', 'patriot', 44, 0, false),
  'petrol-tanker': makeVehicleAsset('petrol-tanker', 'petro', 3, 1, false),
  pony: makeVehicleAsset('pony', 'pony', 32, 1, false),
  roadtrain: makeVehicleAsset('roadtrain', 'rdtrain', 175, 1, true),
  rumpo: makeVehicleAsset('rumpo', 'rumpo', 28, 1, false),
  sadler: makeVehicleAsset('sadler', 'sadler', 12, 1, false),
  sandking: makeVehicleAsset('sandking', 'sandking', 6, 0, true),
  towtruck: makeVehicleAsset('towtruck', 'towtruck', 6, 1, true),
  tractor: makeVehicleAsset('tractor', 'tractor', 128, 0, false),
  voodoo: makeVehicleAsset('voodoo', 'voodoo', 136, 1, false),
  yankee: makeVehicleAsset('yankee', 'yankee', 24, 1, true),
  yosemite: makeVehicleAsset('yosemite', 'yosemite', 3, 1, true),
};

export function getVehiclePaintjobs(vehicleId: string): VehiclePaintjob[] {
  return VEHICLE_3D_ASSETS[vehicleId]?.paintjobs ?? [];
}

const WAA_SUFFIX: Record<string, { code: string; spoilerType: 'b' | 'r' }> = {
  elegy: { code: 'l', spoilerType: 'b' },
  flash: { code: 'f', spoilerType: 'r' },
  jester: { code: 'j', spoilerType: 'b' },
  stratum: { code: 'st', spoilerType: 'r' },
  sultan: { code: 's', spoilerType: 'b' },
  uranus: { code: 'u', spoilerType: 'b' },
};

const LOCOLOW_MOD_ASSETS: Record<string, ModPart3DAsset> = {
  // === Blade ===
  'blade-front-bumper-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/fbmp_lr_bl2.dff`, targetDummy: 'bump_front_dummy' }],
    hideBaseFrames: ['bump_front_ok'],
  },
  'blade-front-bumper-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/fbmp_lr_bl1.dff`, targetDummy: 'bump_front_dummy' }],
    hideBaseFrames: ['bump_front_ok'],
  },
  'blade-rear-bumper-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/rbmp_lr_bl2.dff`, targetDummy: 'bump_rear_dummy' }],
    hideBaseFrames: ['bump_rear_ok'],
  },
  'blade-rear-bumper-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/rbmp_lr_bl1.dff`, targetDummy: 'bump_rear_dummy' }],
    hideBaseFrames: ['bump_rear_ok'],
  },
  'blade-sideskirt-chrome-strips': {
    attachments: [
      { dffUrl: `${GTA3_BASE}/wg_l_lr_bl1.dff`, targetDummy: 'ug_wing_left' },
      { dffUrl: `${GTA3_BASE}/wg_r_lr_bl1.dff`, targetDummy: 'ug_wing_right' },
    ],
  },
  'blade-roof-vinyl-hardtop': {
    attachments: [{ dffUrl: `${GTA3_BASE}/rf_lr_bl1.dff`, targetDummy: 'ug_roof' }],
  },
  'blade-roof-convertible': {
    attachments: [{ dffUrl: `${GTA3_BASE}/rf_lr_bl2.dff`, targetDummy: 'ug_roof' }],
  },
  'blade-exhaust-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/exh_lr_bl2.dff`, targetDummy: 'exhaust_ok' }],
    hideBaseFrames: ['exhaust_ok'],
  },
  'blade-exhaust-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/exh_lr_bl1.dff`, targetDummy: 'exhaust_ok' }],
    hideBaseFrames: ['exhaust_ok'],
  },

  // === Remington ===
  'remington-front-bumper-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/fbmp_lr_rem2.dff`, targetDummy: 'bump_front_dummy' }],
    hideBaseFrames: ['bump_front_ok'],
  },
  'remington-front-bumper-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/fbmp_lr_rem1.dff`, targetDummy: 'bump_front_dummy' }],
    hideBaseFrames: ['bump_front_ok'],
  },
  'remington-rear-bumper-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/rbmp_lr_rem2.dff`, targetDummy: 'bump_rear_dummy' }],
    hideBaseFrames: ['bump_rear_ok'],
  },
  'remington-rear-bumper-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/rbmp_lr_rem1.dff`, targetDummy: 'bump_rear_dummy' }],
    hideBaseFrames: ['bump_rear_ok'],
  },
  'remington-sideskirt-chrome-flames': {
    attachments: [
      { dffUrl: `${GTA3_BASE}/wg_l_lr_rem1.dff`, targetDummy: 'ug_wing_left' },
      { dffUrl: `${GTA3_BASE}/wg_r_lr_rem1.dff`, targetDummy: 'ug_wing_right' },
    ],
  },
  'remington-sideskirt-chrome-arches': {
    attachments: [
      { dffUrl: `${GTA3_BASE}/wg_l_lr_rem2.dff`, targetDummy: 'ug_wing_left' },
      { dffUrl: `${GTA3_BASE}/wg_r_lr_rem2.dff`, targetDummy: 'ug_wing_right' },
    ],
  },
  'remington-misc-chrome-grill': {
    attachments: [{ dffUrl: `${GTA3_BASE}/misc_c_lr_rem1.dff`, targetDummy: 'misc_c' }],
  },
  'remington-misc-chrome-bars': {
    attachments: [{ dffUrl: `${GTA3_BASE}/misc_c_lr_rem2.dff`, targetDummy: 'misc_c' }],
  },
  'remington-misc-chrome-lights': {
    attachments: [{ dffUrl: `${GTA3_BASE}/misc_c_lr_rem3.dff`, targetDummy: 'misc_c' }],
  },
  'remington-exhaust-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/exh_lr_rem2.dff`, targetDummy: 'exhaust_ok' }],
    hideBaseFrames: ['exhaust_ok'],
  },
  'remington-exhaust-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/exh_lr_rem1.dff`, targetDummy: 'exhaust_ok' }],
    hideBaseFrames: ['exhaust_ok'],
  },

  // === Savanna ===
  'savanna-front-bumper-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/fbmp_lr_sv2.dff`, targetDummy: 'bump_front_dummy' }],
    hideBaseFrames: ['bump_front_ok'],
  },
  'savanna-front-bumper-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/fbmp_lr_sv1.dff`, targetDummy: 'bump_front_dummy' }],
    hideBaseFrames: ['bump_front_ok'],
  },
  'savanna-rear-bumper-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/rbmp_lr_sv2.dff`, targetDummy: 'bump_rear_dummy' }],
    hideBaseFrames: ['bump_rear_ok'],
  },
  'savanna-rear-bumper-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/rbmp_lr_sv1.dff`, targetDummy: 'bump_rear_dummy' }],
    hideBaseFrames: ['bump_rear_ok'],
  },
  'savanna-sideskirt-chrome-strips': {
    attachments: [
      { dffUrl: `${GTA3_BASE}/wg_l_lr_sv.dff`, targetDummy: 'ug_wing_left' },
      { dffUrl: `${GTA3_BASE}/wg_r_lr_sv.dff`, targetDummy: 'ug_wing_right' },
    ],
  },
  'savanna-roof-hardtop': {
    attachments: [{ dffUrl: `${GTA3_BASE}/rf_lr_sv1.dff`, targetDummy: 'ug_roof' }],
  },
  'savanna-roof-softtop': {
    attachments: [{ dffUrl: `${GTA3_BASE}/rf_lr_sv2.dff`, targetDummy: 'ug_roof' }],
  },
  'savanna-exhaust-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/exh_lr_sv2.dff`, targetDummy: 'exhaust_ok' }],
    hideBaseFrames: ['exhaust_ok'],
  },
  'savanna-exhaust-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/exh_lr_sv1.dff`, targetDummy: 'exhaust_ok' }],
    hideBaseFrames: ['exhaust_ok'],
  },

  // === Slamvan ===
  'slamvan-front-bumper-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/fbmp_lr_slv1.dff`, targetDummy: 'bump_front_dummy' }],
    hideBaseFrames: ['bump_front_ok'],
  },
  'slamvan-front-bullbar-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/fbb_lr_slv2.dff`, targetDummy: 'ug_frontbullbar' }],
  },
  'slamvan-front-bullbar-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/fbb_lr_slv1.dff`, targetDummy: 'ug_frontbullbar' }],
  },
  'slamvan-rear-bullbar-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/bbb_lr_slv2.dff`, targetDummy: 'ug_backbullbar' }],
  },
  'slamvan-rear-bullbar-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/bbb_lr_slv1.dff`, targetDummy: 'ug_backbullbar' }],
  },
  'slamvan-sideskirt-right-chrome-trim': {
    attachments: [
      { dffUrl: `${GTA3_BASE}/wg_r_lr_slv1.dff`, targetDummy: 'ug_wing_right' },
    ],
  },
  'slamvan-sideskirt-right-wheelcovers': {
    attachments: [
      { dffUrl: `${GTA3_BASE}/wg_r_lr_slv2.dff`, targetDummy: 'ug_wing_right' },
    ],
  },
  'slamvan-sideskirt-left-chrome-trim': {
    attachments: [
      { dffUrl: `${GTA3_BASE}/wg_l_lr_slv1.dff`, targetDummy: 'ug_wing_left' },
    ],
  },
  'slamvan-sideskirt-left-wheelcovers': {
    attachments: [
      { dffUrl: `${GTA3_BASE}/wg_l_lr_slv2.dff`, targetDummy: 'ug_wing_left' },
    ],
  },
  'slamvan-exhaust-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/exh_lr_slv2.dff`, targetDummy: 'exhaust_ok' }],
    hideBaseFrames: ['exhaust_ok'],
  },
  'slamvan-exhaust-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/exh_lr_slv1.dff`, targetDummy: 'exhaust_ok' }],
    hideBaseFrames: ['exhaust_ok'],
  },

  // === Tornado ===
  'tornado-front-bumper-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/fbmp_lr_t2.dff`, targetDummy: 'bump_front_dummy' }],
    hideBaseFrames: ['bump_front_ok'],
  },
  'tornado-front-bumper-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/fbmp_lr_t1.dff`, targetDummy: 'bump_front_dummy' }],
    hideBaseFrames: ['bump_front_ok'],
  },
  'tornado-rear-bumper-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/rbmp_lr_t2.dff`, targetDummy: 'bump_rear_dummy' }],
    hideBaseFrames: ['bump_rear_ok'],
  },
  'tornado-rear-bumper-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/rbmp_lr_t1.dff`, targetDummy: 'bump_rear_dummy' }],
    hideBaseFrames: ['bump_rear_ok'],
  },
  'tornado-sideskirt-chrome-strip': {
    attachments: [
      { dffUrl: `${GTA3_BASE}/wg_l_lr_t1.dff`, targetDummy: 'ug_wing_left' },
      { dffUrl: `${GTA3_BASE}/wg_r_lr_t1.dff`, targetDummy: 'ug_wing_right' },
    ],
  },
  'tornado-exhaust-slamin': {
    attachments: [{ dffUrl: `${GTA3_BASE}/exh_lr_t2.dff`, targetDummy: 'exhaust_ok' }],
    hideBaseFrames: ['exhaust_ok'],
  },
  'tornado-exhaust-chromer': {
    attachments: [{ dffUrl: `${GTA3_BASE}/exh_lr_t1.dff`, targetDummy: 'exhaust_ok' }],
    hideBaseFrames: ['exhaust_ok'],
  },
};

/**
 * Resolves the `.dff` file(s) and target GTA:SA dummy frame(s) for any selected
 * body modification part on a given vehicle.
 */
export function resolveModPart3DAsset(
  vehicleId: string,
  partId: string,
  slot: BodyPartSlot
): ModPart3DAsset | null {
  if (LOCOLOW_MOD_ASSETS[partId]) {
    return LOCOLOW_MOD_ASSETS[partId];
  }

  const waa = WAA_SUFFIX[vehicleId];
  if (!waa) return null;

  const variant = partId.startsWith('alien-')
    ? 'a'
    : partId.startsWith('xflow-')
      ? 'c'
      : null;
  if (!variant) return null;

  switch (slot) {
    case 'front-bumper':
      return {
        attachments: [
          {
            dffUrl: `${GTA3_BASE}/fbmp_${variant}_${waa.code}.dff`,
            targetDummy: 'bump_front_dummy',
          },
        ],
        hideBaseFrames: ['bump_front_ok'],
      };
    case 'rear-bumper':
      return {
        attachments: [
          {
            dffUrl: `${GTA3_BASE}/rbmp_${variant}_${waa.code}.dff`,
            targetDummy: 'bump_rear_dummy',
          },
        ],
        hideBaseFrames: ['bump_rear_ok'],
      };
    case 'sideskirt':
      return {
        attachments: [
          {
            dffUrl: `${GTA3_BASE}/wg_l_${variant}_${waa.code}.dff`,
            targetDummy: 'ug_wing_left',
          },
          {
            dffUrl: `${GTA3_BASE}/wg_r_${variant}_${waa.code}.dff`,
            targetDummy: 'ug_wing_right',
          },
        ],
      };
    case 'spoiler':
      return {
        attachments: [
          {
            dffUrl: `${GTA3_BASE}/spl_${variant}_${waa.code}_${waa.spoilerType}.dff`,
            targetDummy: 'ug_spoiler',
          },
        ],
      };
    case 'roof-vent':
      return {
        attachments: [
          {
            dffUrl: `${GTA3_BASE}/rf_${variant}_${waa.code}.dff`,
            targetDummy: 'ug_roof',
          },
        ],
      };
    case 'exhaust':
      return {
        attachments: [
          {
            dffUrl: `${GTA3_BASE}/exh_${variant}_${waa.code}.dff`,
            targetDummy: 'exhaust_ok',
          },
        ],
        hideBaseFrames: ['exhaust_ok'],
      };
    default:
      return null;
  }
}

/**
 * Official GTA:SA `veh_mods.ide` wheel model mapping for all 17 workshop wheels.
 */
export const WHEEL_3D_ASSETS: Record<string, Wheel3DAsset> = {
  offroad: { wheelId: 'offroad', dffUrl: `${GTA3_BASE}/wheel_or1.dff` },
  shadow: { wheelId: 'shadow', dffUrl: `${GTA3_BASE}/wheel_sr6.dff` },
  mega: { wheelId: 'mega', dffUrl: `${GTA3_BASE}/wheel_sr3.dff` },
  rimshine: { wheelId: 'rimshine', dffUrl: `${GTA3_BASE}/wheel_sr2.dff` },
  wires: { wheelId: 'wires', dffUrl: `${GTA3_BASE}/wheel_lr4.dff` },
  classic: { wheelId: 'classic', dffUrl: `${GTA3_BASE}/wheel_lr1.dff` },
  twist: { wheelId: 'twist', dffUrl: `${GTA3_BASE}/wheel_lr3.dff` },
  cutter: { wheelId: 'cutter', dffUrl: `${GTA3_BASE}/wheel_sr1.dff` },
  switch: { wheelId: 'switch', dffUrl: `${GTA3_BASE}/wheel_sr5.dff` },
  grove: { wheelId: 'grove', dffUrl: `${GTA3_BASE}/wheel_sr4.dff` },
  import: { wheelId: 'import', dffUrl: `${GTA3_BASE}/wheel_gn1.dff` },
  dollar: { wheelId: 'dollar', dffUrl: `${GTA3_BASE}/wheel_lr2.dff` },
  trance: { wheelId: 'trance', dffUrl: `${GTA3_BASE}/wheel_lr5.dff` },
  atomic: { wheelId: 'atomic', dffUrl: `${GTA3_BASE}/wheel_gn2.dff` },
  ahab: { wheelId: 'ahab', dffUrl: `${GTA3_BASE}/wheel_gn3.dff` },
  virtual: { wheelId: 'virtual', dffUrl: `${GTA3_BASE}/wheel_gn4.dff` },
  access: { wheelId: 'access', dffUrl: `${GTA3_BASE}/wheel_gn5.dff` },
};

export interface CarColorSwatch {
  id: string;
  label: string;
  hex: string;
}

export const CAR_COLOR_SWATCHES: CarColorSwatch[] = [
  { id: 'pure-white', label: 'Pure White', hex: '#FFFFFF' },
  { id: 'obsidian', label: 'Obsidian Black', hex: '#181B22' },
  { id: 'orca-red', label: 'ORCA Red', hex: '#D93025' },
  { id: 'racing-blue', label: 'Racing Blue', hex: '#1D4ED8' },
  { id: 'sky-blue', label: 'Sky Blue', hex: '#38BDF8' },
  { id: 'sunburst-gold', label: 'Sunburst Gold', hex: '#EAB308' },
  { id: 'sunset-orange', label: 'Sunset Orange', hex: '#EA580C' },
  { id: 'emerald', label: 'Emerald Green', hex: '#047857' },
  { id: 'mint-teal', label: 'Mint Teal', hex: '#0D9488' },
  { id: 'lowrider-violet', label: 'Locolow Violet', hex: '#7C3AED' },
  { id: 'hot-magenta', label: 'Hot Pink', hex: '#DB2777' },
  { id: 'liquid-silver', label: 'Liquid Silver', hex: '#94A3B8' },
];

export interface CarPaintPreset {
  id: string;
  label: string;
  primary: string;
  secondary: string;
}

export const CAR_PAINT_PRESETS: CarPaintPreset[] = [
  { id: 'orca-blue', label: 'Midnight Blue', primary: '#1D4ED8', secondary: '#F3F4F6' },
  { id: 'orca-red', label: 'ORCA Red', primary: '#D93025', secondary: '#181B22' },
  { id: 'pearl-white', label: 'Pearl White', primary: '#FFFFFF', secondary: '#1F242D' },
  { id: 'obsidian', label: 'Obsidian Black', primary: '#181B22', secondary: '#D93025' },
  { id: 'sunburst', label: 'Sunburst Gold', primary: '#EAB308', secondary: '#111317' },
  { id: 'emerald', label: 'Emerald Metallic', primary: '#047857', secondary: '#F3F4F6' },
  { id: 'lowrider-violet', label: 'Locolow Violet', primary: '#7C3AED', secondary: '#F8FAFC' },
  { id: 'silver-chrome', label: 'Liquid Silver', primary: '#94A3B8', secondary: '#1E293B' },
];
