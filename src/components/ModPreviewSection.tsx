import { useEffect, useState } from 'react';
import { Check, ChevronDown, ImageIcon, Plus, X, ZoomIn } from 'lucide-react';
import {
  LOCOLOW_VEHICLES,
  WAA_VEHICLES,
  getVehicleSlotsWithParts,
  type BodyModPart,
  type ModStyle,
  type VehicleCategory,
  type VehicleModel,
} from '../data/workshopData';
import { formatUSD, type SelectedBodyParts } from '../utils/calculator';

interface ModPreviewSectionProps {
  selectedVehicleId: string;
  selectedBodyParts: SelectedBodyParts;
  onPickPart: (vehicleId: string, partId: string) => void;
}

type StyleFilter = 'ALL' | 'PRIMARY' | 'SECONDARY';

interface LightboxItem {
  vehicleId: string;
  vehicleName: string;
  slotLabel: string;
  part: BodyModPart;
  imageUrl: string;
  badgeLabel: string;
}

function PreviewImageTile({
  vehicleName,
  slotLabel,
  part,
  isSelected,
  onToggle,
  onZoom,
}: {
  vehicleName: string;
  slotLabel: string;
  part: BodyModPart;
  isSelected: boolean;
  onToggle: () => void;
  onZoom: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const badgeLabel = part.badgeLabel ?? part.partName;
  const imageUrl = part.imageUrl ?? '';

  return (
    <div
      className={`rounded-lg border overflow-hidden flex flex-col bg-white transition-colors ${
        isSelected ? 'border-[#D93025] ring-1 ring-[#D93025]' : 'border-[#E2E6EC]'
      }`}
    >
      <button
        type="button"
        onClick={onZoom}
        aria-label={`Perbesar foto ${vehicleName} ${slotLabel} ${badgeLabel}`}
        className="group relative aspect-[16/10] w-full bg-[#181C22] overflow-hidden cursor-pointer block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D93025]"
      >
        {!failed && imageUrl ? (
          <img
            src={imageUrl}
            alt={`${vehicleName} ${slotLabel} — ${badgeLabel}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={`w-full h-full group-hover:scale-[1.03] transition-transform duration-200 ${
              part.id === 'remington-misc-chrome-lights'
                ? 'object-contain bg-[#141210]'
                : 'object-cover'
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#9AA4B2] text-xs gap-1 p-3">
            <ImageIcon className="w-5 h-5 opacity-60" aria-hidden="true" />
            <span>{badgeLabel}</span>
          </div>
        )}

        <span
          aria-hidden="true"
          className="absolute top-2 left-2 px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-[#111317]/85 text-white"
        >
          {badgeLabel}
        </span>

        <span
          aria-hidden="true"
          className="absolute bottom-2 right-2 w-7 h-7 rounded bg-[#111317]/75 text-white inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </span>
      </button>

      <div className="px-3 py-2.5 flex items-center justify-between gap-2 bg-[#F9FAFB] border-t border-[#ECEFF3]">
        <span className="font-mono text-xs sm:text-sm font-semibold text-[#111317] tabular-nums">
          {formatUSD(part.price)}
        </span>

        <button
          type="button"
          onClick={onToggle}
          aria-pressed={isSelected}
          aria-label={`${isSelected ? 'Hapus' : 'Pilih'} ${vehicleName} ${slotLabel} ${badgeLabel}`}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            isSelected
              ? 'bg-[#D93025] text-white'
              : 'bg-[#111317] text-white hover:bg-[#D93025]'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Dipilih</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Pilih</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function VehiclePreviewAccordionItem({
  vehicle,
  primaryStyle,
  secondaryStyle,
  isOpen,
  isActiveVehicle,
  styleFilter,
  selectedBodyParts,
  onToggleOpen,
  onSelectStyleFilter,
  onPickPart,
  onZoom,
}: {
  vehicle: VehicleModel;
  primaryStyle: ModStyle;
  secondaryStyle: ModStyle;
  isOpen: boolean;
  isActiveVehicle: boolean;
  styleFilter: StyleFilter;
  selectedBodyParts: SelectedBodyParts;
  onToggleOpen: () => void;
  onSelectStyleFilter: (filter: StyleFilter) => void;
  onPickPart: (vehicleId: string, partId: string) => void;
  onZoom: (item: LightboxItem) => void;
}) {
  const panelId = `preview-panel-${vehicle.id}`;
  const allSlots = getVehicleSlotsWithParts(vehicle.id);
  const totalPhotos = allSlots.reduce((sum, g) => sum + g.parts.length, 0);

  const visibleSlots = allSlots
    .map((group) => {
      const filteredParts = group.parts.filter((part) => {
        if (styleFilter === 'ALL') return true;
        if (styleFilter === 'PRIMARY') return part.style === primaryStyle;
        return part.style === secondaryStyle;
      });
      return { ...group, parts: filteredParts };
    })
    .filter((group) => group.parts.length > 0);

  const slotSummaryText = allSlots.map((g) => g.label).join(' · ');

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden transition-colors ${
        isOpen ? 'border-[#111317]' : 'border-[#DCE1E8]'
      }`}
    >
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#F9FAFB] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#D93025]"
      >
        <div className="min-w-0">
          <div className="flex items-baseline flex-wrap gap-x-3 gap-y-0.5">
            <span className="font-display text-2xl font-bold text-[#111317] tracking-tight">
              {vehicle.name}
            </span>
            <span className="text-xs font-mono text-[#6B7280] tabular-nums">
              Tipe {vehicle.category} · {totalPhotos} Foto Modifikasi
            </span>
            {isActiveVehicle && (
              <span className="text-xs font-semibold text-[#D93025]">
                (Dipilih di kalkulator)
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5 truncate">
            {slotSummaryText}
          </p>
        </div>

        <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#111317] shrink-0">
          <span className="hidden sm:inline">
            {isOpen ? 'Tutup Preview' : 'Lihat Preview'}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-[#4B5563] transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#D93025]' : ''
            }`}
            aria-hidden="true"
          />
        </span>
      </button>

      {isOpen && (
        <div
          id={panelId}
          className="border-t border-[#E2E6EC] bg-[#F6F7F9] px-4 sm:px-5 py-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <p className="text-xs sm:text-sm text-[#4B5563]">
              Klik gambar untuk memperbesar, atau klik{' '}
              <strong className="font-semibold text-[#111317]">Pilih</strong> untuk
              langsung menambah ke kalkulator.
            </p>

            <div
              role="group"
              aria-label={`Filter gaya modifikasi ${vehicle.name}`}
              className="inline-flex rounded-md border border-[#CBD2DC] bg-white p-0.5 self-start sm:self-auto shrink-0"
            >
              {(
                [
                  { id: 'ALL', label: 'Semua' },
                  { id: 'PRIMARY', label: primaryStyle },
                  { id: 'SECONDARY', label: secondaryStyle },
                ] as const
              ).map((tab) => {
                const active = styleFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onSelectStyleFilter(tab.id)}
                    aria-pressed={active}
                    className={`px-3 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#111317] text-white'
                        : 'text-[#4B5563] hover:text-[#111317]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`grid gap-4 ${
              styleFilter === 'ALL'
                ? 'grid-cols-1 lg:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {visibleSlots.map((group) => {
              const count = group.parts.length;
              const isFiltered = styleFilter !== 'ALL';

              const cardSpanClass = isFiltered
                ? count >= 3
                  ? 'sm:col-span-2 lg:col-span-3'
                  : count === 2
                    ? 'sm:col-span-2'
                    : ''
                : count >= 3
                  ? 'lg:col-span-2'
                  : '';

              const innerGridClass = isFiltered
                ? count >= 3
                  ? 'grid-cols-1 sm:grid-cols-3'
                  : count === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1'
                : count >= 3
                  ? 'grid-cols-1 sm:grid-cols-3'
                  : 'grid-cols-1 sm:grid-cols-2';

              return (
                <div
                  key={group.slot}
                  className={`bg-white border border-[#DCE1E8] rounded-lg p-3.5 ${cardSpanClass}`}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <h4 className="font-display text-lg font-bold text-[#111317] tracking-tight">
                      {group.label}
                    </h4>
                    <span className="text-[11px] font-mono text-[#6B7280]">
                      {vehicle.name} · {count} pilihan
                    </span>
                  </div>

                  <div className={`grid gap-3 ${innerGridClass}`}>
                    {group.parts.map((part) => (
                      <PreviewImageTile
                        key={part.id}
                        vehicleName={vehicle.name}
                        slotLabel={group.label}
                        part={part}
                        isSelected={
                          isActiveVehicle && selectedBodyParts[part.slot] === part.id
                        }
                        onToggle={() => onPickPart(vehicle.id, part.id)}
                        onZoom={() =>
                          onZoom({
                            vehicleId: vehicle.id,
                            vehicleName: vehicle.name,
                            slotLabel: group.label,
                            part,
                            imageUrl: part.imageUrl ?? '',
                            badgeLabel: part.badgeLabel ?? part.partName,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ModPreviewSection({
  selectedVehicleId,
  selectedBodyParts,
  onPickPart,
}: ModPreviewSectionProps) {
  const [activeCategory, setActiveCategory] = useState<VehicleCategory>('WAA');
  const [openVehicleId, setOpenVehicleId] = useState<string | null>(null);
  const [styleFilter, setStyleFilter] = useState<StyleFilter>('ALL');
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightbox(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox]);

  const handleSwitchCategory = (category: VehicleCategory) => {
    setActiveCategory(category);
    setOpenVehicleId(null);
    setStyleFilter('ALL');
  };

  const handleToggleVehicle = (vehicleId: string) => {
    setOpenVehicleId((prev) => (prev === vehicleId ? null : vehicleId));
  };

  const vehicles = activeCategory === 'WAA' ? WAA_VEHICLES : LOCOLOW_VEHICLES;
  const primaryStyle: ModStyle = activeCategory === 'WAA' ? 'X-FLOW' : 'SLAMIN';
  const secondaryStyle: ModStyle = activeCategory === 'WAA' ? 'ALIEN' : 'CHROMER';

  const lightboxIsSelected = lightbox
    ? selectedVehicleId === lightbox.vehicleId &&
      selectedBodyParts[lightbox.part.slot] === lightbox.part.id
    : false;

  return (
    <section
      id="preview-modif"
      className="py-12 lg:py-16 bg-[#F6F7F9] border-b border-[#E2E6EC]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-sm font-semibold text-[#D93025] mb-1.5">
              Image Preview Modifikasi
            </p>
            <h2
              className="font-display font-bold text-[#111317] leading-[1.06] tracking-tight"
              style={{ fontSize: 'clamp(1.9rem, 3vw, 2.75rem)', textWrap: 'balance' }}
            >
              Preview X-FLOW, ALIEN, SLAMIN & CHROMER
            </h2>
          </div>

          <p className="text-sm text-[#4B5563] max-w-md">
            Pilih kategori{' '}
            <strong className="font-semibold text-[#111317]">WAA</strong> atau{' '}
            <strong className="font-semibold text-[#111317]">Locolow</strong>, lalu klik
            nama kendaraan untuk membuka menu ke bawah berisi foto modifikasi.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Kategori preview kendaraan"
          className="inline-flex flex-wrap gap-2 mb-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'WAA'}
            onClick={() => handleSwitchCategory('WAA')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors cursor-pointer ${
              activeCategory === 'WAA'
                ? 'bg-[#111317] text-white border-[#111317]'
                : 'bg-white text-[#1F242D] border-[#CBD2DC] hover:border-[#111317]'
            }`}
          >
            Tipe WAA — X-FLOW & ALIEN
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'Locolow'}
            onClick={() => handleSwitchCategory('Locolow')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors cursor-pointer ${
              activeCategory === 'Locolow'
                ? 'bg-[#111317] text-white border-[#111317]'
                : 'bg-white text-[#1F242D] border-[#CBD2DC] hover:border-[#111317]'
            }`}
          >
            Tipe Locolow — SLAMIN & CHROMER
          </button>
        </div>

        <div className="space-y-3" data-testid="mod-preview-accordion">
          {vehicles.map((vehicle) => (
            <VehiclePreviewAccordionItem
              key={vehicle.id}
              vehicle={vehicle}
              primaryStyle={primaryStyle}
              secondaryStyle={secondaryStyle}
              isOpen={openVehicleId === vehicle.id}
              isActiveVehicle={selectedVehicleId === vehicle.id}
              styleFilter={styleFilter}
              selectedBodyParts={selectedBodyParts}
              onToggleOpen={() => handleToggleVehicle(vehicle.id)}
              onSelectStyleFilter={setStyleFilter}
              onPickPart={onPickPart}
              onZoom={setLightbox}
            />
          ))}
        </div>

        <p className="mt-5 text-xs text-[#525C6A]">
          {activeCategory === 'WAA'
            ? 'Catatan: Paket X-FLOW & ALIEN berlaku lengkap untuk 6 kendaraan WAA (Elegy, Flash, Jester, Stratum, Sultan, Uranus — 72 foto).'
            : 'Catatan: Paket Locolow berlaku lengkap untuk 5 kendaraan (Blade, Remington, Savanna, Slamvan, Tornado — 47 item modifikasi). Harga Blade, Remington, Savanna & Slamvan sudah terupdate; Tornado sementara $0.00.'}
        </p>
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${lightbox.vehicleName} ${lightbox.slotLabel} ${lightbox.badgeLabel}`}
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white rounded-xl overflow-hidden border border-[#DCE1E8] shadow-xl"
          >
            <div className="px-4 py-3 border-b border-[#ECEFF3] flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold text-[#111317]">
                  {lightbox.vehicleName} — {lightbox.slotLabel} ({lightbox.badgeLabel})
                </h3>
                <p className="font-mono text-xs text-[#525C6A] tabular-nums">
                  Harga: {formatUSD(lightbox.part.price)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                aria-label="Tutup preview gambar"
                className="w-9 h-9 rounded-md border border-[#DCE1E8] inline-flex items-center justify-center text-[#111317] hover:bg-[#F6F7F9] cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="bg-[#141210] flex items-center justify-center p-3">
              <img
                src={lightbox.imageUrl}
                alt={`${lightbox.vehicleName} ${lightbox.slotLabel} ${lightbox.badgeLabel}`}
                referrerPolicy="no-referrer"
                className="max-h-[60vh] w-auto object-contain rounded"
              />
            </div>

            <div className="px-4 py-3 bg-[#F9FAFB] border-t border-[#ECEFF3] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onPickPart(lightbox.vehicleId, lightbox.part.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  lightboxIsSelected
                    ? 'bg-[#D93025] text-white'
                    : 'bg-[#111317] text-white hover:bg-[#D93025]'
                }`}
              >
                {lightboxIsSelected ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>Dipilih di Kalkulator</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Pilih ({formatUSD(lightbox.part.price)})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="px-4 py-2 rounded-md text-xs sm:text-sm font-semibold text-[#111317] border border-[#CBD2DC] hover:border-[#111317] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
