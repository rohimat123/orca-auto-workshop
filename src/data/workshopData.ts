export type VehicleCategory = 'WAA' | 'Locolow';

export interface VehicleModel {
  id: string;
  name: string;
  category: VehicleCategory;
}

export type ModStyle = 'X-FLOW' | 'ALIEN' | 'SLAMIN' | 'CHROMER' | 'CUSTOM';

export type BodyPartSlot =
  | 'front-bumper'
  | 'rear-bumper'
  | 'front-bullbar'
  | 'rear-bullbar'
  | 'sideskirt'
  | 'spoiler'
  | 'roof-vent'
  | 'misc'
  | 'exhaust';

export interface BodyModPart {
  id: string;
  slot: BodyPartSlot;
  partName: string;
  style: ModStyle;
  price: number;
  vehicleId?: string;
  imageUrl?: string;
  badgeLabel?: string;
}

export interface NitroOption {
  id: string;
  name: string;
  price: number;
}

export interface WheelItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

export const WAA_VEHICLES: VehicleModel[] = [
  { id: 'elegy', name: 'Elegy', category: 'WAA' },
  { id: 'flash', name: 'Flash', category: 'WAA' },
  { id: 'jester', name: 'Jester', category: 'WAA' },
  { id: 'stratum', name: 'Stratum', category: 'WAA' },
  { id: 'sultan', name: 'Sultan', category: 'WAA' },
  { id: 'uranus', name: 'Uranus', category: 'WAA' },
];

export const LOCOLOW_VEHICLES: VehicleModel[] = [
  { id: 'blade', name: 'Blade', category: 'Locolow' },
  { id: 'remington', name: 'Remington', category: 'Locolow' },
  { id: 'savanna', name: 'Savanna', category: 'Locolow' },
  { id: 'slamvan', name: 'Slamvan', category: 'Locolow' },
  { id: 'tornado', name: 'Tornado', category: 'Locolow' },
];

export const ALL_VEHICLES: VehicleModel[] = [
  ...WAA_VEHICLES,
  ...LOCOLOW_VEHICLES,
];

export const NITRO_OPTIONS: NitroOption[] = [
  { id: 'nitro-2x', name: '2x Nitro', price: 165 },
  { id: 'nitro-5x', name: '5x Nitro', price: 330 },
  { id: 'nitro-10x', name: '10x Nitro', price: 825 },
];

export const SLOT_LABELS: Record<BodyPartSlot, string> = {
  'front-bumper': 'Front Bumper',
  'rear-bumper': 'Rear Bumper',
  'front-bullbar': 'Front Bullbars',
  'rear-bullbar': 'Rear Bullbars',
  sideskirt: 'Side Skirts',
  spoiler: 'Spoiler',
  'roof-vent': 'Roof',
  misc: 'Misc',
  exhaust: 'Exhaust',
};

export const WAA_SLOT_ORDER: { slot: BodyPartSlot; label: string }[] = [
  { slot: 'front-bumper', label: 'Front Bumper' },
  { slot: 'rear-bumper', label: 'Rear Bumper' },
  { slot: 'sideskirt', label: 'Side Skirts' },
  { slot: 'spoiler', label: 'Spoiler' },
  { slot: 'roof-vent', label: 'Roof Vent' },
  { slot: 'exhaust', label: 'Exhaust' },
];

export const LOCOLOW_SLOT_ORDER: BodyPartSlot[] = [
  'front-bumper',
  'rear-bumper',
  'front-bullbar',
  'rear-bullbar',
  'sideskirt',
  'roof-vent',
  'misc',
  'exhaust',
];

export const XFLOW_PARTS: BodyModPart[] = [
  { id: 'xflow-exhaust', slot: 'exhaust', partName: 'X-Flow Exhaust', style: 'X-FLOW', price: 286 },
  { id: 'xflow-sideskirt', slot: 'sideskirt', partName: 'X-Flow Side Skirts', style: 'X-FLOW', price: 165 },
  { id: 'xflow-roof-vent', slot: 'roof-vent', partName: 'X-Flow Roof Vent', style: 'X-FLOW', price: 132 },
  { id: 'xflow-spoiler', slot: 'spoiler', partName: 'X-Flow Spoiler', style: 'X-FLOW', price: 220 },
  { id: 'xflow-rear-bumper', slot: 'rear-bumper', partName: 'X-Flow Rear Bumper', style: 'X-FLOW', price: 396 },
  { id: 'xflow-front-bumper', slot: 'front-bumper', partName: 'X-Flow Front Bumper', style: 'X-FLOW', price: 396 },
];

