import { useState } from 'react';
import { ExternalLink, Menu, X } from 'lucide-react';

const DISCORD_RECRUITMENT_URL = 'https://discord.gg/q6Mx9fKYET';

interface NavbarProps {
  selectedCount: number;
  onJumpToCalculator: () => void;
}

const NAV_LINKS = [
  { href: '#karyawan', label: 'Karyawan' },
  { href: '#kendaraan', label: 'Kendaraan' },
  { href: '#preview-modif', label: 'Preview Modif' },
  { href: '#velg', label: 'Velg' },
  { href: '#preview-3d', label: 'Preview 3D' },
];

export function Navbar({ selectedCount, onJumpToCalculator }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMobileAction = () => {
    setMobileOpen(false);
    onJumpToCalculator();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F6F7F9]/95 backdrop-blur-sm border-b border-[#E2E6EC]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="font-display text-2xl font-bold tracking-tight text-[#111317] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D93025]"
        >
          ORCA Auto Workshop
        </a>

        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4B5563]"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-[#111317] hover:underline underline-offset-4 decoration-[#D93025] decoration-2 transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onJumpToCalculator}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-[#111317] hover:bg-[#D93025] rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {selectedCount > 0 ? `Kalkulator (${selectedCount})` : 'Kalkulator Biaya'}
          </button>

          <a
            href={DISCORD_RECRUITMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-[#D93025] hover:bg-[#B8251C] rounded-md transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            <span>Lamar Pekerjaan</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md border border-[#D4DAE3] text-[#111317] hover:bg-white cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Navigasi mobile"
          className="md:hidden border-t border-[#E2E6EC] bg-white px-5 py-4 space-y-1"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-base font-medium text-[#1F242D] hover:text-[#D93025]"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-[#ECEFF3] flex flex-col gap-2">
            <button
              type="button"
              onClick={handleMobileAction}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#111317] hover:bg-[#D93025] rounded-md cursor-pointer"
            >
              {selectedCount > 0
                ? `Buka Kalkulator (${selectedCount} Item)`
                : 'Kalkulator Biaya'}
            </button>
            <a
              href={DISCORD_RECRUITMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-3 px-4 text-sm font-semibold text-white bg-[#D93025] hover:bg-[#B8251C] rounded-md"
            >
              <span>Lamar Pekerjaan</span>
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
