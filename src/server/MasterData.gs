/**
 * MasterData.gs — Pengelolaan Master Category, Master Section, Master AM, & Master MUM.
 * Aturan PRD 5.4: Master tidak boleh dihapus permanen; hanya ubah nama, nonaktifkan, atau aktifkan kembali.
 */

var TM_MasterData = (function () {
  var CACHE_KEY = 'MASTER_BUNDLE_V1';

  var ENTITY_CONFIG = {
    CATEGORY: {
      sheet: 'Categories',
      idField: 'CategoryID',
      nameField: 'CategoryName',
      prefix: 'CAT',
      label: 'Master Category'
    },
    SECTION: {
      sheet: 'Sections',
      idField: 'SectionID',
      nameField: 'SectionName',
      prefix: 'SEC',
      label: 'Master Section'
    },
    AM: {
      sheet: 'Master_AM',
      idField: 'AM_ID',
      nameField: 'AM_Name',
      prefix: 'AM',
      label: 'Master AM'
    },
    MUM: {
      sheet: 'Master_MUM',
      idField: 'MUM_ID',
      nameField: 'MUM_Name',
      prefix: 'MUM',
      label: 'Master MUM'
    }
  };

  function getEntityCfg(entityType) {
    var cfg = ENTITY_CONFIG[String(entityType || '').toUpperCase()];
    if (!cfg) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Tipe Master Data tidak valid.');
    }
    return cfg;
  }

  function invalidateMasterCache() {
    TM_Db.invalidateCache(CACHE_KEY);
  }

  function getMasterBundle(token) {
    var ctx = TM_Auth.requireAuth(token);
    var bundle = TM_Db.getCachedJson(CACHE_KEY, 300, function () {
      return {
        categories: TM_Db.getAllRecords('Categories'),
        sections: TM_Db.getAllRecords('Sections'),
        ams: TM_Db.getAllRecords('Master_AM'),
        mums: TM_Db.getAllRecords('Master_MUM')
      };
    });

    // Untuk Trainer/Manajemen tetap berikan daftar aktif + daftar lengkap untuk filter Dashboard,
    // sementara mutasi tetap dikunci khusus SUPER_ADMIN.
    return {
      role: ctx.user.Role,
      categories: bundle.categories,
      sections: bundle.sections,
      ams: bundle.ams,
      mums: bundle.mums,
      active: {
        categories: bundle.categories.filter(function (x) { return x.Status === TM_CONFIG.STATUS.ACTIVE; }),
        sections: bundle.sections.filter(function (x) { return x.Status === TM_CONFIG.STATUS.ACTIVE; }),
        ams: bundle.ams.filter(function (x) { return x.Status === TM_CONFIG.STATUS.ACTIVE; }),
        mums: bundle.mums.filter(function (x) { return x.Status === TM_CONFIG.STATUS.ACTIVE; })
      }
    };
  }

  function saveMasterItem(token, entityType, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var cfg = getEntityCfg(entityType);
    var p = dto || {};
    var id = TM_Utils.sanitizeText(p.id);
    var rawName = TM_Utils.sanitizeText(p.name).replace(/\s+/g, ' ');

    if (!rawName || rawName.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama ' + cfg.label + ' wajib diisi (minimal 2 karakter).');
    }

    return TM_Db.withLock(function () {
      var all = TM_Db.getAllRecords(cfg.sheet);
      var normalizedTarget = rawName.toLowerCase();

      for (var i = 0; i < all.length; i++) {
        var row = all[i];
        if (String(row[cfg.idField]) !== id && String(row[cfg.nameField]).trim().toLowerCase() === normalizedTarget) {
          throw TM_Utils.AppError('ERR_DUPLICATE', cfg.label + ' "' + rawName + '" sudah ada.');
        }
      }

      var ts = TM_Utils.formatWibIso();
      if (id) {
        var before = TM_Db.findById(cfg.sheet, cfg.idField, id);
        if (!before) {
          throw TM_Utils.AppError('ERR_NOT_FOUND', cfg.label + ' tidak ditemukan.');
        }
        var updated = TM_Db.updateRecordById(cfg.sheet, cfg.idField, id, function (rec) {
          rec[cfg.nameField] = rawName;
          rec.UpdatedAt = ts;
          return rec;
        });
        invalidateMasterCache();

        TM_Audit.logEvent({
          userId: ctx.user.UserID,
          action: 'MASTER_UPDATED',
          entityType: cfg.sheet,
          entityId: id,
          beforeData: before,
          afterData: updated,
          deviceInfo: ctx.session.DeviceInfo,
          description: 'Mengubah ' + cfg.label + ': "' + before[cfg.nameField] + '" -> "' + rawName + '"'
        });
        return updated;
      }

      var newObj = {};
      newObj[cfg.idField] = TM_Utils.generateId(cfg.prefix);
      newObj[cfg.nameField] = rawName;
      newObj.Status = TM_CONFIG.STATUS.ACTIVE;
      newObj.CreatedAt = ts;
      newObj.UpdatedAt = ts;

      TM_Db.insertRecord(cfg.sheet, newObj);
      invalidateMasterCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'MASTER_CREATED',
        entityType: cfg.sheet,
        entityId: newObj[cfg.idField],
        afterData: newObj,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Menambahkan ' + cfg.label + ': "' + rawName + '"'
      });

      return newObj;
    });
  }

  function setMasterStatus(token, entityType, id, status) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var cfg = getEntityCfg(entityType);
    if (status !== TM_CONFIG.STATUS.ACTIVE && status !== TM_CONFIG.STATUS.INACTIVE) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Status Master Data tidak valid.');
    }

    return TM_Db.withLock(function () {
      var before = TM_Db.findById(cfg.sheet, cfg.idField, id);
      if (!before) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', cfg.label + ' tidak ditemukan.');
      }

      if (before.Status === status) {
        return before;
      }

      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById(cfg.sheet, cfg.idField, id, function (rec) {
        rec.Status = status;
        rec.UpdatedAt = ts;
        return rec;
      });
      invalidateMasterCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: status === TM_CONFIG.STATUS.ACTIVE ? 'MASTER_ACTIVATED' : 'MASTER_DEACTIVATED',
        entityType: cfg.sheet,
        entityId: id,
        beforeData: before,
        afterData: updated,
        deviceInfo: ctx.session.DeviceInfo,
        description: (status === TM_CONFIG.STATUS.ACTIVE ? 'Mengaktifkan ' : 'Menonaktifkan ') + cfg.label + ': "' + before[cfg.nameField] + '"'
      });

      return updated;
    });
  }

  function deleteMasterItem(token, entityType, id) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var cfg = getEntityCfg(entityType);
    var targetId = TM_Utils.sanitizeText(id);
    if (!targetId) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'ID ' + cfg.label + ' wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var before = TM_Db.findById(cfg.sheet, cfg.idField, targetId);
      if (!before) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', cfg.label + ' tidak ditemukan.');
      }

      if (before.Status !== TM_CONFIG.STATUS.INACTIVE) {
        throw TM_Utils.AppError(
          'ERR_VALIDATION',
          'Nonaktifkan ' + cfg.label + ' "' + before[cfg.nameField] + '" terlebih dahulu sebelum menghapus secara permanen.'
        );
      }

      TM_Db.deleteRecordById(cfg.sheet, cfg.idField, targetId);
      invalidateMasterCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'MASTER_DELETED',
        entityType: cfg.sheet,
        entityId: targetId,
        beforeData: before,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Menghapus permanen ' + cfg.label + ': "' + before[cfg.nameField] + '"'
      });

      return {
        deleted: true,
        id: targetId,
        name: before[cfg.nameField]
      };
    });
  }

  return {
    invalidateMasterCache: invalidateMasterCache,
    getMasterBundle: getMasterBundle,
    saveMasterItem: saveMasterItem,
    setMasterStatus: setMasterStatus,
    deleteMasterItem: deleteMasterItem
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_MasterData: TM_MasterData };
}
