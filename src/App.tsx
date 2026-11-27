import { useState } from 'react';
import {
  isTwoColorLocolowVehicle,
  isVelgNitroOnlyVehicle,
  type BodyPartSlot,
  type ModStyle,
  type UpgradeId,
} from './data/workshopData';
import { getVehiclePaintjobs } from './data/gta3Assets';
import {
  applyFullBodySet,
  pruneBodyPartsForVehicle,
  reconcilePaintFinishForVehicle,
  selectAllUpgrades,
  selectChangeColorFinish,
  selectPaintjobFinish,
  selectPrimaryColorFinish,
  selectSecondaryColorFinish,
  toggleBodyPartSelection,
  toggleUpgradeSelection,
  type PaintFinishState,
  type SelectedBodyParts,
} from './utils/calculator';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { StaffRosterSection } from './components/StaffRosterSection';
import { VehicleTypesSection } from './components/VehicleTypesSection';
import { ModPreviewSection } from './components/ModPreviewSection';
import { WheelGallerySection } from './components/WheelGallerySection';
import { Preview3DSection } from './components/Preview3DSection';
import { CostCalculatorSection } from './components/CostCalculatorSection';
import { Footer } from './components/Footer';

export default function App() {
  const [vehicleId, setVehicleId] = useState<string>('elegy');
  const [upgradeIds, setUpgradeIds] = useState<UpgradeId[]>([]);
  const [nitroId, setNitroId] = useState<string | null>(null);
  const [wheelId, setWheelId] = useState<string | null>(null);
  const [bodyParts, setBodyParts] = useState<SelectedBodyParts>({});
  const [paintFinish, setPaintFinish] = useState<PaintFinishState>({
    paintjobId: null,
    changeColor: false,
    primaryColorId: null,
    secondaryColorId: null,
  });

  const { paintjobId, changeColor, primaryColorId = null, secondaryColorId = null } = paintFinish;
  const allowSecondaryWithPaintjob = isTwoColorLocolowVehicle(vehicleId);

  const jumpToCalculator = () => {
    const el = document.getElementById('kalkulator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const reconcilePaintForVehicle = (nextVehicleId: string) => {
    const validIds = getVehiclePaintjobs(nextVehicleId).map((pj) => pj.id);
    setPaintFinish((prev) =>
      reconcilePaintFinishForVehicle(prev, nextVehicleId, validIds)
    );
  };

  const handleSelectVehicle = (nextVehicleId: string) => {
    setVehicleId(nextVehicleId);
    if (isVelgNitroOnlyVehicle(nextVehicleId)) {
      setBodyParts({});
      reconcilePaintForVehicle(nextVehicleId);
      setUpgradeIds([]);
      return;
    }
    setBodyParts((prev) => pruneBodyPartsForVehicle(prev, nextVehicleId));
    reconcilePaintForVehicle(nextVehicleId);
  };

  const handlePickPreviewPart = (targetVehicleId: string, partId: string) => {
    setVehicleId(targetVehicleId);
    setBodyParts((prev) => {
      const pruned = pruneBodyPartsForVehicle(prev, targetVehicleId);
      return toggleBodyPartSelection(pruned, partId);
    });
    reconcilePaintForVehicle(targetVehicleId);
  };

  const handleChangePaintjob = (nextPaintjobId: number | null) => {
    setPaintFinish((prev) =>
      selectPaintjobFinish(prev, nextPaintjobId, allowSecondaryWithPaintjob)
    );
  };

  const handleChangeColor = (enabled: boolean) => {
    setPaintFinish((prev) =>
      selectChangeColorFinish(prev, enabled, allowSecondaryWithPaintjob)
    );
  };

  const handleSelectPrimaryColorId = (colorId: number) => {
    setPaintFinish((prev) => selectPrimaryColorFinish(prev, colorId));
  };

  const handleSelectSecondaryColorId = (colorId: number) => {
    setPaintFinish((prev) =>
      selectSecondaryColorFinish(prev, colorId, allowSecondaryWithPaintjob)
    );
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

  const handleToggleUpgrade = (upgradeId: UpgradeId) => {
    setUpgradeIds((prev) => toggleUpgradeSelection(prev, upgradeId));
  };

  const handleSelectAllUpgrades = () => {
    setUpgradeIds(selectAllUpgrades());
  };

  const handleClearUpgrades = () => {
    setUpgradeIds([]);
  };

  const handleResetAll = () => {
    setUpgradeIds([]);
    setNitroId(null);
    setWheelId(null);
    setBodyParts({});
    setPaintFinish({
      paintjobId: null,
      changeColor: false,
      primaryColorId: null,
      secondaryColorId: null,
    });
  };

  const paintFinishCount =
    (paintjobId !== null ? 1 : 0) +
    (changeColor && (paintjobId === null || allowSecondaryWithPaintjob) ? 1 : 0);

  const selectedCount =
    upgradeIds.length +
    (nitroId ? 1 : 0) +
    (wheelId ? 1 : 0) +
    paintFinishCount +
    Object.values(bodyParts).filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-[#111317]">
      <Navbar
        selectedCount={selectedCount}
        onJumpToCalculator={jumpToCalculator}
      />

      <main className="flex-1">
        <HeroSection onJumpToCalculator={jumpToCalculator} />
        <StaffRosterSection />
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
        <Preview3DSection
          vehicleId={vehicleId}
          wheelId={wheelId}
          bodyParts={bodyParts}
          paintjobId={paintjobId}
          changeColor={changeColor}
          primaryColorId={primaryColorId}
          secondaryColorId={secondaryColorId}
          onChangeVehicle={handleSelectVehicle}
          onToggleBodyPart={handleToggleBodyPart}
          onSelectFullSet={handleSelectFullSet}
          onClearBodyParts={() => setBodyParts({})}
          onChangeWheel={setWheelId}
          onChangePaintjob={handleChangePaintjob}
          onChangeColor={handleChangeColor}
          onSelectPrimaryColorId={handleSelectPrimaryColorId}
          onSelectSecondaryColorId={handleSelectSecondaryColorId}
          onJumpToCalculator={jumpToCalculator}
        />
        <CostCalculatorSection
          vehicleId={vehicleId}
          upgradeIds={upgradeIds}
          nitroId={nitroId}
          wheelId={wheelId}
          bodyParts={bodyParts}
          paintjobId={paintjobId}
          changeColor={changeColor}
          primaryColorId={primaryColorId}
          secondaryColorId={secondaryColorId}
          onChangeVehicle={handleSelectVehicle}
          onToggleUpgrade={handleToggleUpgrade}
          onSelectAllUpgrades={handleSelectAllUpgrades}
          onClearUpgrades={handleClearUpgrades}
          onChangeNitro={setNitroId}
          onChangeWheel={setWheelId}
          onToggleBodyPart={handleToggleBodyPart}
          onSelectFullSet={handleSelectFullSet}
          onClearBodyParts={() => setBodyParts({})}
          onRemoveSlot={handleRemoveSlot}
          onChangePaintjob={handleChangePaintjob}
          onChangeColor={handleChangeColor}
          onSelectPrimaryColorId={handleSelectPrimaryColorId}
          onSelectSecondaryColorId={handleSelectSecondaryColorId}
          onResetAll={handleResetAll}
        />
      </main>

      <Footer />
    </div>
  );
}
