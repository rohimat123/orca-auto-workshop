/**
 * ORCA Auto Workshop — Google Apps Script All-in-One Bridge
 * 1) Order Calculator -> Google Form -> Google Sheets -> Discord Webhook Embed (onFormSubmit)
 * 2) Analisa 6 Karyawan berdasarkan ID Discord & Role "Mechanic On Duty" (1574467296091447300)
 *    - doGet()                    -> JSON 6 karyawan + status otomatis dari Discord API
 *    - doGet({discordId: '...'})  -> Analisa 1 ID Discord secara langsung untuk form di website
 *    - syncDutyStatusByDiscordRole() -> Sinkronisasi terjadwal ke tab "Karyawan" + notifikasi opsional ke Webhook Pantau
 *
 * CATATAN PENTING DISCORD API:
 * - Webhook Discord hanya bisa MENGIRIM pesan (write-only) dan tidak bisa membaca daftar Role member.
 * - Untuk mengecek apakah sebuah ID Discord memiliki Role Mechanic On Duty (1574467296091447300),
 *   Apps Script menggunakan DISCORD_BOT_TOKEN (Bot yang berada di server Discord Anda).
 * - URL Webhook Pantau (DISCORD_STATUS_WEBHOOK_URL) dapat disimpan di Script Properties untuk:
 *   (a) mendeteksi otomatis Server/Guild ID jika DISCORD_GUILD_ID belum diisi, dan
 *   (b) mengirim log perubahan status On Duty / Off Duty ke channel pantauan.
 *
 * CARA PASANG:
 * 1. Di Google Sheets, buka Extensions -> Apps Script, tempel seluruh kode ini.
 * 2. Buka Project Settings (ikon gerigi) -> Script Properties -> tambahkan:
 *    - DISCORD_WEBHOOK_URL        = <URL Webhook Discord untuk notifikasi Order Kalkulator>
 *    - DISCORD_MECHANIC_ROLE_ID   = 1572198506851213353
 *    - DISCORD_BOT_TOKEN          = <Token Bot Discord yang ada di server Anda>
 *    - DISCORD_ON_DUTY_ROLE_ID    = 1574467296091447300
 *    - DISCORD_GUILD_ID           = <Server/Guild ID Discord Anda, default: 1344920657431105546>
 *    - DISCORD_STATUS_WEBHOOK_URL = <Opsional: URL Webhook Pantau status mekanik>
 * 3. Jalankan fungsi setupKaryawanSheet() sekali, lalu isi kolom C ("Discord ID") untuk 6 karyawan.
 * 4. Pasang Trigger (ikon jam -> Add Trigger):
 *    - onFormSubmit                | From spreadsheet | On form submit
 *    - syncDutyStatusByDiscordRole | Time-driven      | Every 5 minutes (opsional untuk update sheet & webhook pantau)
 * 5. Deploy -> New deployment -> Web app (Execute as: Me | Who has access: Anyone)
 *    Salin URL Web App (/exec) ke VITE_STAFF_STATUS_API_URL di Vercel & AI Studio.
 */

