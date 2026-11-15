/**
 * Photos.gs — Penyimpanan foto privat di Google Drive, antrean idempotent, & kontrol akses baca/unduh.
 */

var TM_Photos = (function () {
  var ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png'];

  function setPrivateFileSharing(file) {
    try {
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    } catch (e) {
      // ignore on personal Drive if already private
    }
  }

  function moveFileToFolder(driveFileId, targetFolderId) {
    if (!driveFileId || !targetFolderId) return;
    try {
      var file = DriveApp.getFileById(driveFileId);
      var targetFolder = DriveApp.getFolderById(targetFolderId);
      if (typeof file.moveTo === 'function') {
        file.moveTo(targetFolder);
      } else {
        targetFolder.addFile(file);
      }
    } catch (e) {
      // ignore if file already moved or missing in mock
    }
  }

  function assertCanModifyFindingPhotos(ctx, session, finding) {
    if (!session) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi pemeriksaan tidak ditemukan.');
    }
    if (session.DeletedAt || session.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
      throw TM_Utils.AppError('ERR_DRAFT_DELETED_BY_ADMIN', 'Sesi/Draft telah dihapus.', {
        sessionId: session.SessionID,
        deletedAt: session.DeletedAt,
        deletedBy: session.DeletedBy,
        deleteReason: session.DeleteReason
      });
    }
    if (!finding || finding.DeletedAt) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Temuan tidak ditemukan atau sudah dihapus.');
    }

    if (session.Status === TM_CONFIG.SESSION_STATUS.DRAFT) {
      if (ctx.user.Role !== TM_CONFIG.ROLES.TRAINER || session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Hanya Trainer pembuat Draft yang dapat mengunggah atau menghapus foto Draft ini.');
      }
      return;
    }

    if (session.Status === TM_CONFIG.SESSION_STATUS.SELESAI) {
      if (ctx.user.Role === TM_CONFIG.ROLES.SUPER_ADMIN) return;
      if (ctx.user.Role === TM_CONFIG.ROLES.TRAINER) {
        if (session.TrainerID !== ctx.user.UserID) {
          throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak dapat mengubah foto temuan milik Trainer lain.');
        }
        var submittedMs = new Date(session.SubmittedAt).getTime();
        var windowMs = TM_CONFIG.DEFAULTS.FINDING_EDIT_WINDOW_HOURS * 3600000;
        if (isNaN(submittedMs) || (TM_Utils.now().getTime() - submittedMs) > windowMs) {
          throw TM_Utils.AppError('ERR_EDIT_WINDOW_EXPIRED', 'Batas waktu edit 24 jam setelah finalisasi telah berakhir.');
        }
        return;
      }
    }

    throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak memiliki izin mengubah foto ini.');
  }

  function uploadPhoto(token, payload) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN, TM_CONFIG.ROLES.TRAINER]);
    var p = payload || {};
    var sessionId = TM_Utils.sanitizeText(p.sessionId);
    var findingId = TM_Utils.sanitizeText(p.findingId);
    var idempotencyKey = TM_Utils.sanitizeText(p.idempotencyKey) || TM_Utils.generateId('IDEMP');
    var fileName = TM_Utils.sanitizeText(p.fileName) || ('finding-' + Date.now() + '.jpg');
    var mimeType = TM_Utils.sanitizeText(p.mimeType).toLowerCase();
    var comment = TM_Utils.sanitizeText(p.comment);
    var rawBase64 = String(p.base64Data || '');

    if (!sessionId || !findingId) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'SessionID dan FindingID wajib diisi.');
    }
    if (ALLOWED_MIMES.indexOf(mimeType) === -1) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Format foto harus JPG, JPEG, atau PNG.');
    }
    if (!rawBase64) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Data foto tidak boleh kosong.');
    }

    var cleanB64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
    var bytes = Utilities.base64Decode(cleanB64);
    if (!bytes || bytes.length === 0) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'File foto tidak valid.');
    }
    if (bytes.length > TM_CONFIG.DEFAULTS.MAX_PHOTO_COMPRESSED_BYTES) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Ukuran foto hasil kompresi melebihi batas maksimal 1 MB.');
    }

    return TM_Db.withLock(function () {
      // Cek idempotency agar retry tidak membuat duplikasi
      var existingByKey = TM_Db.findRecord('Photos', function (ph) {
        return ph.IdempotencyKey === idempotencyKey && ph.Status === 'Berhasil' && !ph.DeletedAt;
      });
      if (existingByKey) {
        return existingByKey;
      }

      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      var finding = TM_Db.findById('Findings', 'FindingID', findingId);
      if (finding && finding.SessionID !== sessionId) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Temuan tidak termasuk dalam sesi ini.');
      }
      assertCanModifyFindingPhotos(ctx, session, finding);

      var activePhotos = TM_Db.filterRecords('Photos', function (ph) {
        return ph.FindingID === findingId && !ph.DeletedAt && ph.Status === 'Berhasil';
      });
      if (activePhotos.length >= TM_CONFIG.DEFAULTS.MAX_PHOTOS_PER_FINDING) {
        throw TM_Utils.AppError('ERR_PHOTO_LIMIT', 'Maksimal ' + TM_CONFIG.DEFAULTS.MAX_PHOTOS_PER_FINDING + ' foto per temuan.');
      }

      var activeFolderId = TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ACTIVE_ID);
      if (!activeFolderId) {
        throw TM_Utils.AppError('ERR_CONFIG', 'Folder Drive ActivePhotos belum terkonfigurasi.');
      }

      var normMime = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
      var blob = Utilities.newBlob(bytes, normMime, fileName);
      var folder = DriveApp.getFolderById(activeFolderId);
      var driveFile = folder.createFile(blob);
      setPrivateFileSharing(driveFile);

      var ts = TM_Utils.formatWibIso();
      var photoRec = {
        PhotoID: TM_Utils.generateId('PHT'),
        FindingID: findingId,
        SessionID: sessionId,
        DriveFileID: driveFile.getId(),
        FileName: fileName,
        MimeType: normMime,
        FileSize: String(bytes.length),
        PhotoComment: comment,
        Status: 'Berhasil',
        IdempotencyKey: idempotencyKey,
        UploadedAt: ts,
        UploadedBy: ctx.user.UserID,
        DeletedAt: '',
        DeletedBy: '',
        PurgeReason: '',
        PurgedAt: ''
      };

      TM_Db.insertRecord('Photos', photoRec);

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'PHOTO_UPLOADED',
        entityType: 'Photos',
        entityId: photoRec.PhotoID,
        afterData: { findingId: findingId, sessionId: sessionId, fileName: fileName, fileSize: bytes.length },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Mengunggah foto bukti untuk temuan ' + findingId
      });

      return photoRec;
    });
  }

  function updatePhotoComment(token, photoId, comment) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN, TM_CONFIG.ROLES.TRAINER]);
    var photo = TM_Db.findById('Photos', 'PhotoID', photoId);
    if (!photo || photo.DeletedAt) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Foto tidak ditemukan.');
    }
    var session = TM_Db.findById('Sessions', 'SessionID', photo.SessionID);
    var finding = TM_Db.findById('Findings', 'FindingID', photo.FindingID);
    assertCanModifyFindingPhotos(ctx, session, finding);

    var cleanComment = TM_Utils.sanitizeText(comment);
    var updated = TM_Db.updateRecordById('Photos', 'PhotoID', photoId, function (rec) {
      rec.PhotoComment = cleanComment;
      return rec;
    });

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'PHOTO_COMMENT_UPDATED',
      entityType: 'Photos',
      entityId: photoId,
      beforeData: { comment: photo.PhotoComment },
      afterData: { comment: cleanComment },
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Memperbarui komentar foto ' + photoId
    });

    return updated;
  }

  function deletePhoto(token, photoId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN, TM_CONFIG.ROLES.TRAINER]);
    return TM_Db.withLock(function () {
      var photo = TM_Db.findById('Photos', 'PhotoID', photoId);
      if (!photo || photo.DeletedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Foto tidak ditemukan.');
      }
      var session = TM_Db.findById('Sessions', 'SessionID', photo.SessionID);
      var finding = TM_Db.findById('Findings', 'FindingID', photo.FindingID);
      assertCanModifyFindingPhotos(ctx, session, finding);

      // Jika sesi sudah Selesai, pastikan minimal masih ada 1 foto tersisa setelah hapus
      if (session.Status === TM_CONFIG.SESSION_STATUS.SELESAI) {
        var remaining = TM_Db.filterRecords('Photos', function (ph) {
          return ph.FindingID === photo.FindingID && !ph.DeletedAt && ph.Status === 'Berhasil' && ph.PhotoID !== photoId;
        });
        if (remaining.length === 0) {
          throw TM_Utils.AppError('ERR_VALIDATION', 'Temuan aktif pada sesi Selesai wajib memiliki minimal 1 foto.');
        }
      }

      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Photos', 'PhotoID', photoId, function (rec) {
        rec.DeletedAt = ts;
        rec.DeletedBy = ctx.user.UserID;
        return rec;
      });

      var archiveFolderId = TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ARCHIVE_ID);
      moveFileToFolder(photo.DriveFileID, archiveFolderId);

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'PHOTO_ARCHIVED',
        entityType: 'Photos',
        entityId: photoId,
        afterData: { findingId: photo.FindingID, sessionId: photo.SessionID },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Memindahkan foto ke arsip: ' + photo.FileName
      });

      return updated;
    });
  }

  function archivePhotosForFinding(findingId, actorUserId) {
    var ts = TM_Utils.formatWibIso();
    var archiveFolderId = TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ARCHIVE_ID);
    var photos = TM_Db.filterRecords('Photos', function (ph) {
      return ph.FindingID === findingId && !ph.DeletedAt;
    });
    for (var i = 0; i < photos.length; i++) {
      TM_Db.updateRecordById('Photos', 'PhotoID', photos[i].PhotoID, function (rec) {
        rec.DeletedAt = ts;
        rec.DeletedBy = actorUserId;
        return rec;
      });
      moveFileToFolder(photos[i].DriveFileID, archiveFolderId);
    }
  }

  function restorePhotosForFinding(findingId) {
    var activeFolderId = TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ACTIVE_ID);
    var photos = TM_Db.filterRecords('Photos', function (ph) {
      return ph.FindingID === findingId && ph.DeletedAt && !ph.PurgedAt;
    });
    for (var i = 0; i < photos.length; i++) {
      TM_Db.updateRecordById('Photos', 'PhotoID', photos[i].PhotoID, function (rec) {
        rec.DeletedAt = '';
        rec.DeletedBy = '';
        return rec;
      });
      moveFileToFolder(photos[i].DriveFileID, activeFolderId);
    }
  }

  function assertCanReadPhoto(ctx, photo, session, finding) {
    if (ctx.user.Role === TM_CONFIG.ROLES.SUPER_ADMIN) {
      return;
    }
    if (!session || session.DeletedAt || session.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Foto tidak dapat diakses karena sesi telah dihapus.');
    }
    if (!finding || finding.DeletedAt || photo.DeletedAt) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Foto tidak tersedia.');
    }
    if (session.Status === TM_CONFIG.SESSION_STATUS.DRAFT) {
      if (ctx.user.Role === TM_CONFIG.ROLES.TRAINER && session.TrainerID === ctx.user.UserID) {
        return;
      }
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Draft milik Trainer lain bersifat privat.');
    }
    if (session.Status === TM_CONFIG.SESSION_STATUS.SELESAI) {
      // Baik TRAINER maupun MANAJEMEN berhak melihat/mengunduh foto sesi Selesai
      return;
    }
    throw TM_Utils.AppError('ERR_FORBIDDEN', 'Akses foto ditolak.');
  }

  function getPhotoData(token, photoId, isDownload) {
    var ctx = TM_Auth.requireAuth(token);
    var photo = TM_Db.findById('Photos', 'PhotoID', photoId);
    if (!photo || photo.PurgedAt) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Foto tidak ditemukan.');
    }
    var session = TM_Db.findById('Sessions', 'SessionID', photo.SessionID);
    var finding = TM_Db.findById('Findings', 'FindingID', photo.FindingID);
    assertCanReadPhoto(ctx, photo, session, finding);

    var file = DriveApp.getFileById(photo.DriveFileID);
    var blob = file.getBlob();
    var mime = photo.MimeType || blob.getContentType() || 'image/jpeg';
    var dataUrl = 'data:' + mime + ';base64,' + Utilities.base64Encode(blob.getBytes());

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: isDownload ? 'PHOTO_DOWNLOADED' : 'PHOTO_VIEWED',
      entityType: 'Photos',
      entityId: photoId,
      afterData: { sessionId: photo.SessionID, findingId: photo.FindingID, fileName: photo.FileName },
      deviceInfo: ctx.session.DeviceInfo,
      description: (isDownload ? 'Mengunduh' : 'Membuka') + ' foto privat ' + photo.FileName
    });

    return {
      PhotoID: photo.PhotoID,
      FindingID: photo.FindingID,
      SessionID: photo.SessionID,
      FileName: photo.FileName,
      MimeType: mime,
      PhotoComment: photo.PhotoComment,
      dataUrl: dataUrl
    };
  }

  return {
    uploadPhoto: uploadPhoto,
    updatePhotoComment: updatePhotoComment,
    deletePhoto: deletePhoto,
    archivePhotosForFinding: archivePhotosForFinding,
    restorePhotosForFinding: restorePhotosForFinding,
    getPhotoData: getPhotoData
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Photos: TM_Photos };
}
