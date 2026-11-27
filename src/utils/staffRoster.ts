export type StaffDutyStatus = 'on-duty' | 'off-duty';
export type StaffShiftState = 'active' | 'completed' | 'upcoming' | 'none';
export type ScheduleDateRelation = 'today' | 'past' | 'future' | 'unspecified';

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  rawLabel: string;
  formattedId: string;
}

export interface ShiftTimeRange {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  crossesMidnight: boolean;
  label: string;
}

export interface ParsedShiftEntry {
  timeRange: ShiftTimeRange;
  date: CalendarDate | null;
  names: string[];
}

export interface ParsedSheetSchedule {
  hasScheduleStructure: boolean;
  sheetDate: CalendarDate | null;
  dates: CalendarDate[];
  entries: ParsedShiftEntry[];
  legacyNames: string[];
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  photoUrl: string;
  status: StaffDutyStatus;
  matchAliases?: string[];
  shiftLabel?: string;
  shiftState?: StaffShiftState;
}

export interface EvaluatedScheduleResult {
  staff: StaffMember[];
  onDutyNames: string[];
  sheetDate: CalendarDate | null;
  dateRelation: ScheduleDateRelation;
  activeShiftLabel: string | null;
  currentWibTime: string;
  currentWibDate: string;
}

export interface StaffFetchResult {
  staff: StaffMember[];
  source: 'live' | 'default';
  onDutyNames: string[];
  schedule: ParsedSheetSchedule | null;
  sheetDate: CalendarDate | null;
  dateRelation: ScheduleDateRelation;
  activeShiftLabel: string | null;
  updatedAt?: string;
  error?: string;
}

export interface ResolvedSheetSource {
  csvUrl: string;
  mode: 'gviz-range' | 'published-sheet';
}

export const STAFF_COUNT = 6;
export const WORKSHOP_UTC_OFFSET_HOURS = 7; // WIB (Asia/Jakarta, UTC+7, no DST)
export const DEFAULT_ON_DUTY_SPREADSHEET_ID =
  '1MadJd2v_fD0-akeXeIqSrF5pF3b2scH9QLhizGPbfas';
