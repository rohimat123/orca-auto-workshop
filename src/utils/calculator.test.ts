import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFullBodySet,
  buildOrderSummaryText,
  buildShoppingNoteText,
  calculateOrder,
  formatChangeColorLabel,
  formatSecondaryChangeColorLabel,
  formatUSD,
  pruneBodyPartsForVehicle,
  reconcilePaintFinishForVehicle,
  selectAllUpgrades,
  selectChangeColorFinish,
  selectPaintjobFinish,
  selectPrimaryColorFinish,
  selectSecondaryColorFinish,
  toggleBodyPartSelection,
  toggleUpgradeSelection,
} from './calculator';
import {
  GTA_VEHICLE_COLORS,
  getGtaVehicleColorById,
  getGtaVehicleColorHex,
} from '../data/gtaVehicleColors';
import { VEHICLE_3D_ASSETS } from '../data/gta3Assets';
import {
  ALIEN_PARTS,
  ALL_VEHICLES,
  CHANGE_COLOR_PRICE,
  LOCOLOW_MOD_PARTS,
  LOCOLOW_VEHICLES,
  NON_WAA_LOCOLOW_VEHICLES,
  PAINTJOB_PRICE,
  UPGRADE_OPTIONS,
  UPGRADE_UNIT_PRICE,
  WAA_VEHICLES,
  WHEELS,
  XFLOW_PARTS,
  getVehicleSlotsWithParts,
  isTwoColorLocolowVehicle,
  isVelgNitroOnlyVehicle,
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
  assert.deepEqual(
    NON_WAA_LOCOLOW_VEHICLES.map((v) => v.name),
    [
      'Bandito',
      'Benson',
      'BF Injection',
      'Boxville',
      'Burrito',
      'Camper',
      'Duneride',
      'Flatbed',
      'Hotring',
      'Journey',
      'Linerunner',
      'Mower',
      'Mule',
      'Patriot',
      'Petrol Tanker',
      'Pony',
      'Roadtrain',
      'Rumpo',
      'Sadler',
      'Sandking',
      'Towtruck',
      'Tractor',
      'Voodoo',
      'Yankee',
      'Yosemite',
    ]
  );
  assert.equal(NON_WAA_LOCOLOW_VEHICLES.length, 25);
  assert.equal(ALL_VEHICLES.length, 36);
});

test('Non-WAA/Locolow vehicles allow Change Color, Velg, and Nitro (N2O) while blocking Paintjob, Upgrades, and Body Mods', () => {
  assert.equal(isVelgNitroOnlyVehicle('sandking'), true);
  assert.equal(isVelgNitroOnlyVehicle('petrol-tanker'), true);
  assert.equal(isVelgNitroOnlyVehicle('voodoo'), true);
  assert.equal(isVelgNitroOnlyVehicle('elegy'), false);
  assert.equal(isVelgNitroOnlyVehicle('blade'), false);

  const restrictedOrder = calculateOrder({
    vehicleId: 'sandking',
    paintjobId: 1, // ignored for Non-WAA/Locolow
    changeColor: true, // allowed ($88)
    primaryColorId: 126, // pink from official 0-255 chart
    upgradeIds: selectAllUpgrades(), // ignored
    nitroId: 'nitro-10x', // 825
    wheelId: 'offroad', // 264
    bodyParts: { spoiler: 'xflow-spoiler' }, // ignored
  });

  assert.equal(restrictedOrder.vehicleName, 'Sandking');
  assert.equal(restrictedOrder.vehicleCategory, 'Non-WAA/Locolow');
  assert.equal(restrictedOrder.itemCount, 3);
  assert.equal(restrictedOrder.total, 88 + 825 + 264);
  assert.deepEqual(
    restrictedOrder.items.map((i) => i.label),
    ['Change Color (ID 126)', '10x Nitro', 'Offroad Wheels']
  );
  assert.equal(
    buildShoppingNoteText(restrictedOrder),
    '[Catatan Belanja](e)Change Color (ID 126)(e)10x Nitro(e)Offroad Wheels'
  );
});

