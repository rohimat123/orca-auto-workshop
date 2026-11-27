import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseDff, parseTxd } from './rwParser';
import {
  VEHICLE_3D_ASSETS,
  WHEEL_3D_ASSETS,
  getVehiclePaintjobs,
  resolveModPart3DAsset,
} from '../data/gta3Assets';
import {
  ALL_VEHICLES,
  LOCOLOW_VEHICLES,
  NON_WAA_LOCOLOW_VEHICLES,
  WAA_VEHICLES,
  WHEELS,
  getVehicleBodyParts,
} from '../data/workshopData';

const FULL_MOD_VEHICLES = [...WAA_VEHICLES, ...LOCOLOW_VEHICLES];
const SIX_WHEEL_VEHICLE_IDS = new Set(['flatbed', 'linerunner', 'petrol-tanker', 'roadtrain']);

const PUBLIC_ROOT = path.resolve(process.cwd(), 'public');

function readPublicBuffer(urlPath: string): ArrayBuffer {
  const fullPath = path.join(PUBLIC_ROOT, urlPath.replace(/^\/+/, ''));
  assert.ok(fs.existsSync(fullPath), `Missing GTA3 asset on disk: ${urlPath}`);
  const buf = fs.readFileSync(fullPath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe('RenderWare DFF/TXD Parser & GTA3 Asset Integrity', () => {
  it('parses all 36 authentic GTA:SA vehicle DFF and TXD files cleanly with valid wheel & chassis frames', () => {
    assert.equal(ALL_VEHICLES.length, 36);
    assert.equal(NON_WAA_LOCOLOW_VEHICLES.length, 25);

    for (const vehicle of ALL_VEHICLES) {
      const asset = VEHICLE_3D_ASSETS[vehicle.id];
      assert.ok(asset, `Missing 3D asset mapping for vehicle ${vehicle.id}`);

      const clump = parseDff(readPublicBuffer(asset.dffUrl));
      assert.ok(clump.frames.length >= 10, `${vehicle.id} should have frame hierarchy`);
      assert.ok(clump.atomics.length >= 2, `${vehicle.id} should have atomics`);

      const frameNames = new Set(clump.frames.map((f) => f.name.toLowerCase()));
      assert.ok(frameNames.has('chassis'), `${vehicle.id} missing chassis frame`);
      assert.ok(frameNames.has('wheel_rf_dummy'), `${vehicle.id} missing wheel_rf_dummy`);
      assert.ok(frameNames.has('wheel_lf_dummy'), `${vehicle.id} missing wheel_lf_dummy`);
      assert.ok(frameNames.has('wheel_rb_dummy'), `${vehicle.id} missing wheel_rb_dummy`);
      assert.ok(frameNames.has('wheel_lb_dummy'), `${vehicle.id} missing wheel_lb_dummy`);
      assert.ok(frameNames.has('wheel'), `${vehicle.id} missing wheel template frame`);

      if (SIX_WHEEL_VEHICLE_IDS.has(vehicle.id)) {
        assert.ok(frameNames.has('wheel_rm_dummy'), `${vehicle.id} missing wheel_rm_dummy`);
        assert.ok(frameNames.has('wheel_lm_dummy'), `${vehicle.id} missing wheel_lm_dummy`);
      }

      const txd = parseTxd(readPublicBuffer(asset.txdUrl));
      assert.ok(txd.textures.size > 0, `${vehicle.id}.txd should contain textures`);
      for (const tex of txd.textures.values()) {
        assert.equal(tex.rgba.length, tex.width * tex.height * 4);
      }
    }
  });

  it('verifies every catalog body modification maps to existing DFF(s) and valid target dummy frames', () => {
    let checkedMods = 0;
    for (const vehicle of FULL_MOD_VEHICLES) {
      const carAsset = VEHICLE_3D_ASSETS[vehicle.id];
      const carClump = parseDff(readPublicBuffer(carAsset.dffUrl));
      const carFrames = new Set(carClump.frames.map((f) => f.name.toLowerCase()));

      const parts = getVehicleBodyParts(vehicle.id);
      for (const part of parts) {
        const modAsset = resolveModPart3DAsset(vehicle.id, part.id, part.slot);
        assert.ok(
          modAsset && modAsset.attachments.length > 0,
          `Missing 3D mod mapping for ${vehicle.id} -> ${part.id} (${part.slot})`
        );

        for (const att of modAsset.attachments) {
          assert.ok(
            carFrames.has(att.targetDummy.toLowerCase()),
            `Vehicle ${vehicle.id} missing target dummy "${att.targetDummy}" needed by ${part.id}`
          );
          const modClump = parseDff(readPublicBuffer(att.dffUrl));
          const undamagedAtomics = modClump.atomics.filter((a) => {
            const fr = modClump.frames[a.frameIndex];
            return fr && !fr.name.toLowerCase().endsWith('_dam');
          });
          assert.ok(
            undamagedAtomics.length > 0,
            `Mod DFF ${att.dffUrl} should have at least one undamaged atomic`
          );
        }
        checkedMods++;
      }
    }
    // 6 WAA * 12 + 47 Locolow = 119 total mod definitions
    assert.equal(checkedMods, 119);
  });

  it('verifies all 17 wheel catalog items map to existing, parseable wheel DFFs', () => {
    assert.equal(WHEELS.length, 17);
    for (const wheel of WHEELS) {
      const wheelAsset = WHEEL_3D_ASSETS[wheel.id];
      assert.ok(wheelAsset, `Missing 3D wheel mapping for ${wheel.id}`);
      const clump = parseDff(readPublicBuffer(wheelAsset.dffUrl));
      assert.ok(clump.atomics.length >= 1, `${wheel.id} should have wheel geometry`);
      const geom = clump.geometries[clump.atomics[0].geometryIndex];
      assert.ok(geom.vertices.length >= 30, `${wheel.id} wheel should have vertices`);
    }
  });

  it('verifies all vehicle paintjob TXDs exist on disk, decode cleanly, and pair with remap body materials', () => {
    let totalPaintjobs = 0;
    for (const vehicle of FULL_MOD_VEHICLES) {
      const paintjobs = getVehiclePaintjobs(vehicle.id);
      if (paintjobs.length === 0) continue;

      // Ensure the base vehicle DFF actually exposes a remap*body* material
      const carClump = parseDff(readPublicBuffer(VEHICLE_3D_ASSETS[vehicle.id].dffUrl));
      const hasRemap = carClump.geometries.some((g) =>
        g.materials.some((m) => {
          const tex = m.textureName?.toLowerCase() ?? '';
          return tex.startsWith('remap') && tex.includes('body');
        })
      );
      assert.ok(hasRemap, `${vehicle.id} declares paintjobs but has no remap*body* material`);

      for (const pj of paintjobs) {
        const txd = parseTxd(readPublicBuffer(pj.txdUrl));
        assert.ok(txd.textures.size >= 1, `${pj.txdUrl} should contain a paintjob texture`);
        const first = txd.textures.values().next().value;
        assert.ok(first, `${pj.txdUrl} first texture missing`);
        assert.ok(first.width >= 128 && first.height >= 128, `${pj.txdUrl} dimensions too small`);
        assert.equal(first.rgba.length, first.width * first.height * 4);
        totalPaintjobs++;
      }
    }
    assert.equal(totalPaintjobs, 33);
    // Unknown vehicles safely return an empty list
    assert.deepEqual(getVehiclePaintjobs('unknown-car'), []);
  });

  it('verifies authentic GTA:SA generic wheel & vehicle PNG textures exist on disk', () => {
    const requiredGenericFiles = [
      'vehiclegeneric256.png',
      'vehicletyres128.png',
      'vehiclelights128.png',
      'vehiclelightson128.png',
      'vehiclesteering128.png',
      'vehicledash32.png',
    ];
    for (const file of requiredGenericFiles) {
      const buf = readPublicBuffer(`/assets/gta3/generic/${file}`);
      const bytes = new Uint8Array(buf);
      assert.ok(bytes.length > 100, `${file} should not be empty`);
      // Verify PNG magic signature: 89 50 4E 47
      assert.equal(bytes[0], 0x89, `${file} invalid PNG magic byte 0`);
      assert.equal(bytes[1], 0x50, `${file} invalid PNG magic byte 1`);
      assert.equal(bytes[2], 0x4e, `${file} invalid PNG magic byte 2`);
      assert.equal(bytes[3], 0x47, `${file} invalid PNG magic byte 3`);
    }
  });
});