export const DEFAULT_ON_DUTY_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_ON_DUTY_SPREADSHEET_ID}`;
export const ON_DUTY_SHEET_RANGE = 'A1:Z10';

const SPREADSHEET_ID_RE = /^[A-Za-z0-9_-]{20,}$/;
const PUBLISHED_SHEET_PATH_RE =
  /^\/spreadsheets\/d\/e\/[A-Za-z0-9_-]{20,}\/pub(?:html)?$/;

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const MONTH_NAME_MAP: Record<string, number> = {
  januari: 1,
  january: 1,
  jan: 1,
  februari: 2,
  pebruari: 2,
  february: 2,
  feb: 2,
  maret: 3,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mei: 5,
  may: 5,
  juni: 6,
  june: 6,
  jun: 6,
  juli: 7,
  july: 7,
  jul: 7,
  agustus: 8,
  august: 8,
  agu: 8,
  agt: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  oktober: 10,
  october: 10,
  okt: 10,
  oct: 10,
  november: 11,
  nov: 11,
  nop: 11,
  desember: 12,
  december: 12,
  des: 12,
  dec: 12,
};

export const DEFAULT_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-matheo-jackson',
    name: 'Matheo Jackson',
    role: 'Owner Workshop',
    photoUrl: '/src/assets/images/staff_marcus_reid_1795571872234.jpg',
    status: 'off-duty',
  },
  {
    id: 'staff-ara-viara',
    name: 'Ara Viara',
    role: 'Management Workshop',
    photoUrl: '/src/assets/images/staff_ara_viara_1795571872951.jpg',
    status: 'off-duty',
  },
  {
    id: 'staff-jett-montreve',
    name: 'Jett Montreve',
    role: 'WAA&Loco Specialist',
    photoUrl: '/src/assets/images/staff_jett_montreve_1795571872151.jpg',
    status: 'off-duty',
  },
  {
    id: 'staff-anthony-prudencio',
    name: 'Anthony Prudencio',
    role: 'Mechanic',
    photoUrl: '/src/assets/images/staff_anthony_prudencio_1795571871149.jpg',
    status: 'off-duty',
    matchAliases: ['Anthony Pruidencio'],
  },
  {
    id: 'staff-jeevaa-pritchard',
    name: 'Jeevaa Pritchard',
    role: 'Mechanic',
    photoUrl: '/src/assets/images/staff_gallagher_oakley_1795571872609.jpg',
    status: 'off-duty',
    matchAliases: ['Jeeva Pritchard'],
  },
  {
    id: 'staff-dominico-campbell',
    name: 'Dominico Campbell',
    role: 'Mechanic',
    photoUrl: '/src/assets/images/staff_dominico_campbell_1795571872198.jpg',
    status: 'off-duty',
  },
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatIndonesianDate(year: number, month: number, day: number): string {
  const monthName = INDONESIAN_MONTHS[month - 1] ?? String(month);
  return `${day} ${monthName} ${year}`;
}

export function wibDateTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0
): number {
  return Date.UTC(year, month - 1, day, hour - WORKSHOP_UTC_OFFSET_HOURS, minute, 0, 0);
}

export function getWibDateTimeParts(now: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  formattedTime: string;
  formattedDateId: string;
} {
  const shifted = new Date(now.getTime() + WORKSHOP_UTC_OFFSET_HOURS * 3_600_000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  return {
    year,
    month,
    day,
    hour,
    minute,
    formattedTime: `${pad2(hour)}:${pad2(minute)}`,
    formattedDateId: formatIndonesianDate(year, month, day),
  };
}

function buildValidatedCalendarDate(
  year: number,
  month: number,
  day: number,
  rawLabel: string
): CalendarDate | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return {
    year,
    month,
    day,
    rawLabel: rawLabel.trim(),
    formattedId: formatIndonesianDate(year, month, day),
  };
}

export function compareCalendarDates(
  a: Pick<CalendarDate, 'year' | 'month' | 'day'>,
  b: Pick<CalendarDate, 'year' | 'month' | 'day'>
): -1 | 0 | 1 {
  const aKey = a.year * 10_000 + a.month * 100 + a.day;
  const bKey = b.year * 10_000 + b.month * 100 + b.day;
  if (aKey < bKey) return -1;
  if (aKey > bKey) return 1;
  return 0;
}

/**
 * Parses common Indonesian, English, and numeric dates found in workshop spreadsheets:
 * e.g., "25 November 2026", "Rabu, 25 Nov 2026", "November 25, 2026", "2026-11-25", "25/11/2026".
 */
export function parseSpreadsheetDate(raw: string): CalendarDate | null {
  const trimmed = raw
    .replace(/[\r\n\t\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!trimmed || trimmed.length > 64) return null;

  // Strip optional leading weekday prefix like "Rabu, " or "Wednesday - "
  const cleaned = trimmed.replace(
    /^(?:senin|selasa|rabu|kamis|jum'?at|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\s*[,\-|:]\s*/i,
    ''
  );

  // 1) DD MonthName YYYY (Indonesian & English)
  const dmyText = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})$/);
  if (dmyText) {
    const day = Number.parseInt(dmyText[1], 10);
    const month = MONTH_NAME_MAP[dmyText[2].toLowerCase()];
    const year = Number.parseInt(dmyText[3], 10);
    if (month) return buildValidatedCalendarDate(year, month, day, trimmed);
  }

  // 2) MonthName DD[,] YYYY
  const mdyText = cleaned.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i);
  if (mdyText) {
    const month = MONTH_NAME_MAP[mdyText[1].toLowerCase()];
    const day = Number.parseInt(mdyText[2], 10);
    const year = Number.parseInt(mdyText[3], 10);
    if (month) return buildValidatedCalendarDate(year, month, day, trimmed);
  }

  // 3) ISO YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1], 10);
    const month = Number.parseInt(isoMatch[2], 10);
    const day = Number.parseInt(isoMatch[3], 10);
    return buildValidatedCalendarDate(year, month, day, trimmed);
  }

  // 4) Numeric DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (falls back to MM/DD/YYYY if second part > 12)
  const numericMatch = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (numericMatch) {
    const first = Number.parseInt(numericMatch[1], 10);
    const second = Number.parseInt(numericMatch[2], 10);
    const year = Number.parseInt(numericMatch[3], 10);
    if (second > 12 && first <= 12) {
      return buildValidatedCalendarDate(year, first, second, trimmed);
    }
    return buildValidatedCalendarDate(year, second, first, trimmed);
  }

  return null;
}

/**
 * Parses shift hour ranges from Column A such as "00:00 - 04:00", "08.00 - 12.00 WIB", "20:00 - 00:00".
 */
export function parseShiftTimeRange(raw: string): ShiftTimeRange | null {
  const cleaned = raw.replace(/[\r\n\t\u0000-\u001F\u007F]/g, ' ').trim();
  if (!cleaned) return null;

  const match = cleaned.match(
    /(\d{1,2})[:.](\d{2})\s*(?:-|–|—|s\/?d|to)\s*(\d{1,2})[:.](\d{2})/i
  );
  if (!match) return null;

  const startHour = Number.parseInt(match[1], 10);
  const startMinute = Number.parseInt(match[2], 10);
  const endHour = Number.parseInt(match[3], 10);
  const endMinute = Number.parseInt(match[4], 10);

  if (
    startHour < 0 ||
    startHour > 23 ||
    startMinute < 0 ||
    startMinute > 59 ||
    endHour < 0 ||
    endHour > 24 ||
    endMinute < 0 ||
    endMinute > 59 ||
    (endHour === 24 && endMinute > 0)
  ) {
    return null;
  }

  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  const crossesMidnight = endTotal <= startTotal;

  return {
    startHour,
    startMinute,
    endHour,
    endMinute,
    crossesMidnight,
    label: `${pad2(startHour)}:${pad2(startMinute)} - ${pad2(endHour)}:${pad2(endMinute)}`,
  };
}

export function isSafeImageUrl(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/src/assets/') || trimmed.startsWith('/assets/')) {
    return !trimmed.includes('..');
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;
  return true;
}

export function getStaffInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function normalizeNameKey(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\r\n\t\u0000-\u001F\u007F]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Extracts a validated Google Spreadsheet ID from either a full docs.google.com/spreadsheets/d/<ID> URL
 * or a raw spreadsheet ID string. Rejects non-Google hosts and malformed IDs.
 */
export function extractSpreadsheetId(rawUrlOrId: string): string {
  const trimmed = rawUrlOrId.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
  if (!trimmed) return '';
  if (SPREADSHEET_ID_RE.test(trimmed)) return trimmed;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'https:') return '';
  if (parsed.hostname.toLowerCase() !== 'docs.google.com') return '';
  if (parsed.username || parsed.password || parsed.port) return '';

  const match = parsed.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})(?:\/|$)/);
  return match ? match[1] : '';
}

/**
 * Resolves either:
 * 1) A published-to-web Google Sheets CSV URL (/spreadsheets/d/e/2PACX-.../pub?output=csv), OR
 * 2) A standard Google Spreadsheet URL/ID (/spreadsheets/d/<ID>) converted to gviz A1:Z10 CSV.
 * Strictly allows only HTTPS docs.google.com spreadsheet endpoints.
 */
export function resolveOnDutySheetSource(
  rawUrlOrId: string = DEFAULT_ON_DUTY_SPREADSHEET_URL,
  range: string = ON_DUTY_SHEET_RANGE
): ResolvedSheetSource | null {
  const trimmed = rawUrlOrId.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
  if (!trimmed) return null;

  // Check published-to-web CSV URL first: https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?...
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === 'https:' &&
      parsed.hostname.toLowerCase() === 'docs.google.com' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      PUBLISHED_SHEET_PATH_RE.test(parsed.pathname)
    ) {
      const pubUrl = new URL(parsed.toString());
      pubUrl.pathname = pubUrl.pathname.replace(/\/pubhtml$/, '/pub');
      pubUrl.searchParams.set('output', 'csv');
      return {
        csvUrl: pubUrl.toString(),
        mode: 'published-sheet',
      };
    }
  } catch {
    // Not a full URL; fall through to raw spreadsheet ID handling
  }

  const spreadsheetId = extractSpreadsheetId(trimmed);
  if (!spreadsheetId) return null;
  const safeRange = /^[A-Z]+\d+:[A-Z]+\d+$/.test(range.trim())
    ? range.trim()
    : ON_DUTY_SHEET_RANGE;

  return {
    csvUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&range=${encodeURIComponent(safeRange)}`,
    mode: 'gviz-range',
  };
}

