/**
 * Sessions.gs — Pengelolaan Sesi Pemeriksaan, Draft, Penomoran TM-YYYYMMDD-OUT001-001, Finalisasi, & Soft Delete/Restore.
 */

var TM_Sessions = (function () {
  function getTodayWibDateStr() {
    return TM_Utils.formatWibIso(TM_Utils.now()).slice(0, 10);
  }

  function validateInspectionDate(dateStr, required) {
    if (dateStr === null || dateStr === undefined || String(dateStr).trim() === '') {
      if (required) throw TM_Utils.AppError('ERR_VALIDATION', 'Tanggal pemeriksaan wajib diisi.');
      return getTodayWibDateStr();
    }
    var clean = TM_Utils.normalizeDateStr(dateStr);
    if (!clean) {
      throw TM_Utils.AppError(
        'ERR_VALIDATION',
        'Format tanggal pemeriksaan tidak valid (gunakan DD/MM/YYYY seperti 06/11/2026, 6 Nov 2026, atau YYYY-MM-DD).'
      );
    }
    var today = getTodayWibDateStr();
    if (clean > today) {
      throw TM_Utils.AppError('ERR_FUTURE_DATE', 'Tanggal pemeriksaan tidak boleh di masa depan (' + clean + ' > ' + today + ').');
    }
    return clean;
  }

  function getMaxDraftsLimit() {
    var row = TM_Db.findById('AppSettings', 'SettingKey', 'MAX_ACTIVE_DRAFTS');
    var parsed = row ? parseInt(row.SettingValue, 10) : TM_CONFIG.DEFAULTS.MAX_ACTIVE_DRAFTS;
    return isNaN(parsed) || parsed < 1 ? TM_CONFIG.DEFAULTS.MAX_ACTIVE_DRAFTS : parsed;
  }

  function lookupMasterActive(sheetName, idField, nameField, idValue, label) {
    if (!idValue) return { id: '', name: '' };
    var rec = TM_Db.findById(sheetName, idField, idValue);
    if (!rec) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', label + ' tidak ditemukan.');
    }
    if (rec.Status !== TM_CONFIG.STATUS.ACTIVE) {
      throw TM_Utils.AppError('ERR_INACTIVE_MASTER', label + ' "' + rec[nameField] + '" sedang nonaktif.');
    }
    return { id: rec[idField], name: rec[nameField] };
  }

  function generateReportNumber(inspectionDate, outletCode) {
    var yyyymmdd = inspectionDate.replace(/-/g, '');
    var prefix = 'TM-' + yyyymmdd + '-' + outletCode + '-';
    var sessions = TM_Db.getAllRecords('Sessions');
    var maxSeq = 0;
    for (var i = 0; i < sessions.length; i++) {
      var rn = String(sessions[i].ReportNumber || '');
      if (rn.indexOf(prefix) === 0) {
        var seqStr = rn.slice(prefix.length);
        var seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
    return prefix + String(maxSeq + 1).padStart(3, '0');
  }

  function saveDraft(token, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var p = dto || {};
    var sessionId = TM_Utils.sanitizeText(p.sessionId);
    var inspectionDate = validateInspectionDate(p.inspectionDate, false);
    var picName = TM_Utils.sanitizeText(p.picName);
    var amId = TM_Utils.sanitizeText(p.amId);
    var mumId = TM_Utils.sanitizeText(p.mumId);
    var outletId = TM_Utils.sanitizeText(p.outletId);
    var outletName = TM_Utils.sanitizeText(p.outletName);

    return TM_Db.withLock(function () {
      var existing = sessionId ? TM_Db.findById('Sessions', 'SessionID', sessionId) : null;
      if (existing) {
        if (existing.DeletedAt || existing.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
          throw TM_Utils.AppError('ERR_DRAFT_DELETED_BY_ADMIN', 'Draft ini telah dihapus dan tidak dapat diubah.', {
            sessionId: existing.SessionID,
            deletedAt: existing.DeletedAt,
            deletedBy: existing.DeletedBy,
            deleteReason: existing.DeleteReason
          });
        }
        if (existing.TrainerID !== ctx.user.UserID) {
          throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak dapat mengubah Draft milik Trainer lain.');
        }
        if (existing.Status !== TM_CONFIG.SESSION_STATUS.DRAFT) {
          throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi yang sudah selesai tidak dapat disimpan sebagai Draft.');
        }
      } else {
        // Cek batas maksimum Draft aktif per Trainer (PRD 7.3)
        var maxDrafts = getMaxDraftsLimit();
        var trainerDrafts = TM_Db.filterRecords('Sessions', function (s) {
          return s.TrainerID === ctx.user.UserID && s.Status === TM_CONFIG.SESSION_STATUS.DRAFT && !s.DeletedAt;
        });
        if (trainerDrafts.length >= maxDrafts) {
          throw TM_Utils.AppError(
            'ERR_DRAFT_LIMIT_REACHED',
            'Batas maksimum ' + maxDrafts + ' Draft aktif telah tercapai. Selesaikan atau hapus Draft lama terlebih dahulu.'
          );
        }
      }

      // Resolve AM & MUM jika diisi (boleh kosong saat Draft)
      var amInfo = { id: '', name: '' };
      if (amId) {
        if (existing && existing.AM_ID === amId) {
          amInfo = { id: existing.AM_ID, name: existing.AM_Name_Snapshot };
        } else {
          amInfo = lookupMasterActive('Master_AM', 'AM_ID', 'AM_Name', amId, 'AM');
        }
      }

      var mumInfo = { id: '', name: '' };
      if (mumId) {
        if (existing && existing.MUM_ID === mumId) {
          mumInfo = { id: existing.MUM_ID, name: existing.MUM_Name_Snapshot };
        } else {
          mumInfo = lookupMasterActive('Master_MUM', 'MUM_ID', 'MUM_Name', mumId, 'MUM');
        }
      }

      // Resolve Outlet jika diisi (boleh kosong saat Draft)
      var resolvedOutletId = '';
      var resolvedOutletName = '';
      if (outletId) {
        var oRec = TM_Db.findById('Outlets', 'OutletID', outletId);
        if (!oRec) throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet tidak ditemukan.');
        resolvedOutletId = oRec.OutletID;
        resolvedOutletName = oRec.CanonicalName;
      } else if (outletName) {
        var resOutlet = TM_Outlets.resolveOrCreateOutletUnlocked(ctx, outletName);
        resolvedOutletId = resOutlet.outlet.OutletID;
        resolvedOutletName = resOutlet.outlet.CanonicalName;
      }

      var ts = TM_Utils.formatWibIso();
      if (existing) {
        var nextVersion = String(parseInt(existing.Version || '1', 10) + 1);
        var updated = TM_Db.updateRecordById('Sessions', 'SessionID', existing.SessionID, function (rec) {
          rec.InspectionDate = inspectionDate;
          rec.OutletID = resolvedOutletId;
          rec.OutletNameSnapshot = resolvedOutletName;
          rec.AM_ID = amInfo.id;
          rec.AM_Name_Snapshot = amInfo.name;
          rec.MUM_ID = mumInfo.id;
          rec.MUM_Name_Snapshot = mumInfo.name;
          rec.PIC_Name = picName;
          rec.Version = nextVersion;
          rec.UpdatedAt = ts;
          return rec;
        });

        TM_Audit.logEvent({
          userId: ctx.user.UserID,
          action: 'DRAFT_UPDATED',
          entityType: 'Sessions',
          entityId: updated.SessionID,
          afterData: { version: nextVersion, outlet: resolvedOutletName },
          deviceInfo: ctx.session.DeviceInfo,
          description: 'Memperbarui Draft pemeriksaan ' + updated.SessionID
        });
        return updated;
      }

      var newId = sessionId || TM_Utils.generateId('SES');
      var newSession = {
        SessionID: newId,
        ReportNumber: '',
        InspectionDate: inspectionDate,
        OutletID: resolvedOutletId,
        OutletNameSnapshot: resolvedOutletName,
        AM_ID: amInfo.id,
        AM_Name_Snapshot: amInfo.name,
        MUM_ID: mumInfo.id,
        MUM_Name_Snapshot: mumInfo.name,
        PIC_Name: picName,
        TrainerID: ctx.user.UserID,
        Status: TM_CONFIG.SESSION_STATUS.DRAFT,
        Version: '1',
        IsRestoredFlagUntil: '',
        CreatedAt: ts,
        SubmittedAt: '',
        UpdatedAt: ts,
        DeletedAt: '',
        DeletedBy: '',
        DeleteReason: ''
      };

      TM_Db.insertRecord('Sessions', newSession);

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'DRAFT_CREATED',
        entityType: 'Sessions',
        entityId: newSession.SessionID,
        afterData: newSession,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Membuat Draft pemeriksaan baru'
      });

      return newSession;
    });
  }

  function listMyDrafts(token) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var maxDrafts = getMaxDraftsLimit();
    var allSessions = TM_Db.getAllRecords('Sessions');
    var allFindings = TM_Db.getAllRecords('Findings');

    var findingCountBySession = {};
    for (var i = 0; i < allFindings.length; i++) {
      var f = allFindings[i];
      if (!f.DeletedAt) {
        findingCountBySession[f.SessionID] = (findingCountBySession[f.SessionID] || 0) + 1;
      }
    }

    var drafts = allSessions.filter(function (s) {
      return s.TrainerID === ctx.user.UserID && s.Status === TM_CONFIG.SESSION_STATUS.DRAFT && !s.DeletedAt;
    }).map(function (s) {
      return Object.assign({}, s, {
        FindingCount: findingCountBySession[s.SessionID] || 0
      });
    });

    drafts.sort(function (a, b) {
      return String(b.UpdatedAt).localeCompare(String(a.UpdatedAt));
    });

    return {
      drafts: drafts,
      activeCount: drafts.length,
      maxActiveDrafts: maxDrafts
    };
  }

  function deleteMyDraft(token, sessionId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session || session.DeletedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Draft tidak ditemukan.');
      }
      if (session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda hanya dapat menghapus Draft milik Anda sendiri.');
      }
      if (session.Status !== TM_CONFIG.SESSION_STATUS.DRAFT) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Trainer tidak dapat menghapus sesi yang sudah selesai.');
      }

      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
        rec.Status = TM_CONFIG.SESSION_STATUS.DELETED;
        rec.DeletedAt = ts;
        rec.DeletedBy = ctx.user.UserID;
        rec.DeleteReason = 'Dihapus oleh Trainer pembuat';
        rec.UpdatedAt = ts;
        return rec;
      });

      var findings = TM_Db.filterRecords('Findings', function (f) {
        return f.SessionID === sessionId && !f.DeletedAt;
      });
      for (var i = 0; i < findings.length; i++) {
        TM_Db.updateRecordById('Findings', 'FindingID', findings[i].FindingID, function (rec) {
          rec.DeletedAt = ts;
          rec.DeletedBy = ctx.user.UserID;
          rec.DeleteReason = 'Draft dihapus oleh Trainer';
          rec.DeletionSource = 'SESSION';
          return rec;
        });
        TM_Photos.archivePhotosForFinding(findings[i].FindingID, ctx.user.UserID);
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'TRAINER_DRAFT_DELETED',
        entityType: 'Sessions',
        entityId: sessionId,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Trainer menghapus Draft miliknya: ' + (session.OutletNameSnapshot || sessionId)
      });

      return updated;
    });
  }

  function finalizeSession(token, sessionId, confirmNoFindings) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);

    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session || session.DeletedAt || session.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Draft pemeriksaan tidak ditemukan atau sudah dihapus.');
      }
      if (session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Hanya Trainer pembuat Draft yang dapat memfinalisasi pemeriksaan ini.');
      }
      if (session.Status !== TM_CONFIG.SESSION_STATUS.DRAFT) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi pemeriksaan ini sudah difinalisasi sebelumnya.');
      }

      // Validasi seluruh field sesi wajib (PRD 4 & 7.4)
      var inspectionDate = validateInspectionDate(session.InspectionDate, true);
      if (!session.OutletID || !session.OutletNameSnapshot) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet wajib diisi sebelum finalisasi.');
      }
      if (!session.AM_ID || !session.AM_Name_Snapshot) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'AM wajib dipilih sebelum finalisasi.');
      }
      if (!session.MUM_ID || !session.MUM_Name_Snapshot) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'MUM wajib dipilih sebelum finalisasi.');
      }
      if (!TM_Utils.sanitizeText(session.PIC_Name)) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Nama PIC wajib diisi sebelum finalisasi.');
      }

      var outlet = TM_Db.findById('Outlets', 'OutletID', session.OutletID);
      if (!outlet) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Data Outlet tidak ditemukan.');
      }

      var activeFindings = TM_Db.filterRecords('Findings', function (f) {
        return f.SessionID === sessionId && !f.DeletedAt;
      });

      if (activeFindings.length === 0) {
        if (confirmNoFindings !== true) {
          throw TM_Utils.AppError(
            'ERR_CONFIRM_EMPTY_SESSION',
            'Sesi pemeriksaan ini tidak memiliki temuan. Apakah Anda yakin ingin menyelesaikan pemeriksaan tanpa temuan?'
          );
        }
      } else {
        var allPhotos = TM_Db.filterRecords('Photos', function (ph) {
          return ph.SessionID === sessionId && !ph.DeletedAt;
        });

        for (var i = 0; i < activeFindings.length; i++) {
          var f = activeFindings[i];
          if (!f.CategoryID || !f.SectionID || !TM_Utils.sanitizeText(f.Masalah) || !TM_Utils.sanitizeText(f.Mengapa)) {
            throw TM_Utils.AppError('ERR_VALIDATION', 'Setiap temuan aktif wajib memiliki Category, Section, Masalah, dan Mengapa.');
          }
          var uploadedPhotos = allPhotos.filter(function (ph) {
            return ph.FindingID === f.FindingID && ph.Status === 'Berhasil';
          });
          if (uploadedPhotos.length === 0) {
            throw TM_Utils.AppError('ERR_PHOTO_REQUIRED', 'Setiap temuan aktif wajib memiliki minimal 1 foto bukti yang berhasil diunggah.');
          }
        }
      }

      var reportNumber = generateReportNumber(inspectionDate, outlet.OutletCode);
      var ts = TM_Utils.formatWibIso();
      var nextVersion = String(parseInt(session.Version || '1', 10) + 1);

      var finalized = TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
        rec.ReportNumber = reportNumber;
        rec.Status = TM_CONFIG.SESSION_STATUS.SELESAI;
        rec.Version = nextVersion;
        rec.SubmittedAt = ts;
        rec.UpdatedAt = ts;
        return rec;
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'SESSION_FINALIZED',
        entityType: 'Sessions',
        entityId: sessionId,
        beforeData: { status: session.Status },
        afterData: {
          status: finalized.Status,
          reportNumber: reportNumber,
          findingCount: activeFindings.length
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Memfinalisasi sesi pemeriksaan ' + reportNumber + ' (' + activeFindings.length + ' temuan)'
      });

      return {
        session: finalized,
        findingCount: activeFindings.length
      };
    });
  }

  function getSessionDetail(token, sessionId) {
    var ctx = TM_Auth.requireAuth(token);
    var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
    if (!session) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi pemeriksaan tidak ditemukan.');
    }

    var isAdmin = ctx.user.Role === TM_CONFIG.ROLES.SUPER_ADMIN;
    if (session.DeletedAt && !isAdmin) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi pemeriksaan tidak ditemukan.');
    }
    if (session.Status === TM_CONFIG.SESSION_STATUS.DRAFT) {
      if (!isAdmin && !(ctx.user.Role === TM_CONFIG.ROLES.TRAINER && session.TrainerID === ctx.user.UserID)) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak berhak melihat Draft milik Trainer lain.');
      }
    }

    var users = TM_Db.getAllRecords('Users');
    var trainer = users.find(function (u) { return u.UserID === session.TrainerID; });

    var findings = TM_Db.filterRecords('Findings', function (f) {
      if (f.SessionID !== sessionId) return false;
      return isAdmin ? true : !f.DeletedAt;
    });

    var photos = TM_Db.filterRecords('Photos', function (ph) {
      if (ph.SessionID !== sessionId) return false;
      return isAdmin ? !ph.PurgedAt : !ph.DeletedAt;
    });

    var photosByFinding = {};
    for (var i = 0; i < photos.length; i++) {
      var fid = photos[i].FindingID;
      if (!photosByFinding[fid]) photosByFinding[fid] = [];
      photosByFinding[fid].push(photos[i]);
    }

    var enrichedFindings = findings.map(function (f) {
      return Object.assign({}, f, {
        Photos: photosByFinding[f.FindingID] || []
      });
    });

    return {
      session: Object.assign({}, session, {
        TrainerName: trainer ? trainer.Name : session.TrainerID
      }),
      findings: enrichedFindings,
      readOnly: isAdmin && session.Status === TM_CONFIG.SESSION_STATUS.DRAFT
    };
  }

  function listCompletedSessions(token, limit) {
    var ctx = TM_Auth.requireAuth(token);
    var sessions = TM_Db.filterRecords('Sessions', function (s) {
      return s.Status === TM_CONFIG.SESSION_STATUS.SELESAI && !s.DeletedAt;
    });
    var users = TM_Db.getAllRecords('Users');
    var userMap = {};
    for (var i = 0; i < users.length; i++) {
      userMap[users[i].UserID] = users[i].Name;
    }

    var findings = TM_Db.filterRecords('Findings', function (f) { return !f.DeletedAt; });
    var countBySes = {};
    for (var j = 0; j < findings.length; j++) {
      countBySes[findings[j].SessionID] = (countBySes[findings[j].SessionID] || 0) + 1;
    }

    sessions.sort(function (a, b) {
      return String(b.SubmittedAt || b.CreatedAt).localeCompare(String(a.SubmittedAt || a.CreatedAt));
    });

    var max = limit ? parseInt(limit, 10) : 50;
    return sessions.slice(0, max).map(function (s) {
      return Object.assign({}, s, {
        TrainerName: userMap[s.TrainerID] || s.TrainerID,
        FindingCount: countBySes[s.SessionID] || 0,
        IsOwner: s.TrainerID === ctx.user.UserID
      });
    });
  }

  function listDeletedCompletedSessions(token) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var sessions = TM_Db.filterRecords('Sessions', function (s) {
      return Boolean(s.DeletedAt && s.SubmittedAt);
    });
    var users = TM_Db.getAllRecords('Users');
    var userMap = {};
    for (var i = 0; i < users.length; i++) {
      userMap[users[i].UserID] = users[i].Name;
    }
    sessions.sort(function (a, b) {
      return String(b.DeletedAt).localeCompare(String(a.DeletedAt));
    });
    return sessions.map(function (s) {
      return Object.assign({}, s, {
        TrainerName: userMap[s.TrainerID] || s.TrainerID,
        DeletedByName: userMap[s.DeletedBy] || s.DeletedBy
      });
    });
  }

  function deleteSession(token, sessionId, reason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var delReason = TM_Utils.sanitizeText(reason);
    if (!delReason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan penghapusan sesi wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi pemeriksaan tidak ditemukan.');
      }
      if (session.DeletedAt) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi sudah dalam status terhapus.');
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

      // Soft-delete temuan aktif akibat penghapusan sesi, tanpa menimpa temuan INDIVIDUAL yang sudah dihapus sebelumnya
      var findings = TM_Db.filterRecords('Findings', function (f) {
        return f.SessionID === sessionId && !f.DeletedAt;
      });
      for (var i = 0; i < findings.length; i++) {
        TM_Db.updateRecordById('Findings', 'FindingID', findings[i].FindingID, function (rec) {
          rec.DeletedAt = ts;
          rec.DeletedBy = ctx.user.UserID;
          rec.DeleteReason = 'Penghapusan sesi: ' + delReason;
          rec.DeletionSource = 'SESSION';
          return rec;
        });
        TM_Photos.archivePhotosForFinding(findings[i].FindingID, ctx.user.UserID);
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'SESSION_DELETED',
        entityType: 'Sessions',
        entityId: sessionId,
        beforeData: before,
        afterData: { deletedAt: ts, reason: delReason, cascadedFindings: findings.length },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Super Admin menghapus sesi ' + (session.ReportNumber || sessionId) + ': ' + delReason
      });

      return updated;
    });
  }

  function restoreSession(token, sessionId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi pemeriksaan tidak ditemukan.');
      }
      if (!session.DeletedAt) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi ini tidak dalam status terhapus.');
      }

      var restoredStatus = session.SubmittedAt ? TM_CONFIG.SESSION_STATUS.SELESAI : TM_CONFIG.SESSION_STATUS.DRAFT;
      var ts = TM_Utils.formatWibIso();
      var nextVersion = String(parseInt(session.Version || '1', 10) + 1);

      var restored = TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
        rec.Status = restoredStatus;
        rec.Version = nextVersion;
        rec.DeletedAt = '';
        rec.DeletedBy = '';
        rec.DeleteReason = '';
        rec.UpdatedAt = ts;
        return rec;
      });

      // PRD 9.5: Pulihkan hanya temuan dengan DeletionSource === 'SESSION'; temuan INDIVIDUAL tetap terhapus
      var sessionFindings = TM_Db.filterRecords('Findings', function (f) {
        return f.SessionID === sessionId && f.DeletedAt && f.DeletionSource === 'SESSION';
      });
      for (var i = 0; i < sessionFindings.length; i++) {
        TM_Db.updateRecordById('Findings', 'FindingID', sessionFindings[i].FindingID, function (rec) {
          rec.DeletedAt = '';
          rec.DeletedBy = '';
          rec.DeleteReason = '';
          rec.DeletionSource = '';
          return rec;
        });
        TM_Photos.restorePhotosForFinding(sessionFindings[i].FindingID);
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'SESSION_RESTORED',
        entityType: 'Sessions',
        entityId: sessionId,
        afterData: { status: restoredStatus, restoredFindings: sessionFindings.length },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Super Admin memulihkan sesi ' + (session.ReportNumber || sessionId)
      });

      return restored;
    });
  }

  return {
    getTodayWibDateStr: getTodayWibDateStr,
    validateInspectionDate: validateInspectionDate,
    getMaxDraftsLimit: getMaxDraftsLimit,
    saveDraft: saveDraft,
    listMyDrafts: listMyDrafts,
    deleteMyDraft: deleteMyDraft,
    finalizeSession: finalizeSession,
    getSessionDetail: getSessionDetail,
    listCompletedSessions: listCompletedSessions,
    listDeletedCompletedSessions: listDeletedCompletedSessions,
    deleteSession: deleteSession,
    restoreSession: restoreSession
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Sessions: TM_Sessions };
}
