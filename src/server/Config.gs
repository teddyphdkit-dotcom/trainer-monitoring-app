/**
 * Config.gs — Konfigurasi global, konstanta PRD, skema 20 Sheet, dan utilitas dasar.
 */

var TM_CONFIG = {
  APP_NAME: 'Trainer Monitoring',
  TIMEZONE: 'Asia/Jakarta',
  SCHEMA_VERSION: '1.0.0',

  ROLES: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    TRAINER: 'TRAINER',
    MANAJEMEN: 'MANAJEMEN'
  },

  STATUS: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE'
  },

  SESSION_STATUS: {
    DRAFT: 'Draft',
    SELESAI: 'Selesai',
    DELETED: 'Deleted'
  },

  AUTH: {
    MAX_FAILED_LOGINS: 5,
    LOCKOUT_MINUTES: 15,
    SESSION_MAX_HOURS: 8,
    SESSION_IDLE_MINUTES: 30,
    RESET_TOKEN_MINUTES: 30,
    RATE_LIMIT_WINDOW_SEC: 300,
    RATE_LIMIT_MAX_ATTEMPTS: 15,
    PBKDF2_ITERATIONS: 10000,
    MIN_PASSWORD_LENGTH: 8
  },

  DEFAULTS: {
    COMPANY_NAME: 'Trainer Monitoring',
    MAX_ACTIVE_DRAFTS: 5,
    BACKUP_RETENTION_DAYS: 90,
    LOCAL_DELETED_RETENTION_DAYS: 30,
    RESTORE_REQUEST_WINDOW_DAYS: 7,
    FINDING_EDIT_WINDOW_HOURS: 24,
    MAX_PHOTOS_PER_FINDING: 5,
    MAX_PHOTO_RAW_BYTES: 5 * 1024 * 1024,
    MAX_PHOTO_COMPRESSED_BYTES: 1 * 1024 * 1024,
    MAX_LOGO_BYTES: 2 * 1024 * 1024
  },

  PROP_KEYS: {
    APP_INITIALIZED: 'APP_INITIALIZED',
    BOOTSTRAP_COMPLETED_AT: 'BOOTSTRAP_COMPLETED_AT',
    SPREADSHEET_ID: 'SPREADSHEET_ID',
    DRIVE_ROOT_FOLDER_ID: 'DRIVE_ROOT_FOLDER_ID',
    DRIVE_PHOTOS_ACTIVE_ID: 'DRIVE_PHOTOS_ACTIVE_ID',
    DRIVE_PHOTOS_ARCHIVE_ID: 'DRIVE_PHOTOS_ARCHIVE_ID',
    DRIVE_BACKUPS_ID: 'DRIVE_BACKUPS_ID',
    DRIVE_BRANDING_ID: 'DRIVE_BRANDING_ID',
    HMAC_SECRET: 'HMAC_SECRET',
    SCHEMA_VERSION: 'SCHEMA_VERSION'
  },

  SHEETS: {
    Users: [
      'UserID', 'Name', 'Username', 'Email', 'PasswordHash', 'Role', 'Status',
      'FailedLoginCount', 'LockedUntil', 'MustChangePassword',
      'ResetTokenHash', 'ResetTokenExpiresAt', 'CreatedAt', 'UpdatedAt'
    ],
    AuthSessions: [
      'AuthSessionID', 'UserID', 'TokenHash', 'RoleSnapshot', 'DeviceInfo',
      'IssuedAt', 'LastActivityAt', 'ExpiresAt', 'RevokedAt'
    ],
    Categories: [
      'CategoryID', 'CategoryName', 'Status', 'CreatedAt', 'UpdatedAt'
    ],
    Sections: [
      'SectionID', 'SectionName', 'Status', 'CreatedAt', 'UpdatedAt'
    ],
    Master_AM: [
      'AM_ID', 'AM_Name', 'Status', 'CreatedAt', 'UpdatedAt'
    ],
    Master_MUM: [
      'MUM_ID', 'MUM_Name', 'Status', 'CreatedAt', 'UpdatedAt'
    ],
    Outlets: [
      'OutletID', 'CanonicalName', 'NormalizedName', 'OutletCode', 'Status',
      'MergedIntoOutletID', 'CreatedAt', 'UpdatedAt'
    ],
    OutletAliases: [
      'AliasID', 'OutletID', 'AliasName', 'NormalizedAlias', 'CreatedAt'
    ],
    Sessions: [
      'SessionID', 'ReportNumber', 'InspectionDate', 'OutletID', 'OutletNameSnapshot',
      'AM_ID', 'AM_Name_Snapshot', 'MUM_ID', 'MUM_Name_Snapshot', 'PIC_Name',
      'TrainerID', 'Status', 'Version', 'IsRestoredFlagUntil',
      'CreatedAt', 'SubmittedAt', 'UpdatedAt', 'DeletedAt', 'DeletedBy', 'DeleteReason'
    ],
    Findings: [
      'FindingID', 'SessionID', 'CategoryID', 'CategoryNameSnapshot',
      'SectionID', 'SectionNameSnapshot', 'Masalah', 'Mengapa', 'Solusi',
      'Version', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy',
      'DeletedAt', 'DeletedBy', 'DeleteReason', 'DeletionSource'
    ],
    Photos: [
      'PhotoID', 'FindingID', 'SessionID', 'DriveFileID', 'FileName', 'MimeType',
      'FileSize', 'PhotoComment', 'Status', 'IdempotencyKey',
      'UploadedAt', 'UploadedBy', 'DeletedAt', 'DeletedBy', 'PurgeReason', 'PurgedAt'
    ],
    AuditLogs: [
      'LogID', 'UserID', 'Action', 'EntityType', 'EntityID',
      'BeforeData', 'AfterData', 'Timestamp', 'DeviceInfo', 'Description'
    ],
    Notifications: [
      'NotificationID', 'UserID', 'Type', 'Title', 'Message',
      'RelatedEntityID', 'MetadataJSON', 'ReadAt', 'CreatedAt'
    ],
    NotificationPreferences: [
      'PreferenceID', 'UserID', 'NotificationType', 'InAppEnabled', 'EmailEnabled'
    ],
    DraftRestoreRequests: [
      'RequestID', 'SessionID', 'TrainerID', 'RequestReason', 'Status',
      'RequestedAt', 'ProcessedBy', 'ProcessedAt', 'DecisionReason'
    ],
    SyncMetadata: [
      'SyncID', 'SessionID', 'DeviceID', 'LocalVersion', 'ServerVersion',
      'SyncStatus', 'LastSyncAt', 'ConflictData', 'LastIdempotencyKey'
    ],
    PDFHistory: [
      'PDFVersionID', 'SessionID', 'ReportType', 'VersionNumber',
      'GeneratedAt', 'GeneratedBy', 'RecipientEmail', 'SendStatus'
    ],
    EmailLogs: [
      'EmailLogID', 'SessionID', 'Recipient', 'PDFVersionID',
      'AttemptAt', 'Status', 'FailureReason'
    ],
    BackupHistory: [
      'BackupID', 'BackupType', 'BackupDate', 'Status', 'Size',
      'Important', 'Result', 'StorageReference'
    ],
    AppSettings: [
      'SettingKey', 'SettingValue', 'UpdatedAt', 'UpdatedBy'
    ]
  },

  SEED_CATEGORIES: [
    'Food Safety',
    'Personal Hygiene',
    'Cleaning & Sanitation',
    'Food Handling',
    'Storage Management',
    'Equipment & Maintenance',
    'Operational Procedure',
    'Product Quality'
  ],

  SEED_SECTIONS: [
    'Topping, Cutting & Stuffing',
    'Beverage & Salad',
    'Delivery',
    'Pasta, Rice & Snack',
    'Administrasi',
    'Order Taker dan Cashier',
    'Dough'
  ]
};