var DEFAULT_MECHANIC_ROLE_ID = '1572198506851213353';
var DEFAULT_ON_DUTY_ROLE_ID = '1574467296091447300';
var DEFAULT_GUILD_ID = '1344920657431105546';
var DISCORD_EMBED_COLOR = 0x00A8FC;
var DISCORD_DUTY_EMBED_COLOR = 0x15803D;
var STAFF_SHEET_NAME = 'Karyawan';
var DISCORD_SNOWFLAKE_PATTERN = /^\d{17,20}$/;
var DISCORD_WEBHOOK_PATTERN =
  /^https:\/\/(?:discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api(?:\/v\d+)?\/webhooks\/\d{17,20}\/[A-Za-z0-9_-]{30,120}$/;

var FORM_FIELD_HEADERS = {
  buyerName: 'Nama Pembeli',
  vehicle: 'Kendaraan',
  items: 'Rincian Item & Harga',
  total: 'Total Biaya',
};

function sanitizeText(value) {
  return String(value || '')
    .replace(/[`\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function sanitizeSingleLine(value) {
  return sanitizeText(value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSnowflake(value) {
  var cleaned = sanitizeSingleLine(value).replace(/^<@!?(\d+)>$/, '$1');
  return DISCORD_SNOWFLAKE_PATTERN.test(cleaned) ? cleaned : '';
}

function formatIndonesianDateWIB(date) {
  var days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  var wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return (
    days[wib.getUTCDay()] +
    ', ' +
    wib.getUTCDate() +
    ' ' +
    months[wib.getUTCMonth()] +
    ' ' +
    wib.getUTCFullYear()
  );
}

function buildAlignedCodeBlock(buyerName, vehicle, rawItems, total) {
  var safeBuyer = sanitizeSingleLine(buyerName) || '-';
  var safeVehicle = sanitizeSingleLine(vehicle) || '-';
  var safeTotal = sanitizeSingleLine(total) || '$0.00';

  var itemLines = sanitizeText(rawItems)
    .split(/\r?\n/)
    .map(function (line) {
      return line.trim();
    })
    .filter(function (line) {
      return line.length > 0;
    });

  var parsedRows = itemLines.map(function (line) {
    var idx = line.lastIndexOf(':');
    if (idx > 0) {
      return {
        left: line.slice(0, idx).trim(),
        right: line.slice(idx + 1).trim(),
      };
    }
    return { left: line, right: '' };
  });

  var leftWidth = 5;
  for (var i = 0; i < parsedRows.length; i++) {
    if (parsedRows[i].left.length > leftWidth) {
      leftWidth = parsedRows[i].left.length;
    }
  }
  if (leftWidth > 30) leftWidth = 30;

  var dividerLen = Math.max(32, leftWidth + 12);
  var divider = new Array(dividerLen + 1).join('-');

  function padRight(str, len) {
    if (str.length >= len) return str;
    return str + new Array(len - str.length + 1).join(' ');
  }

  var lines = [
    'Pembeli   : ' + safeBuyer,
    'Kendaraan : ' + safeVehicle,
    divider,
  ];

  for (var j = 0; j < parsedRows.length; j++) {
    var row = parsedRows[j];
    if (row.right) {
      lines.push(padRight(row.left, leftWidth) + ' : ' + row.right);
    } else {
      lines.push(row.left);
    }
  }

  lines.push(divider);
  lines.push(padRight('Total', leftWidth) + ' : ' + safeTotal);

  return '```\n' + lines.join('\n') + '\n```';
}

function sendOrderEmbedToDiscord(buyerName, vehicle, itemsText, totalText) {
  var props = PropertiesService.getScriptProperties();
  var webhookUrl = String(props.getProperty('DISCORD_WEBHOOK_URL') || '').trim();
  if (!webhookUrl) {
    throw new Error(
      'Script Property DISCORD_WEBHOOK_URL belum diatur di Apps Script -> Project Settings.'
    );
  }

  if (!DISCORD_WEBHOOK_PATTERN.test(webhookUrl.replace(/\/+$/, ''))) {
    throw new Error('Format DISCORD_WEBHOOK_URL tidak valid.');
  }

  var roleId = String(
    props.getProperty('DISCORD_MECHANIC_ROLE_ID') || DEFAULT_MECHANIC_ROLE_ID
  ).trim();
  var hasValidRole = DISCORD_SNOWFLAKE_PATTERN.test(roleId);

  var now = new Date();
  var payload = {
    content: hasValidRole ? '<@&' + roleId + '>' : '@mechanic',
    allowed_mentions: {
      parse: [],
      roles: hasValidRole ? [roleId] : [],
    },
    embeds: [
      {
        title: 'ORCA Auto Workshop — Estimasi Belanja',
        description: buildAlignedCodeBlock(
          buyerName,
          vehicle,
          itemsText,
          totalText
        ),
        color: DISCORD_EMBED_COLOR,
        footer: {
          text: formatIndonesianDateWIB(now),
        },
        timestamp: now.toISOString(),
      },
    ],
  };

  var response = UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  var statusCode = response.getResponseCode();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error('Discord Webhook merespons HTTP ' + statusCode);
  }
}

function getFieldValue(e, headerName, fallbackIndex) {
  if (e && e.namedValues && e.namedValues[headerName] && e.namedValues[headerName][0]) {
    return e.namedValues[headerName][0];
  }
  if (e && e.values && e.values.length > fallbackIndex) {
    return e.values[fallbackIndex];
  }
  return '';
}

/**
 * Trigger 1: From spreadsheet -> On form submit (Order Kalkulator)
 */
function onFormSubmit(e) {
  var buyerName = getFieldValue(e, FORM_FIELD_HEADERS.buyerName, 1);
  var vehicle = getFieldValue(e, FORM_FIELD_HEADERS.vehicle, 2);
  var itemsText = getFieldValue(e, FORM_FIELD_HEADERS.items, 3);
  var totalText = getFieldValue(e, FORM_FIELD_HEADERS.total, 4);

  if (!sanitizeSingleLine(buyerName) || !sanitizeText(itemsText)) {
    Logger.log('Data form kosong, pengiriman Discord dilewati.');
    return;
  }

  sendOrderEmbedToDiscord(buyerName, vehicle, itemsText, totalText);
}

/**
 * Jalankan sekali untuk membuat tab "Karyawan" berbasis ID Discord.
 * Kolom: A=Nama | B=Jabatan | C=Discord ID | D=Foto (URL https:// opsional) | E=Status (Auto)
 */
function setupKaryawanSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(STAFF_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(STAFF_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Nama', 'Jabatan', 'Discord ID', 'Foto', 'Status']);
    var defaults = [
      ['Jett Montreve', 'Workshop Manager', '', '', 'Off Duty'],
      ['Dominico Campbell', 'Senior Mechanic', '', '', 'Off Duty'],
      ['Ara Viara', 'Paint & Body Specialist', '', '', 'Off Duty'],
      ['Anthony Prudencio', 'Lead Tuner', '', '', 'Off Duty'],
      ['Gallagher Oakley', 'Lowrider Specialist', '', '', 'Off Duty'],
      ['Marcus Reid', 'Performance Mechanic', '', '', 'Off Duty'],
    ];
    sheet.getRange(2, 1, defaults.length, 5).setValues(defaults);
  }
}

function resolveGuildId(props) {
  var configuredGuild = normalizeSnowflake(props.getProperty('DISCORD_GUILD_ID'));
  if (configuredGuild) return configuredGuild;

  // Jika DISCORD_GUILD_ID kosong, coba baca guild_id dari metadata DISCORD_STATUS_WEBHOOK_URL
  var statusWebhook = String(props.getProperty('DISCORD_STATUS_WEBHOOK_URL') || '').trim();
  if (statusWebhook && DISCORD_WEBHOOK_PATTERN.test(statusWebhook.replace(/\/+$/, ''))) {
    try {
      var metaRes = UrlFetchApp.fetch(statusWebhook, {
        method: 'get',
        muteHttpExceptions: true,
      });
      if (metaRes.getResponseCode() === 200) {
        var meta = JSON.parse(metaRes.getContentText());
        var detectedGuild = normalizeSnowflake(meta.guild_id);
        if (detectedGuild) {
          props.setProperty('DISCORD_GUILD_ID', detectedGuild);
          return detectedGuild;
        }
      }
    } catch (err) {
      Logger.log('Gagal deteksi Guild ID dari webhook: ' + err);
    }
  }

  return DEFAULT_GUILD_ID;
}

function getOnDutyRoleId(props) {
  return (
    normalizeSnowflake(props.getProperty('DISCORD_ON_DUTY_ROLE_ID')) ||
    DEFAULT_ON_DUTY_ROLE_ID
  );
}

/**
 * Menganalisa 1 ID Discord langsung ke Discord API untuk mengecek apakah user
 * memiliki Role Mechanic On Duty (1574467296091447300).
 */
function analyzeDiscordMemberById(guildId, discordId, onDutyRoleId, botToken) {
  var cleanGuild = normalizeSnowflake(guildId);
  var cleanUser = normalizeSnowflake(discordId);
  var cleanRole = normalizeSnowflake(onDutyRoleId) || DEFAULT_ON_DUTY_ROLE_ID;

  if (!cleanGuild || !cleanUser) {
    return {
      ok: false,
      discordId: cleanUser || String(discordId || ''),
      roleId: cleanRole,
      error: 'ID Discord atau Guild ID tidak valid.',
    };
  }

  if (!botToken) {
    return {
      ok: false,
      discordId: cleanUser,
      roleId: cleanRole,
      error:
        'Script Property DISCORD_BOT_TOKEN belum diatur di Apps Script -> Project Settings.',
    };
  }

  var url =
    'https://discord.com/api/v10/guilds/' +
    cleanGuild +
    '/members/' +
    cleanUser;

  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bot ' + botToken },
    muteHttpExceptions: true,
  });

  var code = res.getResponseCode();
  if (code === 404) {
    return {
      ok: false,
      discordId: cleanUser,
      roleId: cleanRole,
      error: 'ID Discord ' + cleanUser + ' tidak ditemukan di server Discord ini.',
    };
  }
  if (code !== 200) {
    return {
      ok: false,
      discordId: cleanUser,
      roleId: cleanRole,
      error: 'Discord API merespons HTTP ' + code + '. Periksa DISCORD_BOT_TOKEN & akses Bot.',
    };
  }

  var member = JSON.parse(res.getContentText());
  var roles = Array.isArray(member.roles) ? member.roles : [];
  var hasOnDutyRole = roles.indexOf(cleanRole) !== -1;

  var userObj = member.user || {};
  var displayName = sanitizeSingleLine(
    member.nick || userObj.global_name || userObj.username || ''
  );

  var avatarUrl = '';
  if (userObj.avatar && /^(?:a_)?[a-fA-F0-9]{16,64}$/.test(String(userObj.avatar))) {
    avatarUrl =
      'https://cdn.discordapp.com/avatars/' +
      cleanUser +
      '/' +
      String(userObj.avatar) +
      '.png?size=256';
  }

  return {
    ok: true,
    discordId: cleanUser,
    displayName: displayName,
    avatarUrl: avatarUrl,
    roles: roles,
    hasOnDutyRole: hasOnDutyRole,
    status: hasOnDutyRole ? 'on-duty' : 'off-duty',
    roleId: cleanRole,
  };
}

function readKaryawanRows(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];

  var headers = sheet
    .getRange(1, 1, 1, Math.max(4, sheet.getLastColumn()))
    .getValues()[0]
    .map(function (h) {
      return sanitizeSingleLine(h).toLowerCase();
    });

  // Mendukung format baru (Nama | Jabatan | Discord ID | Foto | Status)
  // sekaligus tetap aman untuk format lama (Nama | Jabatan | Status | Foto)
  var isDiscordLayout = headers[2] && headers[2].indexOf('discord') !== -1;
  var colCount = Math.min(5, Math.max(4, sheet.getLastColumn()));
  var rows = sheet.getRange(2, 1, Math.min(6, sheet.getLastRow() - 1), colCount).getValues();

  var list = [];
  for (var i = 0; i < rows.length; i++) {
    var nama = sanitizeSingleLine(rows[i][0]);
    if (!nama) continue;
    var jabatan = sanitizeSingleLine(rows[i][1]) || 'Mechanic';
    var discordId = isDiscordLayout ? normalizeSnowflake(rows[i][2]) : '';
    var rawFoto = isDiscordLayout ? sanitizeSingleLine(rows[i][3]) : sanitizeSingleLine(rows[i][3]);
    var rawStatus = isDiscordLayout ? sanitizeSingleLine(rows[i][4]) : sanitizeSingleLine(rows[i][2]);
    var foto = /^https:\/\//i.test(rawFoto) ? rawFoto : '';
    var fallbackStatus =
      rawStatus.toLowerCase() === 'on duty' ||
      rawStatus.toLowerCase() === 'on-duty' ||
      rawStatus.toLowerCase() === 'on'
        ? 'on-duty'
        : 'off-duty';

    list.push({
      rowNumber: i + 2,
      isDiscordLayout: isDiscordLayout,
      id: 'staff-' + (i + 1),
      name: nama,
      role: jabatan,
      discordId: discordId,
      photoUrl: foto,
      status: fallbackStatus,
    });
  }
  return list;
}

/**
 * Web App Endpoint (Deploy -> Web app -> Anyone)
 * - GET /exec                     -> Mengembalikan 6 karyawan dengan analisa live Role Mechanic On Duty (1574467296091447300)
 * - GET /exec?discordId=<17-20d>  -> Menganalisa 1 ID Discord secara langsung untuk form analisa di website
 */
function doGet(e) {
  var props = PropertiesService.getScriptProperties();
  var botToken = String(props.getProperty('DISCORD_BOT_TOKEN') || '').trim();
  var guildId = resolveGuildId(props);
  var onDutyRoleId = getOnDutyRoleId(props);

  // Mode 1: Analisa 1 ID Discord langsung dari form website
  var queryDiscordId =
    e && e.parameter && e.parameter.discordId ? normalizeSnowflake(e.parameter.discordId) : '';
  if (e && e.parameter && typeof e.parameter.discordId !== 'undefined') {
    var singleResult = analyzeDiscordMemberById(
      guildId,
      queryDiscordId || e.parameter.discordId,
      onDutyRoleId,
      botToken
    );
    return ContentService.createTextOutput(JSON.stringify(singleResult)).setMimeType(
      ContentService.MimeType.JSON
    );
  }

  // Mode 2: Feed 6 Karyawan (cache 30 detik agar hemat kuota Discord API)
  var cache = CacheService.getScriptCache();
  var cached = cache.get('orca_staff_discord_feed_v1');
  if (cached) {
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(STAFF_SHEET_NAME);
  var rows = readKaryawanRows(sheet);
  var usedDiscordApi = false;
  var staff = [];

  for (var i = 0; i < rows.length; i++) {
    var item = rows[i];
    var finalStatus = item.status;
    var finalPhoto = item.photoUrl;
    var hasOnDutyRole = finalStatus === 'on-duty';

    if (botToken && item.discordId) {
      var check = analyzeDiscordMemberById(guildId, item.discordId, onDutyRoleId, botToken);
      if (check.ok) {
        usedDiscordApi = true;
        finalStatus = check.status;
        hasOnDutyRole = check.hasOnDutyRole;
        if (!finalPhoto && check.avatarUrl) {
          finalPhoto = check.avatarUrl;
        }
      }
    }

    staff.push({
      id: item.id,
      name: item.name,
      role: item.role,
      discordId: item.discordId,
      status: finalStatus,
      hasOnDutyRole: hasOnDutyRole,
      photoUrl: finalPhoto,
    });
  }

  var jsonStr = JSON.stringify({
    ok: true,
    mode: usedDiscordApi ? 'discord-role' : 'sheet',
    roleId: onDutyRoleId,
    updatedAt: new Date().toISOString(),
    staff: staff,
  });

  cache.put('orca_staff_discord_feed_v1', jsonStr, 30);

  return ContentService.createTextOutput(jsonStr).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Trigger 2 (Opsional, Time-driven tiap 5 menit):
 * Mengecek Role Mechanic On Duty (1574467296091447300) untuk 6 ID Discord di tab "Karyawan",
 * memperbarui kolom Status di Google Sheets, dan mengirim ringkasan perubahan ke DISCORD_STATUS_WEBHOOK_URL (jika diatur).
 */
function syncDutyStatusByDiscordRole() {
  var props = PropertiesService.getScriptProperties();
  var botToken = String(props.getProperty('DISCORD_BOT_TOKEN') || '').trim();
  if (!botToken) {
    Logger.log('DISCORD_BOT_TOKEN belum diatur di Script Properties.');
    return;
  }

  var guildId = resolveGuildId(props);
  var onDutyRoleId = getOnDutyRoleId(props);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(STAFF_SHEET_NAME);
  var rows = readKaryawanRows(sheet);
  if (rows.length === 0) return;

  var changes = [];
  var onDutyNames = [];

  for (var i = 0; i < rows.length; i++) {
    var item = rows[i];
    if (!item.discordId) continue;

    var check = analyzeDiscordMemberById(guildId, item.discordId, onDutyRoleId, botToken);
    if (!check.ok) continue;

    var newLabel = check.hasOnDutyRole ? 'On Duty' : 'Off Duty';
    var oldLabel = item.status === 'on-duty' ? 'On Duty' : 'Off Duty';

    if (check.hasOnDutyRole) {
      onDutyNames.push(item.name);
    }

    if (newLabel !== oldLabel && item.isDiscordLayout) {
      sheet.getRange(item.rowNumber, 5).setValue(newLabel);
      changes.push('- ' + item.name + ' (' + item.discordId + '): ' + oldLabel + ' -> ' + newLabel);
    }
  }

  CacheService.getScriptCache().remove('orca_staff_discord_feed_v1');

  // Kirim ringkasan ke Webhook Pantau jika DISCORD_STATUS_WEBHOOK_URL diatur dan ada perubahan
  var statusWebhook = String(props.getProperty('DISCORD_STATUS_WEBHOOK_URL') || '').trim();
  if (
    changes.length > 0 &&
    statusWebhook &&
    DISCORD_WEBHOOK_PATTERN.test(statusWebhook.replace(/\/+$/, ''))
  ) {
    var now = new Date();
    var body = {
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: 'ORCA Auto Workshop — Update Status Tugas Mekanik',
          description:
            '```\n' +
            changes.join('\n') +
            '\n--------------------------------\n' +
            'On Duty saat ini: ' +
            (onDutyNames.length > 0 ? onDutyNames.join(', ') : 'Tidak ada') +
            '\n```',
          color: DISCORD_DUTY_EMBED_COLOR,
          footer: { text: formatIndonesianDateWIB(now) },
          timestamp: now.toISOString(),
        },
      ],
    };

    UrlFetchApp.fetch(statusWebhook, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    });
  }
}

/**
 * Jalankan fungsi ini sekali secara manual di editor Apps Script untuk uji coba Embed Order Discord.
 */
function testSendSampleOrder() {
  sendOrderEmbedToDiscord(
    'Dominico Campbell',
    'Flash - Tipe WAA',
    '- Upgrade Engine: $400.00\n- Upgrade Body: $400.00\n- X-Flow Front Bumper: $396.00',
    '$1,196.00'
  );
}
