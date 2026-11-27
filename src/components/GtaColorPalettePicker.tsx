import { useEffect, useState } from 'react';
import { Grid2x2, Palette, X } from 'lucide-react';
import {
  GTA_VEHICLE_COLORS,
  getGtaVehicleColorById,
} from '../data/gtaVehicleColors';

interface GtaColorPalettePickerProps {
  /** Field label (e.g., "Change Color (Color 1)" or "Warna Sekunder (Color 2)") */
  label: string;
  /** Currently selected official GTA:SA / SA-MP color ID (0-255), or null if using stock color */
  selectedId: number | null;
  /** Default stock color ID shown as preview when selectedId is null */
  defaultId: number;
  /** Whether a paid Change Color fee is currently active */
  isActive?: boolean;
  /** Price text shown on the right (optional, e.g. "$88.00") */
  priceLabel?: string;
  /** Optional reset button callback (e.g., to clear Change Color) */
  onReset?: () => void;
  /** Reset button label */
  resetLabel?: string;
  /** Called whenever the user picks or enters a valid color ID (0-255) */
  onSelectColorId: (colorId: number) => void;
  /** Light surface (Preview 3D) or dark surface (Cost Calculator) */
  theme?: 'light' | 'dark';
  /** Unique test id prefix */
  testIdPrefix: string;
}

