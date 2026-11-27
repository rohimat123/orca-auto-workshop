import type { GoogleFormConfig } from '../utils/googleFormOrder';
import { DEFAULT_ON_DUTY_SPREADSHEET_URL } from '../utils/staffRoster';

/**
 * Konfigurasi publik Google Form (Order Kalkulator) & Google Sheets Status On Duty (B3:B8).
 * Aman di frontend karena TIDAK berisi secret (webhook Discord tetap hanya di Apps Script).
 */
export const GOOGLE_FORM_CONFIG: GoogleFormConfig = {
  actionUrl: import.meta.env.VITE_GOOGLE_FORM_ACTION_URL ?? '',
  entries: {
    buyerName: import.meta.env.VITE_GOOGLE_FORM_ENTRY_BUYER ?? '',
    vehicle: import.meta.env.VITE_GOOGLE_FORM_ENTRY_VEHICLE ?? '',
    items: import.meta.env.VITE_GOOGLE_FORM_ENTRY_ITEMS ?? '',
    total: import.meta.env.VITE_GOOGLE_FORM_ENTRY_TOTAL ?? '',
  },
};

export const ON_DUTY_SHEET_URL: string =
  import.meta.env.VITE_ON_DUTY_SHEET_URL || DEFAULT_ON_DUTY_SPREADSHEET_URL;
