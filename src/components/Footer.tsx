export function Footer() {
  return (
    <footer className="bg-[#0B0D10] text-[#9AA4B2] border-t border-[#1F242D]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm">
        <div>
          <p className="font-display text-xl font-bold text-white tracking-tight">
            ORCA Auto Workshop
          </p>
          <p className="mt-1 text-xs text-[#8B95A5]">
            Khusus modifikasi & perbaikan kendaraan tipe WAA dan Locolow.
          </p>
        </div>

        <nav aria-label="Navigasi footer" className="flex flex-wrap gap-5 text-xs">
          <a href="#karyawan" className="hover:text-white transition-colors">
            Karyawan
          </a>
          <a href="#kendaraan" className="hover:text-white transition-colors">
            Kendaraan
          </a>
          <a href="#preview-modif" className="hover:text-white transition-colors">
            Preview Modif
          </a>
          <a href="#velg" className="hover:text-white transition-colors">
            Velg
          </a>
          <a href="#preview-3d" className="hover:text-white transition-colors">
            Preview 3D
          </a>
          <a href="#kalkulator" className="hover:text-white transition-colors">
            Kalkulator
          </a>
        </nav>
      </div>
    </footer>
  );
}
