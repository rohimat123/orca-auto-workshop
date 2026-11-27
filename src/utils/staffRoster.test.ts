import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ON_DUTY_SPREADSHEET_ID,
  DEFAULT_ON_DUTY_SPREADSHEET_URL,
  DEFAULT_STAFF_MEMBERS,
  ON_DUTY_SHEET_RANGE,
  STAFF_COUNT,
  applyOnDutyNamesToRoster,
  buildOnDutySheetCsvUrl,
  evaluateScheduleAtTime,
  extractSpreadsheetId,
  fetchOnDutyRosterFromSheet,
  getStaffInitials,
  isSafeImageUrl,
  parseOnDutyNamesFromCsv,
  parseScheduleFromCsv,
  parseShiftTimeRange,
  parseSpreadsheetDate,
  resolveOnDutySheetSource,
  wibDateTimeToUtcMs,
} from './staffRoster';

const LIVE_SHEET_FIXTURE_CSV = [
  'SHIFT,MECHANIC 1',
  ',25 November 2026',
  '00:00 - 04:00,Jett Montreve',
  '04:00 - 08:00,',
  '08:00 - 12:00,Anthony Prudencio & Ara Viara',
  '12:00 - 16:00,Matheo Jackson',
  '16:00 - 20:00,',
  '20:00 - 00:00,Dominico Campbell',
  ',https://discord.com/channels/@me/1573656138895855626/1573657908812587100',
].join('\n');

function wibDate(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return new Date(wibDateTimeToUtcMs(year, month, day, hour, minute));
}