export const ALIEN_PARTS: BodyModPart[] = [
  { id: 'alien-exhaust', slot: 'exhaust', partName: 'Alien Exhaust', style: 'ALIEN', price: 374 },
  { id: 'alien-sideskirt', slot: 'sideskirt', partName: 'Alien Side Skirts', style: 'ALIEN', price: 198 },
  { id: 'alien-roof-vent', slot: 'roof-vent', partName: 'Alien Roof Vent', style: 'ALIEN', price: 176 },
  { id: 'alien-spoiler', slot: 'spoiler', partName: 'Alien Spoiler', style: 'ALIEN', price: 308 },
  { id: 'alien-rear-bumper', slot: 'rear-bumper', partName: 'Alien Rear Bumper', style: 'ALIEN', price: 484 },
  { id: 'alien-front-bumper', slot: 'front-bumper', partName: 'Alien Front Bumper', style: 'ALIEN', price: 396 },
];

/**
 * Official GTA: San Andreas Loco Low Co. exterior modifications per vehicle
 * (aligned with https://gta.rdy.jp/gtasa/carmods_lowrider.html).
 * Blade, Remington, and Savanna use official workshop pricing; Slamvan & Tornado remain $0.00 until updated.
 */
export const LOCOLOW_MOD_PARTS: BodyModPart[] = [
  // === Blade (9 mods) ===
  {
    id: 'blade-front-bumper-slamin',
    vehicleId: 'blade',
    slot: 'front-bumper',
    partName: 'Slamin Bumper',
    style: 'SLAMIN',
    price: 396,
    badgeLabel: 'Slamin Bumper',
    imageUrl: '/assets/mods/blade-slamin-front-bumper.png',
  },
  {
    id: 'blade-front-bumper-chromer',
    vehicleId: 'blade',
    slot: 'front-bumper',
    partName: 'Chromer Bumper',
    style: 'CHROMER',
    price: 484,
    badgeLabel: 'Chromer Bumper',
    imageUrl: '/assets/mods/blade-chromer-front-bumper.png',
  },
  {
    id: 'blade-rear-bumper-slamin',
    vehicleId: 'blade',
    slot: 'rear-bumper',
    partName: 'Slamin Bumper',
    style: 'SLAMIN',
    price: 396,
    badgeLabel: 'Slamin Bumper',
    imageUrl: '/assets/mods/blade-slamin-rear-bumper.png',
  },
  {
    id: 'blade-rear-bumper-chromer',
    vehicleId: 'blade',
    slot: 'rear-bumper',
    partName: 'Chromer Bumper',
    style: 'CHROMER',
    price: 484,
    badgeLabel: 'Chromer Bumper',
    imageUrl: '/assets/mods/blade-chromer-rear-bumper.png',
  },
  {
    id: 'blade-sideskirt-chrome-strips',
    vehicleId: 'blade',
    slot: 'sideskirt',
    partName: 'Chrome Strips',
    style: 'CHROMER',
    price: 286,
    badgeLabel: 'Chrome Strips',
    imageUrl: '/assets/mods/blade-chromer-sideskirt.png',
  },
  {
    id: 'blade-roof-vinyl-hardtop',
    vehicleId: 'blade',
    slot: 'roof-vent',
    partName: 'Vinyl Hardtop',
    style: 'CUSTOM',
    price: 748,
    badgeLabel: 'Vinyl Hardtop',
    imageUrl: '/assets/aistudio/image_e9d60be1.png',
  },
  {
    id: 'blade-roof-convertible',
    vehicleId: 'blade',
    slot: 'roof-vent',
    partName: 'Convertible Roof',
    style: 'CUSTOM',
    price: 286,
    badgeLabel: 'Convertible Roof',
    imageUrl: '/assets/aistudio/image_16d79e88.png',
  },
  {
    id: 'blade-exhaust-slamin',
    vehicleId: 'blade',
    slot: 'exhaust',
    partName: 'Slamin Exhaust',
    style: 'SLAMIN',
    price: 286,
    badgeLabel: 'Slamin Exhaust',
    imageUrl: '/assets/mods/blade-slamin-exhaust.png',
  },
  {
    id: 'blade-exhaust-chromer',
    vehicleId: 'blade',
    slot: 'exhaust',
    partName: 'Chromer Exhaust',
    style: 'CHROMER',
    price: 374,
    badgeLabel: 'Chromer Exhaust',
    imageUrl: '/assets/mods/blade-chromer-exhaust.png',
  },

  // === Remington (11 mods) ===
  {
    id: 'remington-front-bumper-slamin',
    vehicleId: 'remington',
    slot: 'front-bumper',
    partName: 'Slamin Bumper',
    style: 'SLAMIN',
    price: 396,
    badgeLabel: 'Slamin Bumper',
    imageUrl: '/assets/mods/remington-slamin-front-bumper.png',
  },
  {
    id: 'remington-front-bumper-chromer',
    vehicleId: 'remington',
    slot: 'front-bumper',
    partName: 'Chromer Bumper',
    style: 'CHROMER',
    price: 484,
    badgeLabel: 'Chromer Bumper',
    imageUrl: '/assets/mods/remington-chromer-front-bumper.png',
  },
  {
    id: 'remington-rear-bumper-slamin',
    vehicleId: 'remington',
    slot: 'rear-bumper',
    partName: 'Slamin Bumper',
    style: 'SLAMIN',
    price: 396,
    badgeLabel: 'Slamin Bumper',
    imageUrl: '/assets/mods/remington-slamin-rear-bumper.png',
  },
  {
    id: 'remington-rear-bumper-chromer',
    vehicleId: 'remington',
    slot: 'rear-bumper',
    partName: 'Chromer Bumper',
    style: 'CHROMER',
    price: 484,
    badgeLabel: 'Chromer Bumper',
    imageUrl: '/assets/mods/remington-chromer-rear-bumper.png',
  },
  {
    id: 'remington-sideskirt-chrome-flames',
    vehicleId: 'remington',
    slot: 'sideskirt',
    partName: 'Chrome Flames',
    style: 'CHROMER',
    price: 374,
    badgeLabel: 'Chrome Flames',
    imageUrl: '/assets/mods/remington-loco-flames.png',
  },
  {
    id: 'remington-sideskirt-chrome-arches',
    vehicleId: 'remington',
    slot: 'sideskirt',
    partName: 'Chrome Arches',
    style: 'CHROMER',
    price: 330,
    badgeLabel: 'Chrome Arches',
    imageUrl: '/assets/mods/remington-loco-arches.png',
  },
  {
    id: 'remington-misc-chrome-grill',
    vehicleId: 'remington',
    slot: 'misc',
    partName: 'Chrome Grill',
    style: 'CHROMER',
    price: 264,
    badgeLabel: 'Chrome Grill',
    imageUrl: '/assets/mods/remington-misc-chrome-grill.jpg',
  },
  {
    id: 'remington-misc-chrome-bars',
    vehicleId: 'remington',
    slot: 'misc',
    partName: 'Chrome Bars',
    style: 'CHROMER',
    price: 286,
    badgeLabel: 'Chrome Bars',
    imageUrl: '/assets/mods/remington-misc-chrome-bars.jpg',
  },
  {
    id: 'remington-misc-chrome-lights',
    vehicleId: 'remington',
    slot: 'misc',
    partName: 'Chrome Lights',
    style: 'CHROMER',
    price: 220,
    badgeLabel: 'Chrome Lights',
    imageUrl: '/assets/mods/remington-misc-chrome-lights.jpg',
  },
  {
    id: 'remington-exhaust-slamin',
    vehicleId: 'remington',
    slot: 'exhaust',
    partName: 'Slamin Exhaust',
    style: 'SLAMIN',
    price: 286,
    badgeLabel: 'Slamin Exhaust',
    imageUrl: '/assets/mods/remington-slamin-exhaust.png',
  },
  {
    id: 'remington-exhaust-chromer',
    vehicleId: 'remington',
    slot: 'exhaust',
    partName: 'Chromer Exhaust',
    style: 'CHROMER',
    price: 374,
    badgeLabel: 'Chromer Exhaust',
    imageUrl: '/assets/mods/remington-chromer-exhaust.png',
  },

  // === Savanna (9 mods) ===
  {
    id: 'savanna-front-bumper-slamin',
    vehicleId: 'savanna',
    slot: 'front-bumper',
    partName: 'Slamin Bumper',
    style: 'SLAMIN',
    price: 286,
    badgeLabel: 'Slamin Bumper',
    imageUrl: '/assets/mods/savanna-slamin-front-bumper.png',
  },
  {
    id: 'savanna-front-bumper-chromer',
    vehicleId: 'savanna',
    slot: 'front-bumper',
    partName: 'Chromer Bumper',
    style: 'CHROMER',
    price: 264,
    badgeLabel: 'Chromer Bumper',
    imageUrl: '/assets/mods/savanna-chromer-front-bumper.png',
  },
  {
    id: 'savanna-rear-bumper-slamin',
    vehicleId: 'savanna',
    slot: 'rear-bumper',
    partName: 'Slamin Bumper',
    style: 'SLAMIN',
    price: 396,
    badgeLabel: 'Slamin Bumper',
    imageUrl: '/assets/mods/savanna-slamin-rear-bumper.png',
  },
  {
    id: 'savanna-rear-bumper-chromer',
    vehicleId: 'savanna',
    slot: 'rear-bumper',
    partName: 'Chromer Bumper',
    style: 'CHROMER',
    price: 484,
    badgeLabel: 'Chromer Bumper',
    imageUrl: '/assets/mods/savanna-chromer-rear-bumper.png',
  },
  {
    id: 'savanna-sideskirt-chrome-strips',
    vehicleId: 'savanna',
    slot: 'sideskirt',
    partName: 'Chrome Strips',
    style: 'CHROMER',
    price: 308,
    badgeLabel: 'Chrome Strips',
    imageUrl: '/assets/mods/savanna-chromer-sideskirt.png',
  },
  {
    id: 'savanna-roof-softtop',
    vehicleId: 'savanna',
    slot: 'roof-vent',
    partName: 'Softtop',
    style: 'CUSTOM',
    price: 726,
    badgeLabel: 'Softtop',
    imageUrl: '/assets/mods/savanna-slamin-roof-vent.png',
  },
  {
    id: 'savanna-roof-hardtop',
    vehicleId: 'savanna',
    slot: 'roof-vent',
    partName: 'Hardtop',
    style: 'CUSTOM',
    price: 660,
    badgeLabel: 'Hardtop',
    imageUrl: '/assets/mods/savanna-chromer-roof-vent.png',
  },
  {
    id: 'savanna-exhaust-slamin',
    vehicleId: 'savanna',
    slot: 'exhaust',
    partName: 'Slamin Exhaust',
    style: 'SLAMIN',
    price: 286,
    badgeLabel: 'Slamin Exhaust',
    imageUrl: '/assets/mods/savanna-slamin-exhaust.png',
  },
  {
    id: 'savanna-exhaust-chromer',
    vehicleId: 'savanna',
    slot: 'exhaust',
    partName: 'Chromer Exhaust',
    style: 'CHROMER',
    price: 374,
    badgeLabel: 'Chromer Exhaust',
    imageUrl: '/assets/mods/savanna-chromer-exhaust.png',
  },

  // === Slamvan (9 mods) ===
  {
    id: 'slamvan-front-bumper-chromer',
    vehicleId: 'slamvan',
    slot: 'front-bumper',
    partName: 'Chromer Bumper',
    style: 'CHROMER',
    price: 0,
    badgeLabel: 'Chromer Bumper',
    imageUrl: '/assets/mods/slamvan-chromer-front-bumper.png',
  },
  {
    id: 'slamvan-front-bullbar-slamin',
    vehicleId: 'slamvan',
    slot: 'front-bullbar',
    partName: 'Slamin Bullbar',
    style: 'SLAMIN',
    price: 0,
    badgeLabel: 'Slamin Bullbar',
    imageUrl: '/assets/mods/slamvan-front-bullbar-slamin.jpg',
  },
  {
    id: 'slamvan-front-bullbar-chromer',
    vehicleId: 'slamvan',
    slot: 'front-bullbar',
    partName: 'Chromer Bullbar',
    style: 'CHROMER',
    price: 0,
    badgeLabel: 'Chromer Bullbar',
    imageUrl: '/assets/mods/slamvan-front-bullbar-chromer.jpg',
  },
  {
    id: 'slamvan-rear-bullbar-slamin',
    vehicleId: 'slamvan',
    slot: 'rear-bullbar',
    partName: 'Slamin Bullbar',
    style: 'SLAMIN',
    price: 0,
    badgeLabel: 'Slamin Bullbar',
    imageUrl: '/assets/mods/slamvan-rear-bullbar-slamin.jpg',
  },
  {
    id: 'slamvan-rear-bullbar-chromer',
    vehicleId: 'slamvan',
    slot: 'rear-bullbar',
    partName: 'Chromer Bullbar',
    style: 'CHROMER',
    price: 0,
    badgeLabel: 'Chromer Bullbar',
    imageUrl: '/assets/mods/slamvan-rear-bullbar-chromer.jpg',
  },
  {
    id: 'slamvan-sideskirt-chrome-trim',
    vehicleId: 'slamvan',
    slot: 'sideskirt',
    partName: 'Chrome Trim',
    style: 'CHROMER',
    price: 0,
    badgeLabel: 'Chrome Trim',
    imageUrl: '/assets/mods/slamvan-loco-trim.png',
  },
  {
    id: 'slamvan-sideskirt-wheelcovers',
    vehicleId: 'slamvan',
    slot: 'sideskirt',
    partName: 'Wheelcovers',
    style: 'CUSTOM',
    price: 0,
    badgeLabel: 'Wheelcovers',
    imageUrl: '/assets/mods/slamvan-loco-wheelcover.png',
  },
  {
    id: 'slamvan-exhaust-slamin',
    vehicleId: 'slamvan',
    slot: 'exhaust',
    partName: 'Slamin Exhaust',
    style: 'SLAMIN',
    price: 0,
    badgeLabel: 'Slamin Exhaust',
    imageUrl: '/assets/mods/slamvan-slamin-exhaust.png',
  },
  {
    id: 'slamvan-exhaust-chromer',
    vehicleId: 'slamvan',
    slot: 'exhaust',
    partName: 'Chromer Exhaust',
    style: 'CHROMER',
    price: 0,
    badgeLabel: 'Chromer Exhaust',
    imageUrl: '/assets/mods/slamvan-chromer-exhaust.png',
  },

  // === Tornado (7 mods) ===
  {
    id: 'tornado-front-bumper-slamin',
    vehicleId: 'tornado',
    slot: 'front-bumper',
    partName: 'Slamin Bumper',
    style: 'SLAMIN',
    price: 0,
    badgeLabel: 'Slamin Bumper',
    imageUrl: '/assets/mods/tornado-slamin-front-bumper.png',
  },
  {
    id: 'tornado-front-bumper-chromer',
    vehicleId: 'tornado',
    slot: 'front-bumper',
    partName: 'Chromer Bumper',
    style: 'CHROMER',
    price: 0,
    badgeLabel: 'Chromer Bumper',
    imageUrl: '/assets/mods/tornado-chromer-front-bumper.png',
  },
  {
    id: 'tornado-rear-bumper-slamin',
    vehicleId: 'tornado',
    slot: 'rear-bumper',
    partName: 'Slamin Bumper',
    style: 'SLAMIN',
    price: 0,
    badgeLabel: 'Slamin Bumper',
    imageUrl: '/assets/mods/tornado-slamin-rear-bumper.png',
  },
  {
    id: 'tornado-rear-bumper-chromer',
    vehicleId: 'tornado',
    slot: 'rear-bumper',
    partName: 'Chromer Bumper',
    style: 'CHROMER',
    price: 0,
    badgeLabel: 'Chromer Bumper',
    imageUrl: '/assets/mods/tornado-chromer-rear-bumper.png',
  },
  {
    id: 'tornado-sideskirt-chrome-strip',
    vehicleId: 'tornado',
    slot: 'sideskirt',
    partName: 'Chrome Strip',
    style: 'CHROMER',
    price: 0,
    badgeLabel: 'Chrome Strip',
    imageUrl: '/assets/mods/tornado-chromer-sideskirt.png',
  },
  {
    id: 'tornado-exhaust-slamin',
    vehicleId: 'tornado',
    slot: 'exhaust',
    partName: 'Slamin Exhaust',
    style: 'SLAMIN',
    price: 0,
    badgeLabel: 'Slamin Exhaust',
    imageUrl: '/assets/mods/tornado-slamin-exhaust.png',
  },
  {
    id: 'tornado-exhaust-chromer',
    vehicleId: 'tornado',
    slot: 'exhaust',
    partName: 'Chromer Exhaust',
    style: 'CHROMER',
    price: 0,
    badgeLabel: 'Chromer Exhaust',
    imageUrl: '/assets/mods/tornado-chromer-exhaust.png',
  },
];

