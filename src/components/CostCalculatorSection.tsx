import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Copy, Loader2, RotateCcw, Send, Trash2, User } from 'lucide-react';
import {
  ALL_VEHICLES,
  CHANGE_COLOR_PRICE,
  LOCOLOW_VEHICLES,
  NITRO_OPTIONS,
  NON_WAA_LOCOLOW_VEHICLES,
  PAINTJOB_PRICE,
  UPGRADE_OPTIONS,
  UPGRADE_UNIT_PRICE,
  WAA_VEHICLES,
  WHEELS,
  getVehicleSlotsWithParts,
  isTwoColorLocolowVehicle,
  isVelgNitroOnlyVehicle,
  type BodyPartSlot,
  type ModStyle,
  type UpgradeId,
} from '../data/workshopData';
import { VEHICLE_3D_ASSETS, getVehiclePaintjobs } from '../data/gta3Assets';
import { GtaColorPalettePicker } from './GtaColorPalettePicker';
import { GOOGLE_FORM_CONFIG } from '../config/googleFormConfig';
import {
  buildShoppingNoteText,
  calculateOrder,
  formatUSD,
  type SelectedBodyParts,
} from '../utils/calculator';
import {
  MAX_BUYER_NAME_LENGTH,
  SUBMIT_COOLDOWN_MS,
  submitOrderToGoogleForm,
} from '../utils/googleFormOrder';

interface CostCalculatorSectionProps {
  vehicleId: string;
  upgradeIds: UpgradeId[];
  nitroId: string | null;
  wheelId: string | null;
  bodyParts: SelectedBodyParts;
  paintjobId: number | null;
  changeColor: boolean;
  primaryColorId: number | null;
  secondaryColorId: number | null;
  onChangeVehicle: (vehicleId: string) => void;
  onToggleUpgrade: (upgradeId: UpgradeId) => void;
  onSelectAllUpgrades: () => void;
  onClearUpgrades: () => void;
  onChangeNitro: (nitroId: string | null) => void;
  onChangeWheel: (wheelId: string | null) => void;
  onToggleBodyPart: (partId: string) => void;
  onSelectFullSet: (style: ModStyle) => void;
  onClearBodyParts: () => void;
  onRemoveSlot: (slot: BodyPartSlot) => void;
  onChangePaintjob: (paintjobId: number | null) => void;
  onChangeColor: (enabled: boolean) => void;
  onSelectPrimaryColorId: (colorId: number) => void;
  onSelectSecondaryColorId: (colorId: number) => void;
  onResetAll: () => void;
}

