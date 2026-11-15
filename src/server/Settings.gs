/**
 * Settings.gs — Pengaturan Aplikasi (Nama Perusahaan, Logo Privat Drive, & Batas Operasional).
 */

var TM_Settings = (function () {
  var CACHE_KEY = 'APP_SETTINGS_BUNDLE';

  function loadSettingsMap() {
    return TM_Db.getCachedJson(CACHE_KEY, 300, function () {
      var rows = TM_Db.getAllRecords('AppSettings');
      var map = {};
      for (var i = 0; i < rows.length; i++) {
        map[rows[i].SettingKey] = rows[i].SettingValue;
      }
      var logoDataUrl = '';
      var logoFileId = map.COMPANY_LOGO_FILE_ID || '';
      if (logoFileId && typeof DriveApp !== 'undefined') {
        try {
          var file = DriveApp.getFileById(logoFileId);
          var blob = file.getBlob();
          var mime = blob.getContentType() || 'image/png';
          logoDataUrl = 'data:' + mime + ';base64,' + Utilities.base64Encode(blob.getBytes());
        } catch (e) {
          logoDataUrl = '';
        }
      }
      return {
        companyName: map.COMPANY_NAME || TM_CONFIG.DEFAULTS.COMPANY_NAME,
        logoFileId: logoFileId,
        logoDataUrl: logoDataUrl,
        maxActiveDrafts: parseInt(map.MAX_ACTIVE_DRAFTS || TM_CONFIG.DEFAULTS.MAX_ACTIVE_DRAFTS, 10),
        backupRetentionDays: parseInt(map.BACKUP_RETENTION_DAYS || TM_CONFIG.DEFAULTS.BACKUP_RETENTION_DAYS, 10),
        localDeletedRetentionDays: parseInt(map.LOCAL_DELETED_RETENTION_DAYS || TM_CONFIG.DEFAULTS.LOCAL_DELETED_RETENTION_DAYS, 10)
      };
    });
  }

  function getPublicBranding() {
    if (!TM_Bootstrap.isInitialized()) {
      return {
        companyName: TM_CONFIG.DEFAULTS.COMPANY_NAME,
        logoDataUrl: ''
      };
    }
    var bundle = loadSettingsMap();
    return {
      companyName: bundle.companyName,
      logoDataUrl: bundle.logoDataUrl
    };
  }

  function getAppSettings(token) {
    TM_Auth.requireAuth(token);
    return loadSettingsMap();
  }

  function updateAppSettings(token, dto, logoPayload) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var p = dto || {};
    var companyName = TM_Utils.sanitizeText(p.companyName);
    var maxDrafts = parseInt(p.maxActiveDrafts !== undefined ? p.maxActiveDrafts : TM_CONFIG.DEFAULTS.MAX_ACTIVE_DRAFTS, 10);

    if (!companyName || companyName.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama perusahaan wajib diisi (minimal 2 karakter).');
    }
    if (isNaN(maxDrafts) || maxDrafts < 1 || maxDrafts > 20) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Batas Draft aktif harus bernilai antara 1 hingga 20.');
    }

    var before = loadSettingsMap();
    var newLogoFileId = before.logoFileId;

    if (p.removeLogo === true) {
      newLogoFileId = '';
    } else if (logoPayload && logoPayload.base64Data) {
      var mimeType = String(logoPayload.mimeType || '').toLowerCase();
      if (mimeType !== 'image/png' && mimeType !== 'image/jpeg' && mimeType !== 'image/jpg') {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Format logo harus PNG atau JPG.');
      }
      var cleanBase64 = String(logoPayload.base64Data).replace(/^data:[^;]+;base64,/, '');
      var bytes = Utilities.base64Decode(cleanBase64);
      if (bytes.length > TM_CONFIG.DEFAULTS.MAX_LOGO_BYTES) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Ukuran file logo maksimal 2 MB.');
      }
      var brandingFolderId = TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.DRIVE_BRANDING_ID);
      if (!brandingFolderId) {
        throw TM_Utils.AppError('ERR_CONFIG', 'Folder Drive branding tidak ditemukan.');
      }
      var ext = mimeType === 'image/png' ? 'png' : 'jpg';
      var blob = Utilities.newBlob(bytes, mimeType, 'company-logo-' + Date.now() + '.' + ext);
      var folder = DriveApp.getFolderById(brandingFolderId);
      var created = folder.createFile(blob);
      try {
        created.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      } catch (e) {
        // ignore
      }
      newLogoFileId = created.getId();
    }

    TM_Db.upsertSetting('COMPANY_NAME', companyName, ctx.user.UserID);
    TM_Db.upsertSetting('MAX_ACTIVE_DRAFTS', String(maxDrafts), ctx.user.UserID);
    TM_Db.upsertSetting('COMPANY_LOGO_FILE_ID', newLogoFileId, ctx.user.UserID);
    TM_Db.invalidateCache(CACHE_KEY);

    var after = loadSettingsMap();

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'APP_SETTINGS_UPDATED',
      entityType: 'AppSettings',
      entityId: 'GLOBAL',
      beforeData: {
        companyName: before.companyName,
        maxActiveDrafts: before.maxActiveDrafts,
        logoFileId: before.logoFileId
      },
      afterData: {
        companyName: after.companyName,
        maxActiveDrafts: after.maxActiveDrafts,
        logoFileId: after.logoFileId
      },
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Super Admin memperbarui Pengaturan Aplikasi'
    });

    return after;
  }

  return {
    getPublicBranding: getPublicBranding,
    getAppSettings: getAppSettings,
    updateAppSettings: updateAppSettings
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Settings: TM_Settings };
}
