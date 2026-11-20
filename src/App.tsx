import { useState } from 'react';
import type { BodyPartSlot, ModStyle } from './data/workshopData';
import {
  applyFullBodySet,
  pruneBodyPartsForVehicle,
  toggleBodyPartSelection,
  type SelectedBodyParts,
} from './utils/calculator';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { VehicleTypesSection } from './components/VehicleTypesSection';
import { ModPreviewSection } from './components/ModPreviewSection';
import { WheelGallerySection } from './components/WheelGallerySection';
import { CostCalculatorSection } from './components/CostCalculatorSection';
import { Footer } from './components/Footer';

export default function App() {
  const [vehicleId, setVehicleId] = useState<string>('elegy');
  const [nitroId, setNitroId] = useState<string | null>(null);
  const [wheelId, setWheelId] = useState<string | null>(null);
  const [bodyParts, setBodyParts] = useState<SelectedBodyParts>({});

  const jumpToCalculator = () => {
    const el = document.getElementById('kalkulator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectVehicle = (nextVehicleId: string) => {
    setVehicleId(nextVehicleId);
    setBodyParts((prev) => pruneBodyPartsForVehicle(prev, nextVehicleId));
  };

  const handlePickPreviewPart = (targetVehicleId: string, partId: string) => {
    setVehicleId(targetVehicleId);
    setBodyParts((prev) => {
      const pruned = pruneBodyPartsForVehicle(prev, targetVehicleId);
      return toggleBodyPartSelection(pruned, partId);
    });
  };

  const handleToggleWheel = (id: string) => {
    setWheelId((prev) => (prev === id ? null : id));
  };

  const handleToggleBodyPart = (partId: string) => {
    setBodyParts((prev) => toggleBodyPartSelection(prev, partId));
  };

  const handleSelectFullSet = (style: ModStyle) => {
    setBodyParts(applyFullBodySet(style, vehicleId));
  };

  const handleRemoveSlot = (slot: BodyPartSlot) => {
    setBodyParts((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  };

  const handleResetAll = () => {
    setNitroId(null);
    setWheelId(null);
    setBodyParts({});
  };

  const selectedCount =
    (nitroId ? 1 : 0) +
    (wheelId ? 1 : 0) +
    Object.values(bodyParts).filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-[#111317]">
      <Navbar
        selectedCount={selectedCount}
        onJumpToCalculator={jumpToCalculator}
      />

      <main className="flex-1">
        <HeroSection onJumpToCalculator={jumpToCalculator} />
        <VehicleTypesSection
          selectedVehicleId={vehicleId}
          onSelectVehicle={handleSelectVehicle}
        />
        <ModPreviewSection
          selectedVehicleId={vehicleId}
          selectedBodyParts={bodyParts}
          onPickPart={handlePickPreviewPart}
        />
        <WheelGallerySection
          selectedWheelId={wheelId}
          onToggleWheel={handleToggleWheel}
        />
        <CostCalculatorSection
          vehicleId={vehicleId}
          nitroId={nitroId}
          wheelId={wheelId}
          bodyParts={bodyParts}
          onChangeVehicle={handleSelectVehicle}
          onChangeNitro={setNitroId}
          onChangeWheel={setWheelId}
          onToggleBodyPart={handleToggleBodyPart}
          onSelectFullSet={handleSelectFullSet}
          onClearBodyParts={() => setBodyParts({})}
          onRemoveSlot={handleRemoveSlot}
          onResetAll={handleResetAll}
        />
      </main>

      <Footer />
    </div>
  );
}