test('GTA:SA 256-color vehicle palette (0-255) matches reference chart and formats Color ID labels accurately', () => {
  assert.equal(GTA_VEHICLE_COLORS.length, 256);
  assert.equal(GTA_VEHICLE_COLORS[0].id, 0);
  assert.equal(GTA_VEHICLE_COLORS[255].id, 255);
  assert.equal(getGtaVehicleColorHex(0), '#000000');
  assert.equal(getGtaVehicleColorHex(1), '#F5F5F5');
  assert.equal(getGtaVehicleColorHex(3), '#84050E');
  assert.equal(getGtaVehicleColorHex(6), '#D88D0E');
  assert.equal(getGtaVehicleColorHex(126), '#EC6BAE');
  assert.equal(getGtaVehicleColorHex(255), '#28344E');
  assert.equal(getGtaVehicleColorById(1)?.isLight, true);
  assert.equal(getGtaVehicleColorById(0)?.isLight, false);
  assert.equal(getGtaVehicleColorById(-1), null);
  assert.equal(getGtaVehicleColorById(256), null);

  assert.equal(formatChangeColorLabel(null, null), 'Change Color');
  assert.equal(formatChangeColorLabel(3, null), 'Change Color (ID 3)');
  assert.equal(formatChangeColorLabel(3, 1), 'Change Color (ID 3 / 1)');
});

test('formatUSD formats currency with commas and two decimals', () => {
  assert.equal(formatUSD(0), '$0.00');
  assert.equal(formatUSD(264), '$264.00');
  assert.equal(formatUSD(1595), '$1,595.00');
});

