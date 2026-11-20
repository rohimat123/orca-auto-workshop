import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFullBodySet,
  buildOrderSummaryText,
  calculateOrder,
  formatUSD,
  pruneBodyPartsForVehicle,
  toggleBodyPartSelection,
} from './calculator';
import {
  ALIEN_PARTS,
  LOCOLOW_MOD_PARTS,
  LOCOLOW_VEHICLES,
  WAA_VEHICLES,
  WHEELS,
  XFLOW_PARTS,
  getVehicleSlotsWithParts,
} from '../data/workshopData';

test('catalog contains exact 6 WAA, 5 Locolow vehicles (without Broadway), and 17 wheels', () => {
  assert.deepEqual(
    WAA_VEHICLES.map((v) => v.name),
    ['Elegy', 'Flash', 'Jester', 'Stratum', 'Sultan', 'Uranus']
  );
  assert.deepEqual(
    LOCOLOW_VEHICLES.map((v) => v.name),
    ['Blade', 'Remington', 'Savanna', 'Slamvan', 'Tornado']
  );
  assert.equal(WHEELS.length, 17);
});

test('formatUSD formats currency with commas and two decimals', () => {
  assert.equal(formatUSD(0), '$0.00');
  assert.equal(formatUSD(264), '$264.00');
  assert.equal(formatUSD(1595), '$1,595.00');
});

test('WAA prices remain intact; Blade, Remington & Savanna match updated prices while Slamvan & Tornado remain $0.00', () => {
  assert.equal(XFLOW_PARTS.reduce((sum, p) => sum + p.price, 0), 1595);
  assert.equal(ALIEN_PARTS.reduce((sum, p) => sum + p.price, 0), 1936);
  assert.equal(LOCOLOW_MOD_PARTS.length, 45);

  const byId = new Map(LOCOLOW_MOD_PARTS.map((p) => [p.id, p.price]));

  // Savanna exact prices
  assert.equal(byId.get('savanna-sideskirt-chrome-strips'), 308);
  assert.equal(byId.get('savanna-exhaust-chromer'), 374);
  assert.equal(byId.get('savanna-roof-hardtop'), 660);
  assert.equal(byId.get('savanna-roof-softtop'), 726);
  assert.equal(byId.get('savanna-exhaust-slamin'), 286);
  assert.equal(byId.get('savanna-rear-bumper-slamin'), 396);
  assert.equal(byId.get('savanna-rear-bumper-chromer'), 484);
  assert.equal(byId.get('savanna-front-bumper-slamin'), 286);
  assert.equal(byId.get('savanna-front-bumper-chromer'), 264);

  // Blade exact prices
  assert.equal(byId.get('blade-roof-convertible'), 286);
  assert.equal(byId.get('blade-exhaust-chromer'), 374);
  assert.equal(byId.get('blade-exhaust-slamin'), 286);
  assert.equal(byId.get('blade-sideskirt-chrome-strips'), 286);
  assert.equal(byId.get('blade-roof-vinyl-hardtop'), 748);
  assert.equal(byId.get('blade-front-bumper-slamin'), 396);
  assert.equal(byId.get('blade-front-bumper-chromer'), 484);
  assert.equal(byId.get('blade-rear-bumper-slamin'), 396);
  assert.equal(byId.get('blade-rear-bumper-chromer'), 484);

  // Remington exact prices
  assert.equal(byId.get('remington-misc-chrome-grill'), 264);
  assert.equal(byId.get('remington-sideskirt-chrome-flames'), 374);
  assert.equal(byId.get('remington-sideskirt-chrome-arches'), 330);
  assert.equal(byId.get('remington-misc-chrome-bars'), 286);
  assert.equal(byId.get('remington-misc-chrome-lights'), 220);
  assert.equal(byId.get('remington-exhaust-chromer'), 374);
  assert.equal(byId.get('remington-exhaust-slamin'), 286);
  assert.equal(byId.get('remington-rear-bumper-slamin'), 396);
  assert.equal(byId.get('remington-front-bumper-chromer'), 484);
  assert.equal(byId.get('remington-rear-bumper-chromer'), 484);
  assert.equal(byId.get('remington-front-bumper-slamin'), 396);

  // Slamvan & Tornado remain $0
  assert.equal(
    LOCOLOW_MOD_PARTS.filter((p) => p.vehicleId === 'slamvan' || p.vehicleId === 'tornado').every(
      (p) => p.price === 0
    ),
    true
  );
});

