/**
 * Notifications.gs — Pusat Notifikasi (In-App & Email), Status Read/Unread,
 * Preferensi Pengguna (NotificationPreferences), Kebijakan Notifikasi Wajib Super Admin,
 * & Pemantauan / Retry Kegagalan Pengiriman Email (PRD Bagian 14).
 */

var TM_Notifications = (function () {
  var MANDATORY_SETTING_KEY = 'MANDATORY_NOTIFICATION_TYPES';

  var CATALOG = [
    {
      type: 'SESSION_ACTIVITY',
      label: 'Aktivitas Penyimpanan & Finalisasi Sesi',
      description: 'Pemberitahuan ketika sesi pemeriksaan berhasil difinalisasi.',
      systemLockedMandatory: false,
      defaultMandatory: false,
      defaultInApp: true,
      defaultEmail: false
    },
    {
      type: 'DATA_MODIFICATION_DELETION',
      label: 'Perubahan atau Penghapusan Data',
      description: 'Pemberitahuan ketika sesi, temuan, atau Draft diubah/dihapus.',
      systemLockedMandatory: false,
      defaultMandatory: true,
      defaultInApp: true,
      defaultEmail: false
    },
    {
      type: 'DRAFT_RESTORE_WORKFLOW',
      label: 'Permintaan & Keputusan Pemulihan Draft',
      description: 'Pemberitahuan pengajuan pemulihan Draft oleh Trainer serta keputusan Super Admin.',
      systemLockedMandatory: false,
      defaultMandatory: true,
      defaultInApp: true,
      defaultEmail: true
    },
    {
      type: 'ACCOUNT_SECURITY',
      label: 'Aktivitas Keamanan Akun (Wajib & Kritis)',
      description: 'Pemberitahuan lockout akun, reset password, dan perubahan keamanan penting.',
      systemLockedMandatory: true,
      defaultMandatory: true,
      defaultInApp: true,
      defaultEmail: true
    },
    {
      type: 'BACKUP_RESULT',
      label: 'Hasil Backup',
      description: 'Pemberitahuan ketika backup harian atau manual berhasil dijalankan.',
      systemLockedMandatory: false,
      defaultMandatory: false,
      defaultInApp: true,
      defaultEmail: false
    },
    {
      type: 'BACKUP_FAILURE',
      label: 'Kegagalan Backup (Wajib & Kritis)',
      description: 'Peringatan kritis kepada Super Admin ketika proses backup atau restore mengalami kegagalan.',
      systemLockedMandatory: true,
      defaultMandatory: true,
      defaultInApp: true,
      defaultEmail: true
    },
    {
      type: 'REPORT_DELIVERY_STATUS',
      label: 'Status Pengiriman Laporan',
      description: 'Pemberitahuan status pengiriman atau kegagalan pengiriman email laporan PDF.',
      systemLockedMandatory: false,
      defaultMandatory: false,
      defaultInApp: true,
      defaultEmail: false
    }
  ];

  // Pemetaan alias tipe lama (dari Phase 5/6) ke kategori standar PRD 14.3
  var LEGACY_TYPE_MAP = {
    DRAFT_DELETED_BY_ADMIN: 'DATA_MODIFICATION_DELETION',
    SYNC_STOPPED_DRAFT_DELETED: 'DATA_MODIFICATION_DELETION',
    SYNC_CONFLICT: 'DATA_MODIFICATION_DELETION',
    DRAFT_RESTORE_REQUESTED: 'DRAFT_RESTORE_WORKFLOW',
    DRAFT_RESTORE_APPROVED: 'DRAFT_RESTORE_WORKFLOW',
    DRAFT_RESTORE_REJECTED: 'DRAFT_RESTORE_WORKFLOW'
  };

  function resolveCatalogItem(rawType) {
    var mapped = LEGACY_TYPE_MAP[rawType] || rawType;
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].type === mapped) return CATALOG[i];
    }
    return null;
  }

  function getMandatoryTypesMap() {
    var map = {};
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].defaultMandatory || CATALOG[i].systemLockedMandatory) {
        map[CATALOG[i].type] = true;
      }
    }
    var settingRec = TM_Db.findById('AppSettings', 'SettingKey', MANDATORY_SETTING_KEY);
    if (settingRec && settingRec.SettingValue) {
      try {
        var customArr = JSON.parse(settingRec.SettingValue);
        if (Array.isArray(customArr)) {
          map = {};
          for (var j = 0; j < customArr.length; j++) {
            map[customArr[j]] = true;
          }
        }
      } catch (_) {}
    }
    // Pastikan notifikasi keamanan & backup kritis tidak pernah bisa dinonaktifkan (PRD 14.2)
    for (var k = 0; k < CATALOG.length; k++) {
      if (CATALOG[k].systemLockedMandatory) {
        map[CATALOG[k].type] = true;
      }
    }
    return map;
  }

  function getEffectiveUserPreference(userId, rawType) {
    var catItem = resolveCatalogItem(rawType);
    var canonicalType = catItem ? catItem.type : rawType;
    var mandatoryMap = getMandatoryTypesMap();
    var isMandatory = Boolean(mandatoryMap[canonicalType] || (catItem && catItem.systemLockedMandatory));

    var prefRec = TM_Db.findRecord('NotificationPreferences', function (p) {
      return p.UserID === userId && p.NotificationType === canonicalType;
    });

    var inApp = catItem ? catItem.defaultInApp : true;
    var email = catItem ? catItem.defaultEmail : false;

    if (prefRec) {
      inApp = String(prefRec.InAppEnabled).toUpperCase() === 'TRUE';
      email = String(prefRec.EmailEnabled).toUpperCase() === 'TRUE';
    }

    // Jika wajib, kanal In-App wajib aktif, dan untuk keamanan/backup kritis kedua kanal wajib aktif
    if (isMandatory) {
      inApp = true;
      if (catItem && catItem.systemLockedMandatory) {
        email = true;
      }
    }

    return {
      type: canonicalType,
      isMandatory: isMandatory,
      systemLockedMandatory: Boolean(catItem && catItem.systemLockedMandatory),
      inAppEnabled: inApp,
      emailEnabled: email
    };
  }

  /**
   * Mengirim notifikasi sesuai kanal dan preferensi (PRD 14.1 - 14.4).
   * - Menolak tegas pembuatan pengingat berkala khusus untuk Draft (PRD 14.3).
   */
  function dispatchNotification(opts) {
    var o = opts || {};
    var userId = TM_Utils.sanitizeText(o.userId);
    var rawType = TM_Utils.sanitizeText(o.type) || 'SESSION_ACTIVITY';
    var title = TM_Utils.sanitizeText(o.title);
    var message = TM_Utils.sanitizeText(o.message);
    var relatedEntityId = TM_Utils.sanitizeText(o.relatedEntityId);
    var metadata = o.metadata || {};

    // PRD 14.3: Tidak ada pengingat email atau pengingat berkala khusus untuk Draft
    if (rawType === 'DRAFT_REMINDER' || rawType === 'DRAFT_PERIODIC_REMINDER') {
      throw TM_Utils.AppError('ERR_FORBIDDEN_NOTIFICATION_TYPE', 'Pengingat berkala atau email khusus Draft tidak diizinkan oleh kebijakan sistem.');
    }

    if (!userId || !title) return null;

    var user = TM_Db.findById('Users', 'UserID', userId);
    var pref = getEffectiveUserPreference(userId, rawType);
    var nowIso = TM_Utils.formatWibIso();
    var createdNotif = null;

    if (pref.inAppEnabled || o.forceInApp) {
      createdNotif = TM_Db.insertRecord('Notifications', {
        NotificationID: TM_Utils.generateId('NTF'),
        UserID: userId,
        Type: rawType,
        Title: title,
        Message: message,
        RelatedEntityID: relatedEntityId,
        MetadataJSON: JSON.stringify(metadata),
        ReadAt: '',
        CreatedAt: nowIso
      });
    }

    if ((pref.emailEnabled || o.forceEmail) && user && user.Email && user.Status === TM_CONFIG.STATUS.ACTIVE) {
      var branding = TM_Settings.getPublicBranding();
      var subject = '[' + branding.companyName + '] ' + title;
      var bodyText =
        'Halo ' + user.Name + ',\n\n' +
        message + '\n\n' +
        'Waktu: ' + nowIso + '\n' +
        'Salam,\n' + branding.companyName;

      var emailStatus = 'Berhasil';
      var failureReason = '';
      try {
        MailApp.sendEmail({
          to: user.Email,
          subject: subject,
          body: bodyText
        });
      } catch (err) {
        emailStatus = 'Gagal';
        failureReason = err && err.message ? err.message : String(err);
      }

      TM_Db.insertRecord('EmailLogs', {
        EmailLogID: TM_Utils.generateId('EML'),
        SessionID: relatedEntityId || (createdNotif ? createdNotif.NotificationID : 'NOTIF'),
        Recipient: user.Email,
        PDFVersionID: 'NOTIF::' + pref.type + '::' + encodeURIComponent(subject),
        AttemptAt: nowIso,
        Status: emailStatus,
        FailureReason: failureReason
      });
    }

    return createdNotif;
  }

  /**
   * Mengambil daftar notifikasi pengguna beserta filter status baca & jenis (PRD 14.3).
   */
  function listMyNotificationsCenter(token, filterDto) {
    var ctx = TM_Auth.requireAuth(token);
    var f = filterDto || {};
    var statusFilter = String(f.status || 'ALL').toUpperCase(); // ALL | UNREAD | READ
    var typeFilter = TM_Utils.sanitizeText(f.type);

    var allMine = TM_Db.filterRecords('Notifications', function (n) {
      return n.UserID === ctx.user.UserID;
    });

    var unreadCount = 0;
    for (var i = 0; i < allMine.length; i++) {
      if (!allMine[i].ReadAt) unreadCount++;
    }

    var filtered = allMine.filter(function (n) {
      if (statusFilter === 'UNREAD' && n.ReadAt) return false;
      if (statusFilter === 'READ' && !n.ReadAt) return false;
      if (typeFilter) {
        var cat = resolveCatalogItem(n.Type);
        var canon = cat ? cat.type : n.Type;
        if (n.Type !== typeFilter && canon !== typeFilter) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      return String(b.CreatedAt).localeCompare(String(a.CreatedAt));
    });

    return {
      unreadCount: unreadCount,
      totalCount: allMine.length,
      items: filtered
    };
  }

  function setNotificationReadStatus(token, notificationId, isRead) {
    var ctx = TM_Auth.requireAuth(token);
    var notif = TM_Db.findById('Notifications', 'NotificationID', notificationId);
    if (!notif || notif.UserID !== ctx.user.UserID) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Notifikasi tidak ditemukan.');
    }
    var updated = TM_Db.updateRecordById('Notifications', 'NotificationID', notificationId, function (rec) {
      rec.ReadAt = isRead ? TM_Utils.formatWibIso() : '';
      return rec;
    });
    return updated;
  }

  function markAllMyNotificationsRead(token) {
    var ctx = TM_Auth.requireAuth(token);
    var nowIso = TM_Utils.formatWibIso();
    var allMineUnread = TM_Db.filterRecords('Notifications', function (n) {
      return n.UserID === ctx.user.UserID && !n.ReadAt;
    });
    for (var i = 0; i < allMineUnread.length; i++) {
      TM_Db.updateRecordById('Notifications', 'NotificationID', allMineUnread[i].NotificationID, function (rec) {
        rec.ReadAt = nowIso;
        return rec;
      });
    }
    return { markedCount: allMineUnread.length };
  }

  /**
   * Mengambil preferensi notifikasi pengguna & kebijakan notifikasi wajib saat ini (PRD 14.2).
   */
  function getMyNotificationPreferences(token) {
    var ctx = TM_Auth.requireAuth(token);
    var mandatoryMap = getMandatoryTypesMap();

    var items = CATALOG.map(function (cat) {
      var eff = getEffectiveUserPreference(ctx.user.UserID, cat.type);
      return {
        type: cat.type,
        label: cat.label,
        description: cat.description,
        isMandatory: Boolean(mandatoryMap[cat.type] || cat.systemLockedMandatory),
        systemLockedMandatory: cat.systemLockedMandatory,
        inAppEnabled: eff.inAppEnabled,
        emailEnabled: eff.emailEnabled
      };
    });

    return {
      userId: ctx.user.UserID,
      preferences: items
    };
  }

  /**
   * Menyimpan preferensi notifikasi pengguna (PRD 14.2).
   * Menolak upaya menonaktifkan notifikasi wajib / keamanan / backup kritis!
   */
  function updateMyNotificationPreference(token, prefDto) {
    var ctx = TM_Auth.requireAuth(token);
    var d = prefDto || {};
    var type = TM_Utils.sanitizeText(d.type);
    var catItem = resolveCatalogItem(type);
    if (!catItem) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Jenis notifikasi tidak dikenal.');
    }

    var mandatoryMap = getMandatoryTypesMap();
    var isMandatory = Boolean(mandatoryMap[catItem.type] || catItem.systemLockedMandatory);
    var wantInApp = Boolean(d.inAppEnabled);
    var wantEmail = Boolean(d.emailEnabled);

    if (catItem.systemLockedMandatory && (!wantInApp || !wantEmail)) {
      throw TM_Utils.AppError(
        'ERR_MANDATORY_NOTIFICATION',
        'Notifikasi keamanan dan backup kritis bersifat wajib dan tidak boleh dinonaktifkan.'
      );
    }
    if (isMandatory && !wantInApp) {
      throw TM_Utils.AppError(
        'ERR_MANDATORY_NOTIFICATION',
        'Notifikasi "' + catItem.label + '" ditetapkan sebagai notifikasi wajib oleh Super Admin dan tidak dapat dinonaktifkan.'
      );
    }

    return TM_Db.withLock(function () {
      var existing = TM_Db.findRecord('NotificationPreferences', function (p) {
        return p.UserID === ctx.user.UserID && p.NotificationType === catItem.type;
      });

      var saved = null;
      if (existing) {
        saved = TM_Db.updateRecordById('NotificationPreferences', 'PreferenceID', existing.PreferenceID, function (rec) {
          rec.InAppEnabled = wantInApp ? 'TRUE' : 'FALSE';
          rec.EmailEnabled = wantEmail ? 'TRUE' : 'FALSE';
          return rec;
        });
      } else {
        saved = TM_Db.insertRecord('NotificationPreferences', {
          PreferenceID: TM_Utils.generateId('PRF'),
          UserID: ctx.user.UserID,
          NotificationType: catItem.type,
          InAppEnabled: wantInApp ? 'TRUE' : 'FALSE',
          EmailEnabled: wantEmail ? 'TRUE' : 'FALSE'
        });
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'UPDATE_NOTIFICATION_PREFERENCE',
        entityType: 'NotificationPreferences',
        entityId: saved.PreferenceID,
        beforeData: existing,
        afterData: saved,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Mengubah preferensi notifikasi ' + catItem.type
      });

      return getEffectiveUserPreference(ctx.user.UserID, catItem.type);
    });
  }

  /**
   * Super Admin mengatur jenis notifikasi mana saja yang menjadi Notifikasi Wajib (PRD 14.2).
   * ACCOUNT_SECURITY dan BACKUP_FAILURE selalu dikunci sebagai wajib.
   */
  function updateMandatoryNotificationPolicy(token, mandatoryTypesArray) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var incoming = Array.isArray(mandatoryTypesArray) ? mandatoryTypesArray : [];
    var finalSet = {};

    for (var i = 0; i < incoming.length; i++) {
      var c = resolveCatalogItem(incoming[i]);
      if (c) finalSet[c.type] = true;
    }
    // Pastikan keamanan & backup kritis tidak pernah bisa dimatikan
    for (var j = 0; j < CATALOG.length; j++) {
      if (CATALOG[j].systemLockedMandatory) {
        finalSet[CATALOG[j].type] = true;
      }
    }

    var finalList = Object.keys(finalSet);
    return TM_Db.withLock(function () {
      var existing = TM_Db.findById('AppSettings', 'SettingKey', MANDATORY_SETTING_KEY);
      var nowIso = TM_Utils.formatWibIso();
      if (existing) {
        TM_Db.updateRecordById('AppSettings', 'SettingKey', MANDATORY_SETTING_KEY, function (rec) {
          rec.SettingValue = JSON.stringify(finalList);
          rec.UpdatedAt = nowIso;
          rec.UpdatedBy = ctx.user.UserID;
          return rec;
        });
      } else {
        TM_Db.insertRecord('AppSettings', {
          SettingKey: MANDATORY_SETTING_KEY,
          SettingValue: JSON.stringify(finalList),
          UpdatedAt: nowIso,
          UpdatedBy: ctx.user.UserID
        });
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'UPDATE_MANDATORY_NOTIFICATION_POLICY',
        entityType: 'AppSettings',
        entityId: MANDATORY_SETTING_KEY,
        beforeData: existing,
        afterData: { mandatoryTypes: finalList },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Super Admin memperbarui kebijakan jenis notifikasi wajib'
      });

      return { mandatoryTypes: finalList };
    });
  }

  /**
   * Super Admin mencoba ulang (retry) pengiriman email yang gagal pada EmailLogs (PRD 14.4).
   */
  function retryFailedEmailLog(token, emailLogId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var logRec = TM_Db.findById('EmailLogs', 'EmailLogID', emailLogId);
    if (!logRec) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Catatan log email tidak ditemukan.');
    }
    if (logRec.Status === 'Berhasil') {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Email ini sudah berstatus Berhasil.');
    }

    // Jika email tersebut adalah email PDF sesi, gunakan alur pengiriman ulang PDF sesi
    if (logRec.PDFVersionID && String(logRec.PDFVersionID).indexOf('NOTIF::') !== 0) {
      return TM_Reporting.sendSessionPdfEmail(token, logRec.SessionID, logRec.Recipient, true);
    }

    // Jika email tersebut adalah email notifikasi
    var parts = String(logRec.PDFVersionID || '').split('::');
    var subject = parts[2] ? decodeURIComponent(parts[2]) : '[Trainer Monitoring] Pemberitahuan Sistem (Pengiriman Ulang)';
    var nowIso = TM_Utils.formatWibIso();
    var newStatus = 'Berhasil';
    var newFailReason = '';

    try {
      MailApp.sendEmail({
        to: logRec.Recipient,
        subject: subject,
        body: 'Pemberitahuan ulang otomatis dari sistem Trainer Monitoring untuk referensi: ' + logRec.SessionID
      });
    } catch (err) {
      newStatus = 'Gagal';
      newFailReason = err && err.message ? err.message : String(err);
    }

    var updated = TM_Db.updateRecordById('EmailLogs', 'EmailLogID', emailLogId, function (rec) {
      rec.AttemptAt = nowIso;
      rec.Status = newStatus;
      rec.FailureReason = newFailReason;
      return rec;
    });

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'RETRY_FAILED_EMAIL',
      entityType: 'EmailLogs',
      entityId: emailLogId,
      beforeData: logRec,
      afterData: updated,
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Retry pengiriman email ' + emailLogId + ' ke ' + logRec.Recipient + ' (' + newStatus + ')'
    });

    return {
      status: newStatus,
      emailLog: updated,
      failureReason: newFailReason
    };
  }

  return {
    CATALOG: CATALOG,
    dispatchNotification: dispatchNotification,
    listMyNotificationsCenter: listMyNotificationsCenter,
    setNotificationReadStatus: setNotificationReadStatus,
    markAllMyNotificationsRead: markAllMyNotificationsRead,
    getMyNotificationPreferences: getMyNotificationPreferences,
    updateMyNotificationPreference: updateMyNotificationPreference,
    updateMandatoryNotificationPolicy: updateMandatoryNotificationPolicy,
    retryFailedEmailLog: retryFailedEmailLog
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Notifications: TM_Notifications };
}