export function CostCalculatorSection({
  vehicleId,
  upgradeIds,
  nitroId,
  wheelId,
  bodyParts,
  paintjobId,
  changeColor,
  primaryColorId,
  secondaryColorId,
  onChangeVehicle,
  onToggleUpgrade,
  onSelectAllUpgrades,
  onClearUpgrades,
  onChangeNitro,
  onChangeWheel,
  onToggleBodyPart,
  onSelectFullSet,
  onClearBodyParts,
  onRemoveSlot,
  onChangePaintjob,
  onChangeColor,
  onSelectPrimaryColorId,
  onSelectSecondaryColorId,
  onResetAll,
}: CostCalculatorSectionProps) {
  const [buyerName, setBuyerName] = useState('');
  const [buyerNameError, setBuyerNameError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);
  const [noteCopied, setNoteCopied] = useState(false);
  const buyerInputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedAtRef = useRef<number>(0);
  const copyTimeoutRef = useRef<number | null>(null);

  const selectedVehicle =
    ALL_VEHICLES.find((v) => v.id === vehicleId) ?? ALL_VEHICLES[0];
  const vehicleAsset = VEHICLE_3D_ASSETS[selectedVehicle.id] ?? VEHICLE_3D_ASSETS.elegy;
  const velgNitroOnly = isVelgNitroOnlyVehicle(selectedVehicle.id);
  const canCombineSecondaryWithPaintjob = isTwoColorLocolowVehicle(selectedVehicle.id);
  const isWaa = selectedVehicle.category === 'WAA';
  const vehicleSlots = velgNitroOnly ? [] : getVehicleSlotsWithParts(selectedVehicle.id);
  const availablePaintjobs = velgNitroOnly ? [] : getVehiclePaintjobs(selectedVehicle.id);
  const isSecondaryWithPaintjobMode =
    !velgNitroOnly && canCombineSecondaryWithPaintjob && paintjobId !== null;

  const primaryStyle: ModStyle = isWaa ? 'X-FLOW' : 'SLAMIN';
  const secondaryStyle: ModStyle = isWaa ? 'ALIEN' : 'CHROMER';

  const breakdown = calculateOrder({
    vehicleId: selectedVehicle.id,
    upgradeIds,
    nitroId,
    wheelId,
    bodyParts,
    paintjobId,
    changeColor,
    primaryColorId,
    secondaryColorId,
  });

  const shoppingNote = buildShoppingNoteText(breakdown);

  const orderFingerprint = `${selectedVehicle.id}|${upgradeIds.join(',')}|${nitroId ?? ''}|${wheelId ?? ''}|${paintjobId ?? ''}|${changeColor ? '1' : '0'}|${primaryColorId ?? ''}|${secondaryColorId ?? ''}|${Object.entries(
    bodyParts
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v ?? ''}`)
    .join(',')}`;

  useEffect(() => {
    setSubmitState('idle');
    setSubmitFeedback(null);
    setNoteCopied(false);
  }, [orderFingerprint]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyShoppingNote = async () => {
    if (!shoppingNote) return;

    let copied = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shoppingNote);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      const textarea = document.createElement('textarea');
      textarea.value = shoppingNote;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      }
      document.body.removeChild(textarea);
    }

    if (copied) {
      setNoteCopied(true);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setNoteCopied(false);
      }, 2500);
    }
  };

  const handleSendToDiscord = async () => {
    if (breakdown.itemCount === 0 || submitState === 'sending') return;

    const now = Date.now();
    if (now - lastSubmittedAtRef.current < SUBMIT_COOLDOWN_MS) {
      setSubmitState('error');
      setSubmitFeedback('Tunggu beberapa detik sebelum mengirim pesanan lagi.');
      return;
    }

    setBuyerNameError(null);
    setSubmitState('sending');
    setSubmitFeedback(null);

    const result = await submitOrderToGoogleForm({
      breakdown,
      buyerName,
      config: GOOGLE_FORM_CONFIG,
    });

    if (!result.ok) {
      if (result.code === 'INVALID_BUYER_NAME') {
        setBuyerNameError(result.error);
        setSubmitState('idle');
        buyerInputRef.current?.focus();
        return;
      }
      setSubmitState('error');
      setSubmitFeedback(result.error);
      return;
    }

    lastSubmittedAtRef.current = Date.now();
    setSubmitState('sent');
    setSubmitFeedback(
      `Pesanan atas nama ${result.fields.buyerName} telah dikirim dan akan diteruskan otomatis ke Discord (@mechanic).`
    );
  };

  return (
    <section
      id="kalkulator"
      className="py-12 lg:py-16 bg-[#111317] text-[#F3F4F6] border-t border-[#22262E]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-[#F87171] mb-1.5">
              Kalkulator Biaya Belanja
            </p>
            <h2
              className="font-display font-bold text-white leading-[1.06] tracking-tight"
              style={{ fontSize: 'clamp(1.9rem, 3vw, 2.75rem)', textWrap: 'balance' }}
            >
              Hitung Total Biaya Sebelum Order
            </h2>
          </div>
          <p className="text-sm text-[#B4BCC8] max-w-md">
            Pilih kendaraan (WAA, Locolow, atau Non-WAA/Locolow khusus Change Color, Velg &amp; N2O)
            untuk menghitung total biaya belanja secara langsung.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left: Clean Step Controls */}
          <div className="lg:col-span-7 space-y-5">
            {/* 01. Kendaraan */}
            <div className="bg-[#181B22] border border-[#2A2F3A] rounded-xl p-5">
              <label
                htmlFor="calc-vehicle-select"
                className="block text-sm font-bold text-white mb-3"
              >
                01. Pilih Kendaraan (WAA, Locolow &amp; Non-WAA/Locolow)
              </label>
              <select
                id="calc-vehicle-select"
                value={selectedVehicle.id}
                onChange={(e) => onChangeVehicle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-white bg-[#111317] border border-[#323846] rounded-md focus:outline-none focus:border-white cursor-pointer"
              >
                <optgroup label="WAA (X-FLOW & ALIEN)">
                  {WAA_VEHICLES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (WAA)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Locolow (SLAMIN & CHROMER)">
                  {LOCOLOW_VEHICLES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Locolow)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Non-WAA & Locolow (Change Color, Velg & N2O)">
                  {NON_WAA_LOCOLOW_VEHICLES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Non-WAA/Locolow)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {velgNitroOnly && (
              <div
                data-testid="calc-velg-nitro-notice"
                className="bg-[#181B22] border border-[#323846] rounded-xl px-5 py-4"
              >
                <p className="text-sm font-semibold text-white">
                  Layanan Terbatas: Khusus Change Color, Velg &amp; Nitro (N2O)
                </p>
                <p className="text-xs text-[#B4BCC8] mt-1 leading-relaxed">
                  {selectedVehicle.name} termasuk kendaraan Non-WAA &amp; Locolow sehingga dapat
                  mengganti warna cat (Change Color), memasang Nitro (N2O), dan modifikasi Velg.
                </p>
              </div>
            )}

            {/* 02. Paintjob (WAA/Locolow) & Change Color (All vehicles; 2-color Locolow can combine Paintjob + Secondary) */}
            <div className="bg-[#181B22] border border-[#2A2F3A] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-white">
                  {velgNitroOnly
                    ? '02. Ganti Warna Cat Mobil (Change Color)'
                    : canCombineSecondaryWithPaintjob
                      ? '02. Paintjob & Change Color (2 Warna)'
                      : '02. Paintjob atau Change Color'}
                </p>
                <span className="text-xs font-mono text-[#9AA4B2] tabular-nums">
                  {velgNitroOnly
                    ? `Palet 0–255 · ${formatUSD(CHANGE_COLOR_PRICE)}`
                    : canCombineSecondaryWithPaintjob
                      ? `Paintjob + Sekunder · ${formatUSD(PAINTJOB_PRICE)} / item`
                      : `Pilih salah satu · ${formatUSD(PAINTJOB_PRICE)}`}
                </span>
              </div>

              {canCombineSecondaryWithPaintjob && (
                <p
                  data-testid="calc-two-color-locolow-note"
                  className="text-xs text-[#B4BCC8] bg-[#111317] border border-[#2D3340] rounded-md px-3 py-2 leading-relaxed"
                >
                  Khusus <strong className="text-white">{selectedVehicle.name}</strong> (2 warna
                  Locolow): Anda bisa menggunakan{' '}
                  <strong className="text-white">Paintjob</strong> sekaligus{' '}
                  <strong className="text-white">Change Color</strong> pada warna sekunder
                  (Color 2).
                </p>
              )}

              {!velgNitroOnly && availablePaintjobs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#B4BCC8] mb-2">
                    Paintjob ({selectedVehicle.name})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      data-testid="calc-paintjob-none"
                      onClick={() => onChangePaintjob(null)}
                      aria-pressed={paintjobId === null}
                      className={`px-3 py-2.5 rounded-md border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        paintjobId === null
                          ? 'bg-white text-[#111317] border-white'
                          : 'bg-[#111317] text-[#D1D5DB] border-[#2D3340] hover:border-[#6B7280]'
                      }`}
                    >
                      Tanpa Paintjob
                    </button>
                    {availablePaintjobs.map((pj) => {
                      const active = paintjobId === pj.id;
                      return (
                        <button
                          key={pj.id}
                          type="button"
                          data-testid={`calc-paintjob-${pj.id}`}
                          onClick={() => onChangePaintjob(active ? null : pj.id)}
                          aria-pressed={active}
                          aria-label={`${pj.label} ${formatUSD(PAINTJOB_PRICE)}`}
                          className={`px-3 py-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-white text-[#111317] border-white'
                              : 'bg-[#111317] text-[#E5E7EB] border-[#2D3340] hover:border-[#6B7280]'
                          }`}
                        >
                          <span className="block text-xs sm:text-sm font-semibold">
                            {pj.label}
                          </span>
                          <span
                            className={`block text-xs font-mono tabular-nums mt-0.5 ${
                              active ? 'text-[#D93025]' : 'text-[#F87171]'
                            }`}
                          >
                            {formatUSD(PAINTJOB_PRICE)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {!velgNitroOnly && (
                  <p className="text-xs font-semibold text-[#B4BCC8]">
                    {isSecondaryWithPaintjobMode
                      ? 'Ganti Warna Sekunder — Color 2 (Change Color)'
                      : 'Ganti Warna Cat Mobil (Change Color)'}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    data-testid="calc-change-color-off"
                    onClick={() => onChangeColor(false)}
                    aria-pressed={!changeColor}
                    className={`px-3 py-2.5 rounded-md border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      !changeColor
                        ? 'bg-white text-[#111317] border-white'
                        : 'bg-[#111317] text-[#D1D5DB] border-[#2D3340] hover:border-[#6B7280]'
                    }`}
                  >
                    {isSecondaryWithPaintjobMode
                      ? 'Tanpa Ganti Warna Sekunder'
                      : 'Tanpa Ganti Warna'}
                  </button>
                  <button
                    type="button"
                    data-testid="calc-change-color-on"
                    onClick={() => onChangeColor(!changeColor)}
                    aria-pressed={changeColor}
                    aria-label={
                      isSecondaryWithPaintjobMode
                        ? `Change Color Warna Sekunder ${formatUSD(CHANGE_COLOR_PRICE)}`
                        : `Change Color ${formatUSD(CHANGE_COLOR_PRICE)}`
                    }
                    className={`px-3 py-2.5 rounded-md border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      changeColor
                        ? 'bg-white text-[#111317] border-white'
                        : 'bg-[#111317] text-[#E5E7EB] border-[#2D3340] hover:border-[#6B7280]'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-semibold">
                      {isSecondaryWithPaintjobMode
                        ? 'Change Color (Sekunder)'
                        : 'Change Color'}
                    </span>
                    <span
                      className={`text-xs font-mono font-semibold tabular-nums ${
                        changeColor ? 'text-[#D93025]' : 'text-[#F87171]'
                      }`}
                    >
                      {formatUSD(CHANGE_COLOR_PRICE)}
                    </span>
                  </button>
                </div>

                {/* Official 0-255 SA-MP Color Palette Picker */}
                <div className="pt-2 border-t border-[#2A2F3A] space-y-3">
                  {isSecondaryWithPaintjobMode ? (
                    <p
                      data-testid="calc-primary-paintjob-note"
                      className="text-xs text-[#9AA4B2] leading-relaxed"
                    >
                      Warna Utama (Color 1) sedang memakai{' '}
                      <strong className="text-white">Paintjob {paintjobId}</strong>. Pilih{' '}
                      <strong className="text-white">Tanpa Paintjob</strong> di atas jika ingin
                      mengubah Warna Utama.
                    </p>
                  ) : (
                    <GtaColorPalettePicker
                      label="Warna Utama (Color 1 — ID 0–255)"
                      selectedId={paintjobId === null && changeColor ? primaryColorId : null}
                      defaultId={vehicleAsset.defaultPrimaryColorId}
                      isActive={paintjobId === null && changeColor}
                      onReset={() => onChangeColor(false)}
                      onSelectColorId={onSelectPrimaryColorId}
                      theme="dark"
                      testIdPrefix="calc-primary"
                    />
                  )}

                  {vehicleAsset.supportsSecondaryColor && (
                    <div
                      className={
                        isSecondaryWithPaintjobMode ? '' : 'pt-2 border-t border-[#2A2F3A]'
                      }
                    >
                      <GtaColorPalettePicker
                        label={
                          isSecondaryWithPaintjobMode
                            ? 'Warna Sekunder (Color 2 — ID 0–255 · Change Color)'
                            : 'Warna Sekunder (Color 2 — ID 0–255)'
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
                        onReset={
                          isSecondaryWithPaintjobMode
                            ? () => onChangeColor(false)
                            : undefined
                        }
                        resetLabel="Reset Sekunder"
                        onSelectColorId={onSelectSecondaryColorId}
                        theme="dark"
                        testIdPrefix="calc-secondary"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 03. Upgrades (Engine, Body, Alarm, Fuel Tank @ $400) */}
            {!velgNitroOnly && (
              <div
                data-testid="calc-upgrades-card"
                className="bg-[#181B22] border border-[#2A2F3A] rounded-xl p-5"
              >
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <p className="text-sm font-bold text-white">
                  03. Upgrades (Engine, Body, Alarm, Fuel Tank)
                </p>
                <span className="text-xs font-mono text-[#9AA4B2] tabular-nums">
                  {upgradeIds.length}/4 dipilih · {formatUSD(UPGRADE_UNIT_PRICE)} / item
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3.5">
                <button
                  type="button"
                  data-testid="calc-upgrades-select-all"
                  onClick={onSelectAllUpgrades}
                  disabled={upgradeIds.length === UPGRADE_OPTIONS.length}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#272C37] hover:bg-[#D93025] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer"
                >
                  Pilih Semua 4 Upgrades ({formatUSD(UPGRADE_UNIT_PRICE * UPGRADE_OPTIONS.length)})
                </button>
                {upgradeIds.length > 0 && (
                  <button
                    type="button"
                    data-testid="calc-upgrades-clear"
                    onClick={onClearUpgrades}
                    className="px-3 py-1.5 text-xs font-medium text-[#9AA4B2] hover:text-white transition-colors cursor-pointer"
                  >
                    Kosongkan
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {UPGRADE_OPTIONS.map((upgrade) => {
                  const active = upgradeIds.includes(upgrade.id);
                  return (
                    <button
                      key={upgrade.id}
                      type="button"
                      data-testid={`calc-${upgrade.id}`}
                      onClick={() => onToggleUpgrade(upgrade.id)}
                      aria-pressed={active}
                      aria-label={`Upgrade ${upgrade.name} ${formatUSD(upgrade.price)}`}
                      className={`px-3 py-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-white text-[#111317] border-white'
                          : 'bg-[#111317] text-[#E5E7EB] border-[#2D3340] hover:border-[#6B7280]'
                      }`}
                    >
                      <span className="block text-xs sm:text-sm font-semibold">
                        {upgrade.name}
                      </span>
                      <span
                        className={`block text-xs font-mono tabular-nums mt-0.5 ${
                          active ? 'text-[#D93025]' : 'text-[#F87171]'
                        }`}
                      >
                        {formatUSD(upgrade.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
              </div>
            )}

            {/* Nitro (N2O) */}
            <div className="bg-[#181B22] border border-[#2A2F3A] rounded-xl p-5">
              <p className="text-sm font-bold text-white mb-3">
                {velgNitroOnly ? '03' : '04'}. Nitro (N2O)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => onChangeNitro(null)}
                  aria-pressed={nitroId === null}
                  className={`px-3 py-2.5 rounded-md border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                    nitroId === null
                      ? 'bg-white text-[#111317] border-white'
                      : 'bg-[#111317] text-[#D1D5DB] border-[#2D3340] hover:border-[#6B7280]'
                  }`}
                >
                  Tanpa Nitro
                </button>
                {NITRO_OPTIONS.map((nitro) => {
                  const active = nitroId === nitro.id;
                  return (
                    <button
                      key={nitro.id}
                      type="button"
                      onClick={() => onChangeNitro(active ? null : nitro.id)}
                      aria-pressed={active}
                      aria-label={`${nitro.name} ${formatUSD(nitro.price)}`}
                      className={`px-3 py-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-white text-[#111317] border-white'
                          : 'bg-[#111317] text-[#E5E7EB] border-[#2D3340] hover:border-[#6B7280]'
                      }`}
                    >
                      <span className="block text-xs sm:text-sm font-semibold">
                        {nitro.name}
                      </span>
                      <span
                        className={`block text-xs font-mono tabular-nums mt-0.5 ${
                          active ? 'text-[#D93025]' : 'text-[#F87171]'
                        }`}
                      >
                        {formatUSD(nitro.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 05. Modifikasi Body sesuai kendaraan terpilih */}
            {!velgNitroOnly && (
              <div className="bg-[#181B22] border border-[#2A2F3A] rounded-xl p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <p className="text-sm font-bold text-white">
                  05. Modifikasi Body — {selectedVehicle.name} ({selectedVehicle.category})
                </p>
                {!isWaa &&
                  vehicleSlots.every((g) => g.parts.every((p) => p.price === 0)) && (
                    <span className="text-[11px] font-mono text-[#9AA4B2]">
                      Harga sementara $0.00
                    </span>
                  )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => onSelectFullSet(primaryStyle)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#272C37] hover:bg-[#D93025] rounded-md transition-colors cursor-pointer"
                >
                  Full {primaryStyle}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectFullSet(secondaryStyle)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#272C37] hover:bg-[#D93025] rounded-md transition-colors cursor-pointer"
                >
                  Full {secondaryStyle}
                </button>
                {Object.keys(bodyParts).length > 0 && (
                  <button
                    type="button"
                    onClick={onClearBodyParts}
                    className="px-3 py-1.5 text-xs font-medium text-[#9AA4B2] hover:text-white transition-colors cursor-pointer"
                  >
                    Kosongkan
                  </button>
                )}
              </div>

              <div className="divide-y divide-[#2A2F3A]">
                {vehicleSlots.map((group) => {
                  const isWideRow = group.parts.length >= 3;
                  const gridCols = isWideRow
                    ? 'grid-cols-1 sm:grid-cols-3'
                    : group.parts.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-2';

                  return (
                    <div
                      key={group.slot}
                      className={`py-3 flex gap-2.5 ${
                        isWideRow
                          ? 'flex-col'
                          : 'flex-col sm:flex-row sm:items-center justify-between'
                      }`}
                    >
                      <span className="text-sm font-medium text-[#E5E7EB] shrink-0">
                        {group.label}
                      </span>
                      <div
                        className={`grid gap-2 w-full ${
                          isWideRow ? '' : 'sm:w-[23rem]'
                        } ${gridCols}`}
                      >
                        {group.parts.map((part) => {
                          const active = bodyParts[part.slot] === part.id;
                          const shortLabel =
                            isWaa
                              ? part.style
                              : (part.badgeLabel ?? part.partName);

                          return (
                            <button
                              key={part.id}
                              type="button"
                              onClick={() => onToggleBodyPart(part.id)}
                              aria-pressed={active}
                              aria-label={`${group.label} ${shortLabel} ${formatUSD(part.price)}`}
                              className={`px-3 py-2 rounded-md border text-xs font-medium flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                                active
                                  ? 'bg-white text-[#111317] border-white font-semibold'
                                  : 'bg-[#111317] text-[#D1D5DB] border-[#2D3340] hover:border-[#6B7280]'
                              }`}
                            >
                              <span className="whitespace-nowrap">{shortLabel}</span>
                              <span className="font-mono tabular-nums shrink-0">
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
            )}

            {/* Velg */}
            <div className="bg-[#181B22] border border-[#2A2F3A] rounded-xl p-5">
              <label
                htmlFor="calc-wheel-select"
                className="block text-sm font-bold text-white mb-3"
              >
                {velgNitroOnly ? '04' : '06'}. Pilih Velg (atau klik langsung di katalog atas)
              </label>
              <select
                id="calc-wheel-select"
                value={wheelId ?? ''}
                onChange={(e) => onChangeWheel(e.target.value || null)}
                className="w-full px-3.5 py-2.5 text-sm text-white bg-[#111317] border border-[#323846] rounded-md focus:outline-none focus:border-white cursor-pointer"
              >
                <option value="">Tanpa Velg ($0.00)</option>
                {WHEELS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} — {formatUSD(w.price)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Simple Sticky Total Summary */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="bg-white text-[#111317] rounded-xl border border-[#DCE1E8] overflow-hidden">
              <div className="px-6 py-5 border-b border-[#E6EAF0] flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-mono text-[#525C6A]">
                    {breakdown.vehicleName} · Tipe {breakdown.vehicleCategory}
                  </p>
                  <h3 className="font-display text-2xl font-bold text-[#111317]">
                    Ringkasan Belanja
                  </h3>
                </div>
                {breakdown.itemCount > 0 && (
                  <button
                    type="button"
                    onClick={onResetAll}
                    aria-label="Reset semua item kalkulator"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#525C6A] hover:text-[#D93025] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="p-6">
                {breakdown.itemCount === 0 ? (
                  <div className="py-8 text-center border border-dashed border-[#CBD2DC] rounded-lg px-4">
                    <p className="text-sm font-semibold text-[#111317]">
                      Belum ada item dipilih
                    </p>
                    <p className="mt-1 text-xs text-[#525C6A]">
                      {velgNitroOnly
                        ? 'Pilih Change Color, Nitro (N2O), atau Velg untuk melihat total biaya belanja Anda.'
                        : 'Pilih Paintjob, Change Color, Upgrades, Nitro, modifikasi body, atau Velg untuk melihat total biaya belanja Anda.'}
                    </p>
                  </div>
                ) : (
                  <ul
                    data-testid="estimate-items-list"
                    className="divide-y divide-[#ECEFF3]"
                  >
                    {breakdown.items.map((item) => (
                      <li
                        key={item.id}
                        className="py-2.5 first:pt-0 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-[#6B7280]">
                            {item.category}
                          </p>
                          <p className="text-sm font-semibold text-[#111317]">
                            {item.label}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-mono text-sm font-semibold text-[#111317] tabular-nums">
                            {formatUSD(item.price)}
                          </span>
                          <button
                            type="button"
                            aria-label={`Hapus ${item.label}`}
                            onClick={() => {
                              if (item.upgradeId) onToggleUpgrade(item.upgradeId);
                              else if (item.category === 'Nitro (N2O)') onChangeNitro(null);
                              else if (item.category === 'Velg') onChangeWheel(null);
                              else if (item.category === 'Paintjob') onChangePaintjob(null);
                              else if (item.category === 'Cat Mobil') onChangeColor(false);
                              else if (item.slot) onRemoveSlot(item.slot);
                            }}
                            className="p-1 text-[#8B95A5] hover:text-[#D93025] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-5 pt-4 border-t border-[#111317] flex items-baseline justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-[#525C6A]">
                      Total Biaya Belanja
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5 tabular-nums">
                      {breakdown.itemCount} item terpilih
                    </p>
                  </div>
                  <p
                    data-testid="calculator-grand-total"
                    className="font-mono text-3xl font-bold text-[#D93025] tabular-nums"
                  >
                    {formatUSD(breakdown.total)}
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <div>
                    <label
                      htmlFor="calc-buyer-name"
                      className="block text-xs font-semibold text-[#374151] mb-1.5"
                    >
                      Nama Pembeli <span className="text-[#D93025]">*</span>
                    </label>
                    <div className="relative">
                      <User
                        className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        ref={buyerInputRef}
                        id="calc-buyer-name"
                        name="buyerName"
                        type="text"
                        maxLength={MAX_BUYER_NAME_LENGTH}
                        value={buyerName}
                        onChange={(e) => {
                          setBuyerName(e.target.value);
                          if (buyerNameError) setBuyerNameError(null);
                          if (submitState === 'sent' || submitState === 'error') {
                            setSubmitState('idle');
                            setSubmitFeedback(null);
                          }
                        }}
                        placeholder="Masukkan nama Anda (IC / Discord)"
                        aria-invalid={buyerNameError ? true : undefined}
                        aria-describedby={
                          buyerNameError ? 'calc-buyer-name-error' : undefined
                        }
                        className={`w-full pl-9 pr-3 py-2.5 text-sm text-[#111317] bg-[#F9FAFB] border rounded-md placeholder:text-[#9CA3AF] focus:outline-none focus:bg-white transition-colors ${
                          buyerNameError
                            ? 'border-[#D93025] focus:border-[#D93025]'
                            : 'border-[#CBD2DC] focus:border-[#111317]'
                        }`}
                      />
                    </div>
                    {buyerNameError && (
                      <p
                        id="calc-buyer-name-error"
                        role="alert"
                        data-testid="buyer-name-error"
                        className="mt-1 text-xs text-[#B91C1C]"
                      >
                        {buyerNameError}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    data-testid="submit-discord-order-btn"
                    disabled={breakdown.itemCount === 0 || submitState === 'sending'}
                    onClick={handleSendToDiscord}
                    className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white disabled:bg-[#CBD2DC] disabled:text-[#6B7280] disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer ${
                      submitState === 'sent'
                        ? 'bg-[#15803D] hover:bg-[#166534]'
                        : 'bg-[#D93025] hover:bg-[#B8251C]'
                    }`}
                  >
                    {submitState === 'sending' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Mengirim ke Discord...</span>
                      </>
                    ) : submitState === 'sent' ? (
                      <>
                        <Check className="w-4 h-4" aria-hidden="true" />
                        <span>Terkirim ke Discord</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" aria-hidden="true" />
                        <span>Kirim Order ke Discord</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    data-testid="copy-order-note-btn"
                    data-note-preview={shoppingNote}
                    disabled={breakdown.itemCount === 0}
                    onClick={() => void handleCopyShoppingNote()}
                    className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold border rounded-md transition-colors disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF] disabled:border-[#E5E7EB] disabled:cursor-not-allowed cursor-pointer ${
                      noteCopied
                        ? 'bg-[#F0FDF4] text-[#15803D] border-[#15803D]'
                        : 'bg-white text-[#111317] border-[#CBD2DC] hover:bg-[#F3F4F6] hover:border-[#111317]'
                    }`}
                  >
                    {noteCopied ? (
                      <>
                        <Check className="w-4 h-4" aria-hidden="true" />
                        <span>Catatan Disalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" aria-hidden="true" />
                        <span>Salin Catatan</span>
                      </>
                    )}
                  </button>

                  {submitFeedback && (
                    <p
                      role="status"
                      data-testid="discord-submit-feedback"
                      className={`text-xs flex items-start gap-1.5 leading-relaxed ${
                        submitState === 'sent' ? 'text-[#15803D]' : 'text-[#B91C1C]'
                      }`}
                    >
                      {submitState === 'sent' ? (
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>{submitFeedback}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