export const ALL_BODY_PARTS: BodyModPart[] = [
  ...XFLOW_PARTS,
  ...ALIEN_PARTS,
  ...LOCOLOW_MOD_PARTS,
];

export const WHEELS: WheelItem[] = [
  { id: 'offroad', name: 'Offroad Wheels', price: 264, imageUrl: '/assets/wheels/offroad.png' },
  { id: 'shadow', name: 'Shadow Wheels', price: 154, imageUrl: '/assets/wheels/shadow.png' },
  { id: 'mega', name: 'Mega Wheels', price: 226, imageUrl: '/assets/wheels/mega.png' },
  { id: 'rimshine', name: 'Rimshine Wheels', price: 396, imageUrl: '/assets/wheels/rimshine.png' },
  { id: 'wires', name: 'Wires Wheels', price: 343, imageUrl: '/assets/wheels/wires.png' },
  { id: 'classic', name: 'Classic Wheels', price: 363, imageUrl: '/assets/wheels/classic.png' },
  { id: 'twist', name: 'Twist Wheels', price: 418, imageUrl: '/assets/wheels/twist.png' },
  { id: 'cutter', name: 'Cutter Wheels', price: 242, imageUrl: '/assets/wheels/cutter.png' },
  { id: 'switch', name: 'Switch Wheels', price: 462, imageUrl: '/assets/wheels/switch.png' },
  { id: 'grove', name: 'Grove Wheels', price: 270, imageUrl: '/assets/wheels/grove.png' },
  { id: 'import', name: 'Import Wheels', price: 231, imageUrl: '/assets/wheels/import.png' },
  { id: 'dollar', name: 'Dollar Wheels', price: 387, imageUrl: '/assets/wheels/dollar.png' },
  { id: 'trance', name: 'Trance Wheels', price: 297, imageUrl: '/assets/wheels/trance.png' },
  { id: 'atomic', name: 'Atomic Wheels', price: 341, imageUrl: '/assets/wheels/atomic.png' },
  { id: 'ahab', name: 'Ahab Wheels', price: 374, imageUrl: '/assets/wheels/ahab.png' },
  { id: 'virtual', name: 'Virtual Wheels', price: 187, imageUrl: '/assets/wheels/virtual.png' },
  { id: 'access', name: 'Access Wheels', price: 264, imageUrl: '/assets/wheels/access.png' },
];

