import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrder } from './calculator';
import {
  buildGoogleFormOrderFields,
  buildGoogleFormUrlEncodedBody,
  isValidGoogleFormActionUrl,
  normalizeEntryId,
  normalizeGoogleFormActionUrl,
  sanitizeBuyerName,
  submitOrderToGoogleForm,
  validateGoogleFormConfig,
  type GoogleFormConfig,
} from './googleFormOrder';

const SAMPLE_CONFIG: GoogleFormConfig = {
  actionUrl:
    'https://docs.google.com/forms/d/e/1FAIpQLSeSampleFormId1234567890/formResponse',
  entries: {
    buyerName: 'entry.111111111',
    vehicle: 'entry.222222222',
    items: 'entry.333333333',
    total: 'entry.444444444',
  },
};

test('sanitizeBuyerName strips control chars, backticks, and Google Sheets formula injection prefixes', () => {
  assert.equal(sanitizeBuyerName('  Dominico   Campbell \n '), 'Dominico Campbell');
  assert.equal(sanitizeBuyerName('```@everyone```'), 'everyone');
  assert.equal(sanitizeBuyerName('=HYPERLINK("https://evil.com","Click")'), 'HYPERLINK("https://evil.com","Click")');
  assert.equal(sanitizeBuyerName('+1+1'), '1+1');
  assert.equal(sanitizeBuyerName('-cmd|calc'), 'cmd|calc');
  assert.equal(sanitizeBuyerName('@SUM(A1:A2)'), 'SUM(A1:A2)');
  assert.equal(sanitizeBuyerName('Jett-Montreve'), 'Jett-Montreve');
});

test('normalizeGoogleFormActionUrl accepts valid Google Form URLs, converts viewform to formResponse, and rejects non-Google URLs', () => {
  assert.equal(
    isValidGoogleFormActionUrl(
      'https://docs.google.com/forms/d/e/1FAIpQLSeSampleFormId1234567890/formResponse'
    ),
    true
  );
  assert.equal(
    normalizeGoogleFormActionUrl(
      'https://docs.google.com/forms/d/e/1FAIpQLSeSampleFormId1234567890/viewform?usp=sf_link'
    ),
    'https://docs.google.com/forms/d/e/1FAIpQLSeSampleFormId1234567890/formResponse'
  );
  assert.equal(
    isValidGoogleFormActionUrl('http://docs.google.com/forms/d/e/1FAIpQLSeSampleFormId1234567890/formResponse'),
    false
  );
  assert.equal(
    isValidGoogleFormActionUrl('https://evil.example.com/forms/d/e/123456789012/formResponse'),
    false
  );
  assert.equal(isValidGoogleFormActionUrl('javascript:alert(1)'), false);
});

test('normalizeEntryId normalizes raw numeric IDs and rejects invalid values', () => {
  assert.equal(normalizeEntryId('entry.123456789'), 'entry.123456789');
  assert.equal(normalizeEntryId('123456789'), 'entry.123456789');
  assert.equal(normalizeEntryId('entry.abc'), '');
  assert.equal(normalizeEntryId(''), '');
});

test('buildGoogleFormOrderFields and URLSearchParams match flowchart fields accurately', () => {
  const breakdown = calculateOrder({
    vehicleId: 'flash',
    nitroId: null,
    wheelId: 'shadow', // $154
    bodyParts: {
      'front-bumper': 'xflow-front-bumper', // $396
      exhaust: 'xflow-exhaust', // $286
    },
  });
  // 396 + 286 + 154 = $836.00
  assert.equal(breakdown.total, 836);

  const fields = buildGoogleFormOrderFields(breakdown, 'Jett Montreve');
  assert.equal(fields.buyerName, 'Jett Montreve');
  assert.equal(fields.vehicle, 'Flash - Tipe WAA');
  assert.equal(
    fields.itemsText,
    [
      '- X-Flow Front Bumper: $396.00',
      '- X-Flow Exhaust: $286.00',
      '- Shadow Wheels: $154.00',
    ].join('\n')
  );
  assert.equal(fields.totalText, '$836.00');

  const body = buildGoogleFormUrlEncodedBody(fields, SAMPLE_CONFIG);
  assert.equal(body.get('entry.111111111'), 'Jett Montreve');
  assert.equal(body.get('entry.222222222'), 'Flash - Tipe WAA');
  assert.equal(body.get('entry.333333333'), fields.itemsText);
  assert.equal(body.get('entry.444444444'), '$836.00');
});