export function GtaColorPalettePicker({
  label,
  selectedId,
  defaultId,
  isActive = false,
  priceLabel,
  onReset,
  resetLabel = 'Reset Warna',
  onSelectColorId,
  theme = 'light',
  testIdPrefix,
}: GtaColorPalettePickerProps) {
  const effectiveId = selectedId ?? defaultId;
  const activeColor = getGtaVehicleColorById(effectiveId) ?? GTA_VEHICLE_COLORS[1];

  const [inputText, setInputText] = useState<string>(String(effectiveId));
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setInputText(String(effectiveId));
  }, [effectiveId]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen]);

  const handleInputChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^\d]/g, '').slice(0, 3);
    setInputText(digitsOnly);
    if (digitsOnly === '') return;
    const parsed = Number.parseInt(digitsOnly, 10);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 255) {
      onSelectColorId(parsed);
    }
  };

  const handleInputBlur = () => {
    if (inputText === '') {
      setInputText(String(effectiveId));
      return;
    }
    const parsed = Number.parseInt(inputText, 10);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
      const clamped = Math.max(0, Math.min(255, Number.isNaN(parsed) ? effectiveId : parsed));
      setInputText(String(clamped));
      onSelectColorId(clamped);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div data-testid={`${testIdPrefix}-picker`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            isDark ? 'text-[#E5E7EB]' : 'text-[#111317]'
          }`}
        >
          <Palette
            className={`w-3.5 h-3.5 ${isDark ? 'text-[#9AA4B2]' : 'text-[#6B7280]'}`}
            aria-hidden="true"
          />
          {label}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {onReset && isActive && (
            <button
              type="button"
              data-testid={`${testIdPrefix}-reset`}
              onClick={onReset}
              className={`text-[11px] font-semibold cursor-pointer hover:underline ${
                isDark
                  ? 'text-[#9AA4B2] hover:text-[#F87171]'
                  : 'text-[#6B7280] hover:text-[#D93025]'
              }`}
            >
              {resetLabel}
            </button>
          )}
          {priceLabel && (
            <span
              className={`text-[11px] font-mono font-semibold tabular-nums ${
                isActive
                  ? isDark
                    ? 'text-[#F87171]'
                    : 'text-[#D93025]'
                  : isDark
                    ? 'text-[#9AA4B2]'
                    : 'text-[#6B7280]'
              }`}
            >
              {priceLabel}
            </span>
          )}
        </div>
      </div>

      {/* Active color readout + ID input + Full chart trigger */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div
          className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-xs ${
            isDark
              ? 'bg-[#111317] border-[#2D3340] text-[#E5E7EB]'
              : 'bg-white border-[#CBD2DC] text-[#111317]'
          }`}
        >
          <span
            className="w-5 h-5 rounded-sm border border-black/25 inline-flex items-center justify-center font-mono text-[9px] font-bold shrink-0"
            style={{
              backgroundColor: activeColor.hex,
              color: activeColor.isLight ? '#111317' : '#FFFFFF',
            }}
            aria-hidden="true"
          >
            {activeColor.id}
          </span>
          <span
            data-testid={`${testIdPrefix}-active-label`}
            className="font-mono text-[11px] font-semibold tabular-nums"
          >
            ID {activeColor.id}
          </span>
          <span
            className={`font-mono text-[10px] ${
              isDark ? 'text-[#9AA4B2]' : 'text-[#6B7280]'
            }`}
          >
            {activeColor.hex}
          </span>
        </div>

        <label className="inline-flex items-center gap-1.5">
          <span
            className={`text-[11px] font-medium ${
              isDark ? 'text-[#9AA4B2]' : 'text-[#525C6A]'
            }`}
          >
            ID:
          </span>
          <input
            type="text"
            inputMode="numeric"
            aria-label={`Masukkan ID Warna ${label} (0-255)`}
            data-testid={`${testIdPrefix}-id-input`}
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleInputBlur}
            placeholder="0-255"
            className={`w-14 px-2 py-1 rounded border font-mono text-xs tabular-nums focus:outline-none ${
              isDark
                ? 'bg-[#111317] border-[#323846] text-white focus:border-white'
                : 'bg-white border-[#CBD2DC] text-[#111317] focus:border-[#111317]'
            }`}
          />
        </label>

        <button
          type="button"
          data-testid={`${testIdPrefix}-open-modal`}
          onClick={() => setModalOpen(true)}
          className={`ml-auto inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
            isDark
              ? 'bg-[#111317] border-[#323846] text-[#E5E7EB] hover:border-white hover:text-white'
              : 'bg-white border-[#CBD2DC] text-[#111317] hover:border-[#111317] hover:bg-[#F3F4F6]'
          }`}
        >
          <Grid2x2 className="w-3 h-3" aria-hidden="true" />
          <span>Tabel 0–255</span>
        </button>
      </div>

      {/* Inline scrollable 0–255 swatch grid */}
      <div
        role="group"
        aria-label={`Palet warna ${label} (ID 0 sampai 255)`}
        className={`grid gap-1 p-1.5 rounded-md border max-h-[146px] overflow-y-auto ${
          isDark
            ? 'grid-cols-8 sm:grid-cols-12 bg-[#111317] border-[#2D3340]'
            : 'grid-cols-8 bg-[#F6F7F9] border-[#DCE1E8]'
        }`}
      >
        {GTA_VEHICLE_COLORS.map((swatch) => {
          const isSelected = selectedId === swatch.id;
          return (
            <button
              key={swatch.id}
              type="button"
              data-testid={`${testIdPrefix}-swatch-${swatch.id}`}
              aria-label={`${label} ID ${swatch.id}`}
              aria-pressed={isSelected}
              title={`ID ${swatch.id} (${swatch.hex})`}
              onClick={() => onSelectColorId(swatch.id)}
              className={`h-6 rounded-[3px] font-mono text-[10px] font-bold leading-none tabular-nums flex items-center justify-center transition-transform cursor-pointer border ${
                isSelected
                  ? 'ring-2 ring-[#D93025] border-white scale-[1.06] z-10'
                  : 'border-black/20 hover:scale-105 hover:z-10'
              }`}
              style={{
                backgroundColor: swatch.hex,
                color: swatch.isLight ? '#111317' : '#FFFFFF',
              }}
            >
              {swatch.id}
            </button>
          );
        })}
      </div>

      {/* Full 24-column Reference Palette Modal (mirrors official 0–255 chart) */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Tabel Palet Warna Kendaraan 0–255 (${label})`}
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[1060px] max-h-[90vh] bg-white text-[#111317] rounded-xl border border-[#DCE1E8] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 sm:px-5 py-3.5 border-b border-[#E6EAF0] flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold text-[#111317]">
                  Palet Warna Kendaraan Resmi (ID 0–255)
                </h3>
                <p className="text-xs text-[#525C6A] mt-0.5">
                  {label} · Terpilih saat ini:{' '}
                  <strong className="font-mono text-[#111317]">
                    ID {activeColor.id} ({activeColor.hex})
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup tabel palet warna"
                className="w-9 h-9 rounded-md border border-[#DCE1E8] inline-flex items-center justify-center text-[#111317] hover:bg-[#F6F7F9] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-3 sm:p-4 overflow-auto bg-[#F8FAFC]">
              <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-24 gap-1 min-w-[300px]">
                {GTA_VEHICLE_COLORS.map((swatch) => {
                  const isSelected = selectedId === swatch.id;
                  return (
                    <button
                      key={`modal-${swatch.id}`}
                      type="button"
                      data-testid={`${testIdPrefix}-modal-swatch-${swatch.id}`}
                      aria-label={`Pilih ${label} ID ${swatch.id}`}
                      aria-pressed={isSelected}
                      title={`ID ${swatch.id} (${swatch.hex})`}
                      onClick={() => {
                        onSelectColorId(swatch.id);
                        setModalOpen(false);
                      }}
                      className={`aspect-square rounded-[3px] font-mono text-[11px] font-bold tabular-nums flex items-center justify-center border transition-transform cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-[#D93025] ring-offset-1 border-white scale-110 z-10'
                          : 'border-black/15 hover:scale-110 hover:z-10'
                      }`}
                      style={{
                        backgroundColor: swatch.hex,
                        color: swatch.isLight ? '#111317' : '#FFFFFF',
                      }}
                    >
                      {swatch.id}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
