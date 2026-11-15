/**
 * Bootstrap.gs — Auto-provisioning Spreadsheet, Drive privat, seed Master Data, & Super Admin pertama.
 */

var TM_Bootstrap = (function () {
  function isInitialized() {
    return TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.APP_INITIALIZED) === 'true';
  }

  function getBootstrapStatus() {
    var initialized = isInitialized();
    var branding = {
      companyName: TM_CONFIG.DEFAULTS.COMPANY_NAME,
      logoDataUrl: ''
    };
    if (initialized) {
      try {
        branding = TM_Settings.getPublicBranding();
      } catch (e) {
        // ignore branding load error on status check
      }
    }
    return {
      initialized: initialized,
      appName: TM_CONFIG.APP_NAME,
      timezone: TM_CONFIG.TIMEZONE,
      branding: branding
    };
  }

  function setPrivateFolderSharing(folder) {
    try {
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    } catch (e) {
      // Pada beberapa akun personal, setSharing PRIVATE pada folder baru bisa melempar error jika sudah private
    }
  }

  function provisionSpreadsheet() {
    var ss = SpreadsheetApp.create(TM_CONFIG.APP_NAME + ' - Database');
    var sheetNames = Object.keys(TM_CONFIG.SHEETS);

    // Rename default sheet pertama menjadi sheet pertama dalam skema
    var defaultSheet = ss.getSheets()[0];
    defaultSheet.setName(sheetNames[0]);
    TM_Db.ensureSheetHeaders(defaultSheet, TM_CONFIG.SHEETS[sheetNames[0]]);

    for (var i = 1; i < sheetNames.length; i++) {
      var name = sheetNames[i];
      var sheet = ss.insertSheet(name);
      TM_Db.ensureSheetHeaders(sheet, TM_CONFIG.SHEETS[name]);
    }
    return ss;
  }

  function provisionDriveFolders() {
    var root = DriveApp.createFolder(TM_CONFIG.APP_NAME + ' - Private Storage');
    setPrivateFolderSharing(root);

    var activePhotos = root.createFolder('ActivePhotos');
    setPrivateFolderSharing(activePhotos);

    var archivedPhotos = root.createFolder('ArchivedPhotos');
    setPrivateFolderSharing(archivedPhotos);

    var backups = root.createFolder('Backups');
    setPrivateFolderSharing(backups);

    var branding = root.createFolder('Branding');
    setPrivateFolderSharing(branding);

    return {
      rootId: root.getId(),
      activePhotosId: activePhotos.getId(),
      archivedPhotosId: archivedPhotos.getId(),
      backupsId: backups.getId(),
      brandingId: branding.getId()
    };
  }

  function seedInitialData(adminUser, companyName) {
    var ts = TM_Utils.formatWibIso();

    var categories = TM_CONFIG.SEED_CATEGORIES.map(function (name, idx) {
      return {
        CategoryID: 'CAT-' + String(idx + 1).padStart(3, '0'),
        CategoryName: name,
        Status: TM_CONFIG.STATUS.ACTIVE,
        CreatedAt: ts,
        UpdatedAt: ts
      };
    });
    TM_Db.insertRecordsBatch('Categories', categories);

    var sections = TM_CONFIG.SEED_SECTIONS.map(function (name, idx) {
      return {
        SectionID: 'SEC-' + String(idx + 1).padStart(3, '0'),
        SectionName: name,
        Status: TM_CONFIG.STATUS.ACTIVE,
        CreatedAt: ts,
        UpdatedAt: ts
      };
    });
    TM_Db.insertRecordsBatch('Sections', sections);

    var settings = [
      { SettingKey: 'COMPANY_NAME', SettingValue: companyName || TM_CONFIG.DEFAULTS.COMPANY_NAME, UpdatedAt: ts, UpdatedBy: adminUser.UserID },
      { SettingKey: 'COMPANY_LOGO_FILE_ID', SettingValue: '', UpdatedAt: ts, UpdatedBy: adminUser.UserID },
      { SettingKey: 'MAX_ACTIVE_DRAFTS', SettingValue: String(TM_CONFIG.DEFAULTS.MAX_ACTIVE_DRAFTS), UpdatedAt: ts, UpdatedBy: adminUser.UserID },
      { SettingKey: 'BACKUP_RETENTION_DAYS', SettingValue: String(TM_CONFIG.DEFAULTS.BACKUP_RETENTION_DAYS), UpdatedAt: ts, UpdatedBy: adminUser.UserID },
      { SettingKey: 'LOCAL_DELETED_RETENTION_DAYS', SettingValue: String(TM_CONFIG.DEFAULTS.LOCAL_DELETED_RETENTION_DAYS), UpdatedAt: ts, UpdatedBy: adminUser.UserID }
    ];
    TM_Db.insertRecordsBatch('AppSettings', settings);
  }

  function runInitialBootstrap(payload) {
    if (isInitialized()) {
      throw TM_Utils.AppError('ERR_BOOTSTRAP_DISABLED', 'Bootstrap sudah selesai dilakukan dan dinonaktifkan secara permanen.');
    }

    var p = payload || {};
    var name = TM_Utils.sanitizeText(p.name);
    var username = TM_Utils.sanitizeText(p.username).toLowerCase();
    var email = TM_Utils.sanitizeText(p.email).toLowerCase();
    var password = String(p.password || '');
    var companyName = TM_Utils.sanitizeText(p.companyName) || TM_CONFIG.DEFAULTS.COMPANY_NAME;

    if (!name || name.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama lengkap Super Admin wajib diisi (minimal 2 karakter).');
    }
    if (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Username harus 3–32 karakter (huruf kecil, angka, titik, garis bawah, atau tanda hubung).');
    }
    if (!TM_Utils.isValidEmail(email)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Format email Super Admin tidak valid.');
    }
    var pwErr = TM_Security.validatePasswordStrength(password);
    if (pwErr) {
      throw TM_Utils.AppError('ERR_VALIDATION', pwErr);
    }

    return TM_Db.withLock(function () {
      if (isInitialized()) {
        throw TM_Utils.AppError('ERR_BOOTSTRAP_DISABLED', 'Bootstrap sudah selesai dilakukan dan dinonaktifkan secara permanen.');
      }

      var props = TM_Db.getProps();
      var hmacSecret = TM_Security.randomHex(32);
      var ss = provisionSpreadsheet();
      var folders = provisionDriveFolders();

      props.setProperties({
        SPREADSHEET_ID: ss.getId(),
        DRIVE_ROOT_FOLDER_ID: folders.rootId,
        DRIVE_PHOTOS_ACTIVE_ID: folders.activePhotosId,
        DRIVE_PHOTOS_ARCHIVE_ID: folders.archivedPhotosId,
        DRIVE_BACKUPS_ID: folders.backupsId,
        DRIVE_BRANDING_ID: folders.brandingId,
        HMAC_SECRET: hmacSecret,
        SCHEMA_VERSION: TM_CONFIG.SCHEMA_VERSION
      });
      TM_Db.resetSpreadsheetCache();

      var ts = TM_Utils.formatWibIso();
      var adminUser = {
        UserID: TM_Utils.generateId('USR'),
        Name: name,
        Username: username,
        Email: email,
        PasswordHash: TM_Security.hashPassword(password),
        Role: TM_CONFIG.ROLES.SUPER_ADMIN,
        Status: TM_CONFIG.STATUS.ACTIVE,
        FailedLoginCount: '0',
        LockedUntil: '',
        MustChangePassword: 'false',
        ResetTokenHash: '',
        ResetTokenExpiresAt: '',
        CreatedAt: ts,
        UpdatedAt: ts
      };

      TM_Db.insertRecord('Users', adminUser);
      seedInitialData(adminUser, companyName);

      TM_Audit.logEvent({
        userId: adminUser.UserID,
        action: 'SYSTEM_BOOTSTRAP',
        entityType: 'System',
        entityId: ss.getId(),
        afterData: {
          spreadsheetId: ss.getId(),
          driveRootFolderId: folders.rootId,
          superAdminUsername: adminUser.Username,
          companyName: companyName
        },
        deviceInfo: TM_Utils.sanitizeText(p.deviceInfo || 'Bootstrap'),
        description: 'Inisialisasi database, folder Drive privat, Master Data awal, dan Super Admin pertama'
      });

      props.setProperties({
        APP_INITIALIZED: 'true',
        BOOTSTRAP_COMPLETED_AT: ts
      });

      return {
        initialized: true,
        spreadsheetId: ss.getId(),
        driveRootFolderId: folders.rootId,
        superAdmin: {
          UserID: adminUser.UserID,
          Name: adminUser.Name,
          Username: adminUser.Username,
          Email: adminUser.Email,
          Role: adminUser.Role
        }
      };
    });
  }

  return {
    isInitialized: isInitialized,
    getBootstrapStatus: getBootstrapStatus,
    runInitialBootstrap: runInitialBootstrap
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Bootstrap: TM_Bootstrap };
}