test('submitOrderToGoogleForm validates buyerName, config, and submits via no-cors POST', async () => {
  const breakdown = calculateOrder({
    vehicleId: 'elegy',
    nitroId: null,
    wheelId: null,
    bodyParts: {
      'front-bumper': 'xflow-front-bumper',
      'rear-bumper': 'xflow-rear-bumper',
      spoiler: 'xflow-spoiler',
      'roof-vent': 'alien-roof-vent',
      exhaust: 'alien-exhaust',
    },
  });

  // Unconfigured form -> NOT_CONFIGURED
  const unconfigured = await submitOrderToGoogleForm({
    breakdown,
    buyerName: 'Dominico Campbell',
    config: {
      actionUrl: '',
      entries: { buyerName: '', vehicle: '', items: '', total: '' },
    },
  });
  assert.equal(unconfigured.ok, false);
  if (!unconfigured.ok) assert.equal(unconfigured.code, 'NOT_CONFIGURED');

  // Missing buyer name -> INVALID_BUYER_NAME
  const missingBuyer = await submitOrderToGoogleForm({
    breakdown,
    buyerName: ' ',
    config: SAMPLE_CONFIG,
  });
  assert.equal(missingBuyer.ok, false);
  if (!missingBuyer.ok) assert.equal(missingBuyer.code, 'INVALID_BUYER_NAME');

  // Configured form -> sends POST mode: no-cors with URLSearchParams
  let calledUrl = '';
  let calledInit: RequestInit | undefined;
  const result = await submitOrderToGoogleForm({
    breakdown,
    buyerName: 'Dominico Campbell',
    config: SAMPLE_CONFIG,
    fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
      calledUrl = String(url);
      calledInit = init;
      return new Response(null, { status: 200 });
    }) as typeof fetch,
  });

  assert.equal(result.ok, true);
  assert.equal(calledUrl, SAMPLE_CONFIG.actionUrl);
  assert.equal(calledInit?.method, 'POST');
  assert.equal(calledInit?.mode, 'no-cors');
  assert.ok(calledInit?.body instanceof URLSearchParams);
  assert.equal(
    (calledInit?.body as URLSearchParams).get('entry.444444444'),
    '$1,562.00'
  );
});

test('validateGoogleFormConfig reports all missing fields cleanly', () => {
  const check = validateGoogleFormConfig({
    actionUrl: '',
    entries: { buyerName: '12345', vehicle: '', items: 'entry.bad', total: 'entry.999' },
  });
  assert.equal(check.ready, false);
  assert.deepEqual(check.missing, [
    'VITE_GOOGLE_FORM_ACTION_URL',
    'VITE_GOOGLE_FORM_ENTRY_VEHICLE',
    'VITE_GOOGLE_FORM_ENTRY_ITEMS',
  ]);
});

test('Google Apps Script bridge file exists, uses Script Properties (no hardcoded webhook), and locks allowed_mentions', () => {
  const scriptPath = path.join(
    process.cwd(),
    'scripts',
    'google-apps-script-discord.gs'
  );
  assert.equal(fs.existsSync(scriptPath), true);
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.match(content, /PropertiesService\.getScriptProperties\(\)/);
  assert.match(content, /DISCORD_WEBHOOK_URL/);
  assert.match(content, /function onFormSubmit\(e\)/);
  assert.match(content, /UrlFetchApp\.fetch/);
  assert.match(content, /allowed_mentions/);
  assert.doesNotMatch(content, /discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]{20,}/);
});
