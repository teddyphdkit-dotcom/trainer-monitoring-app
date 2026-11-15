/**
 * Drafts.gs — Monitoring Draft Super Admin, Detail 3-Tab Read-Only, Penghapusan Draft oleh Admin,
 * Permintaan Pemulihan (7x24 jam), Locking Persetujuan/Penolakan, & Pemulihan Draft.
 */

var TM_Drafts = (function () {
  var DAY_MS = 24 * 3600000;

  function createInAppNotification(userId, type, title, message, relatedEntityId, metadataObj) {
    if (typeof TM_Notifications !== 'undefined' && TM_Notifications.dispatchNotification) {
      return TM_Notifications.dispatchNotification({
        userId: userId,
        type: type,
        title: title,
        message: message,
        relatedEntityId: relatedEntityId || '',
        metadata: metadataObj || {}
      });
    }
    var ts = TM_Utils.formatWibIso();
    var rec = {
      NotificationID: TM_Utils.generateId('NTF'),
      UserID: userId,
      Type: type,
      Title: title,
      Message: message,
      RelatedEntityID: relatedEntityId || '',
      MetadataJSON: metadataObj ? JSON.stringify(metadataObj) : '',
      ReadAt: '',
      CreatedAt: ts
    };
    return TM_Db.insertRecord('Notifications', rec);
  }

  function computeDraftAgeInfo(createdAtStr, nowMs) {
    var createdMs = new Date(createdAtStr).getTime();
    var diffMs = isNaN(createdMs) ? 0 : Math.max(0, nowMs - createdMs);
    var daysFloat = diffMs / DAY_MS;
    var bucket = 'UNDER_3_DAYS';
    if (daysFloat > 7) {
      bucket = 'OVER_7_DAYS';
    } else if (daysFloat >= 3) {
      bucket = '3_TO_7_DAYS';
    }
    var totalHours = Math.floor(diffMs / 3600000);
    var days = Math.floor(totalHours / 24);
    var remHours = totalHours % 24;
    var relativeText = days > 0
      ? (days + ' hari ' + remHours + ' jam')
      : (totalHours > 0 ? (totalHours + ' jam') : (Math.max(1, Math.floor(diffMs / 60000)) + ' menit'));

    return {
      ageMs: diffMs,
      ageDays: Number(daysFloat.toFixed(2)),
      ageBucket: bucket,
      relativeAge: relativeText
    };
  }

  function getActiveDraftsCount(token) {
    var ctx = TM_Auth.requireAuth(token);
    if (ctx.user.Role !== TM_CONFIG.ROLES.SUPER_ADMIN) {
      return { totalActiveDrafts: 0 };
    }
    var drafts = TM_Db.filterRecords('Sessions', function (s) {
      return s.Status === TM_CONFIG.SESSION_STATUS.DRAFT && !s.DeletedAt;
    });
    return { totalActiveDrafts: drafts.length };
  }

  function listMonitoringDrafts(token, filters) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var f = filters || {};
    var trainerFilter = TM_Utils.sanitizeText(f.trainerId);
    var createdFrom = TM_Utils.sanitizeText(f.createdDateFrom);
    var createdTo = TM_Utils.sanitizeText(f.createdDateTo);
    var search = TM_Utils.sanitizeText(f.search).toLowerCase();

    var users = TM_Db.getAllRecords('Users');
    var userMap = {};
    for (var u = 0; u < users.length; u++) {
      userMap[users[u].UserID] = users[u];
    }

    var allFindings = TM_Db.getAllRecords('Findings');
    var findingCountMap = {};
    for (var i = 0; i < allFindings.length; i++) {
      if (!allFindings[i].DeletedAt) {
        var sid = allFindings[i].SessionID;
        findingCountMap[sid] = (findingCountMap[sid] || 0) + 1;
      }
    }

    var allActiveDrafts = TM_Db.filterRecords('Sessions', function (s) {
      return s.Status === TM_CONFIG.SESSION_STATUS.DRAFT && !s.DeletedAt;
    });

    var nowMs = TM_Utils.now().getTime();
    var summary = {
      totalActiveDrafts: allActiveDrafts.length,
      under3Days: 0,
      days3To7: 0,
      over7Days: 0,
      uniqueTrainers: 0
    };
    var trainerSet = {};

    var enrichedAll = allActiveDrafts.map(function (d) {
      var age = computeDraftAgeInfo(d.CreatedAt, nowMs);
      if (age.ageBucket === 'UNDER_3_DAYS') summary.under3Days++;
      else if (age.ageBucket === '3_TO_7_DAYS') summary.days3To7++;
      else summary.over7Days++;
      trainerSet[d.TrainerID] = true;

      var trainer = userMap[d.TrainerID];
      var trainerName = trainer ? trainer.Name : d.TrainerID;
      return Object.assign({}, d, {
        TrainerName: trainerName,
        TrainerUsername: trainer ? trainer.Username : '',
        FindingCount: findingCountMap[d.SessionID] || 0,
        AgeBucket: age.ageBucket,
        AgeDays: age.ageDays,
        RelativeAge: age.relativeAge
      });
    });

    summary.uniqueTrainers = Object.keys(trainerSet).length;

    var filtered = enrichedAll.filter(function (d) {
      if (trainerFilter && d.TrainerID !== trainerFilter) return false;
      var createdDate = String(d.CreatedAt || '').slice(0, 10);
      if (createdFrom && createdDate < createdFrom) return false;
      if (createdTo && createdDate > createdTo) return false;
      if (search) {
        var hay = (d.TrainerName + ' ' + d.TrainerUsername + ' ' + (d.OutletNameSnapshot || '')).toLowerCase();
        if (hay.indexOf(search) === -1) return false;
      }
      return true;
    });

    // Terbaru di atas berdasarkan CreatedAt (PRD 7.5)
    filtered.sort(function (a, b) {
      return String(b.CreatedAt).localeCompare(String(a.CreatedAt));
    });

    return {
      summary: summary,
      items: filtered
    };
  }

  function getMonitoringDraftDetail(token, sessionId) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
    if (!session) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Draft tidak ditemukan.');
    }

    var trainer = TM_Db.findById('Users', 'UserID', session.TrainerID);
    var age = computeDraftAgeInfo(session.CreatedAt, TM_Utils.now().getTime());

    var findings = TM_Db.filterRecords('Findings', function (f) {
      return f.SessionID === sessionId && !f.DeletedAt;
    });
    var photos = TM_Db.filterRecords('Photos', function (ph) {
      return ph.SessionID === sessionId && !ph.DeletedAt && !ph.PurgedAt;
    });

    var photosByFinding = {};
    for (var i = 0; i < photos.length; i++) {
      var fid = photos[i].FindingID;
      if (!photosByFinding[fid]) photosByFinding[fid] = [];
      photosByFinding[fid].push(photos[i]);
    }

    var findingsTab = findings.map(function (f) {
      var fPhotos = photosByFinding[f.FindingID] || [];
      var uploadedCount = fPhotos.filter(function (p) { return p.Status === 'Berhasil'; }).length;
      var isComplete = Boolean(
        f.CategoryID &&
        f.SectionID &&
        TM_Utils.sanitizeText(f.Masalah) &&
        TM_Utils.sanitizeText(f.Mengapa) &&
        uploadedCount >= 1
      );
      return Object.assign({}, f, {
        PhotoCount: fPhotos.length,
        UploadedPhotoCount: uploadedCount,
        IsComplete: isComplete
      });
    });

    return {
      readOnly: true,
      inspectionInfo: Object.assign({}, session, {
        TrainerName: trainer ? trainer.Name : session.TrainerID,
        TrainerUsername: trainer ? trainer.Username : '',
        RelativeAge: age.relativeAge,
        AgeDays: age.ageDays
      }),
      findings: findingsTab,
      photos: photos
    };
  }

  function adminDeleteDraft(token, sessionId, reason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var delReason = TM_Utils.sanitizeText(reason);
    if (!delReason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan penghapusan Draft wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Draft tidak ditemukan.');
      }
      if (session.DeletedAt || session.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Draft ini sudah dalam status terhapus.');
      }
      if (session.Status !== TM_CONFIG.SESSION_STATUS.DRAFT) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi ini sudah selesai; gunakan fungsi hapus sesi pemeriksaan.');
      }

      var before = Object.assign({}, session);
      var ts = TM_Utils.formatWibIso();
      var nextVersion = String(parseInt(session.Version || '1', 10) + 1);

      var updated = TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
        rec.Status = TM_CONFIG.SESSION_STATUS.DELETED;
        rec.Version = nextVersion;
        rec.DeletedAt = ts;
        rec.DeletedBy = ctx.user.UserID;
        rec.DeleteReason = delReason;
        rec.UpdatedAt = ts;
        return rec;
      });

      // Soft-delete temuan & arsipkan foto server yang sudah masuk
      var findings = TM_Db.filterRecords('Findings', function (f) {
        return f.SessionID === sessionId && !f.DeletedAt;
      });
      for (var i = 0; i < findings.length; i++) {
        TM_Db.updateRecordById('Findings', 'FindingID', findings[i].FindingID, function (rec) {
          rec.DeletedAt = ts;
          rec.DeletedBy = ctx.user.UserID;
          rec.DeleteReason = 'Draft dihapus Super Admin: ' + delReason;
          rec.DeletionSource = 'ADMIN_DRAFT_DELETE';
          return rec;
        });
        TM_Photos.archivePhotosForFinding(findings[i].FindingID, ctx.user.UserID);
      }

      // Periksa metadata sinkronisasi jika ada data lokal tertahan
      var syncMeta = TM_Db.findRecord('SyncMetadata', function (sm) {
        return sm.SessionID === sessionId;
      });
      var hasUnsyncedLocal = Boolean(
        syncMeta &&
        (syncMeta.SyncStatus === 'PENDING' || parseInt(syncMeta.LocalVersion || '0', 10) > parseInt(syncMeta.ServerVersion || '0', 10))
      );

      if (syncMeta) {
        TM_Db.updateRecordById('SyncMetadata', 'SyncID', syncMeta.SyncID, function (rec) {
          rec.SyncStatus = 'DELETED_LOCKED';
          rec.LastSyncAt = ts;
          return rec;
        });
      }

      // Kirim notifikasi in-app ke Trainer pemilik Draft (PRD 7.8)
      var outletLabel = session.OutletNameSnapshot || 'Outlet belum diisi';
      var msg =
        'Draft "' + sessionId + '" (' + outletLabel + ', Tanggal: ' + session.InspectionDate + ') telah dihapus oleh Super Admin ' +
        ctx.user.Name + ' pada ' + ts + '. Alasan: ' + delReason + '.' +
        (hasUnsyncedLocal ? ' Terdapat data lokal yang belum tersinkronisasi dan telah dikunci di perangkat asal.' : '');

      var notification = createInAppNotification(
        session.TrainerID,
        'DRAFT_DELETED_BY_ADMIN',
        'Draft Pemeriksaan Dihapus oleh Super Admin',
        msg,
        sessionId,
        {
          sessionId: sessionId,
          outletName: outletLabel,
          inspectionDate: session.InspectionDate,
          deletedAt: ts,
          deletedByAdminId: ctx.user.UserID,
          deletedByAdminName: ctx.user.Name,
          deleteReason: delReason,
          hasUnsyncedLocal: hasUnsyncedLocal
        }
      );

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'ADMIN_DRAFT_DELETED',
        entityType: 'Sessions',
        entityId: sessionId,
        beforeData: before,
        afterData: {
          deletedAt: ts,
          reason: delReason,
          hasUnsyncedLocal: hasUnsyncedLocal,
          notificationId: notification.NotificationID
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Super Admin menghapus Draft ' + sessionId + ' milik Trainer ' + session.TrainerID + ': ' + delReason
      });

      return {
        session: updated,
        notification: notification
      };
    });
  }

  function listMyDeletedDrafts(token) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var nowMs = TM_Utils.now().getTime();
    var windowMs = TM_CONFIG.DEFAULTS.RESTORE_REQUEST_WINDOW_DAYS * DAY_MS;

    var deletedSessions = TM_Db.filterRecords('Sessions', function (s) {
      return (
        s.TrainerID === ctx.user.UserID &&
        s.DeletedAt &&
        !s.SubmittedAt &&
        s.DeletedBy !== ctx.user.UserID
      );
    });

    var requests = TM_Db.filterRecords('DraftRestoreRequests', function (r) {
      return r.TrainerID === ctx.user.UserID;
    });
    var latestReqBySession = {};
    for (var i = 0; i < requests.length; i++) {
      var req = requests[i];
      var prev = latestReqBySession[req.SessionID];
      if (!prev || String(req.RequestedAt) > String(prev.RequestedAt)) {
        latestReqBySession[req.SessionID] = req;
      }
    }

    var users = TM_Db.getAllRecords('Users');
    var userMap = {};
    for (var u = 0; u < users.length; u++) {
      userMap[users[u].UserID] = users[u].Name;
    }

    return deletedSessions.map(function (s) {
      var delMs = new Date(s.DeletedAt).getTime();
      var withinWindow = !isNaN(delMs) && (nowMs - delMs) <= windowMs;
      var reqRec = latestReqBySession[s.SessionID] || null;
      var canRequest = withinWindow && (!reqRec);
      return Object.assign({}, s, {
        DeletedByName: userMap[s.DeletedBy] || s.DeletedBy,
        Within7DaysWindow: withinWindow,
        CanRequestRestore: canRequest,
        RestoreRequest: reqRec
      });
    }).sort(function (a, b) {
      return String(b.DeletedAt).localeCompare(String(a.DeletedAt));
    });
  }

  function requestDraftRestore(token, sessionId, requestReason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var reason = TM_Utils.sanitizeText(requestReason);
    if (!reason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan pengajuan pemulihan wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session || !session.DeletedAt || session.SubmittedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Draft terhapus tidak ditemukan.');
      }
      if (session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda hanya dapat mengajukan pemulihan untuk Draft milik Anda sendiri.');
      }
      if (session.DeletedBy === ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Draft yang dihapus sendiri oleh Trainer tidak melalui mekanisme pemulihan Super Admin.');
      }

      var nowMs = TM_Utils.now().getTime();
      var deletedMs = new Date(session.DeletedAt).getTime();
      var windowMs = TM_CONFIG.DEFAULTS.RESTORE_REQUEST_WINDOW_DAYS * DAY_MS;
      if (isNaN(deletedMs) || (nowMs - deletedMs) > windowMs) {
        throw TM_Utils.AppError('ERR_RESTORE_WINDOW_EXPIRED', 'Batas waktu pengajuan pemulihan 7 × 24 jam sejak penghapusan telah berakhir.');
      }

      var existingReq = TM_Db.findRecord('DraftRestoreRequests', function (r) {
        return r.SessionID === sessionId && (r.Status === 'Menunggu' || r.Status === 'Disetujui');
      });
      if (existingReq) {
        throw TM_Utils.AppError('ERR_DUPLICATE_REQUEST', 'Permintaan pemulihan untuk Draft ini sudah pernah diajukan.');
      }

      var ts = TM_Utils.formatWibIso();
      var reqRecord = {
        RequestID: TM_Utils.generateId('DRR'),
        SessionID: sessionId,
        TrainerID: ctx.user.UserID,
        RequestReason: reason,
        Status: 'Menunggu',
        RequestedAt: ts,
        ProcessedBy: '',
        ProcessedAt: '',
        DecisionReason: ''
      };
      TM_Db.insertRecord('DraftRestoreRequests', reqRecord);

      // PRD 7.9: Setiap permintaan baru mengirim 1 notifikasi kepada semua Super Admin aktif (status baca masing-masing)
      var activeAdmins = TM_Db.filterRecords('Users', function (u) {
        return u.Role === TM_CONFIG.ROLES.SUPER_ADMIN && u.Status === TM_CONFIG.STATUS.ACTIVE;
      });
      for (var i = 0; i < activeAdmins.length; i++) {
        createInAppNotification(
          activeAdmins[i].UserID,
          'DRAFT_RESTORE_REQUESTED',
          'Permintaan Pemulihan Draft Baru',
          'Trainer ' + ctx.user.Name + ' mengajukan pemulihan untuk Draft ' + sessionId +
            ' (' + (session.OutletNameSnapshot || 'Outlet belum diisi') + '). Alasan: ' + reason,
          reqRecord.RequestID,
          {
            requestId: reqRecord.RequestID,
            sessionId: sessionId,
            trainerId: ctx.user.UserID,
            trainerName: ctx.user.Name,
            requestReason: reason
          }
        );
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'DRAFT_RESTORE_REQUESTED',
        entityType: 'DraftRestoreRequests',
        entityId: reqRecord.RequestID,
        afterData: reqRecord,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Trainer mengajukan pemulihan Draft ' + sessionId + ': ' + reason
      });

      return reqRecord;
    });
  }

  function listDraftRestoreRequests(token) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var requests = TM_Db.getAllRecords('DraftRestoreRequests');
    var users = TM_Db.getAllRecords('Users');
    var sessions = TM_Db.getAllRecords('Sessions');

    var userMap = {};
    for (var i = 0; i < users.length; i++) userMap[users[i].UserID] = users[i].Name;
    var sesMap = {};
    for (var j = 0; j < sessions.length; j++) sesMap[sessions[j].SessionID] = sessions[j];

    var enriched = requests.map(function (r) {
      var s = sesMap[r.SessionID] || {};
      return Object.assign({}, r, {
        TrainerName: userMap[r.TrainerID] || r.TrainerID,
        ProcessedByName: r.ProcessedBy ? (userMap[r.ProcessedBy] || r.ProcessedBy) : '',
        OutletName: s.OutletNameSnapshot || 'Outlet belum diisi',
        InspectionDate: s.InspectionDate || '',
        DeleteReason: s.DeleteReason || ''
      });
    });

    // PRD 7.9: Setiap kelompok diurutkan dari permintaan terlama (RequestedAt ascending)
    function sortOldestFirst(arr) {
      return arr.slice().sort(function (a, b) {
        return String(a.RequestedAt).localeCompare(String(b.RequestedAt));
      });
    }

    return {
      menunggu: sortOldestFirst(enriched.filter(function (x) { return x.Status === 'Menunggu'; })),
      disetujui: sortOldestFirst(enriched.filter(function (x) { return x.Status === 'Disetujui'; })),
      ditolak: sortOldestFirst(enriched.filter(function (x) { return x.Status === 'Ditolak'; }))
    };
  }

  function processDraftRestoreRequest(token, requestId, decision, decisionReason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var normDecision = TM_Utils.sanitizeText(decision);
    var reason = TM_Utils.sanitizeText(decisionReason);

    if (normDecision !== 'Disetujui' && normDecision !== 'Ditolak') {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Keputusan harus "Disetujui" atau "Ditolak".');
    }
    if (!reason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan keputusan (persetujuan maupun penolakan) wajib diisi.');
    }

    // PRD 7.9: Backend menggunakan locking untuk mencegah pemrosesan ganda oleh Super Admin lain
    return TM_Db.withLock(function () {
      var reqRec = TM_Db.findById('DraftRestoreRequests', 'RequestID', requestId);
      if (!reqRec) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Permintaan pemulihan tidak ditemukan.');
      }
      if (reqRec.Status !== 'Menunggu') {
        throw TM_Utils.AppError(
          'ERR_ALREADY_PROCESSED',
          'Permintaan ini sudah diproses sebelumnya dengan status "' + reqRec.Status + '".'
        );
      }

      var session = TM_Db.findById('Sessions', 'SessionID', reqRec.SessionID);
      if (!session) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Data sesi Draft tidak ditemukan.');
      }

      var ts = TM_Utils.formatWibIso();
      var updatedReq = TM_Db.updateRecordById('DraftRestoreRequests', 'RequestID', requestId, function (rec) {
        rec.Status = normDecision;
        rec.ProcessedBy = ctx.user.UserID;
        rec.ProcessedAt = ts;
        rec.DecisionReason = reason;
        return rec;
      });

      var restoredSession = null;
      if (normDecision === 'Disetujui') {
        // PRD 7.10: Label Dipulihkan tampil selama 7 x 24 jam
        var restoredUntil = TM_Utils.addHoursIso(TM_Utils.now(), 7 * 24);
        var nextVersion = String(parseInt(session.Version || '1', 10) + 1);

        restoredSession = TM_Db.updateRecordById('Sessions', 'SessionID', session.SessionID, function (rec) {
          rec.Status = TM_CONFIG.SESSION_STATUS.DRAFT;
          rec.Version = nextVersion;
          rec.IsRestoredFlagUntil = restoredUntil;
          rec.DeletedAt = '';
          rec.DeletedBy = '';
          rec.DeleteReason = '';
          rec.UpdatedAt = ts;
          return rec;
        });

        var findings = TM_Db.filterRecords('Findings', function (f) {
          return f.SessionID === session.SessionID && f.DeletedAt &&
                 (f.DeletionSource === 'ADMIN_DRAFT_DELETE' || f.DeletionSource === 'SESSION');
        });
        for (var i = 0; i < findings.length; i++) {
          TM_Db.updateRecordById('Findings', 'FindingID', findings[i].FindingID, function (rec) {
            rec.DeletedAt = '';
            rec.DeletedBy = '';
            rec.DeleteReason = '';
            rec.DeletionSource = '';
            return rec;
          });
          TM_Photos.restorePhotosForFinding(findings[i].FindingID);
        }
      }

      // Kirim notifikasi keputusan & alasan kepada Trainer (PRD 7.9 & 7.10)
      var notifTitle = normDecision === 'Disetujui'
        ? 'Permintaan Pemulihan Draft Disetujui'
        : 'Permintaan Pemulihan Draft Ditolak';
      var notifMsg = normDecision === 'Disetujui'
        ? ('Draft "' + session.SessionID + '" (' + (session.OutletNameSnapshot || 'Outlet belum diisi') + ') telah dipulihkan oleh Super Admin ' +
           ctx.user.Name + '. Alasan: ' + reason + '. Periksa kembali kelengkapan data dan foto sebelum melanjutkan.')
        : ('Permintaan pemulihan Draft "' + session.SessionID + '" ditolak oleh Super Admin ' + ctx.user.Name +
           '. Alasan: ' + reason + '. Data lokal terkait (jika ada) akan disimpan selama 30 × 24 jam sebelum dihapus otomatis.');

      createInAppNotification(
        reqRec.TrainerID,
        normDecision === 'Disetujui' ? 'DRAFT_RESTORE_APPROVED' : 'DRAFT_RESTORE_REJECTED',
        notifTitle,
        notifMsg,
        session.SessionID,
        {
          requestId: requestId,
          sessionId: session.SessionID,
          decision: normDecision,
          decisionReason: reason,
          processedBy: ctx.user.Name,
          processedAt: ts
        }
      );

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: normDecision === 'Disetujui' ? 'DRAFT_RESTORE_APPROVED' : 'DRAFT_RESTORE_REJECTED',
        entityType: 'DraftRestoreRequests',
        entityId: requestId,
        afterData: {
          sessionId: session.SessionID,
          decision: normDecision,
          decisionReason: reason
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Super Admin memproses permintaan pemulihan Draft ' + session.SessionID + ' (' + normDecision + '): ' + reason
      });

      return {
        request: updatedReq,
        session: restoredSession
      };
    });
  }

  function listMyNotifications(token) {
    var ctx = TM_Auth.requireAuth(token);
    var items = TM_Db.filterRecords('Notifications', function (n) {
      return n.UserID === ctx.user.UserID;
    });
    items.sort(function (a, b) {
      return String(b.CreatedAt).localeCompare(String(a.CreatedAt));
    });
    var unreadCount = items.filter(function (n) { return !n.ReadAt; }).length;
    return {
      items: items,
      unreadCount: unreadCount
    };
  }

  function markNotificationRead(token, notificationId) {
    var ctx = TM_Auth.requireAuth(token);
    var n = TM_Db.findById('Notifications', 'NotificationID', notificationId);
    if (!n || n.UserID !== ctx.user.UserID) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Notifikasi tidak ditemukan.');
    }
    if (n.ReadAt) return n;
    var ts = TM_Utils.formatWibIso();
    return TM_Db.updateRecordById('Notifications', 'NotificationID', notificationId, function (rec) {
      rec.ReadAt = ts;
      return rec;
    });
  }

  return {
    createInAppNotification: createInAppNotification,
    getActiveDraftsCount: getActiveDraftsCount,
    listMonitoringDrafts: listMonitoringDrafts,
    getMonitoringDraftDetail: getMonitoringDraftDetail,
    adminDeleteDraft: adminDeleteDraft,
    listMyDeletedDrafts: listMyDeletedDrafts,
    requestDraftRestore: requestDraftRestore,
    listDraftRestoreRequests: listDraftRestoreRequests,
    processDraftRestoreRequest: processDraftRestoreRequest,
    listMyNotifications: listMyNotifications,
    markNotificationRead: markNotificationRead
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Drafts: TM_Drafts };
}
