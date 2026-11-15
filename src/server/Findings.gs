/**
 * Findings.gs — Pengelolaan Temuan (Draft, Edit/Hapus batas 24 jam, Soft Delete & Restore).
 */

var TM_Findings = (function () {
  function resolveCategoryAndSection(categoryId, sectionId, existingFinding, isFinalizedSession) {
    var catId = TM_Utils.sanitizeText(categoryId);
    var catName = '';
    if (catId) {
      if (existingFinding && existingFinding.CategoryID === catId) {
        catName = existingFinding.CategoryNameSnapshot;
      } else {
        var cat = TM_Db.findById('Categories', 'CategoryID', catId);
        if (!cat) throw TM_Utils.AppError('ERR_NOT_FOUND', 'Master Category tidak ditemukan.');
        if (cat.Status !== TM_CONFIG.STATUS.ACTIVE) {
          throw TM_Utils.AppError('ERR_INACTIVE_MASTER', 'Master Category "' + cat.CategoryName + '" sedang nonaktif.');
        }
        catName = cat.CategoryName;
      }
    } else if (isFinalizedSession) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Master Category wajib dipilih.');
    }

    var secId = TM_Utils.sanitizeText(sectionId);
    var secName = '';
    if (secId) {
      if (existingFinding && existingFinding.SectionID === secId) {
        secName = existingFinding.SectionNameSnapshot;
      } else {
        var sec = TM_Db.findById('Sections', 'SectionID', secId);
        if (!sec) throw TM_Utils.AppError('ERR_NOT_FOUND', 'Master Section tidak ditemukan.');
        if (sec.Status !== TM_CONFIG.STATUS.ACTIVE) {
          throw TM_Utils.AppError('ERR_INACTIVE_MASTER', 'Master Section "' + sec.SectionName + '" sedang nonaktif.');
        }
        secName = sec.SectionName;
      }
    } else if (isFinalizedSession) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Master Section wajib dipilih.');
    }

    return {
      categoryId: catId,
      categoryName: catName,
      sectionId: secId,
      sectionName: secName
    };
  }

  function assertWithin24HoursIfTrainer(ctx, session) {
    if (ctx.user.Role === TM_CONFIG.ROLES.SUPER_ADMIN) return;
    if (ctx.user.Role !== TM_CONFIG.ROLES.TRAINER) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak memiliki izin mengubah atau menghapus temuan.');
    }
    if (session.TrainerID !== ctx.user.UserID) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Trainer tidak dapat mengubah atau menghapus temuan milik Trainer lain.');
    }
    var submittedMs = new Date(session.SubmittedAt).getTime();
    var windowMs = TM_CONFIG.DEFAULTS.FINDING_EDIT_WINDOW_HOURS * 3600000;
    if (isNaN(submittedMs) || (TM_Utils.now().getTime() - submittedMs) > windowMs) {
      throw TM_Utils.AppError('ERR_EDIT_WINDOW_EXPIRED', 'Batas waktu 24 jam sejak finalisasi telah lewat. Hubungi Super Admin untuk perubahan.');
    }
  }

  function saveFindingDraft(token, sessionId, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var p = dto || {};
    var findingId = TM_Utils.sanitizeText(p.findingId);
    var masalah = TM_Utils.sanitizeText(p.masalah);
    var mengapa = TM_Utils.sanitizeText(p.mengapa);
    var solusi = TM_Utils.sanitizeText(p.solusi);

    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session || session.DeletedAt || session.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
        throw TM_Utils.AppError('ERR_DRAFT_DELETED_BY_ADMIN', 'Draft tidak ditemukan atau telah dihapus.');
      }
      if (session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda hanya dapat mengubah temuan pada Draft milik Anda.');
      }
      if (session.Status !== TM_CONFIG.SESSION_STATUS.DRAFT) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi sudah selesai; gunakan fungsi edit temuan resmi.');
      }

      var existing = findingId ? TM_Db.findById('Findings', 'FindingID', findingId) : null;
      if (existing && existing.SessionID !== sessionId) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Temuan tidak sesuai dengan sesi ini.');
      }
      if (existing && existing.DeletedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Temuan telah dihapus.');
      }

      var resolved = resolveCategoryAndSection(p.categoryId, p.sectionId, existing, false);
      var ts = TM_Utils.formatWibIso();

      if (existing) {
        var nextVersion = String(parseInt(existing.Version || '1', 10) + 1);
        var updated = TM_Db.updateRecordById('Findings', 'FindingID', existing.FindingID, function (rec) {
          rec.CategoryID = resolved.categoryId;
          rec.CategoryNameSnapshot = resolved.categoryName;
          rec.SectionID = resolved.sectionId;
          rec.SectionNameSnapshot = resolved.sectionName;
          rec.Masalah = masalah;
          rec.Mengapa = mengapa;
          rec.Solusi = solusi;
          rec.Version = nextVersion;
          rec.UpdatedAt = ts;
          rec.UpdatedBy = ctx.user.UserID;
          return rec;
        });

        TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
          rec.UpdatedAt = ts;
          return rec;
        });

        return updated;
      }

      var newFinding = {
        FindingID: findingId || TM_Utils.generateId('FND'),
        SessionID: sessionId,
        CategoryID: resolved.categoryId,
        CategoryNameSnapshot: resolved.categoryName,
        SectionID: resolved.sectionId,
        SectionNameSnapshot: resolved.sectionName,
        Masalah: masalah,
        Mengapa: mengapa,
        Solusi: solusi,
        Version: '1',
        CreatedAt: ts,
        CreatedBy: ctx.user.UserID,
        UpdatedAt: ts,
        UpdatedBy: ctx.user.UserID,
        DeletedAt: '',
        DeletedBy: '',
        DeleteReason: '',
        DeletionSource: ''
      };

      TM_Db.insertRecord('Findings', newFinding);
      TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
        rec.UpdatedAt = ts;
        return rec;
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'FINDING_DRAFT_ADDED',
        entityType: 'Findings',
        entityId: newFinding.FindingID,
        afterData: { sessionId: sessionId, category: resolved.categoryName, section: resolved.sectionName },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Menambahkan temuan ke Draft ' + sessionId
      });

      return newFinding;
    });
  }

  function deleteFindingInDraft(token, findingId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    return TM_Db.withLock(function () {
      var finding = TM_Db.findById('Findings', 'FindingID', findingId);
      if (!finding || finding.DeletedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Temuan tidak ditemukan.');
      }
      var session = TM_Db.findById('Sessions', 'SessionID', finding.SessionID);
      if (!session || session.DeletedAt || session.Status !== TM_CONFIG.SESSION_STATUS.DRAFT) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Temuan hanya bisa dihapus dari Draft aktif.');
      }
      if (session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak berhak menghapus temuan pada Draft Trainer lain.');
      }

      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Findings', 'FindingID', findingId, function (rec) {
        rec.DeletedAt = ts;
        rec.DeletedBy = ctx.user.UserID;
        rec.DeleteReason = 'Dihapus dari Draft oleh Trainer';
        rec.DeletionSource = 'INDIVIDUAL';
        return rec;
      });
      TM_Photos.archivePhotosForFinding(findingId, ctx.user.UserID);
      TM_Db.updateRecordById('Sessions', 'SessionID', session.SessionID, function (rec) {
        rec.UpdatedAt = ts;
        return rec;
      });

      return updated;
    });
  }

  function updateFinding(token, findingId, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN, TM_CONFIG.ROLES.TRAINER]);
    var p = dto || {};
    var masalah = TM_Utils.sanitizeText(p.masalah);
    var mengapa = TM_Utils.sanitizeText(p.mengapa);
    var solusi = TM_Utils.sanitizeText(p.solusi);

    if (!masalah || !mengapa) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Field Masalah dan Mengapa wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var finding = TM_Db.findById('Findings', 'FindingID', findingId);
      if (!finding || finding.DeletedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Temuan tidak ditemukan atau sudah dihapus.');
      }
      var session = TM_Db.findById('Sessions', 'SessionID', finding.SessionID);
      if (!session || session.DeletedAt || session.Status !== TM_CONFIG.SESSION_STATUS.SELESAI) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Hanya temuan pada sesi Selesai aktif yang dapat diedit melalui menu ini.');
      }

      assertWithin24HoursIfTrainer(ctx, session);

      var resolved = resolveCategoryAndSection(p.categoryId, p.sectionId, finding, true);
      var before = Object.assign({}, finding);
      var ts = TM_Utils.formatWibIso();
      var nextVersion = String(parseInt(finding.Version || '1', 10) + 1);

      var updated = TM_Db.updateRecordById('Findings', 'FindingID', findingId, function (rec) {
        rec.CategoryID = resolved.categoryId;
        rec.CategoryNameSnapshot = resolved.categoryName;
        rec.SectionID = resolved.sectionId;
        rec.SectionNameSnapshot = resolved.sectionName;
        rec.Masalah = masalah;
        rec.Mengapa = mengapa;
        rec.Solusi = solusi;
        rec.Version = nextVersion;
        // PRD 9.1: CreatedAt tidak berubah; menyimpan updated_at & updated_by
        rec.UpdatedAt = ts;
        rec.UpdatedBy = ctx.user.UserID;
        return rec;
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'FINDING_UPDATED',
        entityType: 'Findings',
        entityId: findingId,
        beforeData: before,
        afterData: updated,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Mengubah temuan ' + findingId + ' pada sesi ' + session.ReportNumber
      });

      return updated;
    });
  }

  function deleteFinding(token, findingId, reason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN, TM_CONFIG.ROLES.TRAINER]);
    var delReason = TM_Utils.sanitizeText(reason);
    if (!delReason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan penghapusan temuan wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var finding = TM_Db.findById('Findings', 'FindingID', findingId);
      if (!finding || finding.DeletedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Temuan tidak ditemukan atau sudah dihapus.');
      }
      var session = TM_Db.findById('Sessions', 'SessionID', finding.SessionID);
      if (!session || session.DeletedAt || session.Status !== TM_CONFIG.SESSION_STATUS.SELESAI) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi pemeriksaan tidak aktif atau belum selesai.');
      }

      assertWithin24HoursIfTrainer(ctx, session);

      var before = Object.assign({}, finding);
      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Findings', 'FindingID', findingId, function (rec) {
        rec.DeletedAt = ts;
        rec.DeletedBy = ctx.user.UserID;
        rec.DeleteReason = delReason;
        rec.DeletionSource = 'INDIVIDUAL';
        rec.UpdatedAt = ts;
        rec.UpdatedBy = ctx.user.UserID;
        return rec;
      });

      TM_Photos.archivePhotosForFinding(findingId, ctx.user.UserID);

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'FINDING_DELETED',
        entityType: 'Findings',
        entityId: findingId,
        beforeData: before,
        afterData: { deletedAt: ts, reason: delReason, deletionSource: 'INDIVIDUAL' },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Menghapus temuan ' + findingId + ': ' + delReason
      });

      return updated;
    });
  }

  function restoreFinding(token, findingId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    return TM_Db.withLock(function () {
      var finding = TM_Db.findById('Findings', 'FindingID', findingId);
      if (!finding) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Temuan tidak ditemukan.');
      }
      if (!finding.DeletedAt) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Temuan tidak dalam status terhapus.');
      }
      var session = TM_Db.findById('Sessions', 'SessionID', finding.SessionID);
      if (!session || session.DeletedAt) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi induk masih berstatus terhapus. Pulihkan sesi terlebih dahulu.');
      }

      var before = Object.assign({}, finding);
      var ts = TM_Utils.formatWibIso();
      var restored = TM_Db.updateRecordById('Findings', 'FindingID', findingId, function (rec) {
        rec.DeletedAt = '';
        rec.DeletedBy = '';
        rec.DeleteReason = '';
        rec.DeletionSource = '';
        rec.UpdatedAt = ts;
        rec.UpdatedBy = ctx.user.UserID;
        return rec;
      });

      TM_Photos.restorePhotosForFinding(findingId);

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'FINDING_RESTORED',
        entityType: 'Findings',
        entityId: findingId,
        beforeData: before,
        afterData: restored,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Super Admin memulihkan temuan ' + findingId
      });

      return restored;
    });
  }

  return {
    saveFindingDraft: saveFindingDraft,
    deleteFindingInDraft: deleteFindingInDraft,
    updateFinding: updateFinding,
    deleteFinding: deleteFinding,
    restoreFinding: restoreFinding
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Findings: TM_Findings };
}