export function buildOnDutySheetCsvUrl(
  rawUrlOrId: string = DEFAULT_ON_DUTY_SPREADSHEET_URL,
  range: string = ON_DUTY_SHEET_RANGE
): string {
  return resolveOnDutySheetSource(rawUrlOrId, range)?.csvUrl ?? '';
}

/**
 * Parses RFC-4180 CSV text into rows of string cells without using eval or regex backtracking.
 */
export function parseCsvMatrix(csvText: string): string[][] {
  const cleaned = csvText.replace(/^\uFEFF/, '');
  if (!cleaned.trim()) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r') {
      if (cleaned[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function splitCellIntoNames(rawCell: string): string[] {
  const normalized = rawCell
    .replace(/[\r\n\t\u0000-\u001F\u007F]/g, ' ')
    .trim();
  if (!normalized || normalized === '-' || normalized.toLowerCase() === 'none') {
    return [];
  }

  // Handle cells containing multiple mechanics like "Anthony Prudencio & Ara Viara"
  return normalized
    .split(/\s*(?:&|,|\/|\+|;|\|)\s*|\s+dan\s+/i)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 0 && part !== '-' && part.toLowerCase() !== 'none');
}

/**
 * Parses the full workshop shift schedule from the Google Sheets CSV:
 * - Reads date header(s) from rows above the shift slots (e.g. Row 2 "25 November 2026")
 * - Reads shift time windows from Column A (e.g. "00:00 - 04:00" .. "20:00 - 00:00")
 * - Reads assigned mechanic names from Column B (and additional columns if present)
 * Falls back to legacy single-column name list when no shift time windows exist.
 */
export function parseScheduleFromCsv(csvText: string): ParsedSheetSchedule {
  const matrix = parseCsvMatrix(csvText);
  if (matrix.length === 0) {
    return {
      hasScheduleStructure: false,
      sheetDate: null,
      dates: [],
      entries: [],
      legacyNames: [],
    };
  }

  const shiftRows: Array<{ rowIndex: number; timeRange: ShiftTimeRange; row: string[] }> = [];
  for (let r = 0; r < matrix.length; r += 1) {
    const firstCell = matrix[r]?.[0] ?? '';
    const parsedRange = parseShiftTimeRange(firstCell);
    if (parsedRange) {
      shiftRows.push({ rowIndex: r, timeRange: parsedRange, row: matrix[r] });
    }
  }

  if (shiftRows.length === 0) {
    const legacyNames: string[] = [];
    for (const row of matrix) {
      const cell = row[1] ?? row[0] ?? '';
      legacyNames.push(...splitCellIntoNames(cell));
    }
    return {
      hasScheduleStructure: false,
      sheetDate: null,
      dates: [],
      entries: [],
      legacyNames,
    };
  }

  const firstShiftRowIndex = shiftRows[0].rowIndex;
  const colDates = new Map<number, CalendarDate>();
  const dates: CalendarDate[] = [];
  const seenDateKeys = new Set<string>();
  let primaryDate: CalendarDate | null = null;

  // Prefer scanning header rows right above the first shift row (row 2 first, then row 1)
  const headerIndices: number[] = [];
  for (let r = firstShiftRowIndex - 1; r >= 0; r -= 1) {
    headerIndices.push(r);
  }

  for (const r of headerIndices) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < row.length; c += 1) {
      const parsedDate = parseSpreadsheetDate(row[c] ?? '');
      if (parsedDate) {
        if (!colDates.has(c)) {
          colDates.set(c, parsedDate);
        }
        if (!primaryDate) {
          primaryDate = parsedDate;
        }
        const key = `${parsedDate.year}-${parsedDate.month}-${parsedDate.day}`;
        if (!seenDateKeys.has(key)) {
          seenDateKeys.add(key);
          dates.push(parsedDate);
        }
      }
    }
  }

  let maxCols = 2;
  for (const { row } of shiftRows) {
    if (row.length > maxCols) maxCols = row.length;
  }
  for (const colIdx of colDates.keys()) {
    if (colIdx + 1 > maxCols) maxCols = colIdx + 1;
  }

  // Only consider columns >= 1 that have either a column date or any mechanic entry in shift rows
  const activeCols: number[] = [];
  for (let c = 1; c < maxCols; c += 1) {
    const hasDate = colDates.has(c);
    const hasShiftContent = shiftRows.some(({ row }) => (row[c] ?? '').trim().length > 0);
    if (c === 1 || hasDate || hasShiftContent) {
      activeCols.push(c);
    }
  }

  const entries: ParsedShiftEntry[] = [];
  for (const c of activeCols) {
    // Inherit nearest date at or to the left of column c, else primaryDate
    let colDate: CalendarDate | null = colDates.get(c) ?? null;
    if (!colDate) {
      for (let left = c - 1; left >= 0; left -= 1) {
        if (colDates.has(left)) {
          colDate = colDates.get(left) ?? null;
          break;
        }
      }
    }
    if (!colDate) colDate = primaryDate;

    for (const { timeRange, row } of shiftRows) {
      const names = splitCellIntoNames(row[c] ?? '');
      entries.push({
        timeRange,
        date: colDate,
        names,
      });
    }
  }

  return {
    hasScheduleStructure: true,
    sheetDate: primaryDate,
    dates,
    entries,
    legacyNames: [],
  };
}