const WAA_VEHICLE_ID_SET = new Set(WAA_VEHICLES.map((v) => v.id));

export function getWaaPreviewImage(
  vehicleId: string,
  style: 'X-FLOW' | 'ALIEN',
  slot: BodyPartSlot
): string | null {
  if (!WAA_VEHICLE_ID_SET.has(vehicleId)) {
    return null;
  }
  const styleKey = style === 'X-FLOW' ? 'xflow' : 'alien';
  return `/assets/mods/${vehicleId}-${styleKey}-${slot}.png`;
}

export function getVehicleBodyParts(vehicleId: string): BodyModPart[] {
  if (WAA_VEHICLE_ID_SET.has(vehicleId)) {
    return [...XFLOW_PARTS, ...ALIEN_PARTS];
  }
  return LOCOLOW_MOD_PARTS.filter((part) => part.vehicleId === vehicleId);
}

export function getVehicleSlotsWithParts(
  vehicleId: string
): { slot: BodyPartSlot; label: string; parts: BodyModPart[] }[] {
  if (WAA_VEHICLE_ID_SET.has(vehicleId)) {
    return WAA_SLOT_ORDER.map(({ slot, label }) => {
      const xflow = XFLOW_PARTS.find((p) => p.slot === slot)!;
      const alien = ALIEN_PARTS.find((p) => p.slot === slot)!;
      return {
        slot,
        label,
        parts: [
          {
            ...xflow,
            badgeLabel: 'X-Flow',
            imageUrl: getWaaPreviewImage(vehicleId, 'X-FLOW', slot) ?? undefined,
          },
          {
            ...alien,
            badgeLabel: 'Alien',
            imageUrl: getWaaPreviewImage(vehicleId, 'ALIEN', slot) ?? undefined,
          },
        ],
      };
    });
  }

  const locoParts = LOCOLOW_MOD_PARTS.filter((p) => p.vehicleId === vehicleId);
  return LOCOLOW_SLOT_ORDER.map((slot) => ({
    slot,
    label: SLOT_LABELS[slot],
    parts: locoParts.filter((p) => p.slot === slot),
  })).filter((group) => group.parts.length > 0);
}
