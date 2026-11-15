/**
 * Sync.gs — Sinkronisasi Offline/Online Idempotent, Deteksi & Resolusi Konflik,
 * Multi-Device Tracking, Prioritas Penghapusan Super Admin saat Sync, & Kebijakan Retensi Lokal.
 */

var TM_Sync = (function () {
  var DAY_MS = 24 * 3600000;

  function upsertSyncMetadata(sessionId, deviceId, updaterFn) {
    var existing = TM_Db.findRecord('SyncMetadata', function (sm) {
      return sm.SessionID === sessionId;
    });
    var ts = TM_Utils.formatWibIso();
    if (existing) {
      return TM_Db.updateRecordById('SyncMetadata', 'SyncID', existing.SyncID, function (rec) {
        var next = updaterFn(rec) || rec;
        next.LastSyncAt = ts;
        return next;
      });
    }
    var initial = {
      SyncID: TM_Utils.generateId('SYNC'),
      SessionID: sessionId,
      DeviceID: deviceId || 'UNKNOWN_DEVICE',
      LocalVersion: '1',
      ServerVersion: '1',
      SyncStatus: 'SYNCED',
      LastSyncAt: ts,
      ConflictData: '',
      LastIdempotencyKey: ''
    };
    var created = updaterFn(initial) || initial;
    return TM_Db.insertRecord('SyncMetadata', created);
  }

  function computeRetentionPolicy(session, latestRestoreReq, nowMs) {
    if (!session || !session.DeletedAt) {
      return null;
    }
    var deletedMs = new Date(session.DeletedAt).getTime();
    var reqWindowEndMs = deletedMs + (TM_CONFIG.DEFAULTS.RESTORE_REQUEST_WINDOW_DAYS * DAY_MS);
    var retentionDays = TM_CONFIG.DEFAULTS.LOCAL_DELETED_RETENTION_DAYS || 30;
    var retentionMs = retentionDays * DAY_MS;
    var warningLeadMs = 7 * DAY_MS;

    // 1. Jika ada permintaan pemulihan berstatus Menunggu -> ditahan tanpa batas waktu (PRD 7.11)
    if (latestRestoreReq && latestRestoreReq.Status === 'Menunggu') {
      return {
        state: 'WAITING_DECISION',
        label: 'Draft Dihapus — Menunggu Pemulihan',
        unlimitedRetention: true,
        retentionDeleteAt: '',
        warningStartAt: '',
        show7DayWarning: false,
        shouldPurgeLocal: false
      };
    }

    // 2. Jika permintaan pemulihan Ditolak -> 30 x 24 jam sejak penolakan (PRD 7.11)
    if (latestRestoreReq && latestRestoreReq.Status === 'Ditolak') {
      var rejectedMs = new Date(latestRestoreReq.ProcessedAt || session.DeletedAt).getTime();
      var purgeAtMs = rejectedMs + retentionMs;
      var warnAtMs = purgeAtMs - warningLeadMs;
      return {
        state: 'REJECTED_RETENTION',
        label: 'Pemulihan Ditolak — Retensi Lokal 30 Hari',
        unlimitedRetention: false,
        retentionDeleteAt: TM_Utils.formatWibIso(new Date(purgeAtMs)),
        warningStartAt: TM_Utils.formatWibIso(new Date(warnAtMs)),
        show7DayWarning: nowMs >= warnAtMs && nowMs < purgeAtMs,
        shouldPurgeLocal: nowMs >= purgeAtMs
      };
    }

    // 3. Jika belum mengajukan pemulihan:
    //    - Dalam 7 x 24 jam pertama: menunggu pengajuan
    //    - Lewat 7 x 24 jam tanpa pengajuan: masuk retensi 30 x 24 jam setelah batas pengajuan berakhir (PRD 7.11)
    if (nowMs <= reqWindowEndMs) {
      var purgeIfNoReqMs = reqWindowEndMs + retentionMs;
      return {
        state: 'DELETED_WITHIN_REQUEST_WINDOW',
        label: 'Draft Dihapus — Menunggu Pemulihan',
        unlimitedRetention: false,
        requestDeadlineAt: TM_Utils.formatWibIso(new Date(reqWindowEndMs)),
        retentionDeleteAt: TM_Utils.formatWibIso(new Date(purgeIfNoReqMs)),
        warningStartAt: TM_Utils.formatWibIso(new Date(purgeIfNoReqMs - warningLeadMs)),
        show7DayWarning: false,
        shouldPurgeLocal: false
      };
    }

    var finalPurgeMs = reqWindowEndMs + retentionMs;
    var finalWarnMs = finalPurgeMs - warningLeadMs;
    return {
      state: 'NO_REQUEST_RETENTION',
      label: 'Draft Dihapus — Masa Retensi Lokal',
      unlimitedRetention: false,
      retentionDeleteAt: TM_Utils.formatWibIso(new Date(finalPurgeMs)),
      warningStartAt: TM_Utils.formatWibIso(new Date(finalWarnMs)),
      show7DayWarning: nowMs >= finalWarnMs && nowMs < finalPurgeMs,
      shouldPurgeLocal: nowMs >= finalPurgeMs
    };
  }

  function buildServerDraftSnapshot(sessionId) {
    var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
    if (!session) return null;
    var findings = TM_Db.filterRecords('Findings', function (f) {
      return f.SessionID === sessionId && !f.DeletedAt;
    });
    var photos = TM_Db.filterRecords('Photos', function (ph) {
      return ph.SessionID === sessionId && !ph.DeletedAt && !ph.PurgedAt;
    });
    return {
      session: session,
      findings: findings,
      photos: photos
    };
  }

  function hasMeaningfulDifference(serverSnap, draftPayload) {
    if (!serverSnap || !serverSnap.session || !draftPayload) return false;
    var s = serverSnap.session;
    var pDate = TM_Utils.normalizeDateStr(draftPayload.inspectionDate) || draftPayload.inspectionDate;
    var sDate = TM_Utils.normalizeDateStr(s.InspectionDate) || s.InspectionDate;
    if (pDate && pDate !== sDate) return true;
    if (draftPayload.outletName && TM_Outlets.cleanDisplayName(draftPayload.outletName) !== s.OutletNameSnapshot) return true;
    if (draftPayload.amId !== undefined && String(draftPayload.amId) !== String(s.AM_ID)) return true;
    if (draftPayload.mumId !== undefined && String(draftPayload.mumId) !== String(s.MUM_ID)) return true;
    if (draftPayload.picName !== undefined && TM_Utils.sanitizeText(draftPayload.picName) !== String(s.PIC_Name)) return true;

    var incomingFindings = Array.isArray(draftPayload.findings) ? draftPayload.findings : null;
    if (incomingFindings) {
      if (incomingFindings.length !== serverSnap.findings.length) return true;
      for (var i = 0; i < incomingFindings.length; i++) {
        var inf = incomingFindings[i];
        var match = serverSnap.findings.find(function (sf) { return sf.FindingID === inf.findingId; });
        if (!match) return true;
        if (
          String(inf.categoryId || '') !== String(match.CategoryID || '') ||
          String(inf.sectionId || '') !== String(match.SectionID || '') ||
          TM_Utils.sanitizeText(inf.masalah) !== String(match.Masalah || '') ||
          TM_Utils.sanitizeText(inf.mengapa) !== String(match.Mengapa || '') ||
          TM_Utils.sanitizeText(inf.solusi) !== String(match.Solusi || '')
        ) {
          return true;
        }
      }
    }
    return false;
  }

  function applyDraftFindingsList(token, sessionId, findingsArray) {
    if (!Array.isArray(findingsArray)) return [];
    var savedFindings = [];
    for (var i = 0; i < findingsArray.length; i++) {
      var fDto = findingsArray[i];
      var saved = TM_Findings.saveFindingDraft(token, sessionId, {
        findingId: fDto.findingId || '',
        categoryId: fDto.categoryId || '',
        sectionId: fDto.sectionId || '',
        masalah: fDto.masalah || '',
        mengapa: fDto.mengapa || '',
        solusi: fDto.solusi || ''
      });
      savedFindings.push(saved);
    }
    return savedFindings;
  }

  /**
   * Sinkronisasi satu operasi Draft dari antrean offline client.
   * Menangani:
   * 1. Idempotency (mencegah duplikasi saat retry)
   * 2. Prioritas penghapusan Super Admin (PRD 7.12: hentikan sync, kunci lokal, tidak buat ulang Draft)
   * 3. Deteksi konflik versi & multi-perangkat (PRD 8.3 & 8.4)
   * 4. Pemeriksaan konflik pasca-pemulihan Draft (PRD 7.10)
   */
  function syncDraftOperation(token, payload) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var p = payload || {};
    var sessionId = TM_Utils.sanitizeText(p.sessionId);
    var deviceId = TM_Utils.sanitizeText(p.deviceId) || ctx.session.DeviceInfo || 'DEFAULT_DEVICE';
    var idempotencyKey = TM_Utils.sanitizeText(p.idempotencyKey) || TM_Utils.generateId('SYNCKEY');
    var localVersion = parseInt(p.localVersion || '1', 10);
    var baseServerVersion = parseInt(p.baseServerVersion !== undefined ? p.baseServerVersion : '0', 10);
    var draftData = p.draft || {};

    if (!sessionId) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'SessionID wajib disertakan dalam operasi sinkronisasi.');
    }

    var existingSyncMeta = TM_Db.findRecord('SyncMetadata', function (sm) {
      return sm.SessionID === sessionId;
    });

    // 1. Cek Idempotency Key agar retry otomatis tidak menduplikasi transaksi
    if (existingSyncMeta && existingSyncMeta.LastIdempotencyKey === idempotencyKey && existingSyncMeta.SyncStatus === 'SYNCED') {
      var snapIdemp = buildServerDraftSnapshot(sessionId);
      return {
        status: 'SYNCED',
        idempotentReplay: true,
        sessionId: sessionId,
        serverVersion: snapIdemp && snapIdemp.session ? parseInt(snapIdemp.session.Version || '1', 10) : 1,
        snapshot: snapIdemp
      };
    }

    var existingSession = TM_Db.findById('Sessions', 'SessionID', sessionId);

    // 2. Prioritas Penghapusan Super Admin saat Sinkronisasi Berjalan (PRD 7.12)
    if (existingSession && (existingSession.DeletedAt || existingSession.Status === TM_CONFIG.SESSION_STATUS.DELETED)) {
      var latestReq = TM_Db.findRecord('DraftRestoreRequests', function (r) {
        return r.SessionID === sessionId;
      });
      var retention = computeRetentionPolicy(existingSession, latestReq, TM_Utils.now().getTime());
      var originDevice = existingSyncMeta ? existingSyncMeta.DeviceID : deviceId;

      upsertSyncMetadata(sessionId, originDevice, function (rec) {
        rec.LocalVersion = String(localVersion);
        rec.ServerVersion = String(existingSession.Version || '1');
        rec.SyncStatus = 'DELETED_LOCKED';
        return rec;
      });

      // Kirim notifikasi lengkap dengan info data lokal tertahan & tautan Lihat Data Lokal (PRD 7.12)
      TM_Drafts.createInAppNotification(
        ctx.user.UserID,
        'SYNC_STOPPED_DRAFT_DELETED',
        'Sinkronisasi Dihentikan — Draft Telah Dihapus Super Admin',
        'Sinkronisasi untuk Draft "' + sessionId + '" dihentikan karena Draft telah dihapus oleh Super Admin (' +
          (existingSession.DeleteReason || '-') + '). Data lokal Anda yang belum tersinkronisasi tetap tersimpan dalam kondisi terkunci (Hanya Baca) di perangkat asal. Gunakan tombol "Lihat Data Lokal" pada halaman Input.',
        sessionId,
        {
          sessionId: sessionId,
          deletedAt: existingSession.DeletedAt,
          deleteReason: existingSession.DeleteReason,
          originDeviceId: originDevice,
          actionLink: 'VIEW_LOCAL_DATA'
        }
      );

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'SYNC_ABORTED_DRAFT_DELETED',
        entityType: 'Sessions',
        entityId: sessionId,
        afterData: {
          deviceId: deviceId,
          originDeviceId: originDevice,
          localVersion: localVersion,
          deletedAt: existingSession.DeletedAt
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Menghentikan sinkronisasi tertunda karena Draft telah dihapus oleh Super Admin (mencegah pembuatan ulang Draft)'
      });

      return {
        status: 'DELETED_LOCKED',
        sessionId: sessionId,
        deletedAt: existingSession.DeletedAt,
        deletedBy: existingSession.DeletedBy,
        deleteReason: existingSession.DeleteReason,
        originDeviceId: originDevice,
        isOriginDevice: originDevice === deviceId,
        retention: retention
      };
    }

    // 3. Cek Kepemilikan jika sesi sudah ada di server
    if (existingSession && existingSession.TrainerID !== ctx.user.UserID) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak dapat menyinkronkan Draft milik Trainer lain.');
    }

    // 4. Deteksi Konflik Versi / Lintas Perangkat / Pasca-Pemulihan Draft (PRD 7.10, 8.3, 8.4)
    if (existingSession) {
      var currentServerVer = parseInt(existingSession.Version || '1', 10);
      var serverSnap = buildServerDraftSnapshot(sessionId);
      var isRestoredNeedsCheck = Boolean(p.hasUnsyncedPreDeleteChanges);
      var versionMismatch = baseServerVersion < currentServerVer;

      if ((versionMismatch && hasMeaningfulDifference(serverSnap, draftData)) || isRestoredNeedsCheck) {
        var conflictPayload = {
          detectedAt: TM_Utils.formatWibIso(),
          deviceId: deviceId,
          baseServerVersion: baseServerVersion,
          currentServerVersion: currentServerVer,
          localDraft: draftData,
          serverSnapshot: serverSnap
        };

        upsertSyncMetadata(sessionId, existingSyncMeta ? existingSyncMeta.DeviceID : deviceId, function (rec) {
          rec.LocalVersion = String(localVersion);
          rec.ServerVersion = String(currentServerVer);
          rec.SyncStatus = 'CONFLICT';
          rec.ConflictData = JSON.stringify(conflictPayload);
          return rec;
        });

        TM_Drafts.createInAppNotification(
          ctx.user.UserID,
          'SYNC_CONFLICT',
          'Perlu Tindakan: Konflik Sinkronisasi Draft',
          'Terdapat perbedaan versi antara perangkat Anda dan server pada Draft "' + sessionId + '". Silakan tinjau dan pilih resolusi konflik.',
          sessionId,
          { sessionId: sessionId, currentServerVersion: currentServerVer }
        );

        TM_Audit.logEvent({
          userId: ctx.user.UserID,
          action: 'SYNC_CONFLICT_DETECTED',
          entityType: 'Sessions',
          entityId: sessionId,
          afterData: {
            deviceId: deviceId,
            baseServerVersion: baseServerVersion,
            currentServerVersion: currentServerVer
          },
          deviceInfo: ctx.session.DeviceInfo,
          description: 'Konflik sinkronisasi terdeteksi pada Draft ' + sessionId
        });

        return {
          status: 'CONFLICT',
          sessionId: sessionId,
          serverVersion: currentServerVer,
          serverSnapshot: serverSnap,
          localDraft: draftData
        };
      }
    }

    // 5. Aman untuk disinkronkan secara otomatis
    var savedSession = TM_Sessions.saveDraft(token, {
      sessionId: sessionId,
      inspectionDate: draftData.inspectionDate,
      outletId: draftData.outletId,
      outletName: draftData.outletName,
      amId: draftData.amId,
      mumId: draftData.mumId,
      picName: draftData.picName
    });

    applyDraftFindingsList(token, savedSession.SessionID, draftData.findings);

    var updatedSnap = buildServerDraftSnapshot(savedSession.SessionID);
    var newServerVer = parseInt(updatedSnap.session.Version || '1', 10);

    upsertSyncMetadata(savedSession.SessionID, existingSyncMeta ? existingSyncMeta.DeviceID : deviceId, function (rec) {
      rec.LocalVersion = String(localVersion);
      rec.ServerVersion = String(newServerVer);
      rec.SyncStatus = 'SYNCED';
      rec.ConflictData = '';
      rec.LastIdempotencyKey = idempotencyKey;
      return rec;
    });

    return {
      status: 'SYNCED',
      idempotentReplay: false,
      sessionId: savedSession.SessionID,
      serverVersion: newServerVer,
      snapshot: updatedSnap
    };
  }

  function syncBatch(token, batchPayload) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var b = batchPayload || {};
    var deviceId = TM_Utils.sanitizeText(b.deviceId);
    var ops = Array.isArray(b.operations) ? b.operations : [];
    var results = [];

    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      try {
        var res = syncDraftOperation(token, Object.assign({}, op, {
          deviceId: op.deviceId || deviceId
        }));
        results.push(res);
      } catch (err) {
        results.push({
          status: 'ERROR',
          sessionId: op.sessionId || '',
          error: {
            code: err && err.code ? err.code : 'ERR_SYNC_OP',
            message: err && err.message ? err.message : String(err)
          }
        });
      }
    }

    return {
      deviceId: deviceId,
      results: results
    };
  }

  function resolveSyncConflict(token, sessionId, resolutionDto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var r = resolutionDto || {};
    var strategy = TM_Utils.sanitizeText(r.strategy); // USE_SERVER | APPLY_LOCAL
    var deviceId = TM_Utils.sanitizeText(r.deviceId) || ctx.session.DeviceInfo;

    if (strategy !== 'USE_SERVER' && strategy !== 'APPLY_LOCAL') {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Strategi resolusi konflik harus USE_SERVER atau APPLY_LOCAL.');
    }

    var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
    if (!session) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Draft tidak ditemukan di server.');
    }
    if (session.TrainerID !== ctx.user.UserID) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak berhak menyelesaikan konflik untuk Draft Trainer lain.');
    }
    if (session.DeletedAt || session.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
      throw TM_Utils.AppError('ERR_DRAFT_DELETED_BY_ADMIN', 'Draft telah dihapus oleh Super Admin.');
    }

    var beforeSnap = buildServerDraftSnapshot(sessionId);

    if (strategy === 'APPLY_LOCAL' && r.localDraft) {
      TM_Sessions.saveDraft(token, {
        sessionId: sessionId,
        inspectionDate: r.localDraft.inspectionDate,
        outletId: r.localDraft.outletId,
        outletName: r.localDraft.outletName,
        amId: r.localDraft.amId,
        mumId: r.localDraft.mumId,
        picName: r.localDraft.picName
      });
      applyDraftFindingsList(token, sessionId, r.localDraft.findings);
    }

    var afterSnap = buildServerDraftSnapshot(sessionId);
    var finalVer = parseInt(afterSnap.session.Version || '1', 10);

    upsertSyncMetadata(sessionId, deviceId, function (rec) {
      rec.ServerVersion = String(finalVer);
      rec.SyncStatus = 'SYNCED';
      rec.ConflictData = '';
      return rec;
    });

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'SYNC_CONFLICT_RESOLVED',
      entityType: 'Sessions',
      entityId: sessionId,
      beforeData: beforeSnap.session,
      afterData: {
        strategy: strategy,
        finalServerVersion: finalVer,
        session: afterSnap.session
      },
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Trainer menyelesaikan konflik sinkronisasi Draft ' + sessionId + ' dengan strategi ' + strategy
    });

    return {
      status: 'SYNCED',
      strategy: strategy,
      sessionId: sessionId,
      serverVersion: finalVer,
      snapshot: afterSnap
    };
  }

  function getDraftSyncAndRetentionStatus(token, sessionIds, deviceId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER, TM_CONFIG.ROLES.SUPER_ADMIN]);
    var ids = Array.isArray(sessionIds) ? sessionIds : [sessionIds];
    var nowMs = TM_Utils.now().getTime();
    var allSessions = TM_Db.getAllRecords('Sessions');
    var allSync = TM_Db.getAllRecords('SyncMetadata');
    var allReqs = TM_Db.getAllRecords('DraftRestoreRequests');

    var sesMap = {};
    for (var i = 0; i < allSessions.length; i++) sesMap[allSessions[i].SessionID] = allSessions[i];
    var syncMap = {};
    for (var j = 0; j < allSync.length; j++) syncMap[allSync[j].SessionID] = allSync[j];

    var latestReqMap = {};
    for (var k = 0; k < allReqs.length; k++) {
      var req = allReqs[k];
      var prev = latestReqMap[req.SessionID];
      if (!prev || String(req.RequestedAt) > String(prev.RequestedAt)) {
        latestReqMap[req.SessionID] = req;
      }
    }

    var out = [];
    for (var idx = 0; idx < ids.length; idx++) {
      var sid = ids[idx];
      var s = sesMap[sid];
      if (!s) continue;
      if (ctx.user.Role === TM_CONFIG.ROLES.TRAINER && s.TrainerID !== ctx.user.UserID) continue;
      var sm = syncMap[sid] || null;
      var reqRec = latestReqMap[sid] || null;
      var originDev = sm ? sm.DeviceID : '';
      var isOrigin = !originDev || originDev === deviceId;

      out.push({
        sessionId: sid,
        status: s.Status,
        serverVersion: parseInt(s.Version || '1', 10),
        deletedAt: s.DeletedAt || '',
        deleteReason: s.DeleteReason || '',
        originDeviceId: originDev,
        isOriginDevice: isOrigin,
        otherDeviceNotice: (!isOrigin && s.DeletedAt)
          ? 'Data lokal yang belum tersinkronisasi untuk Draft ini tertahan di perangkat asal (' + originDev + ').'
          : '',
        restoreRequest: reqRec,
        retention: computeRetentionPolicy(s, reqRec, nowMs)
      });
    }

    return out;
  }

  return {
    computeRetentionPolicy: computeRetentionPolicy,
    syncDraftOperation: syncDraftOperation,
    syncBatch: syncBatch,
    resolveSyncConflict: resolveSyncConflict,
    getDraftSyncAndRetentionStatus: getDraftSyncAndRetentionStatus
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Sync: TM_Sync };
}
