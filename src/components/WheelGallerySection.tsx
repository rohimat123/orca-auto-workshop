import { useState } from 'react';
import { Check, Disc3, Search } from 'lucide-react';
import { WHEELS } from '../data/workshopData';
import { formatUSD } from '../utils/calculator';

interface WheelGallerySectionProps {
  selectedWheelId: string | null;
  onToggleWheel: (wheelId: string) => void;
}

export function WheelGallerySection({
  selectedWheelId,
  onToggleWheel,
}: WheelGallerySectionProps) {
  const [query, setQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const filteredWheels = query.trim()
    ? WHEELS.filter((w) =>
        w.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : WHEELS;

  return (
    <section id="velg" className="py-12 lg:py-16 bg-white border-y border-[#E2E6EC]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-[#D93025] mb-1.5">
              Katalog Velg (17 Pilihan)
            </p>
            <h2
              className="font-display font-bold text-[#111317] leading-[1.06] tracking-tight"
              style={{ fontSize: 'clamp(1.9rem, 3vw, 2.75rem)', textWrap: 'balance' }}
            >
              Gambar & Daftar Harga Velg
            </h2>
          </div>

          <div className="relative w-full md:w-72">
            <label htmlFor="wheel-search" className="sr-only">
              Cari nama velg
            </label>
            <Search
              className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="wheel-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari velg (mis. Switch, Shadow)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm text-[#111317] bg-[#F6F7F9] border border-[#CBD2DC] rounded-md focus:outline-none focus:border-[#111317] focus:bg-white"
            />
          </div>
        </div>

        {filteredWheels.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-[#CBD2DC] rounded-xl">
            <p className="text-sm font-semibold text-[#111317]">
              Velg "{query}" tidak ditemukan
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-[#111317] rounded-md cursor-pointer"
            >
              Tampilkan Semua Velg
            </button>
          </div>
        ) : (
          <div
            data-testid="wheel-gallery-grid"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {filteredWheels.map((wheel) => {
              const isSelected = selectedWheelId === wheel.id;
              const imgFailed = failedImages[wheel.id];

              return (
                <article
                  key={wheel.id}
                  className={`rounded-xl overflow-hidden border transition-colors duration-150 flex flex-col justify-between bg-[#F9FAFB] ${
                    isSelected
                      ? 'border-[#D93025] ring-1 ring-[#D93025]'
                      : 'border-[#DCE1E8] hover:border-[#8B95A5]'
                  }`}
                >
                  <div>
                    <div className="aspect-[4/4] bg-[#181B22] overflow-hidden border-b border-[#E6EAF0] flex items-center justify-center">
                      {!imgFailed ? (
                        <img
                          src={wheel.imageUrl}
                          alt={wheel.name}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImages((prev) => ({
                              ...prev,
                              [wheel.id]: true,
                            }))
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#9AA4B2] p-4 text-center">
                          <Disc3 className="w-8 h-8 mb-1 opacity-60" aria-hidden="true" />
                          <span className="text-xs">{wheel.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3.5">
                      <h3 className="text-sm font-bold text-[#111317] leading-snug">
                        {wheel.name}
                      </h3>
                      <p className="mt-1 font-mono text-sm font-semibold text-[#D93025] tabular-nums">
                        {formatUSD(wheel.price)}
                      </p>
                    </div>
                  </div>

                  <div className="px-3.5 pb-3.5">
                    <button
                      type="button"
                      onClick={() => onToggleWheel(wheel.id)}
                      aria-pressed={isSelected}
                      aria-label={`${isSelected ? 'Hapus' : 'Pilih'} ${wheel.name}`}
                      className={`w-full py-2 px-3 text-xs font-semibold rounded-md transition-colors duration-150 inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-[#D93025] text-white hover:bg-[#B8251C]'
                          : 'bg-[#111317] text-white hover:bg-[#D93025]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                      <span>{isSelected ? 'Dipilih' : 'Pilih Velg'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
