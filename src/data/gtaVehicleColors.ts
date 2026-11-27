export interface GtaVehicleColor {
  id: number;
  hex: string;
  /** True when relative luminance is bright enough to require dark text for contrast */
  isLight: boolean;
}

/**
 * Official 256-color GTA:SA / SA-MP Vehicle Color Palette (IDs 0–255),
 * sampled directly from the reference color chart (`/assets/aistudio/image_c2cacf78.png`).
 */
const RAW_GTA_COLOR_HEXES: readonly string[] = [
  // Row 0 (0 - 23)
  '#000000', '#F5F5F5', '#2977A5', '#84050E', '#253737', '#884370', '#D88D0E', '#4C75B7',
  '#BEBFC3', '#5E7072', '#455A79', '#666978', '#5B7F8F', '#58595B', '#D5DAD6', '#9CA1A4',
  '#335F3C', '#770D1B', '#7F072B', '#A09D94', '#394E79', '#742D3F', '#691E3C', '#96918D',
  // Row 1 (24 - 47)
  '#515459', '#3F3E44', '#A8A8AA', '#645C5A', '#3D4B68', '#989590', '#42201F', '#5F262C',
  '#8395AB', '#777B7C', '#646368', '#5A5752', '#262425', '#2E3A36', '#93A396', '#6B7B8A',
  '#221A17', '#6F665D', '#781E2A', '#610917', '#173A26', '#5D1B1D', '#9D9872', '#7A755F',
  // Row 2 (48 - 71)
  '#9A9488', '#AEB0AF', '#848887', '#305043', '#4E6168', '#152348', '#292E4B', '#7E6256',
  '#9DA4AA', '#9C8D70', '#6F1821', '#4E6883', '#9C9D98', '#937245', '#651B28', '#949DA2',
  '#A5A7A6', '#8F8D43', '#36191E', '#6C798C', '#AAAD8E', '#AC9891', '#871E2C', '#718296',
  // Row 3 (72 - 95)
  '#575852', '#99A78E', '#611925', '#20202C', '#A4A095', '#AB9D83', '#78222B', '#0E306D',
  '#74293E', '#7C715D', '#761C28', '#1F2E33', '#4E322F', '#7C1B44', '#2E5B20', '#395A83',
  '#6C2739', '#A7A28E', '#ADB1B0', '#364155', '#6D6D6F', '#0F6A89', '#204B6B', '#2A3E57',
  // Row 4 (96 - 119)
  '#9B9F9E', '#6B8498', '#4E8395', '#AE9A7F', '#406C8F', '#1F253B', '#AB9176', '#124572',
  '#97816C', '#66676B', '#125081', '#A19984', '#385694', '#525661', '#7F6856', '#8B929A',
  '#596E89', '#45362F', '#46614E', '#730A28', '#223458', '#640E1B', '#A3ADC6', '#6A5854',
  // Row 5 (120 - 143)
  '#9C8C7F', '#620B1E', '#5D5D5F', '#624428', '#731827', '#1C376E', '#EC6BAE', '#000000',
  '#167615', '#1F0705', '#105479', '#452A0D', '#561E1D', '#010801', '#252259', '#2C89AA',
  '#894DBE', '#349838', '#B6B8B3', '#474C8E', '#84878C', '#817867', '#817B27', '#69506E',
  // Row 6 (144 - 167)
  '#583E6E', '#8AB973', '#825076', '#6E276B', '#1D1D13', '#1F1307', '#1F2519', '#2C4530',
  '#1E4C9A', '#2D5F42', '#1F9848', '#1D9999', '#999975', '#7C8499', '#992E1E', '#2D1E09',
  '#142407', '#9A3E4B', '#1D4D99', '#198182', '#1A2A2A', '#15616F', '#1B6686', '#6C4099',
  // Row 7 (168 - 191)
  '#49190D', '#78739B', '#746D99', '#53387D', '#212407', '#3F190C', '#46210E', '#991F1C',
  '#8D4C8E', '#805B7D', '#7C3E81', '#3C1738', '#723518', '#781819', '#84341B', '#8E2F19',
  '#7F3E54', '#7D6C7C', '#010D03', '#072406', '#163112', '#17301B', '#642B4E', '#358552',
  // Row 8 (192 - 215)
  '#999691', '#808C98', '#989B1A', '#80984A', '#819393', '#788221', '#2A3D99', '#393C07',
  '#887950', '#0E1F4A', '#14381E', '#15273D', '#365874', '#07071F', '#051427', '#1F3A4D',
  '#2D4F8C', '#134270', '#0F3250', '#241663', '#692113', '#8C8D92', '#526013', '#090F03',
  // Row 9 (216 - 239)
  '#8D573F', '#53888C', '#965D52', '#9A581B', '#993A62', '#9A8F51', '#9B301C', '#0C1840',
  '#511F1E', '#42430A', '#499B1B', '#09291A', '#95821B', '#198015', '#3D131D', '#745215',
  '#893E91', '#7F196C', '#0A380A', '#28450F', '#042023', '#784472', '#8A6539', '#732518',
  // Row 10 (240 - 255)
  '#2E9592', '#57941D', '#581739', '#198A2E', '#38160D', '#031805', '#355D8E', '#2F3E5B',
  '#581A29', '#4E0E29', '#706D68', '#3A3F43', '#2F2C35', '#7A7E7D', '#494542', '#28344E',
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function isLightHex(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 165;
}

export const GTA_VEHICLE_COLORS: readonly GtaVehicleColor[] = RAW_GTA_COLOR_HEXES.map(
  (hex, id) => ({
    id,
    hex,
    isLight: isLightHex(hex),
  })
);

export function getGtaVehicleColorById(id: number | null | undefined): GtaVehicleColor | null {
  if (id === null || id === undefined || !Number.isInteger(id)) return null;
  if (id < 0 || id >= GTA_VEHICLE_COLORS.length) return null;
  return GTA_VEHICLE_COLORS[id];
}

export function getGtaVehicleColorHex(id: number, fallback = '#F5F5F5'): string {
  return getGtaVehicleColorById(id)?.hex ?? fallback;
}

export function clampGtaColorId(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(GTA_VEHICLE_COLORS.length - 1, Math.round(raw)));
}