test('WAA prices remain intact; Blade, Remington, Savanna & Slamvan match updated prices while Tornado remains $0.00', () => {
  assert.equal(XFLOW_PARTS.reduce((sum, p) => sum + p.price, 0), 1595);
  assert.equal(ALIEN_PARTS.reduce((sum, p) => sum + p.price, 0), 1936);
  assert.equal(LOCOLOW_MOD_PARTS.length, 47);

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

  // Slamvan exact prices (11 mods)
  assert.equal(byId.get('slamvan-rear-bullbar-chromer'), 479.6);
  assert.equal(byId.get('slamvan-rear-bullbar-slamin'), 462);
  assert.equal(byId.get('slamvan-exhaust-chromer'), 374);
  assert.equal(byId.get('slamvan-exhaust-slamin'), 286);
  assert.equal(byId.get('slamvan-front-bullbar-chromer'), 484);
  assert.equal(byId.get('slamvan-front-bullbar-slamin'), 462);
  assert.equal(byId.get('slamvan-front-bumper-chromer'), 396);
  assert.equal(byId.get('slamvan-sideskirt-right-chrome-trim'), 129.8);
  assert.equal(byId.get('slamvan-sideskirt-right-wheelcovers'), 165);
  assert.equal(byId.get('slamvan-sideskirt-left-chrome-trim'), 129.8);
  assert.equal(byId.get('slamvan-sideskirt-left-wheelcovers'), 165);

  // Tornado remains $0
  assert.equal(
    LOCOLOW_MOD_PARTS.filter((p) => p.vehicleId === 'tornado').every((p) => p.price === 0),
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

  // Slamvan Full CHROMER: Front Bumper 396 + Front Bullbar 484 + Rear Bullbar 479.6 + Right Chrome Trim 129.8 + Left Chrome Trim 129.8 + Exhaust 374 = 1993.20
  const slamvanChromer = calculateOrder({
    vehicleId: 'slamvan',
    nitroId: null,
    wheelId: null,
    bodyParts: applyFullBodySet('CHROMER', 'slamvan'),
  });
  assert.equal(slamvanChromer.total, 1993.2);
  assert.equal(formatUSD(slamvanChromer.total), '$1,993.20');
  assert.equal(slamvanChromer.itemCount, 6);
  assert.equal(slamvanChromer.vehicleCategory, 'Locolow');

  // Slamvan Full SLAMIN: Front Bullbar 462 + Rear Bullbar 462 + Exhaust 286 = 1210
  const slamvanSlamin = calculateOrder({
    vehicleId: 'slamvan',
    nitroId: null,
    wheelId: null,
    bodyParts: applyFullBodySet('SLAMIN', 'slamvan'),
  });
  assert.equal(slamvanSlamin.total, 1210);
  assert.equal(slamvanSlamin.itemCount, 3);

  // Slamvan independent right/left sideskirt selection
  const slamvanMixedSideskirts = calculateOrder({
    vehicleId: 'slamvan',
    nitroId: null,
    wheelId: null,
    bodyParts: {
      'rear-bullbar': 'slamvan-rear-bullbar-chromer', // 479.60
      'sideskirt-right': 'slamvan-sideskirt-right-wheelcovers', // 165.00
      'sideskirt-left': 'slamvan-sideskirt-left-chrome-trim', // 129.80
    },
  });
  assert.equal(slamvanMixedSideskirts.total, 774.4);
  assert.equal(formatUSD(slamvanMixedSideskirts.total), '$774.40');

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

test('Paintjob ($88) and Change Color ($88) are mutually exclusive and calculate accurately with mods', () => {
  assert.equal(PAINTJOB_PRICE, 88);
  assert.equal(CHANGE_COLOR_PRICE, 88);

  // Choosing Paintjob clears Change Color; choosing Change Color clears Paintjob
  let finish = selectPaintjobFinish({ paintjobId: null, changeColor: false }, 1);
  assert.deepEqual(finish, { paintjobId: 1, changeColor: false });

  finish = selectChangeColorFinish(finish, true);
  assert.deepEqual(finish, { paintjobId: null, changeColor: true });

  finish = selectPaintjobFinish(finish, 2);
  assert.deepEqual(finish, { paintjobId: 2, changeColor: false });

  const pjOnly = calculateOrder({
    vehicleId: 'sultan',
    nitroId: null,
    wheelId: null,
    bodyParts: {},
    paintjobId: 1,
    changeColor: false,
  });
  assert.equal(pjOnly.total, 88);
  assert.equal(pjOnly.itemCount, 1);
  assert.equal(pjOnly.items[0].label, 'Paintjob 1');

  const colorOnly = calculateOrder({
    vehicleId: 'blade',
    nitroId: null,
    wheelId: null,
    bodyParts: {},
    paintjobId: null,
    changeColor: true,
  });
  assert.equal(colorOnly.total, 88);
  assert.equal(colorOnly.itemCount, 1);
  assert.equal(colorOnly.items[0].label, 'Change Color');

  // Even if both flags are passed, only one finish ($88) is billed
  const combinedWithPj = calculateOrder({
    vehicleId: 'sultan',
    nitroId: 'nitro-2x', // 165
    wheelId: 'shadow', // 154
    bodyParts: { spoiler: 'xflow-spoiler' }, // 220
    paintjobId: 2, // 88
    changeColor: true, // ignored because Paintjob is active
  });
  assert.equal(combinedWithPj.total, 165 + 154 + 220 + 88);
  assert.equal(combinedWithPj.itemCount, 4);
  const summary = buildOrderSummaryText(combinedWithPj);
  assert.match(summary, /Paintjob 2: \$88\.00/);
  assert.doesNotMatch(summary, /Change Color/);
  assert.match(summary, /\$627\.00/);
});

test('Upgrades include Engine, Body, Alarm, Fuel Tank at $400 each (max 4 = $1,600) and integrate into order totals', () => {
  assert.equal(UPGRADE_UNIT_PRICE, 400);
  assert.deepEqual(
    UPGRADE_OPTIONS.map((u) => u.name),
    ['Engine', 'Body', 'Alarm', 'Fuel Tank']
  );

  let selected = toggleUpgradeSelection([], 'upgrade-fuel-tank');
  selected = toggleUpgradeSelection(selected, 'upgrade-engine');
  // Canonical order preserved: Engine before Fuel Tank
  assert.deepEqual(selected, ['upgrade-engine', 'upgrade-fuel-tank']);

  const twoUpgrades = calculateOrder({
    vehicleId: 'flash',
    upgradeIds: selected,
    nitroId: null,
    wheelId: null,
    bodyParts: {},
  });
  assert.equal(twoUpgrades.itemCount, 2);
  assert.equal(twoUpgrades.total, 800);
  assert.deepEqual(
    twoUpgrades.items.map((i) => i.label),
    ['Upgrade Engine', 'Upgrade Fuel Tank']
  );

  const allFour = calculateOrder({
    vehicleId: 'elegy',
    upgradeIds: selectAllUpgrades(),
    nitroId: 'nitro-2x', // $165
    wheelId: null,
    bodyParts: {},
  });
  assert.equal(allFour.itemCount, 5);
  assert.equal(allFour.total, 1600 + 165);

  const removedOne = toggleUpgradeSelection(selectAllUpgrades(), 'upgrade-alarm');
  assert.equal(removedOne.length, 3);
  assert.equal(removedOne.includes('upgrade-alarm'), false);
});

test('buildShoppingNoteText formats [Catatan Belanja](e)... and summarizes 1-4 Upgrades as Upgrade N', () => {
  const emptyOrder = calculateOrder({
    vehicleId: 'elegy',
    upgradeIds: [],
    nitroId: null,
    wheelId: null,
    bodyParts: {},
  });
  assert.equal(buildShoppingNoteText(emptyOrder), '');

  const exactExample = calculateOrder({
    vehicleId: 'elegy',
    paintjobId: 1,
    upgradeIds: selectAllUpgrades(),
    nitroId: 'nitro-10x',
    wheelId: 'switch',
    bodyParts: { spoiler: 'xflow-spoiler' },
  });
  assert.equal(
    buildShoppingNoteText(exactExample),
    '[Catatan Belanja](e)Paintjob 1(e)Upgrade 4(e)10x Nitro(e)X-Flow Spoiler(e)Switch Wheels'
  );

  const singleUpgrade = calculateOrder({
    vehicleId: 'sultan',
    upgradeIds: ['upgrade-fuel-tank'],
    nitroId: null,
    wheelId: null,
    bodyParts: {},
  });
  assert.equal(buildShoppingNoteText(singleUpgrade), '[Catatan Belanja](e)Upgrade 1');

  const twoUpgrades = calculateOrder({
    vehicleId: 'flash',
    upgradeIds: ['upgrade-engine', 'upgrade-body'],
    nitroId: 'nitro-5x',
    wheelId: null,
    bodyParts: {},
  });
  assert.equal(
    buildShoppingNoteText(twoUpgrades),
    '[Catatan Belanja](e)Upgrade 2(e)5x Nitro'
  );

  const threeUpgrades = calculateOrder({
    vehicleId: 'jester',
    changeColor: true,
    upgradeIds: ['upgrade-engine', 'upgrade-alarm', 'upgrade-fuel-tank'],
    nitroId: null,
    wheelId: null,
    bodyParts: {},
  });
  assert.equal(
    buildShoppingNoteText(threeUpgrades),
    '[Catatan Belanja](e)Change Color(e)Upgrade 3'
  );
});

test('all 72 WAA and 47 Locolow (119 total) official preview images exist on disk with exact counts', () => {
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
    slamvan: 11,
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
  assert.equal(locoCount, 47);

  // Verify newly downloaded Remington Misc & Slamvan Bullbar/Sideskirt names
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
  const slamvanRightSkirt = getVehicleSlotsWithParts('slamvan').find(
    (g) => g.slot === 'sideskirt-right'
  );
  const slamvanLeftSkirt = getVehicleSlotsWithParts('slamvan').find(
    (g) => g.slot === 'sideskirt-left'
  );
  assert.deepEqual(
    slamvanFrontBullbars?.parts.map((p) => p.partName),
    ['Slamin Front Bullbars', 'Chrome Front Bullbars']
  );
  assert.deepEqual(
    slamvanRearBullbars?.parts.map((p) => p.partName),
    ['Slamin Rear Bullbars', 'Chrome Rear Bullbars']
  );
  assert.deepEqual(
    slamvanRightSkirt?.parts.map((p) => p.partName),
    ["Right 'Chrome Trim' Sideskirt", "Right 'Wheelcovers' Sideskirt"]
  );
  assert.deepEqual(
    slamvanLeftSkirt?.parts.map((p) => p.partName),
    ["Left 'Chrome Trim' Sideskirt", "Left 'Wheelcovers' Sideskirt"]
  );
});

test('2-color Locolow vehicles (Blade, Remington, Savanna, Tornado) can combine Paintjob + Secondary Change Color while all others stay normal', () => {
  // 1. Exact alignment with GTA:SA 3D asset secondary-color flags across all 36 vehicles
  for (const v of ALL_VEHICLES) {
    const asset = VEHICLE_3D_ASSETS[v.id];
    const expected = v.category === 'Locolow' && Boolean(asset?.supportsSecondaryColor);
    assert.equal(
      isTwoColorLocolowVehicle(v.id),
      expected,
      `Mismatch for ${v.id} (${v.category})`
    );
  }
  assert.deepEqual(
    ALL_VEHICLES.filter((v) => isTwoColorLocolowVehicle(v.id)).map((v) => v.id),
    ['blade', 'remington', 'savanna', 'tornado']
  );
  assert.equal(isTwoColorLocolowVehicle('slamvan'), false);
  assert.equal(isTwoColorLocolowVehicle('elegy'), false);
  assert.equal(isTwoColorLocolowVehicle('sandking'), false);

  // 2. State transitions on a 2-color Locolow vehicle (Blade)
  let finish = selectPaintjobFinish({ paintjobId: null, changeColor: false }, 1, true);
  assert.deepEqual(finish, { paintjobId: 1, changeColor: false });

  // Picking a secondary color keeps Paintjob 1 active and turns on Change Color
  finish = selectSecondaryColorFinish(finish, 3, true);
  assert.deepEqual(finish, { paintjobId: 1, changeColor: true, secondaryColorId: 3 });

  // Switching to Paintjob 2 preserves secondary color ID 3
  finish = selectPaintjobFinish(finish, 2, true);
  assert.deepEqual(finish, { paintjobId: 2, changeColor: true, secondaryColorId: 3 });

  // Turning off Change Color keeps Paintjob 2 active
  const pjOnlyFinish = selectChangeColorFinish(finish, false, true);
  assert.deepEqual(pjOnlyFinish, { paintjobId: 2, changeColor: false });

  // Re-enabling Change Color keeps Paintjob 2 active
  const combinedToggle = selectChangeColorFinish(pjOnlyFinish, true, true);
  assert.deepEqual(combinedToggle, { paintjobId: 2, changeColor: true });

  // Choosing a Primary Color (Color 1) clears Paintjob and switches to standard Change Color
  const primaryOverride = selectPrimaryColorFinish(finish, 126);
  assert.deepEqual(primaryOverride, {
    paintjobId: null,
    changeColor: true,
    primaryColorId: 126,
    secondaryColorId: 3,
  });

  // Switching from Blade (PJ 2 + Change Color Sekunder ID 3) to Slamvan or Elegy clears Change Color
  assert.deepEqual(reconcilePaintFinishForVehicle(finish, 'slamvan', [1, 2, 3]), {
    paintjobId: 2,
    changeColor: false,
  });
  assert.deepEqual(reconcilePaintFinishForVehicle(finish, 'elegy', [1, 2, 3]), {
    paintjobId: 2,
    changeColor: false,
  });
  // Switching from Blade to Savanna (another 2-color Locolow) preserves both!
  assert.deepEqual(reconcilePaintFinishForVehicle(finish, 'savanna', [1, 2, 3]), finish);
  // Switching from Blade to Sandking (Non-WAA/Locolow) clears Paintjob and preserves Change Color
  assert.deepEqual(reconcilePaintFinishForVehicle(finish, 'sandking', []), {
    paintjobId: null,
    changeColor: true,
    secondaryColorId: 3,
  });

  // 3. Billing & Shopping Note for 2-color Locolow (Paintjob $88 + Secondary Change Color $88 = $176)
  assert.equal(formatSecondaryChangeColorLabel(3), 'Change Color Sekunder (ID 3)');
  assert.equal(formatSecondaryChangeColorLabel(null), 'Change Color Sekunder');

  const bladeCombined = calculateOrder({
    vehicleId: 'blade',
    nitroId: 'nitro-2x', // 165
    wheelId: null,
    bodyParts: {},
    paintjobId: 1, // 88
    changeColor: true, // 88 (secondary)
    primaryColorId: 126, // ignored when Paintjob is active
    secondaryColorId: 3,
  });
  assert.equal(bladeCombined.itemCount, 3);
  assert.equal(bladeCombined.total, 88 + 88 + 165);
  assert.deepEqual(
    bladeCombined.items.map((i) => i.label),
    ['Paintjob 1', 'Change Color Sekunder (ID 3)', '2x Nitro']
  );
  assert.equal(
    buildShoppingNoteText(bladeCombined),
    '[Catatan Belanja](e)Paintjob 1(e)Change Color Sekunder (ID 3)(e)2x Nitro'
  );

  // 4. Slamvan (1-color Locolow) and Elegy (WAA) remain strictly mutually exclusive ($88 only)
  for (const normalVehicleId of ['slamvan', 'elegy', 'sultan']) {
    const order = calculateOrder({
      vehicleId: normalVehicleId,
      nitroId: null,
      wheelId: null,
      bodyParts: {},
      paintjobId: 1,
      changeColor: true,
      secondaryColorId: 3,
    });
    assert.equal(order.itemCount, 1, `${normalVehicleId} must keep Paintjob/Change Color exclusive`);
    assert.equal(order.total, 88);
    assert.equal(order.items[0].label, 'Paintjob 1');
  }
});