/**
 * Extracts active On Duty names from Google Sheets CSV.
 * When the CSV contains shift schedule rows, returns names whose shift is active at `now` (WIB).
 */
export function parseOnDutyNamesFromCsv(
  csvText: string,
  mode: 'gviz-range' | 'published-sheet' = 'gviz-range',
  now: Date = new Date()
): string[] {
  const schedule = parseScheduleFromCsv(csvText);
  if (schedule.hasScheduleStructure) {
    return evaluateScheduleAtTime(schedule, now).onDutyNames;
  }

  const matrix = parseCsvMatrix(csvText);
  if (matrix.length === 0) return [];

  const targetCells: string[] =
    mode === 'published-sheet'
      ? matrix.slice(2, 8).map((row) => row[1] ?? '')
      : matrix.map((row) => row[0] ?? '');

  const names: string[] = [];
  for (const rawCell of targetCells) {
    names.push(...splitCellIntoNames(rawCell));
  }
  return names;
}

function memberMatchesNames(member: StaffMember, names: string[]): boolean {
  const normalizedEntries = names.map((n) => normalizeNameKey(n)).filter(Boolean);
  if (normalizedEntries.length === 0) return false;
  const normalizedSet = new Set(normalizedEntries);

  const candidateKeys = [
    normalizeNameKey(member.name),
    ...(member.matchAliases ?? []).map((alias) => normalizeNameKey(alias)),
  ].filter(Boolean);

  return candidateKeys.some(
    (key) =>
      normalizedSet.has(key) ||
      normalizedEntries.some((entry) => ` ${entry} `.includes(` ${key} `))
  );
}

