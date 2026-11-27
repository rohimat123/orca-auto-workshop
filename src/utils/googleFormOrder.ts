import { formatUSD, type OrderBreakdown } from './calculator';

export const MIN_BUYER_NAME_LENGTH = 2;
export const MAX_BUYER_NAME_LENGTH = 60;
export const SUBMIT_COOLDOWN_MS = 5_000;

const GOOGLE_FORM_URL_RE =
  /^https:\/\/docs\.google\.com\/forms\/d\/(?:e\/)?[A-Za-z0-9_-]{10,}\/formResponse$/;
const ENTRY_ID_RE = /^entry\.\d+$/;
const NUMERIC_ENTRY_RE = /^\d+$/;

export interface GoogleFormConfig {
  actionUrl: string;
  entries: {
    buyerName: string;
    vehicle: string;
    items: string;
    total: string;
  };
}

export interface GoogleFormOrderFields {
  buyerName: string;
  vehicle: string;
  itemsText: string;
  totalText: string;
}

export interface GoogleFormConfigValidation {
  ready: boolean;
  normalized?: GoogleFormConfig;
  missing: string[];
}

export type GoogleFormSubmitResult =
  | { ok: true; fields: GoogleFormOrderFields }
  | { ok: false; code: 'INVALID_BUYER_NAME' | 'EMPTY_ORDER' | 'NOT_CONFIGURED' | 'NETWORK_ERROR'; error: string };

/**
 * Cleans buyer name against control characters, backticks (Discord code block breakout),
 * and leading Google Sheets formula trigger prefixes (=, +, -, @).
 */
export function sanitizeBuyerName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[`\r\n\t\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[=+\-@]+/, '')
    .trim();
}

export function normalizeGoogleFormActionUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
  if (!trimmed) return '';
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'https:') return '';
  if (parsed.hostname.toLowerCase() !== 'docs.google.com') return '';
  if (parsed.username || parsed.password || parsed.port) return '';

  const normalizedPath = parsed.pathname
    .replace(/\/+$/, '')
    .replace(/\/viewform$/i, '/formResponse');

  const candidate = `https://docs.google.com${normalizedPath}`;
  return GOOGLE_FORM_URL_RE.test(candidate) ? candidate : '';
}

export function isValidGoogleFormActionUrl(rawUrl: string): boolean {
  return normalizeGoogleFormActionUrl(rawUrl) !== '';
}

export function normalizeEntryId(rawEntry: string): string {
  const trimmed = rawEntry.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
  if (!trimmed) return '';
  if (ENTRY_ID_RE.test(trimmed)) return trimmed;
  if (NUMERIC_ENTRY_RE.test(trimmed)) return `entry.${trimmed}`;
  return '';
}

export function validateGoogleFormConfig(
  config: GoogleFormConfig
): GoogleFormConfigValidation {
  const missing: string[] = [];

  const actionUrl = normalizeGoogleFormActionUrl(config.actionUrl);
  if (!actionUrl) missing.push('VITE_GOOGLE_FORM_ACTION_URL');

  const buyerName = normalizeEntryId(config.entries.buyerName);
  if (!buyerName) missing.push('VITE_GOOGLE_FORM_ENTRY_BUYER');

  const vehicle = normalizeEntryId(config.entries.vehicle);
  if (!vehicle) missing.push('VITE_GOOGLE_FORM_ENTRY_VEHICLE');

  const items = normalizeEntryId(config.entries.items);
  if (!items) missing.push('VITE_GOOGLE_FORM_ENTRY_ITEMS');

  const total = normalizeEntryId(config.entries.total);
  if (!total) missing.push('VITE_GOOGLE_FORM_ENTRY_TOTAL');

  if (missing.length > 0) {
    return { ready: false, missing };
  }

  return {
    ready: true,
    missing: [],
    normalized: {
      actionUrl,
      entries: {
        buyerName,
        vehicle,
        items,
        total,
      },
    },
  };
}

export function buildGoogleFormOrderFields(
  breakdown: OrderBreakdown,
  rawBuyerName: string
): GoogleFormOrderFields {
  const buyerName = sanitizeBuyerName(rawBuyerName);
  const vehicle = `${breakdown.vehicleName} - Tipe ${breakdown.vehicleCategory}`;
  const itemsText = breakdown.items
    .map((item) => `- ${item.label}: ${formatUSD(item.price)}`)
    .join('\n');
  const totalText = formatUSD(breakdown.total);

  return {
    buyerName,
    vehicle,
    itemsText,
    totalText,
  };
}

export function buildGoogleFormUrlEncodedBody(
  fields: GoogleFormOrderFields,
  config: GoogleFormConfig
): URLSearchParams {
  const params = new URLSearchParams();
  params.set(config.entries.buyerName, fields.buyerName);
  params.set(config.entries.vehicle, fields.vehicle);
  params.set(config.entries.items, fields.itemsText);
  params.set(config.entries.total, fields.totalText);
  return params;
}

export async function submitOrderToGoogleForm(params: {
  breakdown: OrderBreakdown;
  buyerName: string;
  config: GoogleFormConfig;
  fetchImpl?: typeof fetch;
}): Promise<GoogleFormSubmitResult> {
  if (params.breakdown.itemCount === 0) {
    return {
      ok: false,
      code: 'EMPTY_ORDER',
      error: 'Pilih minimal satu modifikasi sebelum mengirim pesanan.',
    };
  }

  const cleanBuyer = sanitizeBuyerName(params.buyerName);
  if (cleanBuyer.length < MIN_BUYER_NAME_LENGTH) {
    return {
      ok: false,
      code: 'INVALID_BUYER_NAME',
      error: 'Nama pembeli wajib diisi minimal 2 karakter.',
    };
  }
  if (cleanBuyer.length > MAX_BUYER_NAME_LENGTH) {
    return {
      ok: false,
      code: 'INVALID_BUYER_NAME',
      error: `Nama pembeli maksimal ${MAX_BUYER_NAME_LENGTH} karakter.`,
    };
  }

  const validation = validateGoogleFormConfig(params.config);
  if (!validation.ready || !validation.normalized) {
    return {
      ok: false,
      code: 'NOT_CONFIGURED',
      error:
        'Google Form belum dikonfigurasi. Isi VITE_GOOGLE_FORM_ACTION_URL dan 4 entry ID di Environment Variables (Vercel / .env).',
    };
  }

  const fields = buildGoogleFormOrderFields(params.breakdown, cleanBuyer);
  const body = buildGoogleFormUrlEncodedBody(fields, validation.normalized);
  const fetchFn = params.fetchImpl ?? fetch;

  try {
    await fetchFn(validation.normalized.actionUrl, {
      method: 'POST',
      mode: 'no-cors',
      body,
    });
    return { ok: true, fields };
  } catch {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      error: 'Koneksi gagal saat mengirim pesanan ke Google Form. Coba lagi.',
    };
  }
}
