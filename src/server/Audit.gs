/**
 * Audit.gs — Append-only AuditLogs & query untuk Super Admin.
 */

var TM_Audit = (function () {
  var SENSITIVE_KEYS = ['PasswordHash', 'password', 'newPassword', 'currentPassword', 'tempPassword', 'ResetTokenHash', 'token', 'TokenHash'];

  function redactObject(obj) {
    if (obj === null || obj === undefined) return '';
    if (typeof obj === 'string') return obj;
    try {
      var clone = JSON.parse(JSON.stringify(obj));
      if (clone && typeof clone === 'object') {
        for (var i = 0; i < SENSITIVE_KEYS.length; i++) {
          var k = SENSITIVE_KEYS[i];
          if (Object.prototype.hasOwnProperty.call(clone, k)) {
            clone[k] = '[REDACTED]';
          }
        }
      }
      return JSON.stringify(clone);
    } catch (e) {
      return String(obj);
    }
  }

  function logEvent(entry) {
    var record = {
      LogID: TM_Utils.generateId('LOG'),
      UserID: entry.userId || 'SYSTEM',
      Action: entry.action || 'UNKNOWN',
      EntityType: entry.entityType || 'SYSTEM',
      EntityID: entry.entityId || '',
      BeforeData: redactObject(entry.beforeData),
      AfterData: redactObject(entry.afterData),
      Timestamp: TM_Utils.formatWibIso(),
      DeviceInfo: TM_Utils.sanitizeText(entry.deviceInfo || ''),
      Description: TM_Utils.sanitizeText(entry.description || '')
    };
    return TM_Db.insertRecord('AuditLogs', record);
  }

  function queryAuditLogs(token, filters) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var f = filters || {};

    // Catat akses ke Audit Log itu sendiri (PRD Section 16)
    logEvent({
      userId: ctx.user.UserID,
      action: 'AUDIT_LOG_ACCESSED',
      entityType: 'AuditLogs',
      entityId: '',
      afterData: { filters: f },
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Super Admin mengakses riwayat Audit Log'
    });

    var all = TM_Db.getAllRecords('AuditLogs');
    var search = TM_Utils.sanitizeText(f.search).toLowerCase();
    var actionFilter = TM_Utils.sanitizeText(f.action);
    var entityFilter = TM_Utils.sanitizeText(f.entityType);
    var userFilter = TM_Utils.sanitizeText(f.userId);
    var dateFrom = TM_Utils.sanitizeText(f.dateFrom);
    var dateTo = TM_Utils.sanitizeText(f.dateTo);

    var filtered = all.filter(function (row) {
      if (actionFilter && row.Action !== actionFilter) return false;
      if (entityFilter && row.EntityType !== entityFilter) return false;
      if (userFilter && row.UserID !== userFilter) return false;
      var rowDate = String(row.Timestamp || '').slice(0, 10);
      if (dateFrom && rowDate < dateFrom) return false;
      if (dateTo && rowDate > dateTo) return false;
      if (search) {
        var hay = (
          row.LogID + ' ' + row.UserID + ' ' + row.Action + ' ' +
          row.EntityType + ' ' + row.EntityID + ' ' + row.Description
        ).toLowerCase();
        if (hay.indexOf(search) === -1) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      return String(b.Timestamp).localeCompare(String(a.Timestamp));
    });

    var page = Math.max(1, parseInt(f.page || 1, 10));
    var pageSize = Math.min(100, Math.max(10, parseInt(f.pageSize || 25, 10)));
    var total = filtered.length;
    var start = (page - 1) * pageSize;
    var items = filtered.slice(start, start + pageSize);

    // Enrich dengan nama user agar mudah dibaca di UI
    var users = TM_Db.getAllRecords('Users');
    var userMap = {};
    for (var i = 0; i < users.length; i++) {
      userMap[users[i].UserID] = users[i].Name + ' (' + users[i].Username + ')';
    }
    items = items.map(function (item) {
      return Object.assign({}, item, {
        UserDisplay: userMap[item.UserID] || item.UserID
      });
    });

    return {
      items: items,
      total: total,
      page: page,
      pageSize: pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }

  return {
    logEvent: logEvent,
    queryAuditLogs: queryAuditLogs
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Audit: TM_Audit };
}
