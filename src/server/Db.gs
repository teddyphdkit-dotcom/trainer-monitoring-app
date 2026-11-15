/**
 * Db.gs — Lapisan akses Google Sheets berbasis batch, header-mapping, cache, dan LockService.
 */

var TM_Db = (function () {
  var _ssCache = null;

  function getProps() {
    return PropertiesService.getScriptProperties();
  }

  function getScriptCache() {
    return CacheService.getScriptCache();
  }

  function resetSpreadsheetCache() {
    _ssCache = null;
  }

  function getSpreadsheet() {
    if (_ssCache) return _ssCache;
    var ssId = getProps().getProperty(TM_CONFIG.PROP_KEYS.SPREADSHEET_ID);
    if (!ssId) {
      throw TM_Utils.AppError('ERR_NOT_INITIALIZED', 'Database aplikasi belum diinisialisasi.');
    }
    _ssCache = SpreadsheetApp.openById(ssId);
    return _ssCache;
  }

  function getSheet(sheetName) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw TM_Utils.AppError('ERR_SHEET_MISSING', 'Sheet "' + sheetName + '" tidak ditemukan.');
    }
    return sheet;
  }

  function withLock(fn, timeoutMs) {
    var lock = LockService.getScriptLock();
    var acquired = lock.tryLock(timeoutMs || 25000);
    if (!acquired) {
      throw TM_Utils.AppError('ERR_LOCK_TIMEOUT', 'Sistem sedang memproses transaksi lain. Silakan coba lagi.');
    }
    try {
      return fn();
    } finally {
      lock.releaseLock();
    }
  }

  function ensureSheetHeaders(sheet, expectedHeaders) {
    var lastCol = sheet.getLastColumn();
    if (sheet.getLastRow() === 0 || lastCol === 0) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
      return expectedHeaders;
    }
    var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    return currentHeaders;
  }

  function cellToString(headerName, val) {
    if (val === undefined || val === null || val === '') return '';
    if (Object.prototype.toString.call(val) === '[object Date]') {
      if (isNaN(val.getTime())) return '';
      if (headerName === 'InspectionDate') {
        return TM_Utils.formatWibIso(val).slice(0, 10);
      }
      return TM_Utils.formatWibIso(val);
    }
    var str = String(val);
    if (headerName === 'InspectionDate') {
      return TM_Utils.normalizeDateStr(str) || str;
    }
    return str;
  }

  function getAllRecords(sheetName) {
    var sheet = getSheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) {
      return [];
    }
    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = values[0];
    var records = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var isEmpty = true;
      for (var c = 0; c < headers.length; c++) {
        if (row[c] !== '' && row[c] !== null && row[c] !== undefined) {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty) continue;
      var obj = {};
      for (var col = 0; col < headers.length; col++) {
        var key = String(headers[col]);
        obj[key] = cellToString(key, row[col]);
      }
      records.push(obj);
    }
    return records;
  }

  function findRecord(sheetName, predicate) {
    var rows = getAllRecords(sheetName);
    for (var i = 0; i < rows.length; i++) {
      if (predicate(rows[i])) return rows[i];
    }
    return null;
  }

  function findById(sheetName, idField, idValue) {
    var target = String(idValue);
    return findRecord(sheetName, function (row) {
      return String(row[idField]) === target;
    });
  }

  function filterRecords(sheetName, predicate) {
    var rows = getAllRecords(sheetName);
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if (predicate(rows[i])) out.push(rows[i]);
    }
    return out;
  }

  function objectToRow(headers, obj) {
    var row = [];
    for (var i = 0; i < headers.length; i++) {
      var key = headers[i];
      var val = obj[key];
      row.push(val === undefined || val === null ? '' : String(val));
    }
    return row;
  }

  function insertRecord(sheetName, obj) {
    return insertRecordsBatch(sheetName, [obj])[0];
  }

  function insertRecordsBatch(sheetName, objs) {
    if (!objs || objs.length === 0) return [];
    var sheet = getSheet(sheetName);
    var expectedHeaders = TM_CONFIG.SHEETS[sheetName];
    var headers = ensureSheetHeaders(sheet, expectedHeaders);
    var rows = objs.map(function (o) { return objectToRow(headers, o); });
    var startRow = Math.max(sheet.getLastRow() + 1, 2);
    var targetRange = sheet.getRange(startRow, 1, rows.length, headers.length);
    if (typeof targetRange.setNumberFormat === 'function') {
      targetRange.setNumberFormat('@');
    }
    targetRange.setValues(rows);
    return objs;
  }

  function replaceSheetRecords(sheetName, objs) {
    var sheet = getSheet(sheetName);
    var expectedHeaders = TM_CONFIG.SHEETS[sheetName];
    if (typeof sheet.clearContents === 'function') {
      sheet.clearContents();
    } else if (typeof sheet.clear === 'function') {
      sheet.clear();
    }
    ensureSheetHeaders(sheet, expectedHeaders);
    if (objs && objs.length > 0) {
      insertRecordsBatch(sheetName, objs);
    }
  }

  function updateRecordById(sheetName, idField, idValue, updaterFn) {
    var sheet = getSheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) return null;

    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = values[0];
    var idColIdx = headers.indexOf(idField);
    if (idColIdx === -1) {
      throw TM_Utils.AppError('ERR_SCHEMA', 'Kolom "' + idField + '" tidak ada di sheet "' + sheetName + '".');
    }

    var target = String(idValue);
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][idColIdx]) === target) {
        var existing = {};
        for (var c = 0; c < headers.length; c++) {
          var key = String(headers[c]);
          existing[key] = cellToString(key, values[r][c]);
        }
        var updated = updaterFn(Object.assign({}, existing)) || existing;
        var rowArray = objectToRow(headers, updated);
        var rowRange = sheet.getRange(r + 1, 1, 1, headers.length);
        if (typeof rowRange.setNumberFormat === 'function') {
          rowRange.setNumberFormat('@');
        }
        rowRange.setValues([rowArray]);
        return updated;
      }
    }
    return null;
  }

  function deleteRecordById(sheetName, idField, idValue) {
    var target = String(idValue);
    var deleted = deleteRecordsWhere(sheetName, function (row) {
      return String(row[idField]) === target;
    });
    return deleted.length > 0 ? deleted[0] : null;
  }

  function deleteRecordsWhere(sheetName, predicate) {
    var rows = getAllRecords(sheetName);
    var kept = [];
    var removed = [];
    for (var i = 0; i < rows.length; i++) {
      if (predicate(rows[i])) {
        removed.push(rows[i]);
      } else {
        kept.push(rows[i]);
      }
    }
    if (removed.length > 0) {
      replaceSheetRecords(sheetName, kept);
    }
    return removed;
  }

  function upsertSetting(key, value, userId) {
    var ts = TM_Utils.formatWibIso();
    var updated = updateRecordById('AppSettings', 'SettingKey', key, function (rec) {
      rec.SettingValue = String(value);
      rec.UpdatedAt = ts;
      rec.UpdatedBy = userId || 'SYSTEM';
      return rec;
    });
    if (!updated) {
      updated = insertRecord('AppSettings', {
        SettingKey: key,
        SettingValue: String(value),
        UpdatedAt: ts,
        UpdatedBy: userId || 'SYSTEM'
      });
    }
    invalidateCache('APP_SETTINGS');
    return updated;
  }

  function getCachedJson(cacheKey, ttlSeconds, loaderFn) {
    try {
      var cache = getScriptCache();
      var raw = cache.get(cacheKey);
      if (raw) {
        return JSON.parse(raw);
      }
      var fresh = loaderFn();
      var serialized = JSON.stringify(fresh);
      if (serialized.length < 95000) {
        cache.put(cacheKey, serialized, ttlSeconds || 300);
      }
      return fresh;
    } catch (e) {
      return loaderFn();
    }
  }

  function invalidateCache(cacheKey) {
    try {
      getScriptCache().remove(cacheKey);
    } catch (e) {
      // ignore cache errors
    }
  }

  return {
    getProps: getProps,
    getScriptCache: getScriptCache,
    resetSpreadsheetCache: resetSpreadsheetCache,
    getSpreadsheet: getSpreadsheet,
    getSheet: getSheet,
    withLock: withLock,
    ensureSheetHeaders: ensureSheetHeaders,
    getAllRecords: getAllRecords,
    findRecord: findRecord,
    findById: findById,
    filterRecords: filterRecords,
    insertRecord: insertRecord,
    insertRecordsBatch: insertRecordsBatch,
    replaceSheetRecords: replaceSheetRecords,
    updateRecordById: updateRecordById,
    deleteRecordById: deleteRecordById,
    deleteRecordsWhere: deleteRecordsWhere,
    upsertSetting: upsertSetting,
    getCachedJson: getCachedJson,
    invalidateCache: invalidateCache
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Db: TM_Db };
}