var TM_Utils = (function () {
  var _nowProvider = null;

  function setNowProvider(fn) {
    _nowProvider = fn;
  }

  function now() {
    return _nowProvider ? new Date(_nowProvider()) : new Date();
  }

  function formatWibIso(dateInput) {
    var d = dateInput ? new Date(dateInput) : now();
    if (typeof Utilities !== 'undefined' && Utilities.formatDate) {
      return Utilities.formatDate(d, TM_CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
    }
    var utcMs = d.getTime() + (d.getTimezoneOffset() * 60000);
    var wib = new Date(utcMs + (7 * 3600000));
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return (
      wib.getFullYear() + '-' + pad(wib.getMonth() + 1) + '-' + pad(wib.getDate()) +
      'T' + pad(wib.getHours()) + ':' + pad(wib.getMinutes()) + ':' + pad(wib.getSeconds()) + '+07:00'
    );
  }

  function addMinutesIso(dateInput, minutes) {
    var d = dateInput ? new Date(dateInput) : now();
    return formatWibIso(new Date(d.getTime() + minutes * 60000));
  }

  function addHoursIso(dateInput, hours) {
    return addMinutesIso(dateInput, hours * 60);
  }

  function generateId(prefix) {
    var raw = typeof Utilities !== 'undefined' && Utilities.getUuid
      ? Utilities.getUuid().replace(/-/g, '')
      : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    return (prefix ? prefix + '-' : '') + raw.slice(0, 16).toUpperCase();
  }

  function AppError(code, message, details) {
    var err = new Error(message);
    err.code = code || 'ERR_INTERNAL';
    err.details = details || null;
    err.isAppError = true;
    return err;
  }

  function okResponse(data) {
    return {
      ok: true,
      data: data === undefined ? null : data,
      error: null,
      serverTime: formatWibIso()
    };
  }

  function errorResponse(err) {
    var code = (err && err.isAppError && err.code) ? err.code : 'ERR_INTERNAL';
    var message = (err && err.message) ? err.message : 'Terjadi kesalahan pada server.';
    var details = (err && err.isAppError && err.details) ? err.details : null;
    return {
      ok: false,
      data: null,
      error: {
        code: code,
        message: message,
        details: details
      },
      serverTime: formatWibIso()
    };
  }

  function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    var trimmed = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }

  function sanitizeText(val) {
    return String(val === null || val === undefined ? '' : val).trim();
  }

  var MONTH_MAP = {
    jan: 1, januari: 1, january: 1,
    feb: 2, februari: 2, february: 2,
    mar: 3, maret: 3, march: 3,
    apr: 4, april: 4,
    mei: 5, may: 5,
    jun: 6, juni: 6, june: 6,
    jul: 7, juli: 7, july: 7,
    agu: 8, agt: 8, ags: 8, agustus: 8, aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    okt: 10, oct: 10, oktober: 10, october: 10,
    nov: 11, nop: 11, november: 11, nopember: 11,
    des: 12, dec: 12, desember: 12, december: 12
  };

  function isValidYmdParts(y, m, d) {
    if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    var maxDays = new Date(y, m, 0).getDate();
    return d <= maxDays;
  }

  function formatYmdParts(y, m, d) {
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return String(y) + '-' + pad(m) + '-' + pad(d);
  }

  /**
   * Menormalisasi berbagai format tanggal kalender ke YYYY-MM-DD:
   * - Date object Google Sheets
   * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (contoh: 06/11/2026)
   * - D MMM YYYY / DD MMMM YYYY bahasa Indonesia & Inggris (contoh: 6 Nov 2026, 06 November 2026)
   * - YYYY-MM-DD, YYYY/MM/DD (contoh: 2026-11-06)
   * - ISO 8601 atau string Date Google Sheets (contoh: Fri Nov 06 2026 00:00:00 GMT+0700)
   */
  function normalizeDateStr(dateInput) {
    if (dateInput === null || dateInput === undefined || dateInput === '') return '';
    if (Object.prototype.toString.call(dateInput) === '[object Date]') {
      if (isNaN(dateInput.getTime())) return '';
      return formatWibIso(dateInput).slice(0, 10);
    }
    var s = String(dateInput).trim();
    if (!s) return '';

    // 1. YYYY-MM-DD atau YYYY/MM/DD
    var mYmd = s.match(/^(\d{4})[\/\-.\s](\d{1,2})[\/\-.\s](\d{1,2})$/);
    if (mYmd) {
      var y1 = parseInt(mYmd[1], 10);
      var mo1 = parseInt(mYmd[2], 10);
      var d1 = parseInt(mYmd[3], 10);
      if (!isValidYmdParts(y1, mo1, d1)) return '';
      return formatYmdParts(y1, mo1, d1);
    }

    // 2. DD/MM/YYYY atau DD-MM-YYYY (Format kalender lokal Indonesia: 06/11/2026)
    var mDmy = s.match(/^(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{4})$/);
    if (mDmy) {
      var d2 = parseInt(mDmy[1], 10);
      var mo2 = parseInt(mDmy[2], 10);
      var y2 = parseInt(mDmy[3], 10);
      if (mo2 > 12 && d2 >= 1 && d2 <= 12) {
        var tmp = d2;
        d2 = mo2;
        mo2 = tmp;
      }
      if (!isValidYmdParts(y2, mo2, d2)) return '';
      return formatYmdParts(y2, mo2, d2);
    }

    // 3. D MMM YYYY / DD MMMM YYYY (Format popup kalender Android: 6 Nov 2026 / 6 November 2026)
    var mText = s.match(/^(\d{1,2})[\s\/\-.,]+([A-Za-z]+)[\s\/\-.,]+(\d{4})$/);
    if (mText) {
      var d3 = parseInt(mText[1], 10);
      var mo3 = MONTH_MAP[mText[2].toLowerCase()] || 0;
      var y3 = parseInt(mText[3], 10);
      if (!isValidYmdParts(y3, mo3, d3)) return '';
      return formatYmdParts(y3, mo3, d3);
    }

    // 4. ISO 8601 timestamp atau Date.toString() dari sel tanggal Google Sheets
    if (/^\d{4}-\d{2}-\d{2}T/.test(s) || /\b\d{4}\b/.test(s)) {
      var parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        return formatWibIso(parsed).slice(0, 10);
      }
    }

    return '';
  }

  return {
    setNowProvider: setNowProvider,
    now: now,
    formatWibIso: formatWibIso,
    addMinutesIso: addMinutesIso,
    addHoursIso: addHoursIso,
    generateId: generateId,
    AppError: AppError,
    okResponse: okResponse,
    errorResponse: errorResponse,
    isValidEmail: isValidEmail,
    sanitizeText: sanitizeText,
    normalizeDateStr: normalizeDateStr
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_CONFIG: TM_CONFIG, TM_Utils: TM_Utils };
}