/**
 * Maps the 6 workshop staff members against a flat list of active names.
 */
export function applyOnDutyNamesToRoster(
  onDutyNames: string[],
  baseRoster: StaffMember[] = DEFAULT_STAFF_MEMBERS
): StaffMember[] {
  return baseRoster.slice(0, STAFF_COUNT).map((member) => {
    const isOnDuty = memberMatchesNames(member, onDutyNames);
    return {
      ...member,
      status: isOnDuty ? 'on-duty' : 'off-duty',
      shiftLabel: undefined,
      shiftState: isOnDuty ? 'active' : 'none',
    };
  });
}

function getShiftWindowUtcMs(
  date: Pick<CalendarDate, 'year' | 'month' | 'day'>,
  timeRange: ShiftTimeRange
): { startMs: number; endMs: number } {
  const startMs = wibDateTimeToUtcMs(
    date.year,
    date.month,
    date.day,
    timeRange.startHour,
    timeRange.startMinute
  );
  const endDayOffset = timeRange.crossesMidnight ? 1 : 0;
  const endMs = wibDateTimeToUtcMs(
    date.year,
    date.month,
    date.day + endDayOffset,
    timeRange.endHour,
    timeRange.endMinute
  );
  return { startMs, endMs };
}

/**
 * Evaluates a parsed spreadsheet schedule against the current WIB date & time.
 * Mechanics are marked 'on-duty' strictly when their scheduled date + shift window is active right now;
 * once the shift end time passes (or if the spreadsheet date has passed / hasn't started), they are 'off-duty'.
 */
