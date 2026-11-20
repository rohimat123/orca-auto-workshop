import { Check } from 'lucide-react';
import {
  LOCOLOW_VEHICLES,
  WAA_VEHICLES,
  type VehicleModel,
} from '../data/workshopData';

interface VehicleTypesSectionProps {
  selectedVehicleId: string;
  onSelectVehicle: (vehicleId: string) => void;
}

function VehicleGroupCard({
  title,
  subtitle,
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
}: {
  title: string;
  subtitle: string;
  vehicles: VehicleModel[];
  selectedVehicleId: string;
  onSelectVehicle: (vehicleId: string) => void;
}) {
  return (
    <div className="bg-white border border-[#DCE1E8] rounded-xl p-6">
      <div className="pb-4 border-b border-[#ECEFF3] flex items-baseline justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#111317]">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-[#525C6A] mt-0.5">{subtitle}</p>
        </div>
        <span className="font-mono text-xs text-[#6B7280] tabular-nums">
          {vehicles.length} kendaraan
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {vehicles.map((vehicle) => {
          const isSelected = vehicle.id === selectedVehicleId;
          return (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => onSelectVehicle(vehicle.id)}
              aria-pressed={isSelected}
              className={`px-4 py-3 rounded-lg border text-left text-sm font-semibold transition-colors duration-150 flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D93025] ${
                isSelected
                  ? 'bg-[#111317] text-white border-[#111317]'
                  : 'bg-[#F9FAFB] text-[#111317] border-[#DCE1E8] hover:border-[#111317] hover:bg-white'
              }`}
            >
              <span>{vehicle.name}</span>
              {isSelected && (
                <Check className="w-4 h-4 text-[#F87171] shrink-0" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VehicleTypesSection({
  selectedVehicleId,
  onSelectVehicle,
}: VehicleTypesSectionProps) {
  return (
    <section id="kendaraan" className="py-12 lg:py-16 bg-white border-y border-[#E2E6EC]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-[#D93025] mb-1.5">
              Tipe Kendaraan
            </p>
            <h2
              className="font-display font-bold text-[#111317] leading-[1.06] tracking-tight"
              style={{ fontSize: 'clamp(1.9rem, 3vw, 2.75rem)', textWrap: 'balance' }}
            >
              Kendaraan yang Bisa Dimodifikasi & Diperbaiki
            </h2>
          </div>
          <p className="text-sm text-[#4B5563] max-w-md">
            Workshop ini <strong className="font-semibold text-[#111317]">hanya melayani tipe WAA dan Locolow</strong>.
            Klik nama kendaraan di bawah untuk memilihnya di kalkulator biaya.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VehicleGroupCard
            title="Tipe WAA"
            subtitle="Wheel Arch Angels — Sport & Street Tuner"
            vehicles={WAA_VEHICLES}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={onSelectVehicle}
          />
          <VehicleGroupCard
            title="Tipe Locolow"
            subtitle="Loco Low Co. — Classic & Lowrider"
            vehicles={LOCOLOW_VEHICLES}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={onSelectVehicle}
          />
        </div>
      </div>
    </section>
  );
}
