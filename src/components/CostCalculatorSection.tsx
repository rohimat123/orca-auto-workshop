import { useState } from 'react';
import { Check, Copy, RotateCcw, Trash2 } from 'lucide-react';
import {
  ALL_VEHICLES,
  LOCOLOW_VEHICLES,
  NITRO_OPTIONS,
  WAA_VEHICLES,
  WHEELS,
  getVehicleSlotsWithParts,
  type BodyPartSlot,
  type ModStyle,
} from '../data/workshopData';
import {
  buildOrderSummaryText,
  calculateOrder,
  formatUSD,
  type SelectedBodyParts,
} from '../utils/calculator';

interface CostCalculatorSectionProps {
  vehicleId: string;
  nitroId: string | null;
  wheelId: string | null;
  bodyParts: SelectedBodyParts;
  onChangeVehicle: (vehicleId: string) => void;
  onChangeNitro: (nitroId: string | null) => void;
  onChangeWheel: (wheelId: string | null) => void;
  onToggleBodyPart: (partId: string) => void;
  onSelectFullSet: (style: ModStyle) => void;
  onClearBodyParts: () => void;
  onRemoveSlot: (slot: BodyPartSlot) => void;
  onResetAll: () => void;
}

export function CostCalculatorSection({
  vehicleId,
  nitroId,
  wheelId,
  bodyParts,
  onChangeVehicle,
  onChangeNitro,
  onChangeWheel,
  onToggleBodyPart,
  onSelectFullSet,
  onClearBodyParts,
  onRemoveSlot,
  onResetAll,
}: CostCalculatorSectionProps) {
  const [copied, setCopied] = useState(false);

  const selectedVehicle =
    ALL_VEHICLES.find((v) => v.id === vehicleId) ?? ALL_VEHICLES[0];
  const isWaa = selectedVehicle.category === 'WAA';
  const vehicleSlots = getVehicleSlotsWithParts(selectedVehicle.id);

  const primaryStyle: ModStyle = isWaa ? 'X-FLOW' : 'SLAMIN';
  const secondaryStyle: ModStyle = isWaa ? 'ALIEN' : 'CHROMER';

  const breakdown = calculateOrder({
    vehicleId: selectedVehicle.id,
    nitroId,
    wheelId,
    bodyParts,
  });

  const handleCopy = async () => {
    if (breakdown.itemCount === 0) return;
    try {
      await navigator.clipboard.writeText(buildOrderSummaryText(breakdown));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
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
            Pilih kendaraan (WAA / Locolow), Nitro, part modifikasi sesuai kendaraan,
            serta Velg untuk mengetahui total belanja secara langsung.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left: Clean 4-Step Controls */}
          <div className="lg:col-span-7 space-y-5">
            {/* 01. Kendaraan */}
            <div className="bg-[#181B22] border border-[#2A2F3A] rounded-xl p-5">
              <label
                htmlFor="calc-vehicle-select"
                className="block text-sm font-bold text-white mb-3"
              >
                01. Pilih Kendaraan (Hanya WAA & Locolow)
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
              </select>
            </div>

            {/* 02. Nitro (N2O) */}
            <div className="bg-[#181B22] border border-[#2A2F3A] rounded-xl p-5">
              <p className="text-sm font-bold text-white mb-3">02. Nitro (N2O)</p>
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

            {/* 03. Modifikasi Body sesuai kendaraan terpilih */}
            <div className="bg-[#181B22] border border-[#2A2F3A] rounded-xl p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <p className="text-sm font-bold text-white">
                  03. Modifikasi Body — {selectedVehicle.name} ({selectedVehicle.category})
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

            {/* 04. Velg */}
            <div className="bg-[#181B22] border border-[#2A2F3A] rounded-xl p-5">
              <label
                htmlFor="calc-wheel-select"
                className="block text-sm font-bold text-white mb-3"
              >
                04. Pilih Velg (atau klik langsung di katalog atas)
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
                      Pilih Nitro, modifikasi body, atau Velg untuk melihat total biaya
                      belanja Anda.
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
                              if (item.category === 'Nitro (N2O)') onChangeNitro(null);
                              else if (item.category === 'Velg') onChangeWheel(null);
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

                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    disabled={breakdown.itemCount === 0}
                    onClick={handleCopy}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-[#D93025] hover:bg-[#B8251C] disabled:bg-[#CBD2DC] disabled:text-[#6B7280] disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" aria-hidden="true" />
                        <span>Rincian Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" aria-hidden="true" />
                        <span>Salin Rincian Order</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
