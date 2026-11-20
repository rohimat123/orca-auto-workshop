import { useState } from 'react';
import { ArrowRight, Wrench } from 'lucide-react';

interface HeroSectionProps {
  onJumpToCalculator: () => void;
}

const HERO_IMAGE =
  '/assets/aistudio/Gemini_Generated_Image_nhy28xnhy28xnhy2_570cccd7.jpg';

export function HeroSection({ onJumpToCalculator }: HeroSectionProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <section id="top" className="pt-10 pb-12 lg:pt-14 lg:pb-16">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 flex flex-col justify-between py-1">
            <div>
              <p className="text-sm font-semibold text-[#D93025] mb-3">
                Spesialis WAA & Locolow
              </p>

              <h1
                className="font-display font-bold text-[#111317] leading-[1.03] tracking-tight"
                style={{
                  fontSize: 'clamp(2.35rem, 3.8vw, 3.5rem)',
                  textWrap: 'balance',
                }}
              >
                ORCA Auto Workshop — Modifikasi & Perbaikan Kendaraan
              </h1>

              <p className="mt-4 text-base leading-relaxed text-[#434B57] max-w-[50ch]">
                Bengkel modifikasi dan perbaikan kendaraan khusus tipe{' '}
                <strong className="font-semibold text-[#111317]">WAA</strong> dan{' '}
                <strong className="font-semibold text-[#111317]">Locolow</strong>.
                Tersedia paket modifikasi body X-FLOW, ALIEN, SLAMIN, CHROMER, Nitro
                (N2O), serta 17 pilihan velg dengan daftar harga transparan.
              </p>

              <div className="mt-5 p-4 rounded-lg bg-white border border-[#DCE1E8] text-sm text-[#1F242D]">
                <span className="font-semibold text-[#D93025]">Info Workshop: </span>
                ORCA Auto Workshop{' '}
                <strong className="font-semibold">
                  hanya memperbaiki dan memodifikasi kendaraan tipe WAA & Locolow
                </strong>
                . Pastikan tipe kendaraan Anda termasuk dalam daftar di bawah sebelum
                order.
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={onJumpToCalculator}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#D93025] hover:bg-[#B8251C] rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Hitung Total Biaya</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <a
                href="#preview-modif"
                className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-[#111317] bg-white border border-[#CBD2DC] hover:border-[#111317] rounded-md transition-colors duration-150 whitespace-nowrap shrink-0"
              >
                Preview Modifikasi
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-xl overflow-hidden bg-[#141210] border border-[#DCE1E8] shadow-sm">
              {!imgFailed ? (
                <img
                  src={HERO_IMAGE}
                  alt="ORCA Auto Workshop — Performance & Customization Since 2023"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-auto block object-contain"
                />
              ) : (
                <div className="w-full aspect-[25/10] flex flex-col items-center justify-center bg-[#141210] text-[#CBD2DC] p-6 text-center">
                  <Wrench className="w-9 h-9 mb-2 opacity-70" aria-hidden="true" />
                  <p className="font-display text-2xl font-bold text-white">
                    ORCA Auto Workshop
                  </p>
                </div>
              )}

              <div className="px-4 py-3 bg-[#141210] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-white/80">
                <span>X-FLOW · ALIEN · SLAMIN · CHROMER · Nitro</span>
                <span>WAA & Locolow · 17 Velg</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