test('DEFAULT_STAFF_MEMBERS has exact 6 mechanics in required left-to-right order and roles', () => {
  assert.equal(DEFAULT_STAFF_MEMBERS.length, STAFF_COUNT);
  assert.deepEqual(
    DEFAULT_STAFF_MEMBERS.map((m) => ({ name: m.name, role: m.role })),
    [
      { name: 'Matheo Jackson', role: 'Owner Workshop' },
      { name: 'Ara Viara', role: 'Management Workshop' },
      { name: 'Jett Montreve', role: 'WAA&Loco Specialist' },
      { name: 'Anthony Prudencio', role: 'Mechanic' },
      { name: 'Jeevaa Pritchard', role: 'Mechanic' },
      { name: 'Dominico Campbell', role: 'Mechanic' },
    ]
  );

  for (const member of DEFAULT_STAFF_MEMBERS) {
    assert.equal(isSafeImageUrl(member.photoUrl), true);
    const diskPath = path.join(process.cwd(), member.photoUrl.replace(/^\//, ''));
    assert.equal(fs.existsSync(diskPath), true, `Missing staff portrait: ${diskPath}`);
  }
});

test('resolveOnDutySheetSource accepts both standard /d/<ID> (A1:Z10) and published /d/e/2PACX-.../pub CSV URLs only', () => {
  assert.equal(
    extractSpreadsheetId(DEFAULT_ON_DUTY_SPREADSHEET_URL),
    DEFAULT_ON_DUTY_SPREADSHEET_ID
  );
  assert.equal(
    buildOnDutySheetCsvUrl(DEFAULT_ON_DUTY_SPREADSHEET_URL, ON_DUTY_SHEET_RANGE),
    'https://docs.google.com/spreadsheets/d/1MadJd2v_fD0-akeXeIqSrF5pF3b2scH9QLhizGPbfas/gviz/tq?tqx=out:csv&range=A1%3AZ10'
  );

  const pubUrl =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vThqZfihM34YdCCaJsH-KIhRy_GqF1W2E9rLDJV_Qt62SqwkRz8VsDaVEutkSGlG_ZWFqz_PaYoMgMA/pub?gid=1708691691&single=true&output=csv';
  const resolvedPub = resolveOnDutySheetSource(pubUrl);
  assert.equal(resolvedPub?.mode, 'published-sheet');
  assert.equal(resolvedPub?.csvUrl, pubUrl);

  assert.equal(
    resolveOnDutySheetSource('https://evil.example.com/spreadsheets/d/e/2PACX-12345678901234567890/pub'),
    null
  );
  assert.equal(
    resolveOnDutySheetSource('http://docs.google.com/spreadsheets/d/1MadJd2v_fD0-akeXeIqSrF5pF3b2scH9QLhizGPbfas'),
    null
  );
});

test('parseSpreadsheetDate supports Indonesian, English, ISO, and numeric date formats and rejects invalid dates', () => {
  assert.deepEqual(parseSpreadsheetDate('25 November 2026'), {
    year: 2026,
    month: 11,
    day: 25,
    rawLabel: '25 November 2026',
    formattedId: '25 November 2026',
  });
  assert.equal(parseSpreadsheetDate('Rabu, 25 Mei 2026')?.formattedId, '25 Mei 2026');
  assert.equal(parseSpreadsheetDate('25 Agt 2026')?.formattedId, '25 Agustus 2026');
  assert.equal(parseSpreadsheetDate('November 25, 2026')?.formattedId, '25 November 2026');
  assert.equal(parseSpreadsheetDate('2026-11-25')?.formattedId, '25 November 2026');
  assert.equal(parseSpreadsheetDate('25/11/2026')?.formattedId, '25 November 2026');
  assert.equal(parseSpreadsheetDate('25-12-2026')?.formattedId, '25 Desember 2026');
  assert.equal(parseSpreadsheetDate('31 Februari 2026'), null);
  assert.equal(parseSpreadsheetDate('MECHANIC 1'), null);
});

test('parseShiftTimeRange handles colon, dot, midnight rollover, and rejects invalid times', () => {
  assert.deepEqual(parseShiftTimeRange('00:00 - 04:00'), {
    startHour: 0,
    startMinute: 0,
    endHour: 4,
    endMinute: 0,
    crossesMidnight: false,
    label: '00:00 - 04:00',
  });
  assert.equal(parseShiftTimeRange('08.00 - 12.00 WIB')?.label, '08:00 - 12:00');
  assert.equal(parseShiftTimeRange('20:00 - 00:00')?.crossesMidnight, true);
  assert.equal(parseShiftTimeRange('22:00 - 02:00')?.crossesMidnight, true);
  assert.equal(parseShiftTimeRange('25:00 - 26:00'), null);
});

test('evaluateScheduleAtTime flips mechanics to off-duty once shift ends and respects spreadsheet date', () => {
  const schedule = parseScheduleFromCsv(LIVE_SHEET_FIXTURE_CSV);
  assert.equal(schedule.hasScheduleStructure, true);
  assert.equal(schedule.sheetDate?.formattedId, '25 November 2026');

  // 02:30 WIB on 25 Nov 2026 -> only Jett Montreve (00:00 - 04:00) is On Duty
  const at0230 = evaluateScheduleAtTime(schedule, wibDate(2026, 11, 25, 2, 30));
  assert.equal(at0230.dateRelation, 'today');
  assert.equal(at0230.activeShiftLabel, '00:00 - 04:00');
  assert.deepEqual(at0230.onDutyNames, ['Jett Montreve']);
  assert.equal(at0230.staff.find((m) => m.name === 'Jett Montreve')?.status, 'on-duty');
  assert.equal(at0230.staff.find((m) => m.name === 'Ara Viara')?.status, 'off-duty');

  // 04:00 WIB exact end boundary -> Jett Montreve automatically becomes Off Duty (completed)
  const at0400 = evaluateScheduleAtTime(schedule, wibDate(2026, 11, 25, 4, 0));
  assert.deepEqual(at0400.onDutyNames, []);
  const jettAfter = at0400.staff.find((m) => m.name === 'Jett Montreve');
  assert.equal(jettAfter?.status, 'off-duty');
  assert.equal(jettAfter?.shiftState, 'completed');
  assert.equal(jettAfter?.shiftLabel, '00:00 - 04:00');

  // 10:52 WIB on 25 Nov 2026 -> Anthony Prudencio & Ara Viara On Duty; Jett Off Duty (completed); Matheo Off Duty (upcoming)
  const at1052 = evaluateScheduleAtTime(schedule, wibDate(2026, 11, 25, 10, 52));
  assert.equal(at1052.activeShiftLabel, '08:00 - 12:00');
  assert.deepEqual(at1052.onDutyNames, ['Anthony Prudencio', 'Ara Viara']);
  assert.equal(at1052.staff.filter((m) => m.status === 'on-duty').length, 2);
  assert.equal(at1052.staff.find((m) => m.name === 'Ara Viara')?.status, 'on-duty');
  assert.equal(at1052.staff.find((m) => m.name === 'Anthony Prudencio')?.status, 'on-duty');
  assert.equal(at1052.staff.find((m) => m.name === 'Jett Montreve')?.shiftState, 'completed');
  assert.equal(at1052.staff.find((m) => m.name === 'Matheo Jackson')?.status, 'off-duty');
  assert.equal(at1052.staff.find((m) => m.name === 'Matheo Jackson')?.shiftState, 'upcoming');

  // 23:30 WIB on 25 Nov 2026 -> Dominico Campbell (20:00 - 00:00) is On Duty
  const at2330 = evaluateScheduleAtTime(schedule, wibDate(2026, 11, 25, 23, 30));
  assert.deepEqual(at2330.onDutyNames, ['Dominico Campbell']);
  assert.equal(at2330.staff.find((m) => m.name === 'Dominico Campbell')?.status, 'on-duty');

  // 00:00 WIB on 26 Nov 2026 -> Spreadsheet date (25 Nov 2026) is now in the past; everyone is Off Duty
  const nextDayMidnight = evaluateScheduleAtTime(schedule, wibDate(2026, 11, 26, 0, 0));
  assert.equal(nextDayMidnight.dateRelation, 'past');
  assert.deepEqual(nextDayMidnight.onDutyNames, []);
  assert.equal(nextDayMidnight.staff.every((m) => m.status === 'off-duty'), true);

  // 24 Nov 2026 10:00 WIB -> Spreadsheet date (25 Nov 2026) is in the future; everyone is Off Duty
  const prevDay = evaluateScheduleAtTime(schedule, wibDate(2026, 11, 24, 10, 0));
  assert.equal(prevDay.dateRelation, 'future');
  assert.deepEqual(prevDay.onDutyNames, []);
  assert.equal(prevDay.staff.every((m) => m.status === 'off-duty'), true);
});

test('parseScheduleFromCsv supports multiple date columns side-by-side', () => {
  const multiDayCsv = [
    'SHIFT,HARI 1,HARI 2',
    ',24 November 2026,25 November 2026',
    '08:00 - 12:00,Jett Montreve,Jeevaa Pritchard',
  ].join('\n');

  const schedule = parseScheduleFromCsv(multiDayCsv);
  const eval25 = evaluateScheduleAtTime(schedule, wibDate(2026, 11, 25, 9, 30));
  assert.equal(eval25.sheetDate?.formattedId, '25 November 2026');
  assert.equal(eval25.dateRelation, 'today');
  assert.deepEqual(eval25.onDutyNames, ['Jeevaa Pritchard']);
  assert.equal(eval25.staff.find((m) => m.name === 'Jeevaa Pritchard')?.status, 'on-duty');
  assert.equal(eval25.staff.find((m) => m.name === 'Jett Montreve')?.status, 'off-duty');
});

test('parseOnDutyNamesFromCsv supports legacy single-column CSV and schedule-aware CSV', () => {
  const gvizCsv = '"Jett Montreve"\n"Anthony Prudencio & Ara Viara"\n""\n';
  assert.deepEqual(parseOnDutyNamesFromCsv(gvizCsv, 'gviz-range'), [
    'Jett Montreve',
    'Anthony Prudencio',
    'Ara Viara',
  ]);

  assert.deepEqual(
    parseOnDutyNamesFromCsv(
      LIVE_SHEET_FIXTURE_CSV,
      'published-sheet',
      wibDate(2026, 11, 25, 10, 30)
    ),
    ['Anthony Prudencio', 'Ara Viara']
  );
  assert.equal(getStaffInitials('Matheo Jackson'), 'MJ');
});

test('applyOnDutyNamesToRoster marks only provided names as on-duty (case-insensitive & alias-safe)', () => {
  const updated = applyOnDutyNamesToRoster([
    'jett montreve',
    'Anthony Pruidencio',
    'Ara Viara',
  ]);

  assert.deepEqual(
    updated.map((m) => [m.name, m.status]),
    [
      ['Matheo Jackson', 'off-duty'],
      ['Ara Viara', 'on-duty'],
      ['Jett Montreve', 'on-duty'],
      ['Anthony Prudencio', 'on-duty'],
      ['Jeevaa Pritchard', 'off-duty'],
      ['Dominico Campbell', 'off-duty'],
    ]
  );
});

test('fetchOnDutyRosterFromSheet fetches published CSV and evaluates active WIB shift + date cleanly', async () => {
  const pubUrl =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vThqZfihM34YdCCaJsH-KIhRy_GqF1W2E9rLDJV_Qt62SqwkRz8VsDaVEutkSGlG_ZWFqz_PaYoMgMA/pub?gid=1708691691&single=true&output=csv';

  const res = await fetchOnDutyRosterFromSheet({
    sheetUrl: pubUrl,
    now: wibDate(2026, 11, 25, 10, 52),
    fetchImpl: (async (url) => {
      assert.equal(String(url), pubUrl);
      return new Response(LIVE_SHEET_FIXTURE_CSV, {
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      });
    }) as typeof fetch,
  });

  assert.equal(res.source, 'live');
  assert.equal(res.sheetDate?.formattedId, '25 November 2026');
  assert.equal(res.dateRelation, 'today');
  assert.equal(res.activeShiftLabel, '08:00 - 12:00');
  assert.deepEqual(res.onDutyNames, ['Anthony Prudencio', 'Ara Viara']);
  assert.equal(res.staff.filter((m) => m.status === 'on-duty').length, 2);
  assert.equal(res.staff[1].status, 'on-duty'); // Ara Viara
  assert.equal(res.staff[2].status, 'off-duty'); // Jett Montreve (shift 00:00 - 04:00 sudah lewat)
  assert.equal(res.staff[3].status, 'on-duty'); // Anthony Prudencio
});

test('isSafeImageUrl blocks javascript:, data:, and http: URLs while allowing local assets and https:', () => {
  assert.equal(isSafeImageUrl('/src/assets/images/test.jpg'), true);
  assert.equal(isSafeImageUrl('https://cdn.discordapp.com/avatars/123/abc.png'), true);
  assert.equal(isSafeImageUrl('javascript:alert(1)'), false);
  assert.equal(isSafeImageUrl('data:image/svg+xml,<svg/>'), false);
  assert.equal(isSafeImageUrl('http://example.com/photo.jpg'), false);
  assert.equal(isSafeImageUrl('/src/assets/../../etc/passwd'), false);
});
