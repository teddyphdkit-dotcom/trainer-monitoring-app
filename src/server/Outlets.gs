/**
 * Outlets.gs — Normalisasi nama Outlet, deteksi duplikat, Canonical ID, Alias, Merge & Unmerge.
 */

var TM_Outlets = (function () {
  var CACHE_KEY = 'OUTLETS_BUNDLE_V1';

  function cleanDisplayName(raw) {
    return TM_Utils.sanitizeText(raw).replace(/\s+/g, ' ');
  }

  function normalizeOutletName(raw) {
    return cleanDisplayName(raw)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function levenshtein(a, b) {
    var m = a.length;
    var n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    var dp = new Array(n + 1);
    for (var j = 0; j <= n; j++) dp[j] = j;
    for (var i = 1; i <= m; i++) {
      var prev = dp[0];
      dp[0] = i;
      for (var k = 1; k <= n; k++) {
        var temp = dp[k];
        var cost = a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1;
        dp[k] = Math.min(dp[k] + 1, dp[k - 1] + 1, prev + cost);
        prev = temp;
      }
    }
    return dp[n];
  }

  function computeSimilarity(normA, normB) {
    if (!normA || !normB) return 0;
    if (normA === normB) return 1;
    if (normA.indexOf(normB) !== -1 || normB.indexOf(normA) !== -1) {
      var minLen = Math.min(normA.length, normB.length);
      var maxLen = Math.max(normA.length, normB.length);
      return 0.72 + (0.23 * (minLen / maxLen));
    }

    var maxLen2 = Math.max(normA.length, normB.length);
    var dist = levenshtein(normA, normB);
    var levScore = 1 - (dist / maxLen2);

    var tokensA = normA.split(' ');
    var tokensB = normB.split(' ');
    var overlap = 0;
    for (var i = 0; i < tokensA.length; i++) {
      if (tokensB.indexOf(tokensA[i]) !== -1) overlap++;
    }
    var tokenScore = overlap / Math.max(tokensA.length, tokensB.length);
    return Math.max(levScore, tokenScore * 0.9);
  }

  function invalidateOutletCache() {
    TM_Db.invalidateCache(CACHE_KEY);
  }

  function loadBundle() {
    return TM_Db.getCachedJson(CACHE_KEY, 300, function () {
      return {
        outlets: TM_Db.getAllRecords('Outlets'),
        aliases: TM_Db.getAllRecords('OutletAliases')
      };
    });
  }

  function resolveCanonicalOutletFromList(outletId, outletsMap) {
    var visited = {};
    var curr = outletsMap[outletId];
    while (curr && curr.MergedIntoOutletID && !visited[curr.OutletID]) {
      visited[curr.OutletID] = true;
      var parent = outletsMap[curr.MergedIntoOutletID];
      if (!parent) break;
      curr = parent;
    }
    return curr || null;
  }

  function generateNextOutletCode(existingOutlets) {
    var maxNum = 0;
    for (var i = 0; i < existingOutlets.length; i++) {
      var code = String(existingOutlets[i].OutletCode || '');
      var match = code.match(/^OUT(\d+)$/i);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    var next = maxNum + 1;
    return 'OUT' + String(next).padStart(3, '0');
  }

  function listOutlets(token) {
    TM_Auth.requireAuth(token);
    var bundle = loadBundle();
    var aliasByOutlet = {};
    for (var i = 0; i < bundle.aliases.length; i++) {
      var al = bundle.aliases[i];
      if (!aliasByOutlet[al.OutletID]) aliasByOutlet[al.OutletID] = [];
      aliasByOutlet[al.OutletID].push(al);
    }

    var outletsMap = {};
    for (var j = 0; j < bundle.outlets.length; j++) {
      outletsMap[bundle.outlets[j].OutletID] = bundle.outlets[j];
    }

    return bundle.outlets.map(function (o) {
      var mergedTarget = o.MergedIntoOutletID ? outletsMap[o.MergedIntoOutletID] : null;
      return Object.assign({}, o, {
        Aliases: aliasByOutlet[o.OutletID] || [],
        MergedIntoName: mergedTarget ? mergedTarget.CanonicalName : ''
      });
    });
  }

  function suggestOutlets(token, rawQuery) {
    TM_Auth.requireAuth(token);
    var clean = cleanDisplayName(rawQuery);
    var norm = normalizeOutletName(clean);
    var bundle = loadBundle();

    var outletsMap = {};
    for (var i = 0; i < bundle.outlets.length; i++) {
      outletsMap[bundle.outlets[i].OutletID] = bundle.outlets[i];
    }

    var aliasByOutlet = {};
    for (var a = 0; a < bundle.aliases.length; a++) {
      var al = bundle.aliases[a];
      if (!aliasByOutlet[al.OutletID]) aliasByOutlet[al.OutletID] = [];
      aliasByOutlet[al.OutletID].push(al);
    }

    if (!norm) {
      return bundle.outlets
        .filter(function (o) { return o.Status === TM_CONFIG.STATUS.ACTIVE && !o.MergedIntoOutletID; })
        .slice(0, 15)
        .map(function (o) {
          return {
            OutletID: o.OutletID,
            OutletCode: o.OutletCode,
            CanonicalName: o.CanonicalName,
            matchType: 'LIST',
            score: 1,
            aliases: (aliasByOutlet[o.OutletID] || []).map(function (x) { return x.AliasName; })
          };
        });
    }

    var candidatesByCanonical = {};

    function registerCandidate(canonical, score, matchType, matchedVia) {
      if (!canonical || canonical.Status === TM_CONFIG.STATUS.INACTIVE) return;
      var prev = candidatesByCanonical[canonical.OutletID];
      if (!prev || score > prev.score) {
        candidatesByCanonical[canonical.OutletID] = {
          OutletID: canonical.OutletID,
          OutletCode: canonical.OutletCode,
          CanonicalName: canonical.CanonicalName,
          matchType: matchType,
          matchedVia: matchedVia,
          score: Number(score.toFixed(3)),
          aliases: (aliasByOutlet[canonical.OutletID] || []).map(function (x) { return x.AliasName; })
        };
      }
    }

    for (var j = 0; j < bundle.outlets.length; j++) {
      var o = bundle.outlets[j];
      var canonical = resolveCanonicalOutletFromList(o.OutletID, outletsMap);
      var score = computeSimilarity(norm, o.NormalizedName);
      if (norm === o.NormalizedName) {
        registerCandidate(canonical, 1.0, o.MergedIntoOutletID ? 'MERGED_EXACT' : 'EXACT', o.CanonicalName);
      } else if (score >= 0.55) {
        registerCandidate(canonical, score, 'SIMILAR', o.CanonicalName);
      }
    }

    for (var k = 0; k < bundle.aliases.length; k++) {
      var alias = bundle.aliases[k];
      var target = resolveCanonicalOutletFromList(alias.OutletID, outletsMap);
      var alScore = computeSimilarity(norm, alias.NormalizedAlias);
      if (norm === alias.NormalizedAlias) {
        registerCandidate(target, 0.99, 'ALIAS_EXACT', alias.AliasName);
      } else if (alScore >= 0.55) {
        registerCandidate(target, alScore, 'ALIAS_SIMILAR', alias.AliasName);
      }
    }

    return Object.keys(candidatesByCanonical)
      .map(function (id) { return candidatesByCanonical[id]; })
      .sort(function (x, y) { return y.score - x.score; })
      .slice(0, 10);
  }

  function resolveOrCreateOutletUnlocked(ctx, rawName) {
    var display = cleanDisplayName(rawName);
    var norm = normalizeOutletName(display);

    if (!display || norm.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama Outlet wajib diisi (minimal 2 karakter).');
    }

    var outlets = TM_Db.getAllRecords('Outlets');
    var aliases = TM_Db.getAllRecords('OutletAliases');
    var outletsMap = {};
    for (var i = 0; i < outlets.length; i++) {
      outletsMap[outlets[i].OutletID] = outlets[i];
    }

    // 1. Cek kecocokan persis di Outlets
    for (var j = 0; j < outlets.length; j++) {
      if (outlets[j].NormalizedName === norm) {
        var canonical = resolveCanonicalOutletFromList(outlets[j].OutletID, outletsMap);
        if (canonical && canonical.Status === TM_CONFIG.STATUS.INACTIVE) {
          throw TM_Utils.AppError('ERR_OUTLET_INACTIVE', 'Outlet "' + canonical.CanonicalName + '" sedang nonaktif.');
        }
        return {
          outlet: canonical,
          created: false,
          matchedVia: outlets[j].OutletID === canonical.OutletID ? 'CANONICAL' : 'MERGED'
        };
      }
    }

    // 2. Cek kecocokan persis di OutletAliases
    for (var k = 0; k < aliases.length; k++) {
      if (aliases[k].NormalizedAlias === norm) {
        var target = resolveCanonicalOutletFromList(aliases[k].OutletID, outletsMap);
        if (target && target.Status !== TM_CONFIG.STATUS.INACTIVE) {
          return {
            outlet: target,
            created: false,
            matchedVia: 'ALIAS'
          };
        }
      }
    }

    // 3. Buat identitas Outlet baru
    var ts = TM_Utils.formatWibIso();
    var newOutlet = {
      OutletID: TM_Utils.generateId('OTL'),
      CanonicalName: display,
      NormalizedName: norm,
      OutletCode: generateNextOutletCode(outlets),
      Status: TM_CONFIG.STATUS.ACTIVE,
      MergedIntoOutletID: '',
      CreatedAt: ts,
      UpdatedAt: ts
    };
    TM_Db.insertRecord('Outlets', newOutlet);
    invalidateOutletCache();

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'OUTLET_CREATED',
      entityType: 'Outlets',
      entityId: newOutlet.OutletID,
      afterData: newOutlet,
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Membuat Outlet baru: ' + newOutlet.CanonicalName + ' (' + newOutlet.OutletCode + ')'
    });

    return {
      outlet: newOutlet,
      created: true,
      matchedVia: 'NEW'
    };
  }

  function resolveOrCreateOutlet(token, rawName) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN, TM_CONFIG.ROLES.TRAINER]);
    return TM_Db.withLock(function () {
      return resolveOrCreateOutletUnlocked(ctx, rawName);
    });
  }

  function updateOutlet(token, outletId, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var p = dto || {};
    var display = cleanDisplayName(p.canonicalName);
    var norm = normalizeOutletName(display);

    if (!display || norm.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama Outlet wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var outlets = TM_Db.getAllRecords('Outlets');
      var target = outlets.find(function (o) { return o.OutletID === outletId; });
      if (!target) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet tidak ditemukan.');
      }
      for (var i = 0; i < outlets.length; i++) {
        if (outlets[i].OutletID !== outletId && outlets[i].NormalizedName === norm) {
          throw TM_Utils.AppError('ERR_DUPLICATE', 'Nama Outlet "' + display + '" sudah digunakan.');
        }
      }

      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Outlets', 'OutletID', outletId, function (rec) {
        rec.CanonicalName = display;
        rec.NormalizedName = norm;
        rec.UpdatedAt = ts;
        return rec;
      });
      invalidateOutletCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'OUTLET_UPDATED',
        entityType: 'Outlets',
        entityId: outletId,
        beforeData: target,
        afterData: updated,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Mengubah nama Outlet: "' + target.CanonicalName + '" -> "' + display + '"'
      });

      return updated;
    });
  }

  function mergeOutlets(token, primaryOutletId, duplicateOutletIds, reason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var mergeReason = TM_Utils.sanitizeText(reason);
    if (!mergeReason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan merge Outlet wajib diisi.');
    }
    var dupIds = Array.isArray(duplicateOutletIds) ? duplicateOutletIds : [duplicateOutletIds];
    dupIds = dupIds.filter(function (id, idx) {
      return id && dupIds.indexOf(id) === idx;
    });
    if (dupIds.length === 0) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Pilih minimal satu Outlet duplikat untuk di-merge.');
    }
    if (dupIds.indexOf(primaryOutletId) !== -1) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet utama tidak boleh termasuk dalam daftar duplikat.');
    }

    return TM_Db.withLock(function () {
      var outlets = TM_Db.getAllRecords('Outlets');
      var aliases = TM_Db.getAllRecords('OutletAliases');
      var outletsMap = {};
      for (var i = 0; i < outlets.length; i++) {
        outletsMap[outlets[i].OutletID] = outlets[i];
      }

      var primary = outletsMap[primaryOutletId];
      if (!primary) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet utama tidak ditemukan.');
      }
      if (primary.Status !== TM_CONFIG.STATUS.ACTIVE || primary.MergedIntoOutletID) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet utama harus berstatus aktif dan bukan hasil merge.');
      }

      var ts = TM_Utils.formatWibIso();
      var mergedResults = [];
      var newAliases = [];

      for (var d = 0; d < dupIds.length; d++) {
        var dupId = dupIds[d];
        var dup = outletsMap[dupId];
        if (!dup) {
          throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet duplikat "' + dupId + '" tidak ditemukan.');
        }
        if (dup.MergedIntoOutletID) {
          throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet "' + dup.CanonicalName + '" sudah di-merge sebelumnya.');
        }
        var hasChildren = outlets.some(function (x) { return x.MergedIntoOutletID === dupId; });
        if (hasChildren) {
          throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet "' + dup.CanonicalName + '" menjadi induk merge outlet lain. Batalkan merge anak terlebih dahulu.');
        }

        var updatedDup = TM_Db.updateRecordById('Outlets', 'OutletID', dupId, function (rec) {
          rec.Status = 'MERGED';
          rec.MergedIntoOutletID = primaryOutletId;
          rec.UpdatedAt = ts;
          return rec;
        });

        // Simpan nama lama sebagai alias pada Outlet utama jika belum ada
        var aliasExists = aliases.some(function (al) {
          return al.OutletID === primaryOutletId && al.NormalizedAlias === dup.NormalizedName;
        }) || newAliases.some(function (al) {
          return al.OutletID === primaryOutletId && al.NormalizedAlias === dup.NormalizedName;
        });

        if (!aliasExists) {
          newAliases.push({
            AliasID: TM_Utils.generateId('ALS'),
            OutletID: primaryOutletId,
            AliasName: dup.CanonicalName,
            NormalizedAlias: dup.NormalizedName,
            CreatedAt: ts
          });
        }

        mergedResults.push(updatedDup);
      }

      if (newAliases.length > 0) {
        TM_Db.insertRecordsBatch('OutletAliases', newAliases);
      }
      invalidateOutletCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'OUTLET_MERGED',
        entityType: 'Outlets',
        entityId: primaryOutletId,
        beforeData: {
          primary: primary,
          duplicates: dupIds.map(function (id) { return outletsMap[id]; })
        },
        afterData: {
          primaryId: primaryOutletId,
          mergedIds: dupIds,
          aliasesAdded: newAliases,
          reason: mergeReason
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Merge ' + dupIds.length + ' Outlet ke "' + primary.CanonicalName + '": ' + mergeReason
      });

      return {
        primary: primary,
        mergedOutlets: mergedResults,
        aliasesAdded: newAliases
      };
    });
  }

  function unmergeOutlet(token, duplicateOutletId, reason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var unmergeReason = TM_Utils.sanitizeText(reason);
    if (!unmergeReason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan pembatalan merge wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var dup = TM_Db.findById('Outlets', 'OutletID', duplicateOutletId);
      if (!dup) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet tidak ditemukan.');
      }
      if (!dup.MergedIntoOutletID) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet "' + dup.CanonicalName + '" tidak dalam status merge.');
      }

      var before = Object.assign({}, dup);
      var previousPrimaryId = dup.MergedIntoOutletID;
      var ts = TM_Utils.formatWibIso();

      var restored = TM_Db.updateRecordById('Outlets', 'OutletID', duplicateOutletId, function (rec) {
        rec.Status = TM_CONFIG.STATUS.ACTIVE;
        rec.MergedIntoOutletID = '';
        rec.UpdatedAt = ts;
        return rec;
      });

      // Hapus alias hasil merge otomatis pada Outlet utama jika cocok dengan nama Outlet yang di-unmerge
      var aliasSheet = TM_Db.getSheet('OutletAliases');
      var lastRow = aliasSheet.getLastRow();
      var lastCol = aliasSheet.getLastColumn();
      if (lastRow > 1 && lastCol > 0) {
        var values = aliasSheet.getRange(1, 1, lastRow, lastCol).getValues();
        var headers = values[0];
        var oidIdx = headers.indexOf('OutletID');
        var normIdx = headers.indexOf('NormalizedAlias');
        var keptRows = [headers];
        for (var r = 1; r < values.length; r++) {
          var isMergeAlias =
            String(values[r][oidIdx]) === previousPrimaryId &&
            String(values[r][normIdx]) === dup.NormalizedName;
          if (!isMergeAlias) {
            keptRows.push(values[r]);
          }
        }
        if (keptRows.length !== values.length) {
          // Kosongkan dan tulis ulang bersih
          var blank = values.map(function (row) { return row.map(function () { return ''; }); });
          aliasSheet.getRange(1, 1, values.length, headers.length).setValues(blank);
          aliasSheet.getRange(1, 1, keptRows.length, headers.length).setValues(keptRows);
        }
      }

      invalidateOutletCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'OUTLET_UNMERGED',
        entityType: 'Outlets',
        entityId: duplicateOutletId,
        beforeData: before,
        afterData: { restored: restored, reason: unmergeReason },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Membatalkan merge Outlet "' + dup.CanonicalName + '": ' + unmergeReason
      });

      return restored;
    });
  }

  function setOutletStatus(token, outletId, status) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var targetId = TM_Utils.sanitizeText(outletId);
    if (status !== TM_CONFIG.STATUS.ACTIVE && status !== TM_CONFIG.STATUS.INACTIVE) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Status Outlet tidak valid.');
    }

    return TM_Db.withLock(function () {
      var before = TM_Db.findById('Outlets', 'OutletID', targetId);
      if (!before) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet tidak ditemukan.');
      }
      if (before.MergedIntoOutletID) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet hasil merge tidak dapat diubah statusnya secara langsung.');
      }
      if (before.Status === status) {
        return before;
      }

      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Outlets', 'OutletID', targetId, function (rec) {
        rec.Status = status;
        rec.UpdatedAt = ts;
        return rec;
      });
      invalidateOutletCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: status === TM_CONFIG.STATUS.ACTIVE ? 'OUTLET_ACTIVATED' : 'OUTLET_DEACTIVATED',
        entityType: 'Outlets',
        entityId: targetId,
        beforeData: before,
        afterData: updated,
        deviceInfo: ctx.session.DeviceInfo,
        description: (status === TM_CONFIG.STATUS.ACTIVE ? 'Mengaktifkan ' : 'Menonaktifkan ') + 'Outlet: "' + before.CanonicalName + '" (' + before.OutletCode + ')'
      });

      return updated;
    });
  }

  function deleteOutlet(token, outletId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var targetId = TM_Utils.sanitizeText(outletId);
    if (!targetId) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'ID Outlet wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var outlets = TM_Db.getAllRecords('Outlets');
      var before = outlets.find(function (o) { return o.OutletID === targetId; });
      if (!before) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet tidak ditemukan.');
      }

      if (before.Status === TM_CONFIG.STATUS.ACTIVE && !before.MergedIntoOutletID) {
        throw TM_Utils.AppError(
          'ERR_VALIDATION',
          'Nonaktifkan Outlet "' + before.CanonicalName + '" terlebih dahulu sebelum menghapus secara permanen.'
        );
      }

      var hasMergedChildren = outlets.some(function (o) {
        return o.MergedIntoOutletID === targetId;
      });
      if (hasMergedChildren) {
        throw TM_Utils.AppError(
          'ERR_VALIDATION',
          'Outlet "' + before.CanonicalName + '" masih menjadi induk penggabungan (merge) Outlet lain. Batalkan merge terlebih dahulu.'
        );
      }

      TM_Db.deleteRecordById('Outlets', 'OutletID', targetId);
      var removedAliases = TM_Db.deleteRecordsWhere('OutletAliases', function (al) {
        return al.OutletID === targetId;
      });
      invalidateOutletCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'OUTLET_DELETED',
        entityType: 'Outlets',
        entityId: targetId,
        beforeData: before,
        afterData: { removedAliasesCount: removedAliases.length },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Menghapus permanen Outlet: "' + before.CanonicalName + '" (' + before.OutletCode + ')'
      });

      return {
        deleted: true,
        outletId: targetId,
        outletCode: before.OutletCode,
        canonicalName: before.CanonicalName
      };
    });
  }

  return {
    cleanDisplayName: cleanDisplayName,
    normalizeOutletName: normalizeOutletName,
    invalidateOutletCache: invalidateOutletCache,
    listOutlets: listOutlets,
    suggestOutlets: suggestOutlets,
    resolveOrCreateOutletUnlocked: resolveOrCreateOutletUnlocked,
    resolveOrCreateOutlet: resolveOrCreateOutlet,
    updateOutlet: updateOutlet,
    setOutletStatus: setOutletStatus,
    deleteOutlet: deleteOutlet,
    mergeOutlets: mergeOutlets,
    unmergeOutlet: unmergeOutlet
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Outlets: TM_Outlets };
}