export function evaluateScheduleAtTime(
  schedule: ParsedSheetSchedule,
  now: Date = new Date(),
  baseRoster: StaffMember[] = DEFAULT_STAFF_MEMBERS
): EvaluatedScheduleResult {
  const wibNow = getWibDateTimeParts(now);

  if (!schedule.hasScheduleStructure) {
    const staff = applyOnDutyNamesToRoster(schedule.legacyNames, baseRoster);
    return {
      staff,
      onDutyNames: schedule.legacyNames,
      sheetDate: null,
      dateRelation: 'unspecified',
      activeShiftLabel: null,
      currentWibTime: wibNow.formattedTime,
      currentWibDate: wibNow.formattedDateId,
    };
  }

  const nowMs = now.getTime();
  const todayRef = { year: wibNow.year, month: wibNow.month, day: wibNow.day };

  let displayDate: CalendarDate | null = schedule.sheetDate;
  let dateRelation: ScheduleDateRelation = 'unspecified';

  const matchingTodayDate = schedule.dates.find(
    (d) => compareCalendarDates(d, todayRef) === 0
  );
  if (matchingTodayDate) {
    displayDate = matchingTodayDate;
    dateRelation = 'today';
  } else if (displayDate) {
    const cmp = compareCalendarDates(displayDate, todayRef);
    dateRelation = cmp < 0 ? 'past' : cmp > 0 ? 'future' : 'today';
  }

  type ClassifiedEntry = {
    entry: ParsedShiftEntry;
    state: 'active' | 'completed' | 'upcoming';
    startMs: number;
    endMs: number;
  };

  const classified: ClassifiedEntry[] = schedule.entries.map((entry) => {
    const effectiveDate = entry.date ?? todayRef;
    const { startMs, endMs } = getShiftWindowUtcMs(effectiveDate, entry.timeRange);
    let state: 'active' | 'completed' | 'upcoming';
    if (nowMs >= startMs && nowMs < endMs) {
      state = 'active';
    } else if (nowMs >= endMs) {
      state = 'completed';
    } else {
      state = 'upcoming';
    }
    return { entry, state, startMs, endMs };
  });

  const activeEntries = classified.filter((c) => c.state === 'active');
  const activeShiftLabel = activeEntries[0]?.entry.timeRange.label ?? null;

  const onDutyNames: string[] = [];
  for (const item of activeEntries) {
    for (const name of item.entry.names) {
      if (!onDutyNames.includes(name)) {
        onDutyNames.push(name);
      }
    }
  }

  const staff = baseRoster.slice(0, STAFF_COUNT).map((member) => {
    const matched = classified.filter((item) =>
      memberMatchesNames(member, item.entry.names)
    );

    const activeMatch = matched.find((m) => m.state === 'active');
    if (activeMatch) {
      return {
        ...member,
        status: 'on-duty' as StaffDutyStatus,
        shiftState: 'active' as StaffShiftState,
        shiftLabel: activeMatch.entry.timeRange.label,
      };
    }

    const upcomingMatches = matched
      .filter((m) => m.state === 'upcoming')
      .sort((a, b) => a.startMs - b.startMs);
    if (upcomingMatches.length > 0) {
      return {
        ...member,
        status: 'off-duty' as StaffDutyStatus,
        shiftState: 'upcoming' as StaffShiftState,
        shiftLabel: upcomingMatches[0].entry.timeRange.label,
      };
    }

    const completedMatches = matched
      .filter((m) => m.state === 'completed')
      .sort((a, b) => b.endMs - a.endMs);
    if (completedMatches.length > 0) {
      return {
        ...member,
        status: 'off-duty' as StaffDutyStatus,
        shiftState: 'completed' as StaffShiftState,
        shiftLabel: completedMatches[0].entry.timeRange.label,
      };
    }

    return {
      ...member,
      status: 'off-duty' as StaffDutyStatus,
      shiftState: 'none' as StaffShiftState,
      shiftLabel: undefined,
    };
  });

  return {
    staff,
    onDutyNames,
    sheetDate: displayDate,
    dateRelation,
    activeShiftLabel,
    currentWibTime: wibNow.formattedTime,
    currentWibDate: wibNow.formattedDateId,
  };
}

