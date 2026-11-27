import {
  ALL_BODY_PARTS,
  ALL_VEHICLES,
  CHANGE_COLOR_PRICE,
  NITRO_OPTIONS,
  PAINTJOB_PRICE,
  SLOT_LABELS,
  UPGRADE_OPTIONS,
  WHEELS,
  getVehicleBodyParts,
  isTwoColorLocolowVehicle,
  isVelgNitroOnlyVehicle,
  type BodyPartSlot,
  type ModStyle,
  type UpgradeId,
  type VehicleCategory,
} from '../data/workshopData.js';

export type SelectedBodyParts = Partial<Record<BodyPartSlot, string>>;

export interface OrderInput {
  vehicleId: string;
  nitroId: string | null;
  wheelId: string | null;
  bodyParts: SelectedBodyParts;
  upgradeIds?: UpgradeId[];
  paintjobId?: number | null;
  changeColor?: boolean;
  primaryColorId?: number | null;
  secondaryColorId?: number | null;
}

export interface OrderLineItem {
  id: string;
  category: string;
  label: string;
  price: number;
  slot?: BodyPartSlot;
  upgradeId?: UpgradeId;
}

export interface OrderBreakdown {
  vehicleName: string;
  vehicleCategory: VehicleCategory;
  items: OrderLineItem[];
  total: number;
  itemCount: number;
}

