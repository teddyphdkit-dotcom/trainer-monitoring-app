/**
 * Backup.gs — Backup Otomatis Harian & Manual, Label Important, Retensi 90 Hari,
 * 8 Langkah Safe Restore (Pre-Restore Backup, Validasi Integritas/Relasi/Foto, & Rollback Otomatis),
 * serta Manajemen Arsip Foto & Purge Manual dengan Alasan Wajib (PRD Bagian 13 & 15).
 */

var TM_Backup = (function () {
  var DAY_MS = 24 * 3600000;

  var DATA_SHEETS_TO_BACKUP = [
    'Users',
    'AuthSessions',
    'Categories',
    'Sections',
    'Master_AM',
    'Master_MUM',
    'Outlets',
    'OutletAliases',
    'Sessions',
    'Findings',
    'Photos',
    'AuditLogs',
    'Notifications',
    'NotificationPreferences',
    'DraftRestoreRequests',
    'SyncMetadata',
    'PDFHistory',
    'EmailLogs',
    'AppSettings'
  ];

  function notifyAllSuperAdmins(type, title, message, relatedId, metadata) {
    if (typeof TM_Notifications === 'undefined' || !TM_Notifications.dispatchNotification) return;
    var admins = TM_Db.filterRecords('Users', function (u) {
      return u.Role === TM_CONFIG.ROLES.SUPER_ADMIN && u.Status === TM_CONFIG.STATUS.ACTIVE;
    });
    for (var i = 0; i < admins.length; i++) {
      TM_Notifications.dispatchNotification({
        userId: admins[i].UserID,
        type: type,
        title: title,
        message: message,
        relatedEntityId: relatedId || '',
        metadata: metadata || {}
      });
    }
  }

  function buildFullSystemSnapshot() {
    var tables = {};
    for (var i = 0; i < DATA_SHEETS_TO_BACKUP.length; i++) {
      var sName = DATA_SHEETS_TO_BACKUP[i];
      tables[sName] = TM_Db.getAllRecords(sName);
    }

    // Sertakan manifest & salinan biner foto di Drive (PRD 15.2 & 24.7)
    var photos = tables.Photos || [];
    var drivePhotos = {};
    for (var p = 0; p < photos.length; p++) {
      var ph = photos[p];
      if (ph.DriveFileID && !ph.PurgedAt) {
        try {
          var f = DriveApp.getFileById(ph.DriveFileID);
          if (!f.isTrashed || !f.isTrashed()) {
            var blob = f.getBlob();
            drivePhotos[ph.DriveFileID] = {
              driveFileId: ph.DriveFileID,
              photoId: ph.PhotoID,
              fileName: ph.FileName || blob.getName(),
              mimeType: ph.MimeType || blob.getContentType(),
              base64Data: Utilities.base64Encode(blob.getBytes())
            };
          }
        } catch (_) {}
      }
    }

    var props = TM_Db.getProps();
    var metadata = {
      schemaVersion: props.getProperty(TM_CONFIG.PROP_KEYS.SCHEMA_VERSION) || TM_CONFIG.SCHEMA_VERSION,
      bootstrapCompletedAt: props.getProperty(TM_CONFIG.PROP_KEYS.BOOTSTRAP_COMPLETED_AT) || '',
      createdAt: TM_Utils.formatWibIso(),
      summary: {
        usersCount: (tables.Users || []).length,
        outletsCount: (tables.Outlets || []).length,
        sessionsCount: (tables.Sessions || []).length,
        findingsCount: (tables.Findings || []).length,
        photosCount: (tables.Photos || []).length,
        auditLogsCount: (tables.AuditLogs || []).length
      }
    };

    return {
      metadata: metadata,
      tables: tables,
      drivePhotos: drivePhotos
    };
  }

  function performBackupInternal(userId, deviceInfo, backupType, isImportant, description) {
    var nowIso = TM_Utils.formatWibIso();
    var backupId = TM_Utils.generateId('BKP');
    var props = TM_Db.getProps();
    var backupsFolderId = props.getProperty(TM_CONFIG.PROP_KEYS.DRIVE_BACKUPS_ID);

    try {
      if (!backupsFolderId) {
        throw TM_Utils.AppError('ERR_BACKUP_STORAGE', 'Folder Drive Backups belum terkonfigurasi.');
      }
      var snapshot = buildFullSystemSnapshot();
      snapshot.metadata.backupId = backupId;
      snapshot.metadata.backupType = backupType;
      snapshot.metadata.important = Boolean(isImportant);
      snapshot.metadata.description = description || '';

      var serialized = JSON.stringify(snapshot);
      var bytes = Utilities.base64Decode(Utilities.base64Encode(
        typeof Buffer !== 'undefined' ? Buffer.from(serialized, 'utf8') : serialized.split('').map(function (c) { return c.charCodeAt(0); })
      ));
      var fileName = backupId + '-' + backupType + '.json';
      var blob = Utilities.newBlob(bytes, 'application/json', fileName);
      var folder = DriveApp.getFolderById(backupsFolderId);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

      var row = TM_Db.insertRecord('BackupHistory', {
        BackupID: backupId,
        BackupType: backupType,
        BackupDate: nowIso,
        Status: 'Berhasil',
        Size: String(serialized.length),
        Important: isImportant ? 'TRUE' : 'FALSE',
        Result: description
          ? ('Berhasil (' + description + ') — ' + snapshot.metadata.summary.sessionsCount + ' sesi, ' + snapshot.metadata.summary.photosCount + ' foto')
          : ('Berhasil — ' + snapshot.metadata.summary.sessionsCount + ' sesi, ' + snapshot.metadata.summary.photosCount + ' foto'),
        StorageReference: file.getId()
      });

      TM_Audit.logEvent({
        userId: userId || 'SYSTEM',
        action: 'CREATE_BACKUP',
        entityType: 'BackupHistory',
        entityId: backupId,
        afterData: {
          backupType: backupType,
          important: Boolean(isImportant),
          sizeBytes: serialized.length,
          summary: snapshot.metadata.summary
        },
        deviceInfo: deviceInfo || 'SYSTEM',
        description: 'Membuat backup ' + backupType + (isImportant ? ' [IMPORTANT]' : '')
      });

      if (backupType !== 'PRE_RESTORE') {
        notifyAllSuperAdmins(
          'BACKUP_RESULT',
          'Backup ' + backupType + ' Berhasil',
          'Backup "' + backupId + '" (' + backupType + ') berhasil disimpan pada ' + nowIso + '.',
          backupId,
          { backupId: backupId, backupType: backupType }
        );
      }

      return {
        backup: row,
        summary: snapshot.metadata.summary
      };
    } catch (err) {
      var errMsg = err && err.message ? err.message : String(err);
      var failedRow = TM_Db.insertRecord('BackupHistory', {
        BackupID: backupId,
        BackupType: backupType,
        BackupDate: nowIso,
        Status: 'Gagal',
        Size: '0',
        Important: isImportant ? 'TRUE' : 'FALSE',
        Result: 'Gagal: ' + errMsg,
        StorageReference: ''
      });

      TM_Audit.logEvent({
        userId: userId || 'SYSTEM',
        action: 'BACKUP_FAILED',
        entityType: 'BackupHistory',
        entityId: backupId,
        afterData: { backupType: backupType, error: errMsg },
        deviceInfo: deviceInfo || 'SYSTEM',
        description: 'Gagal membuat backup ' + backupType + ': ' + errMsg
      });

      notifyAllSuperAdmins(
        'BACKUP_FAILURE',
        'KRITIS: Kegagalan Backup Sistem',
        'Proses backup "' + backupType + '" mengalami kegagalan: ' + errMsg,
        backupId,
        { backupId: backupId, error: errMsg }
      );

      throw TM_Utils.AppError('ERR_BACKUP_FAILED', 'Gagal membuat backup: ' + errMsg, { backupRecord: failedRow });
    }
  }

  /**
   * Membuat Backup Manual oleh Super Admin, dengan opsi label Important (PRD 15.1).
   */
  function createManualBackup(token, optionsDto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var opts = optionsDto || {};
    var isImp = Boolean(opts.important);
    var desc = TM_Utils.sanitizeText(opts.description);
    return TM_Db.withLock(function () {
      return performBackupInternal(ctx.user.UserID, ctx.session.DeviceInfo, 'MANUAL', isImp, desc);
    });
  }

  /**
   * Menjalankan Backup Harian Otomatis & Pembersihan Retensi 90 Hari (PRD 15.1).
   */
  function runDailyAutomatedBackup(tokenOrNull) {
    var userId = 'SYSTEM_CRON';
    var devInfo = 'TIME_TRIGGER';
    if (tokenOrNull) {
      var ctx = TM_Auth.requireAuth(tokenOrNull, [TM_CONFIG.ROLES.SUPER_ADMIN]);
      userId = ctx.user.UserID;
      devInfo = ctx.session.DeviceInfo;
    }
    return TM_Db.withLock(function () {
      var res = performBackupInternal(userId, devInfo, 'DAILY_AUTO', false, 'Backup otomatis harian');
      var cleaned = cleanupExpiredBackupsUnlocked(userId, devInfo);
      return {
        backup: res.backup,
        summary: res.summary,
        expiredCleanedCount: cleaned.cleanedCount
      };
    });
  }

  /**
   * Mengubah status label Important pada suatu Backup (PRD 15.1).
   */
  function toggleBackupImportant(token, backupId, isImportant) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var existing = TM_Db.findById('BackupHistory', 'BackupID', backupId);
    if (!existing) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Catatan backup tidak ditemukan.');
    }
    var updated = TM_Db.updateRecordById('BackupHistory', 'BackupID', backupId, function (rec) {
      rec.Important = isImportant ? 'TRUE' : 'FALSE';
      return rec;
    });

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'TOGGLE_BACKUP_IMPORTANT',
      entityType: 'BackupHistory',
      entityId: backupId,
      beforeData: existing,
      afterData: updated,
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Mengubah label Important backup ' + backupId + ' menjadi ' + (isImportant ? 'TRUE' : 'FALSE')
    });

    return updated;
  }

  function getRetentionDays() {
    var rec = TM_Db.findById('AppSettings', 'SettingKey', 'BACKUP_RETENTION_DAYS');
    var parsed = rec ? parseInt(rec.SettingValue, 10) : NaN;
    return (!isNaN(parsed) && parsed > 0) ? parsed : (TM_CONFIG.DEFAULTS.BACKUP_RETENTION_DAYS || 90);
  }

  function cleanupExpiredBackupsUnlocked(userId, deviceInfo) {
    var retentionDays = getRetentionDays();
    var cutoffMs = TM_Utils.now().getTime() - (retentionDays * DAY_MS);
    var allBackups = TM_Db.getAllRecords('BackupHistory');
    var cleanedIds = [];

    for (var i = 0; i < allBackups.length; i++) {
      var b = allBackups[i];
      if (b.Status !== 'Berhasil') continue;
      // Backup Important TIDAK IKUT pembersihan otomatis (PRD 15.1 & 22.8)
      if (String(b.Important).toUpperCase() === 'TRUE') continue;

      var bTime = new Date(b.BackupDate).getTime();
      if (!isNaN(bTime) && bTime < cutoffMs) {
        if (b.StorageReference) {
          try {
            var file = DriveApp.getFileById(b.StorageReference);
            if (file && typeof file.setTrashed === 'function') {
              file.setTrashed(true);
            }
          } catch (_) {}
        }
        TM_Db.updateRecordById('BackupHistory', 'BackupID', b.BackupID, function (rec) {
          rec.Status = 'EXPIRED_CLEANED';
          rec.Result = rec.Result + ' [Dibersihkan otomatis > ' + retentionDays + ' hari]';
          return rec;
        });
        cleanedIds.push(b.BackupID);
      }
    }

    if (cleanedIds.length > 0) {
      TM_Audit.logEvent({
        userId: userId || 'SYSTEM',
        action: 'CLEANUP_EXPIRED_BACKUPS',
        entityType: 'BackupHistory',
        entityId: cleanedIds.join(','),
        afterData: { retentionDays: retentionDays, cleanedIds: cleanedIds },
        deviceInfo: deviceInfo || 'SYSTEM',
        description: 'Membersihkan ' + cleanedIds.length + ' backup otomatis yang melewati masa retensi ' + retentionDays + ' hari'
      });
    }

    return {
      retentionDays: retentionDays,
      cleanedCount: cleanedIds.length,
      cleanedIds: cleanedIds
    };
  }

  function cleanupExpiredBackups(token) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    return TM_Db.withLock(function () {
      return cleanupExpiredBackupsUnlocked(ctx.user.UserID, ctx.session.DeviceInfo);
    });
  }

  function listBackups(token) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var items = TM_Db.getAllRecords('BackupHistory');
    items.sort(function (a, b) {
      return String(b.BackupDate).localeCompare(String(a.BackupDate));
    });
    return {
      retentionDays: getRetentionDays(),
      items: items
    };
  }

  function loadBackupSnapshotFromDrive(backupRec) {
    if (!backupRec || !backupRec.StorageReference) {
      throw TM_Utils.AppError('ERR_BACKUP_CORRUPT', 'Referensi penyimpanan file backup tidak ditemukan.');
    }
    var file = null;
    try {
      file = DriveApp.getFileById(backupRec.StorageReference);
    } catch (_) {
      throw TM_Utils.AppError('ERR_BACKUP_CORRUPT', 'File paket backup di Google Drive tidak ditemukan.');
    }
    if (file.isTrashed && file.isTrashed()) {
      throw TM_Utils.AppError('ERR_BACKUP_CORRUPT', 'File paket backup telah dihapus/dibersihkan.');
    }
    var bytes = file.getBlob().getBytes();
    var jsonStr = typeof Buffer !== 'undefined'
      ? Buffer.from(bytes).toString('utf8')
      : String.fromCharCode.apply(null, bytes);
    var parsed = null;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (_) {
      throw TM_Utils.AppError('ERR_BACKUP_CORRUPT', 'Isi paket backup rusak (bukan JSON valid).');
    }
    return parsed;
  }

  /**
   * Memvalidasi integritas struktur, relasi antar entitas, dan referensi foto dalam snapshot backup
   * (Langkah 4 & 5 dari Safe Restore — PRD 15.4 & 22.8).
   */
  function validateSnapshotIntegrityAndRelations(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || !snapshot.metadata || !snapshot.tables) {
      throw TM_Utils.AppError('ERR_RESTORE_INTEGRITY', 'Struktur paket backup tidak lengkap (metadata/tables hilang).');
    }

    for (var i = 0; i < DATA_SHEETS_TO_BACKUP.length; i++) {
      var sName = DATA_SHEETS_TO_BACKUP[i];
      if (!Array.isArray(snapshot.tables[sName])) {
        throw TM_Utils.AppError('ERR_RESTORE_INTEGRITY', 'Tabel wajib "' + sName + '" tidak ditemukan dalam paket backup.');
      }
    }

    var t = snapshot.tables;
    if (t.Users.length === 0) {
      throw TM_Utils.AppError('ERR_RESTORE_INTEGRITY', 'Paket backup tidak memiliki data pengguna (Users kosong).');
    }

    var userIds = {};
    for (var u = 0; u < t.Users.length; u++) userIds[t.Users[u].UserID] = true;

    var outletIds = {};
    for (var o = 0; o < t.Outlets.length; o++) outletIds[t.Outlets[o].OutletID] = true;

    var catIds = {};
    for (var c = 0; c < t.Categories.length; c++) catIds[t.Categories[c].CategoryID] = true;

    var secIds = {};
    for (var sc = 0; sc < t.Sections.length; sc++) secIds[t.Sections[sc].SectionID] = true;

    var sessionIds = {};
    for (var s = 0; s < t.Sessions.length; s++) {
      var ses = t.Sessions[s];
      sessionIds[ses.SessionID] = ses;
      if (!ses.TrainerID || !userIds[ses.TrainerID]) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Sesi "' + ses.SessionID + '" mereferensikan TrainerID "' + ses.TrainerID + '" yang tidak ada di tabel Users.'
        );
      }
      if (ses.Status === TM_CONFIG.SESSION_STATUS.SELESAI && (!ses.OutletID || !outletIds[ses.OutletID])) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Sesi Selesai "' + ses.SessionID + '" mereferensikan OutletID "' + ses.OutletID + '" yang tidak ada di tabel Outlets.'
        );
      }
    }

    var findingIds = {};
    for (var f = 0; f < t.Findings.length; f++) {
      var fnd = t.Findings[f];
      findingIds[fnd.FindingID] = fnd;
      if (!fnd.SessionID || !sessionIds[fnd.SessionID]) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Temuan "' + fnd.FindingID + '" mereferensikan SessionID "' + fnd.SessionID + '" yang tidak ada di tabel Sessions.'
        );
      }
      if (fnd.CategoryID && !catIds[fnd.CategoryID]) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Temuan "' + fnd.FindingID + '" mereferensikan CategoryID "' + fnd.CategoryID + '" yang tidak ditemukan.'
        );
      }
      if (fnd.SectionID && !secIds[fnd.SectionID]) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Temuan "' + fnd.FindingID + '" mereferensikan SectionID "' + fnd.SectionID + '" yang tidak ditemukan.'
        );
      }
    }

    var drivePhotosMap = snapshot.drivePhotos || {};
    for (var p = 0; p < t.Photos.length; p++) {
      var ph = t.Photos[p];
      if (!ph.SessionID || !sessionIds[ph.SessionID]) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Foto "' + ph.PhotoID + '" mereferensikan SessionID "' + ph.SessionID + '" yang tidak ditemukan.'
        );
      }
      if (!ph.FindingID || !findingIds[ph.FindingID]) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Foto "' + ph.PhotoID + '" mereferensikan FindingID "' + ph.FindingID + '" yang tidak ditemukan.'
        );
      }
      if (!ph.PurgedAt) {
        if (!ph.DriveFileID) {
          throw TM_Utils.AppError(
            'ERR_RESTORE_PHOTO_REF',
            'Referensi foto tidak valid: Foto aktif "' + ph.PhotoID + '" tidak memiliki DriveFileID.'
          );
        }
        var existsInDrive = false;
        try {
          var df = DriveApp.getFileById(ph.DriveFileID);
          existsInDrive = Boolean(df && (!df.isTrashed || !df.isTrashed()));
        } catch (_) {
          existsInDrive = false;
        }
        var existsInBackupBundle = Boolean(drivePhotosMap[ph.DriveFileID] && drivePhotosMap[ph.DriveFileID].base64Data);
        if (!existsInDrive && !existsInBackupBundle) {
          throw TM_Utils.AppError(
            'ERR_RESTORE_PHOTO_REF',
            'Referensi foto rusak: File Drive "' + ph.DriveFileID + '" untuk foto "' + ph.PhotoID + '" tidak ditemukan di Drive maupun paket backup.'
          );
        }
      }
    }

    return true;
  }

  /**
   * Langkah 1 Safe Restore: Menampilkan tanggal dan ringkasan backup sebelum eksekusi (PRD 15.4).
   */
  function getBackupSummaryForRestore(token, backupId) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var rec = TM_Db.findById('BackupHistory', 'BackupID', backupId);
    if (!rec) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Data backup tidak ditemukan.');
    }
    var snapshot = loadBackupSnapshotFromDrive(rec);
    return {
      backupId: rec.BackupID,
      backupType: rec.BackupType,
      backupDate: rec.BackupDate,
      important: rec.Important === 'TRUE',
      sizeBytes: Number(rec.Size || 0),
      schemaVersion: snapshot.metadata && snapshot.metadata.schemaVersion,
      summary: snapshot.metadata && snapshot.metadata.summary
    };
  }

  function applySnapshotTablesToDatabase(snapshot, options) {
    var opts = options || {};
    var currentAuditLogs = TM_Db.getAllRecords('AuditLogs');

    // Pulihkan foto yang tidak ada di Drive dari salinan biner paket backup
    var props = TM_Db.getProps();
    var photosFolderId = props.getProperty(TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ID);
    var drivePhotosMap = snapshot.drivePhotos || {};
    var restoredPhotosTable = (snapshot.tables.Photos || []).map(function (ph) {
      var copy = Object.assign({}, ph);
      if (!copy.PurgedAt && copy.DriveFileID) {
        var driveOk = false;
        try {
          var f = DriveApp.getFileById(copy.DriveFileID);
          driveOk = Boolean(f && (!f.isTrashed || !f.isTrashed()));
        } catch (_) {
          driveOk = false;
        }
        if (!driveOk && drivePhotosMap[copy.DriveFileID] && photosFolderId) {
          var bInfo = drivePhotosMap[copy.DriveFileID];
          var blob = Utilities.newBlob(
            Utilities.base64Decode(bInfo.base64Data),
            bInfo.mimeType || 'image/jpeg',
            bInfo.fileName || 'restored.jpg'
          );
          var newFile = DriveApp.getFolderById(photosFolderId).createFile(blob);
          newFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
          copy.DriveFileID = newFile.getId();
        }
      }
      return copy;
    });

    for (var i = 0; i < DATA_SHEETS_TO_BACKUP.length; i++) {
      var sName = DATA_SHEETS_TO_BACKUP[i];
      if (sName === 'AuditLogs') {
        // Gabungkan AuditLogs agar bersifat append-only (tidak menghilangkan jejak audit)
        var seenLogs = {};
        var mergedLogs = [];
        var snapLogs = snapshot.tables.AuditLogs || [];
        for (var a = 0; a < snapLogs.length; a++) {
          seenLogs[snapLogs[a].LogID] = true;
          mergedLogs.push(snapLogs[a]);
        }
        for (var b = 0; b < currentAuditLogs.length; b++) {
          if (!seenLogs[currentAuditLogs[b].LogID]) {
            seenLogs[currentAuditLogs[b].LogID] = true;
            mergedLogs.push(currentAuditLogs[b]);
          }
        }
        TM_Db.replaceSheetRecords('AuditLogs', mergedLogs);
        continue;
      }

      if (sName === 'Photos') {
        TM_Db.replaceSheetRecords('Photos', restoredPhotosTable);
      } else {
        TM_Db.replaceSheetRecords(sName, snapshot.tables[sName] || []);
      }

      // Mendukung simulasi kegagalan di tengah proses tulis untuk menguji rollback otomatis (Langkah 7)
      if (opts.simulateFailureAfterSheet && opts.simulateFailureAfterSheet === sName) {
        throw new Error('Simulasi kegagalan tulis di tengah proses restore setelah tabel ' + sName);
      }
    }

    TM_Db.invalidateCache('APP_SETTINGS');
  }

  /**
   * Menjalankan 8 Langkah Safe Restore (PRD 15.4 & 22.8):
   * 1. Mengambil tanggal & ringkasan backup
   * 2. Membuat pre-restore backup
   * 3. Memverifikasi konfirmasi eksplisit Super Admin
   * 4. Memvalidasi integritas data
   * 5. Memvalidasi relasi dan referensi foto
   * 6. Menjalankan restore di bawah ScriptLock
   * 7. Melakukan rollback otomatis menggunakan pre-restore backup jika gagal
   * 8. Mencatat aktivitas lengkap pada Audit Log
   */
  function executeSafeRestore(token, backupId, confirmationDto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var conf = confirmationDto || {};

    // Langkah 3: Konfirmasi eksplisit Super Admin
    if (conf.confirmRestore !== true || String(conf.confirmationText || '').trim().toUpperCase() !== 'RESTORE') {
      throw TM_Utils.AppError(
        'ERR_CONFIRMATION_REQUIRED',
        'Konfirmasi eksplisit Super Admin diperlukan (ketik "RESTORE" untuk menjalankan Safe Restore).'
      );
    }

    return TM_Db.withLock(function () {
      // Langkah 1: Ambil catatan backup target
      var targetBackupRec = TM_Db.findById('BackupHistory', 'BackupID', backupId);
      if (!targetBackupRec) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Backup yang dipilih tidak ditemukan.');
      }

      // Langkah 4 & 5: Muat dan validasi integritas data, relasi antar tabel, serta referensi foto
      var targetSnapshot = loadBackupSnapshotFromDrive(targetBackupRec);
      validateSnapshotIntegrityAndRelations(targetSnapshot);

      // Langkah 2: Buat Pre-Restore Backup sebelum menyentuh tabel mana pun
      var preRestore = performBackupInternal(
        ctx.user.UserID,
        ctx.session.DeviceInfo,
        'PRE_RESTORE',
        true,
        'Pre-restore backup otomatis sebelum memulihkan ' + backupId
      );
      var preRestoreSnapshot = loadBackupSnapshotFromDrive(preRestore.backup);

      try {
        // Langkah 6: Jalankan restore
        applySnapshotTablesToDatabase(targetSnapshot, {
          simulateFailureAfterSheet: conf.simulateFailureAfterSheet || ''
        });

        // Langkah 8: Catat keberhasilan Safe Restore pada Audit Log
        TM_Audit.logEvent({
          userId: ctx.user.UserID,
          action: 'SAFE_RESTORE_COMPLETED',
          entityType: 'BackupHistory',
          entityId: backupId,
          afterData: {
            restoredBackupId: backupId,
            backupDate: targetBackupRec.BackupDate,
            preRestoreBackupId: preRestore.backup.BackupID,
            summary: targetSnapshot.metadata.summary
          },
          deviceInfo: ctx.session.DeviceInfo,
          description: 'Safe Restore berhasil dijalankan dari backup ' + backupId + ' (Pre-restore: ' + preRestore.backup.BackupID + ')'
        });

        return {
          status: 'RESTORED',
          restoredBackupId: backupId,
          preRestoreBackupId: preRestore.backup.BackupID,
          backupDate: targetBackupRec.BackupDate,
          summary: targetSnapshot.metadata.summary
        };
      } catch (restoreErr) {
        // Langkah 7: Rollback otomatis menggunakan pre-restore backup jika gagal!
        var errMsg = restoreErr && restoreErr.message ? restoreErr.message : String(restoreErr);
        applySnapshotTablesToDatabase(preRestoreSnapshot, {});

        TM_Audit.logEvent({
          userId: ctx.user.UserID,
          action: 'SAFE_RESTORE_ROLLED_BACK',
          entityType: 'BackupHistory',
          entityId: backupId,
          afterData: {
            failedBackupId: backupId,
            rolledBackToPreRestoreId: preRestore.backup.BackupID,
            error: errMsg
          },
          deviceInfo: ctx.session.DeviceInfo,
          description: 'Safe Restore gagal dan berhasil di-rollback otomatis ke kondisi pra-restore (' + preRestore.backup.BackupID + '): ' + errMsg
        });

        notifyAllSuperAdmins(
          'BACKUP_FAILURE',
          'KRITIS: Safe Restore Gagal & Telah Di-Rollback Otomatis',
          'Proses Safe Restore dari "' + backupId + '" gagal (' + errMsg + '). Sistem telah mengembalikan seluruh data ke Pre-Restore Backup "' + preRestore.backup.BackupID + '".',
          backupId,
          { failedBackupId: backupId, preRestoreBackupId: preRestore.backup.BackupID }
        );

        throw TM_Utils.AppError(
          'ERR_RESTORE_ROLLED_BACK',
          'Restore gagal dan sistem telah melakukan rollback otomatis ke Pre-Restore Backup (' + preRestore.backup.BackupID + '): ' + errMsg,
          { preRestoreBackupId: preRestore.backup.BackupID }
        );
      }
    });
  }

  /**
   * Memeriksa apakah sebuah foto direferensikan oleh backup yang masih harus dipertahankan
   * (yaitu backup berstatus 'Berhasil' yang Important ATAU masih dalam masa retensi 90 hari).
   */
  function getRetainedBackupsReferencingPhoto(photoId, driveFileId) {
    var retentionDays = getRetentionDays();
    var cutoffMs = TM_Utils.now().getTime() - (retentionDays * DAY_MS);
    var allBackups = TM_Db.getAllRecords('BackupHistory');
    var referencingIds = [];

    for (var i = 0; i < allBackups.length; i++) {
      var b = allBackups[i];
      if (b.Status !== 'Berhasil') continue;
      var isImportant = String(b.Important).toUpperCase() === 'TRUE';
      var bTime = new Date(b.BackupDate).getTime();
      var isWithinRetention = isNaN(bTime) || bTime >= cutoffMs;
      if (!isImportant && !isWithinRetention) continue;

      try {
        var snap = loadBackupSnapshotFromDrive(b);
        var bPhotos = (snap.tables && snap.tables.Photos) || [];
        var found = bPhotos.some(function (p) {
          return (p.PhotoID === photoId || (driveFileId && p.DriveFileID === driveFileId)) && !p.PurgedAt;
        });
        if (found) {
          referencingIds.push(b.BackupID);
        }
      } catch (_) {}
    }

    return referencingIds;
  }

  /**
   * Menampilkan daftar foto arsip (foto dari temuan/sesi yang dihapus atau foto yang dihapus)
   * beserta status kelayakan purge (PRD Bagian 13).
   */
  function listArchivedPhotos(token) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var sessions = TM_Db.getAllRecords('Sessions');
    var findings = TM_Db.getAllRecords('Findings');
    var photos = TM_Db.getAllRecords('Photos');

    var sesMap = {};
    for (var i = 0; i < sessions.length; i++) sesMap[sessions[i].SessionID] = sessions[i];
    var fndMap = {};
    for (var j = 0; j < findings.length; j++) fndMap[findings[j].FindingID] = findings[j];

    var archived = [];
    for (var k = 0; k < photos.length; k++) {
      var ph = photos[k];
      var ses = sesMap[ph.SessionID];
      var fnd = fndMap[ph.FindingID];
      var isArchived = Boolean(ph.DeletedAt || (fnd && fnd.DeletedAt) || (ses && ses.DeletedAt));
      if (!isArchived) continue;

      var retainedBackupRefs = ph.PurgedAt ? [] : getRetainedBackupsReferencingPhoto(ph.PhotoID, ph.DriveFileID);
      archived.push({
        PhotoID: ph.PhotoID,
        SessionID: ph.SessionID,
        FindingID: ph.FindingID,
        OutletName: ses ? ses.OutletNameSnapshot : '-',
        InspectionDate: ses ? ses.InspectionDate : '-',
        FileName: ph.FileName,
        FileSize: Number(ph.FileSize || 0),
        PhotoComment: ph.PhotoComment || '',
        UploadedAt: ph.UploadedAt,
        DeletedAt: ph.DeletedAt || (fnd && fnd.DeletedAt) || (ses && ses.DeletedAt) || '',
        PurgedAt: ph.PurgedAt || '',
        PurgeReason: ph.PurgeReason || '',
        ReferencedByRetainedBackups: retainedBackupRefs,
        CanPurge: !ph.PurgedAt && retainedBackupRefs.length === 0
      });
    }

    archived.sort(function (a, b) {
      return String(b.DeletedAt).localeCompare(String(a.DeletedAt));
    });

    return archived;
  }

  /**
   * Purge manual foto arsip oleh Super Admin (PRD Bagian 13 & 22.8):
   * - Hanya berlaku untuk foto arsip yang tidak aktif digunakan
   * - Memerlukan alasan wajib
   * - Tidak boleh menghapus foto yang masih direferensikan data aktif atau backup yang harus dipertahankan
   * - Dicatat pada Audit Log
   */
  function purgeArchivedPhoto(token, photoId, purgeReason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var reason = TM_Utils.sanitizeText(purgeReason);
    if (!reason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan purge foto arsip wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var photo = TM_Db.findById('Photos', 'PhotoID', photoId);
      if (!photo) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Foto tidak ditemukan.');
      }
      if (photo.PurgedAt) {
        throw TM_Utils.AppError('ERR_ALREADY_PURGED', 'Foto ini sudah pernah di-purge sebelumnya.');
      }

      var session = TM_Db.findById('Sessions', 'SessionID', photo.SessionID);
      var finding = TM_Db.findById('Findings', 'FindingID', photo.FindingID);

      var isArchived = Boolean(photo.DeletedAt || (finding && finding.DeletedAt) || (session && session.DeletedAt));
      if (!isArchived) {
        throw TM_Utils.AppError(
          'ERR_PHOTO_ACTIVE_REFERENCED',
          'Foto masih direferensikan oleh data pemeriksaan aktif dan tidak boleh di-purge.'
        );
      }

      var retainedRefs = getRetainedBackupsReferencingPhoto(photo.PhotoID, photo.DriveFileID);
      if (retainedRefs.length > 0) {
        throw TM_Utils.AppError(
          'ERR_PHOTO_REFERENCED_BY_BACKUP',
          'Foto tidak dapat di-purge karena masih direferensikan oleh backup yang harus dipertahankan (' + retainedRefs.join(', ') + ').'
        );
      }

      if (photo.DriveFileID) {
        try {
          var driveFile = DriveApp.getFileById(photo.DriveFileID);
          if (driveFile && typeof driveFile.setTrashed === 'function') {
            driveFile.setTrashed(true);
          }
        } catch (_) {}
      }

      var nowIso = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Photos', 'PhotoID', photoId, function (rec) {
        rec.PurgedAt = nowIso;
        rec.PurgeReason = reason;
        rec.Status = 'Purged';
        return rec;
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'PURGE_ARCHIVED_PHOTO',
        entityType: 'Photos',
        entityId: photoId,
        beforeData: photo,
        afterData: updated,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Purge permanen foto arsip ' + photoId + ': ' + reason
      });

      return updated;
    });
  }

  return {
    createManualBackup: createManualBackup,
    runDailyAutomatedBackup: runDailyAutomatedBackup,
    toggleBackupImportant: toggleBackupImportant,
    cleanupExpiredBackups: cleanupExpiredBackups,
    listBackups: listBackups,
    getBackupSummaryForRestore: getBackupSummaryForRestore,
    executeSafeRestore: executeSafeRestore,
    listArchivedPhotos: listArchivedPhotos,
    purgeArchivedPhoto: purgeArchivedPhoto
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Backup: TM_Backup };
}