export async function fetchOnDutyRosterFromSheet(params?: {
  sheetUrl?: string;
  range?: string;
  roster?: StaffMember[];
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<StaffFetchResult> {
  const baseRoster = params?.roster ?? DEFAULT_STAFF_MEMBERS;
  const now = params?.now ?? new Date();
  const resolved = resolveOnDutySheetSource(
    params?.sheetUrl || DEFAULT_ON_DUTY_SPREADSHEET_URL,
    params?.range || ON_DUTY_SHEET_RANGE
  );

  if (!resolved) {
    return {
      staff: baseRoster.slice(0, STAFF_COUNT),
      source: 'default',
      onDutyNames: [],
      schedule: null,
      sheetDate: null,
      dateRelation: 'unspecified',
      activeShiftLabel: null,
      error: 'Link Google Spreadsheet tidak valid.',
    };
  }

  const fetchFn = params?.fetchImpl ?? fetch;

  try {
    const response = await fetchFn(resolved.csvUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        staff: baseRoster.slice(0, STAFF_COUNT),
        source: 'default',
        onDutyNames: [],
        schedule: null,
        sheetDate: null,
        dateRelation: 'unspecified',
        activeShiftLabel: null,
        error: 'Gagal membaca jadwal On Duty dari Google Sheets.',
      };
    }

    const csvText = await response.text();
    const schedule = parseScheduleFromCsv(csvText);
    const evaluated = evaluateScheduleAtTime(schedule, now, baseRoster);

    return {
      staff: evaluated.staff,
      source: 'live',
      onDutyNames: evaluated.onDutyNames,
      schedule,
      sheetDate: evaluated.sheetDate,
      dateRelation: evaluated.dateRelation,
      activeShiftLabel: evaluated.activeShiftLabel,
      updatedAt: now.toISOString(),
    };
  } catch {
    return {
      staff: baseRoster.slice(0, STAFF_COUNT),
      source: 'default',
      onDutyNames: [],
      schedule: null,
      sheetDate: null,
      dateRelation: 'unspecified',
      activeShiftLabel: null,
      error: 'Tidak dapat terhubung ke Google Sheets saat ini.',
    };
  }
}