export function formatUSD(amount: number): string {
  const fixed = amount.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${formattedInt}.${decPart}`;
}

export function toggleBodyPartSelection(
  current: SelectedBodyParts,
  partId: string
): SelectedBodyParts {
  const part = ALL_BODY_PARTS.find((p) => p.id === partId);
  if (!part) return current;
  const next: SelectedBodyParts = { ...current };
  if (next[part.slot] === part.id) {
    delete next[part.slot];
  } else {
    next[part.slot] = part.id;
  }
  return next;
}

export function pruneBodyPartsForVehicle(
  current: SelectedBodyParts,
  vehicleId: string
): SelectedBodyParts {
  const validIds = new Set(getVehicleBodyParts(vehicleId).map((p) => p.id));
  const next: SelectedBodyParts = {};
  for (const [slot, partId] of Object.entries(current)) {
    if (partId && validIds.has(partId)) {
      next[slot as BodyPartSlot] = partId;
    }
  }
  return next;
}

export function applyFullBodySet(
  style: ModStyle,
  vehicleId?: string
): SelectedBodyParts {
  const sourceParts = vehicleId
    ? getVehicleBodyParts(vehicleId)
    : ALL_BODY_PARTS.filter((p) => !p.vehicleId);
  const next: SelectedBodyParts = {};
  for (const part of sourceParts) {
    if (part.style === style && !next[part.slot]) {
      next[part.slot] = part.id;
    }
  }
  return next;
}

function getBodyPartCategoryLabel(slot: BodyPartSlot, style: ModStyle): string {
  if (style === 'X-FLOW' || style === 'ALIEN') {
    return style;
  }
  return SLOT_LABELS[slot];
}

export interface PaintFinishState {
  paintjobId: number | null;
  changeColor: boolean;
  primaryColorId?: number | null;
  secondaryColorId?: number | null;
}

/**
 * Paintjob and Change Color are mutually exclusive for standard vehicles.
 * For 2-color Locolow vehicles (`allowSecondaryWithPaintjob = true`), Paintjob
 * occupies Color 1 while Change Color can be combined on the secondary color (Color 2).
 */
export function selectPaintjobFinish(
  current: PaintFinishState,
  nextPaintjobId: number | null,
  allowSecondaryWithPaintjob = false
): PaintFinishState {
  if (nextPaintjobId !== null) {
    if (allowSecondaryWithPaintjob && current.changeColor) {
      const hasSecondary =
        typeof current.secondaryColorId === 'number' &&
        Number.isInteger(current.secondaryColorId);
      const hasPrimary =
        typeof current.primaryColorId === 'number' &&
        Number.isInteger(current.primaryColorId);

      // Keep Change Color active if secondary color was chosen OR if user toggled
      // Change Color on generically without choosing a primary-only swatch.
      if (hasSecondary || !hasPrimary) {
        return {
          paintjobId: nextPaintjobId,
          changeColor: true,
          ...(hasSecondary ? { secondaryColorId: current.secondaryColorId } : {}),
        };
      }
    }
    return {
      paintjobId: nextPaintjobId,
      changeColor: false,
    };
  }
  return {
    ...current,
    paintjobId: null,
  };
}

export function selectChangeColorFinish(
  current: PaintFinishState,
  enabled: boolean,
  allowSecondaryWithPaintjob = false
): PaintFinishState {
  if (!enabled) {
    return {
      paintjobId: current.paintjobId,
      changeColor: false,
    };
  }
  if (allowSecondaryWithPaintjob && current.paintjobId !== null) {
    const hasSecondary =
      typeof current.secondaryColorId === 'number' &&
      Number.isInteger(current.secondaryColorId);
    return {
      paintjobId: current.paintjobId,
      changeColor: true,
      ...(hasSecondary ? { secondaryColorId: current.secondaryColorId } : {}),
    };
  }
  return {
    ...current,
    paintjobId: null,
    changeColor: true,
  };
}

export function selectPrimaryColorFinish(
  current: PaintFinishState,
  colorId: number
): PaintFinishState {
  return {
    ...current,
    paintjobId: null,
    changeColor: true,
    primaryColorId: colorId,
  };
}

export function selectSecondaryColorFinish(
  current: PaintFinishState,
  colorId: number,
  allowSecondaryWithPaintjob = false
): PaintFinishState {
  if (allowSecondaryWithPaintjob && current.paintjobId !== null) {
    return {
      paintjobId: current.paintjobId,
      changeColor: true,
      secondaryColorId: colorId,
    };
  }
  return {
    ...current,
    paintjobId: null,
    changeColor: true,
    secondaryColorId: colorId,
  };
}

export function reconcilePaintFinishForVehicle(
  current: PaintFinishState,
  nextVehicleId: string,
  validPaintjobIds: number[]
): PaintFinishState {
  if (isVelgNitroOnlyVehicle(nextVehicleId)) {
    return {
      ...current,
      paintjobId: null,
    };
  }

  const nextPaintjobId =
    current.paintjobId !== null && validPaintjobIds.includes(current.paintjobId)
      ? current.paintjobId
      : null;

  // Non-2-color vehicles cannot keep both Paintjob and Change Color active together
  if (
    nextPaintjobId !== null &&
    current.changeColor &&
    !isTwoColorLocolowVehicle(nextVehicleId)
  ) {
    return {
      paintjobId: nextPaintjobId,
      changeColor: false,
    };
  }

  return {
    ...current,
    paintjobId: nextPaintjobId,
  };
}

export function formatChangeColorLabel(
  primaryColorId?: number | null,
  secondaryColorId?: number | null
): string {
  const hasPrimary = typeof primaryColorId === 'number' && Number.isInteger(primaryColorId);
  const hasSecondary =
    typeof secondaryColorId === 'number' && Number.isInteger(secondaryColorId);

  if (hasPrimary && hasSecondary) {
    return `Change Color (ID ${primaryColorId} / ${secondaryColorId})`;
  }
  if (hasPrimary) {
    return `Change Color (ID ${primaryColorId})`;
  }
  if (hasSecondary) {
    return `Change Color (ID ${secondaryColorId})`;
  }
  return 'Change Color';
}

export function formatSecondaryChangeColorLabel(
  secondaryColorId?: number | null
): string {
  const hasSecondary =
    typeof secondaryColorId === 'number' && Number.isInteger(secondaryColorId);
  if (hasSecondary) {
    return `Change Color Sekunder (ID ${secondaryColorId})`;
  }
  return 'Change Color Sekunder';
}

export function toggleUpgradeSelection(
  current: UpgradeId[],
  upgradeId: UpgradeId
): UpgradeId[] {
  const validIds = new Set(UPGRADE_OPTIONS.map((u) => u.id));
  if (!validIds.has(upgradeId)) return current;
  const selected = new Set(current.filter((id) => validIds.has(id)));
  if (selected.has(upgradeId)) {
    selected.delete(upgradeId);
  } else {
    selected.add(upgradeId);
  }
  return UPGRADE_OPTIONS.map((u) => u.id).filter((id) => selected.has(id));
}

export function selectAllUpgrades(): UpgradeId[] {
  return UPGRADE_OPTIONS.map((u) => u.id);
}

export function calculateOrder(input: OrderInput): OrderBreakdown {
  const vehicle =
    ALL_VEHICLES.find((v) => v.id === input.vehicleId) ?? ALL_VEHICLES[0];
  const velgNitroOnly = isVelgNitroOnlyVehicle(vehicle.id);
  const allowSecondaryWithPaintjob = isTwoColorLocolowVehicle(vehicle.id);

  const items: OrderLineItem[] = [];
  const hasPaintjob = !velgNitroOnly && input.paintjobId != null;

  if (hasPaintjob) {
    items.push({
      id: `paintjob-${input.paintjobId}`,
      category: 'Paintjob',
      label: `Paintjob ${input.paintjobId}`,
      price: PAINTJOB_PRICE,
    });
  }

  if (input.changeColor && (!hasPaintjob || allowSecondaryWithPaintjob)) {
    const isSecondaryWithPaintjob = hasPaintjob && allowSecondaryWithPaintjob;
    items.push({
      id: 'change-color',
      category: 'Cat Mobil',
      label: isSecondaryWithPaintjob
        ? formatSecondaryChangeColorLabel(input.secondaryColorId)
        : formatChangeColorLabel(input.primaryColorId, input.secondaryColorId),
      price: CHANGE_COLOR_PRICE,
    });
  }

  if (!velgNitroOnly) {
    if (input.upgradeIds && input.upgradeIds.length > 0) {
      const selectedUpgradeSet = new Set(input.upgradeIds);
      for (const upgrade of UPGRADE_OPTIONS) {
        if (selectedUpgradeSet.has(upgrade.id)) {
          items.push({
            id: upgrade.id,
            category: 'Upgrades',
            label: `Upgrade ${upgrade.name}`,
            price: upgrade.price,
            upgradeId: upgrade.id,
          });
        }
      }
    }
  }

  if (input.nitroId) {
    const nitro = NITRO_OPTIONS.find((n) => n.id === input.nitroId);
    if (nitro) {
      items.push({
        id: nitro.id,
        category: 'Nitro (N2O)',
        label: nitro.name,
        price: nitro.price,
      });
    }
  }

  if (!velgNitroOnly) {
    for (const partId of Object.values(input.bodyParts)) {
      if (!partId) continue;
      const part = ALL_BODY_PARTS.find((p) => p.id === partId);
      if (part) {
        const slotPrefix =
          part.slot === 'front-bumper' && !part.partName.includes('Front')
            ? `Front ${part.partName}`
            : part.slot === 'rear-bumper' && !part.partName.includes('Rear')
              ? `Rear ${part.partName}`
              : part.slot === 'front-bullbar' && !part.partName.includes('Front')
                ? `Front ${part.partName}`
                : part.slot === 'rear-bullbar' && !part.partName.includes('Rear')
                  ? `Rear ${part.partName}`
                  : part.partName;

        items.push({
          id: part.id,
          category: getBodyPartCategoryLabel(part.slot, part.style),
          label: slotPrefix,
          price: part.price,
          slot: part.slot,
        });
      }
    }
  }

  if (input.wheelId) {
    const wheel = WHEELS.find((w) => w.id === input.wheelId);
    if (wheel) {
      items.push({
        id: wheel.id,
        category: 'Velg',
        label: wheel.name,
        price: wheel.price,
      });
    }
  }

  const total =
    Math.round(items.reduce((sum, item) => sum + item.price, 0) * 100) / 100;

  return {
    vehicleName: vehicle.name,
    vehicleCategory: vehicle.category,
    items,
    total,
    itemCount: items.length,
  };
}

export function buildOrderSummaryText(breakdown: OrderBreakdown): string {
  const lines = [
    `ORCA Auto Workshop — Estimasi Belanja`,
    `Kendaraan: ${breakdown.vehicleName} (${breakdown.vehicleCategory})`,
    `--------------------------------`,
    ...breakdown.items.map((item) => `- ${item.label}: ${formatUSD(item.price)}`),
    `--------------------------------`,
    `Total: ${formatUSD(breakdown.total)}`,
  ];
  return lines.join('\n');
}

/**
 * Formats shopping note for quick clipboard copy:
 * [Catatan Belanja](e)Paintjob 1(e)Upgrade 4(e)10x Nitro...
 * All selected Upgrades (Engine, Body, Alarm, Fuel Tank) are summarized as "Upgrade <count>".
 */
export function buildShoppingNoteText(breakdown: OrderBreakdown): string {
  if (breakdown.itemCount === 0) return '';

  const upgradeCount = breakdown.items.filter(
    (item) => Boolean(item.upgradeId) || item.category === 'Upgrades'
  ).length;

  const entries: string[] = ['[Catatan Belanja]'];
  let upgradesAdded = false;

  for (const item of breakdown.items) {
    if (item.upgradeId || item.category === 'Upgrades') {
      if (!upgradesAdded && upgradeCount > 0) {
        entries.push(`Upgrade ${upgradeCount}`);
        upgradesAdded = true;
      }
      continue;
    }
    entries.push(item.label);
  }

  return entries.join('(e)');
}