test('full set totals work per vehicle for WAA and Locolow', () => {
  const xflowCalc = calculateOrder({
    vehicleId: 'elegy',
    nitroId: null,
    wheelId: null,
    bodyParts: applyFullBodySet('X-FLOW', 'elegy'),
  });
  assert.equal(xflowCalc.total, 1595);
  assert.equal(xflowCalc.itemCount, 6);

  const alienCalc = calculateOrder({
    vehicleId: 'sultan',
    nitroId: null,
    wheelId: null,
    bodyParts: applyFullBodySet('ALIEN', 'sultan'),
  });
  assert.equal(alienCalc.total, 1936);
  assert.equal(alienCalc.itemCount, 6);

  const slamvanChromer = calculateOrder({
    vehicleId: 'slamvan',
    nitroId: null,
    wheelId: null,
    bodyParts: applyFullBodySet('CHROMER', 'slamvan'),
  });
  assert.equal(slamvanChromer.total, 0);
  assert.equal(slamvanChromer.itemCount, 5);
  assert.equal(slamvanChromer.vehicleCategory, 'Locolow');

  // Remington Full CHROMER: Front 484 + Rear 484 + Chrome Flames 374 + Chrome Grill 264 + Exhaust 374 = 1980
  const remingtonChromer = calculateOrder({
    vehicleId: 'remington',
    nitroId: null,
    wheelId: null,
    bodyParts: applyFullBodySet('CHROMER', 'remington'),
  });
  assert.equal(remingtonChromer.itemCount, 5);
  assert.equal(remingtonChromer.total, 1980);

  // Savanna Full SLAMIN: Front 286 + Rear 396 + Exhaust 286 = 968
  const savannaSlamin = calculateOrder({
    vehicleId: 'savanna',
    nitroId: null,
    wheelId: null,
    bodyParts: applyFullBodySet('SLAMIN', 'savanna'),
  });
  assert.equal(savannaSlamin.itemCount, 3);
  assert.equal(savannaSlamin.total, 968);

  // Blade Full CHROMER: Front 484 + Rear 484 + Chrome Strips 286 + Exhaust 374 = 1628
  const bladeChromer = calculateOrder({
    vehicleId: 'blade',
    nitroId: null,
    wheelId: null,
    bodyParts: applyFullBodySet('CHROMER', 'blade'),
  });
  assert.equal(bladeChromer.itemCount, 4);
  assert.equal(bladeChromer.total, 1628);
});

test('toggling parts in same slot replaces cleanly and pruning removes incompatible parts on vehicle switch', () => {
  let parts = toggleBodyPartSelection({}, 'remington-misc-chrome-grill');
  assert.equal(parts.misc, 'remington-misc-chrome-grill');

  parts = toggleBodyPartSelection(parts, 'remington-misc-chrome-lights');
  assert.equal(parts.misc, 'remington-misc-chrome-lights');

  // Switching to Tornado prunes Remington-only Misc part
  const prunedForTornado = pruneBodyPartsForVehicle(parts, 'tornado');
  assert.equal(prunedForTornado.misc, undefined);
});

test('combined order calculates Nitro + Body Mod + Wheels accurately and builds clean text summary', () => {
  const breakdown = calculateOrder({
    vehicleId: 'sultan',
    nitroId: 'nitro-10x', // 825
    wheelId: 'switch', // 462
    bodyParts: { spoiler: 'xflow-spoiler' }, // 220
  });

  assert.equal(breakdown.total, 1507);
  assert.equal(breakdown.vehicleName, 'Sultan');
  assert.equal(breakdown.vehicleCategory, 'WAA');

  const summary = buildOrderSummaryText(breakdown);
  assert.match(summary, /Sultan \(WAA\)/);
  assert.match(summary, /X-Flow Spoiler/);
  assert.match(summary, /\$1,507\.00/);
});

test('all 72 WAA and 45 Locolow (117 total) official preview images exist on disk with exact gta.rdy.jp counts', () => {
  let waaCount = 0;
  for (const vehicle of WAA_VEHICLES) {
    const groups = getVehicleSlotsWithParts(vehicle.id);
    assert.equal(groups.length, 6);
    for (const group of groups) {
      for (const part of group.parts) {
        assert.ok(part.imageUrl, `Missing WAA imageUrl for ${vehicle.id} ${part.id}`);
        const diskPath = path.join(process.cwd(), 'public', part.imageUrl.replace(/^\//, ''));
        assert.equal(fs.existsSync(diskPath), true, `Missing WAA asset on disk: ${diskPath}`);
        waaCount += 1;
      }
    }
  }
  assert.equal(waaCount, 72);

  const expectedLocoCounts: Record<string, number> = {
    blade: 9,
    remington: 11,
    savanna: 9,
    slamvan: 9,
    tornado: 7,
  };

  let locoCount = 0;
  for (const vehicle of LOCOLOW_VEHICLES) {
    const groups = getVehicleSlotsWithParts(vehicle.id);
    const carParts = groups.flatMap((g) => g.parts);
    assert.equal(
      carParts.length,
      expectedLocoCounts[vehicle.id],
      `Unexpected mod count for ${vehicle.name}`
    );
    for (const part of carParts) {
      assert.ok(part.imageUrl, `Missing Locolow imageUrl for ${vehicle.id} ${part.id}`);
      const diskPath = path.join(process.cwd(), 'public', part.imageUrl.replace(/^\//, ''));
      assert.equal(fs.existsSync(diskPath), true, `Missing Locolow asset on disk: ${diskPath}`);
      locoCount += 1;
    }
  }
  assert.equal(locoCount, 45);

  // Verify newly downloaded Remington Misc & Slamvan Bullbar names
  const remingtonMisc = getVehicleSlotsWithParts('remington').find((g) => g.slot === 'misc');
  assert.deepEqual(
    remingtonMisc?.parts.map((p) => p.partName),
    ['Chrome Grill', 'Chrome Bars', 'Chrome Lights']
  );

  const slamvanFrontBullbars = getVehicleSlotsWithParts('slamvan').find(
    (g) => g.slot === 'front-bullbar'
  );
  const slamvanRearBullbars = getVehicleSlotsWithParts('slamvan').find(
    (g) => g.slot === 'rear-bullbar'
  );
  assert.deepEqual(
    slamvanFrontBullbars?.parts.map((p) => p.partName),
    ['Slamin Bullbar', 'Chromer Bullbar']
  );
  assert.deepEqual(
    slamvanRearBullbars?.parts.map((p) => p.partName),
    ['Slamin Bullbar', 'Chromer Bullbar']
  );
});
