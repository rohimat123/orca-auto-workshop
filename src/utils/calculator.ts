import {
  ALL_BODY_PARTS,
  ALL_VEHICLES,
  NITRO_OPTIONS,
  SLOT_LABELS,
  WHEELS,
  getVehicleBodyParts,
  type BodyPartSlot,
  type ModStyle,
} from '../data/workshopData';

export type SelectedBodyParts = Partial<Record<BodyPartSlot, string>>;

export interface OrderInput {
  vehicleId: string;
  nitroId: string | null;
  wheelId: string | null;
  bodyParts: SelectedBodyParts;
}

export interface OrderLineItem {
  id: string;
  category: string;
  label: string;
  price: number;
  slot?: BodyPartSlot;
}

export interface OrderBreakdown {
  vehicleName: string;
  vehicleCategory: 'WAA' | 'Locolow';
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

export function calculateOrder(input: OrderInput): OrderBreakdown {
  const vehicle =
    ALL_VEHICLES.find((v) => v.id === input.vehicleId) ?? ALL_VEHICLES[0];

  const items: OrderLineItem[] = [];

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

  const total = items.reduce((sum, item) => sum + item.price, 0);

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
