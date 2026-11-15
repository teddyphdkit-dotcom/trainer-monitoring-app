/**
 * Auth.gs — Login, proteksi brute-force & lockout, session 8h/30m, reset password, & RBAC backend.
 */

var TM_Auth = (function () {
  var SESSION_CACHE_PREFIX = 'AUTH_SES_';
  var MAX_CREDENTIAL_ENTRIES = 128;
  var MAX_TRACKED_RATE_KEYS = 2000;

  // Matriks hak akses rute/aksi mengikuti pola admin-token-verifier.ts (Orca)
  var SHARED_AUTH_ROUTES = [
    'api_getCurrentUser', 'api_logout', 'api_changePasswordRequired',
    'api_getMasterBundle', 'api_suggestOutlets', 'api_listCompletedSessions',
    'api_getSessionDetail', 'api_getPhotoData', 'api_getDashboardFilterOptions',
    'api_getDashboardData', 'api_generateSessionPdf', 'api_generateDashboardPdf',
    'api_listSessionPdfHistory', 'api_exportDashboardData', 'api_listMyNotifications',
    'api_markNotificationRead', 'api_markAllNotificationsRead', 'api_getMyNotificationPreferences',
    'api_updateMyNotificationPreference'
  ];

  var TRAINER_ROUTES = SHARED_AUTH_ROUTES.concat([
    'api_resolveOrCreateOutlet', 'api_saveDraft', 'api_listMyDrafts', 'api_deleteMyDraft',
    'api_finalizeSession', 'api_saveFindingDraft', 'api_deleteFindingInDraft',
    'api_updateFinding', 'api_deleteFinding', 'api_uploadPhoto', 'api_updatePhotoComment',
    'api_deletePhoto', 'api_listMyDeletedDrafts', 'api_requestDraftRestore',
    'api_syncDraftOperation', 'api_syncBatchOperations', 'api_listMySyncConflicts',
    'api_resolveSyncConflict', 'api_checkLocalDraftsStatus', 'api_sendSessionPdfEmail'
  ]);

  var SUPER_ADMIN_ROUTES = TRAINER_ROUTES.concat([
    'api_listUsers', 'api_createUser', 'api_updateUser', 'api_adminResetUserPassword',
    'api_unlockUser', 'api_updateAppSettings', 'api_queryAuditLogs',
    'api_saveMasterItem', 'api_setMasterStatus', 'api_deleteMasterItem',
    'api_listOutlets', 'api_updateOutlet', 'api_setOutletStatus', 'api_deleteOutlet',
    'api_mergeOutlets', 'api_unmergeOutlet', 'api_deleteSession', 'api_restoreSession',
    'api_listDeletedCompletedSessions', 'api_restoreFinding', 'api_getActiveDraftsCount',
    'api_listMonitoringDrafts', 'api_getDraftMonitoringDetail', 'api_adminDeleteDraft',
    'api_listDraftRestoreRequests', 'api_processDraftRestoreRequest', 'api_adminDirectRestoreDraft',
    'api_runDraftStaleReminderSweep', 'api_retryFailedEmailLog', 'api_listEmailLogs',
    'api_createManualBackup', 'api_runScheduledWeeklyBackup', 'api_listBackupHistory',
    'api_setBackupImportant', 'api_previewRestoreBackup', 'api_executeSafeRestore',
    'api_listPhotoArchive', 'api_restoreArchivedPhoto', 'api_runArchiveRetentionPurge'
  ]);

  function identityMayAccess(role, routeOrAction) {
    if (!role || !routeOrAction) return false;
    if (role === TM_CONFIG.ROLES.SUPER_ADMIN) {
      return SUPER_ADMIN_ROUTES.indexOf(routeOrAction) !== -1 || String(routeOrAction).indexOf('api_') === 0;
    }
    if (role === TM_CONFIG.ROLES.TRAINER) {
      return TRAINER_ROUTES.indexOf(routeOrAction) !== -1;
    }
    if (role === TM_CONFIG.ROLES.MANAJEMEN) {
      return SHARED_AUTH_ROUTES.indexOf(routeOrAction) !== -1;
    }
    return false;
  }

  // LRU Session State Cache mengikuti pola integration-token-file-cache.ts (Orca)
  var _sessionLruKeys = [];
  var _sessionLruMap = {};

  function lruTouchSession(authSessionId, sessionRec) {
    var idx = _sessionLruKeys.indexOf(authSessionId);
    if (idx !== -1) _sessionLruKeys.splice(idx, 1);
    _sessionLruKeys.push(authSessionId);
    _sessionLruMap[authSessionId] = sessionRec;
    while (_sessionLruKeys.length > MAX_CREDENTIAL_ENTRIES) {
      var oldest = _sessionLruKeys.shift();
      if (oldest !== undefined) delete _sessionLruMap[oldest];
    }
  }

  function lruForgetSession(authSessionId) {
    var idx = _sessionLruKeys.indexOf(authSessionId);
    if (idx !== -1) _sessionLruKeys.splice(idx, 1);
    delete _sessionLruMap[authSessionId];
  }

  // Token-Bucket Rate Limiter mengikuti pola client-ip-rate-limit.ts (Orca)
  var _rateBuckets = {};
  var _rateBucketKeys = [];

  function checkRateLimit(key) {
    var capacity = TM_CONFIG.AUTH.RATE_LIMIT_MAX_ATTEMPTS;
    var windowMs = TM_CONFIG.AUTH.RATE_LIMIT_WINDOW_SEC * 1000;
    var nowMs = TM_Utils.now().getTime();
    var cacheKey = 'RL_' + TM_Security.sha256Hex(key).slice(0, 24);

    var bucket = _rateBuckets[cacheKey];
    try {
      var cache = TM_Db.getScriptCache();
      if (!bucket) {
        var raw = cache.get(cacheKey);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed.tokens === 'number' && typeof parsed.updatedAt === 'number') {
            bucket = parsed;
          }
        }
      }
      var currentTokens = capacity;
      if (bucket) {
        var refilled = ((nowMs - bucket.updatedAt) * capacity) / windowMs;
        currentTokens = Math.min(capacity, bucket.tokens + Math.max(0, refilled));
      }
      var nextBucket = {
        tokens: currentTokens < 1 ? currentTokens : currentTokens - 1,
        updatedAt: nowMs
      };
      var kIdx = _rateBucketKeys.indexOf(cacheKey);
      if (kIdx !== -1) _rateBucketKeys.splice(kIdx, 1);
      _rateBucketKeys.push(cacheKey);
      _rateBuckets[cacheKey] = nextBucket;
      while (_rateBucketKeys.length > MAX_TRACKED_RATE_KEYS) {
        var oldestKey = _rateBucketKeys.shift();
        if (oldestKey !== undefined) delete _rateBuckets[oldestKey];
      }
      cache.put(cacheKey, JSON.stringify(nextBucket), TM_CONFIG.AUTH.RATE_LIMIT_WINDOW_SEC);
      if (currentTokens < 1) {
        throw TM_Utils.AppError('ERR_RATE_LIMIT', 'Terlalu banyak percobaan login. Silakan tunggu beberapa menit sebelum mencoba lagi.');
      }
    } catch (e) {
      if (e && e.isAppError) throw e;
    }
  }

  function sanitizeUser(u) {
    if (!u) return null;
    return {
      UserID: u.UserID,
      Name: u.Name,
      Username: u.Username,
      Email: u.Email,
      Role: u.Role,
      Status: u.Status,
      FailedLoginCount: parseInt(u.FailedLoginCount || '0', 10),
      LockedUntil: u.LockedUntil || '',
      MustChangePassword: u.MustChangePassword === 'true',
      CreatedAt: u.CreatedAt,
      UpdatedAt: u.UpdatedAt
    };
  }

  function cacheSession(sessionRec) {
    if (!sessionRec || !sessionRec.AuthSessionID) return;
    lruTouchSession(sessionRec.AuthSessionID, sessionRec);
    try {
      TM_Db.getScriptCache().put(
        SESSION_CACHE_PREFIX + sessionRec.AuthSessionID,
        JSON.stringify(sessionRec),
        1800
      );
    } catch (e) {
      // ignore cache failure
    }
  }

  function getCachedOrSheetSession(authSessionId) {
    if (_sessionLruMap[authSessionId]) {
      var memHit = _sessionLruMap[authSessionId];
      lruTouchSession(authSessionId, memHit);
      return memHit;
    }
    try {
      var cached = TM_Db.getScriptCache().get(SESSION_CACHE_PREFIX + authSessionId);
      if (cached) {
        var parsed = JSON.parse(cached);
        lruTouchSession(authSessionId, parsed);
        return parsed;
      }
    } catch (e) {
      // fallback to sheet
    }
    var rec = TM_Db.findById('AuthSessions', 'AuthSessionID', authSessionId);
    if (rec) cacheSession(rec);
    return rec;
  }

  function invalidateSessionCache(authSessionId) {
    lruForgetSession(authSessionId);
    try {
      TM_Db.getScriptCache().remove(SESSION_CACHE_PREFIX + authSessionId);
    } catch (e) {
      // ignore
    }
  }

  function revokeAllUserSessions(userId) {
    var ts = TM_Utils.formatWibIso();
    var sessions = TM_Db.filterRecords('AuthSessions', function (s) {
      return s.UserID === userId && !s.RevokedAt;
    });
    for (var i = 0; i < sessions.length; i++) {
      var sid = sessions[i].AuthSessionID;
      TM_Db.updateRecordById('AuthSessions', 'AuthSessionID', sid, function (rec) {
        rec.RevokedAt = ts;
        return rec;
      });
      invalidateSessionCache(sid);
    }
  }

  function login(usernameInput, passwordInput, deviceInfo) {
    if (!TM_Bootstrap.isInitialized()) {
      throw TM_Utils.AppError('ERR_NOT_INITIALIZED', 'Aplikasi belum di-bootstrap.');
    }

    var username = TM_Utils.sanitizeText(usernameInput).toLowerCase();
    var password = String(passwordInput || '');
    var dev = TM_Utils.sanitizeText(deviceInfo || 'Unknown Device');

    if (!username || !password) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Username dan password wajib diisi.');
    }

    checkRateLimit('USER:' + username);
    if (dev) {
      checkRateLimit('DEV:' + dev);
    }

    var user = TM_Db.findRecord('Users', function (u) {
      return String(u.Username).toLowerCase() === username;
    });

    if (!user) {
      TM_Audit.logEvent({
        userId: 'ANONYMOUS',
        action: 'LOGIN_FAILED',
        entityType: 'Users',
        entityId: username,
        deviceInfo: dev,
        description: 'Percobaan login dengan username tidak ditemukan: ' + username
      });
      throw TM_Utils.AppError('ERR_INVALID_CREDENTIALS', 'Username atau password salah.');
    }

    if (user.Status !== TM_CONFIG.STATUS.ACTIVE) {
      TM_Audit.logEvent({
        userId: user.UserID,
        action: 'LOGIN_FAILED_INACTIVE',
        entityType: 'Users',
        entityId: user.UserID,
        deviceInfo: dev,
        description: 'Percobaan login pada akun nonaktif'
      });
      throw TM_Utils.AppError('ERR_ACCOUNT_INACTIVE', 'Akun Anda sedang dinonaktifkan. Hubungi Super Admin.');
    }

    var nowMs = TM_Utils.now().getTime();
    if (user.LockedUntil) {
      var lockedMs = new Date(user.LockedUntil).getTime();
      if (!isNaN(lockedMs) && nowMs < lockedMs) {
        var minsLeft = Math.ceil((lockedMs - nowMs) / 60000);
        TM_Audit.logEvent({
          userId: user.UserID,
          action: 'LOGIN_BLOCKED_LOCKED',
          entityType: 'Users',
          entityId: user.UserID,
          deviceInfo: dev,
          description: 'Percobaan login saat akun terkunci (' + minsLeft + ' menit tersisa)'
        });
        throw TM_Utils.AppError(
          'ERR_ACCOUNT_LOCKED',
          'Akun terkunci sementara karena 5 kali gagal login. Coba lagi dalam ' + minsLeft + ' menit atau hubungi Super Admin.'
        );
      }
    }

    var validPw = TM_Security.verifyPassword(password, user.PasswordHash);
    if (!validPw) {
      var nextFailCount = parseInt(user.FailedLoginCount || '0', 10) + 1;
      // Jika sebelumnya sudah lewat masa lockout, mulai hitung lagi atau langsung kunci jika >= 5
      if (user.LockedUntil && new Date(user.LockedUntil).getTime() <= nowMs) {
        nextFailCount = 1;
      }
      var lockUntil = '';
      var shouldLock = nextFailCount >= TM_CONFIG.AUTH.MAX_FAILED_LOGINS;
      if (shouldLock) {
        lockUntil = TM_Utils.addMinutesIso(TM_Utils.now(), TM_CONFIG.AUTH.LOCKOUT_MINUTES);
      }
      var tsFail = TM_Utils.formatWibIso();
      TM_Db.updateRecordById('Users', 'UserID', user.UserID, function (rec) {
        rec.FailedLoginCount = String(nextFailCount);
        rec.LockedUntil = lockUntil;
        rec.UpdatedAt = tsFail;
        return rec;
      });

      TM_Audit.logEvent({
        userId: user.UserID,
        action: shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        entityType: 'Users',
        entityId: user.UserID,
        afterData: { failedLoginCount: nextFailCount, lockedUntil: lockUntil },
        deviceInfo: dev,
        description: shouldLock
          ? 'Akun dikunci 15 menit setelah 5 kegagalan login'
          : 'Password salah (percobaan ke-' + nextFailCount + ')'
      });

      if (shouldLock) {
        throw TM_Utils.AppError(
          'ERR_ACCOUNT_LOCKED',
          'Password salah 5 kali. Akun dikunci selama ' + TM_CONFIG.AUTH.LOCKOUT_MINUTES + ' menit.'
        );
      }
      throw TM_Utils.AppError('ERR_INVALID_CREDENTIALS', 'Username atau password salah.');
    }

    // Login berhasil: reset counter & buat AuthSession baru
    var tsNow = TM_Utils.formatWibIso();
    var updatedUser = TM_Db.updateRecordById('Users', 'UserID', user.UserID, function (rec) {
      rec.FailedLoginCount = '0';
      rec.LockedUntil = '';
      rec.UpdatedAt = tsNow;
      return rec;
    });

    var authSessionId = TM_Utils.generateId('SESAUTH');
    var rawToken = TM_Security.signSessionToken(authSessionId, {
      userId: user.UserID,
      role: user.Role
    });
    var sessionRec = {
      AuthSessionID: authSessionId,
      UserID: user.UserID,
      TokenHash: TM_Security.sha256Hex(rawToken),
      RoleSnapshot: user.Role,
      DeviceInfo: dev,
      IssuedAt: tsNow,
      LastActivityAt: tsNow,
      ExpiresAt: TM_Utils.addHoursIso(TM_Utils.now(), TM_CONFIG.AUTH.SESSION_MAX_HOURS),
      RevokedAt: ''
    };
    TM_Db.insertRecord('AuthSessions', sessionRec);
    cacheSession(sessionRec);

    TM_Audit.logEvent({
      userId: user.UserID,
      action: 'LOGIN_SUCCESS',
      entityType: 'AuthSessions',
      entityId: authSessionId,
      afterData: { role: user.Role, expiresAt: sessionRec.ExpiresAt },
      deviceInfo: dev,
      description: 'Login berhasil'
    });

    return {
      token: rawToken,
      user: sanitizeUser(updatedUser || user),
      mustChangePassword: user.MustChangePassword === 'true',
      expiresAt: sessionRec.ExpiresAt
    };
  }

  function requireAuth(token, allowedRoles, opts) {
    if (!TM_Bootstrap.isInitialized()) {
      throw TM_Utils.AppError('ERR_NOT_INITIALIZED', 'Aplikasi belum di-bootstrap.');
    }
    var options = opts || {};
    var cleanToken = TM_Security.readBearerToken(token);
    var authSessionId = TM_Security.verifySessionToken(cleanToken);
    if (!authSessionId) {
      throw TM_Utils.AppError('ERR_UNAUTHORIZED', 'Sesi tidak valid. Silakan login kembali.');
    }

    var sessionRec = getCachedOrSheetSession(authSessionId);
    if (!sessionRec || !TM_Security.constantTimeEquals(sessionRec.TokenHash, TM_Security.sha256Hex(cleanToken))) {
      throw TM_Utils.AppError('ERR_UNAUTHORIZED', 'Sesi tidak ditemukan. Silakan login kembali.');
    }
    if (sessionRec.RevokedAt) {
      throw TM_Utils.AppError('ERR_SESSION_REVOKED', 'Sesi telah diakhiri. Silakan login kembali.');
    }

    var nowMs = TM_Utils.now().getTime();
    var expiresMs = new Date(sessionRec.ExpiresAt).getTime();
    var lastActMs = new Date(sessionRec.LastActivityAt).getTime();
    var idleLimitMs = TM_CONFIG.AUTH.SESSION_IDLE_MINUTES * 60000;

    if (isNaN(expiresMs) || nowMs >= expiresMs) {
      TM_Db.updateRecordById('AuthSessions', 'AuthSessionID', authSessionId, function (rec) {
        rec.RevokedAt = TM_Utils.formatWibIso();
        return rec;
      });
      invalidateSessionCache(authSessionId);
      throw TM_Utils.AppError('ERR_SESSION_EXPIRED', 'Batas waktu sesi 8 jam telah berakhir. Silakan login kembali.');
    }

    if (isNaN(lastActMs) || (nowMs - lastActMs) > idleLimitMs) {
      TM_Db.updateRecordById('AuthSessions', 'AuthSessionID', authSessionId, function (rec) {
        rec.RevokedAt = TM_Utils.formatWibIso();
        return rec;
      });
      invalidateSessionCache(authSessionId);
      throw TM_Utils.AppError('ERR_SESSION_IDLE_TIMEOUT', 'Sesi berakhir karena tidak ada aktivitas selama 30 menit.');
    }

    var user = TM_Db.findById('Users', 'UserID', sessionRec.UserID);
    if (!user || user.Status !== TM_CONFIG.STATUS.ACTIVE) {
      throw TM_Utils.AppError('ERR_ACCOUNT_INACTIVE', 'Akun tidak aktif atau tidak ditemukan.');
    }

    if (user.MustChangePassword === 'true' && !options.allowMustChangePassword) {
      throw TM_Utils.AppError('ERR_MUST_CHANGE_PASSWORD', 'Anda harus mengganti password terlebih dahulu sebelum mengakses sistem.');
    }

    if (allowedRoles && allowedRoles.length > 0 && allowedRoles.indexOf(user.Role) === -1) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak memiliki hak akses untuk tindakan ini.');
    }

    // Update LastActivityAt (cache selalu, sheet di-throttle per 60 detik untuk efisiensi)
    var tsNow = TM_Utils.formatWibIso();
    sessionRec.LastActivityAt = tsNow;
    cacheSession(sessionRec);
    if ((nowMs - lastActMs) >= 60000) {
      TM_Db.updateRecordById('AuthSessions', 'AuthSessionID', authSessionId, function (rec) {
        rec.LastActivityAt = tsNow;
        return rec;
      });
    }

    return {
      user: sanitizeUser(user),
      session: sessionRec
    };
  }

  function logout(token) {
    var authSessionId = TM_Security.verifySessionToken(token);
    if (!authSessionId) {
      return { loggedOut: true };
    }
    var sessionRec = getCachedOrSheetSession(authSessionId);
    if (sessionRec && !sessionRec.RevokedAt) {
      var tsNow = TM_Utils.formatWibIso();
      TM_Db.updateRecordById('AuthSessions', 'AuthSessionID', authSessionId, function (rec) {
        rec.RevokedAt = tsNow;
        return rec;
      });
      invalidateSessionCache(authSessionId);
      TM_Audit.logEvent({
        userId: sessionRec.UserID,
        action: 'LOGOUT',
        entityType: 'AuthSessions',
        entityId: authSessionId,
        deviceInfo: sessionRec.DeviceInfo,
        description: 'Logout manual oleh pengguna'
      });
    }
    return { loggedOut: true };
  }

  function requestPasswordReset(emailInput, appUrl) {
    if (!TM_Bootstrap.isInitialized()) {
      throw TM_Utils.AppError('ERR_NOT_INITIALIZED', 'Aplikasi belum di-bootstrap.');
    }
    var email = TM_Utils.sanitizeText(emailInput).toLowerCase();
    if (!TM_Utils.isValidEmail(email)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Format email tidak valid.');
    }

    checkRateLimit('RESET:' + email);

    var user = TM_Db.findRecord('Users', function (u) {
      return String(u.Email).toLowerCase() === email && u.Status === TM_CONFIG.STATUS.ACTIVE;
    });

    if (user) {
      var rawResetToken = TM_Security.randomHex(32);
      var tokenHash = TM_Security.sha256Hex(rawResetToken);
      var expiresAt = TM_Utils.addMinutesIso(TM_Utils.now(), TM_CONFIG.AUTH.RESET_TOKEN_MINUTES);
      var tsNow = TM_Utils.formatWibIso();

      TM_Db.updateRecordById('Users', 'UserID', user.UserID, function (rec) {
        rec.ResetTokenHash = tokenHash;
        rec.ResetTokenExpiresAt = expiresAt;
        rec.UpdatedAt = tsNow;
        return rec;
      });

      var baseUrl = TM_Utils.sanitizeText(appUrl);
      if (!baseUrl && typeof ScriptApp !== 'undefined' && ScriptApp.getService) {
        try {
          baseUrl = ScriptApp.getService().getUrl() || '';
        } catch (e) {
          baseUrl = '';
        }
      }
      var sep = baseUrl.indexOf('?') === -1 ? '?' : '&';
      var resetLink = baseUrl ? (baseUrl + sep + 'mode=reset&token=' + encodeURIComponent(rawResetToken)) : rawResetToken;

      var mailSent = false;
      var mailError = '';
      if (typeof MailApp !== 'undefined' && MailApp.sendEmail) {
        try {
          MailApp.sendEmail({
            to: user.Email,
            subject: '[' + TM_CONFIG.APP_NAME + '] Tautan Reset Password',
            body:
              'Halo ' + user.Name + ',\n\n' +
              'Kami menerima permintaan reset password untuk akun Anda (' + user.Username + ').\n' +
              'Gunakan tautan atau token sekali pakai berikut (berlaku ' + TM_CONFIG.AUTH.RESET_TOKEN_MINUTES + ' menit):\n\n' +
              resetLink + '\n\n' +
              'Token Reset: ' + rawResetToken + '\n\n' +
              'Jika Anda tidak meminta reset password, abaikan email ini.'
          });
          mailSent = true;
        } catch (e) {
          mailError = e && e.message ? e.message : String(e);
        }
      }

      TM_Audit.logEvent({
        userId: user.UserID,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'Users',
        entityId: user.UserID,
        afterData: { expiresAt: expiresAt, mailSent: mailSent, mailError: mailError },
        description: 'Permintaan reset password melalui email'
      });
    }

    return {
      accepted: true,
      message: 'Jika email terdaftar dan aktif, instruksi reset password telah dikirim ke email Anda.'
    };
  }

  function confirmPasswordReset(resetToken, newPassword) {
    if (!TM_Bootstrap.isInitialized()) {
      throw TM_Utils.AppError('ERR_NOT_INITIALIZED', 'Aplikasi belum di-bootstrap.');
    }
    var tokenStr = TM_Utils.sanitizeText(resetToken);
    if (!tokenStr) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Token reset password tidak boleh kosong.');
    }
    var pwErr = TM_Security.validatePasswordStrength(newPassword);
    if (pwErr) {
      throw TM_Utils.AppError('ERR_VALIDATION', pwErr);
    }

    var tokenHash = TM_Security.sha256Hex(tokenStr);
    var user = TM_Db.findRecord('Users', function (u) {
      return u.ResetTokenHash && TM_Security.constantTimeEquals(u.ResetTokenHash, tokenHash);
    });

    if (!user) {
      throw TM_Utils.AppError('ERR_INVALID_RESET_TOKEN', 'Tautan atau token reset password tidak valid atau sudah digunakan.');
    }

    var nowMs = TM_Utils.now().getTime();
    var expMs = new Date(user.ResetTokenExpiresAt).getTime();
    if (!user.ResetTokenExpiresAt || isNaN(expMs) || nowMs > expMs) {
      throw TM_Utils.AppError('ERR_RESET_TOKEN_EXPIRED', 'Token reset password telah kedaluwarsa. Silakan ajukan ulang.');
    }

    var tsNow = TM_Utils.formatWibIso();
    TM_Db.updateRecordById('Users', 'UserID', user.UserID, function (rec) {
      rec.PasswordHash = TM_Security.hashPassword(newPassword);
      rec.ResetTokenHash = '';
      rec.ResetTokenExpiresAt = '';
      rec.MustChangePassword = 'false';
      rec.FailedLoginCount = '0';
      rec.LockedUntil = '';
      rec.UpdatedAt = tsNow;
      return rec;
    });

    revokeAllUserSessions(user.UserID);

    TM_Audit.logEvent({
      userId: user.UserID,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'Users',
      entityId: user.UserID,
      description: 'Pengguna berhasil melakukan reset password melalui tautan sekali pakai'
    });

    return { reset: true };
  }

  function changePasswordRequired(token, currentPassword, newPassword) {
    var ctx = requireAuth(token, null, { allowMustChangePassword: true });
    var user = TM_Db.findById('Users', 'UserID', ctx.user.UserID);
    if (!user) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Pengguna tidak ditemukan.');
    }
    if (!TM_Security.verifyPassword(String(currentPassword || ''), user.PasswordHash)) {
      throw TM_Utils.AppError('ERR_INVALID_CREDENTIALS', 'Password saat ini salah.');
    }
    if (String(currentPassword) === String(newPassword)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Password baru harus berbeda dari password saat ini.');
    }
    var pwErr = TM_Security.validatePasswordStrength(newPassword);
    if (pwErr) {
      throw TM_Utils.AppError('ERR_VALIDATION', pwErr);
    }

    var tsNow = TM_Utils.formatWibIso();
    var updated = TM_Db.updateRecordById('Users', 'UserID', user.UserID, function (rec) {
      rec.PasswordHash = TM_Security.hashPassword(newPassword);
      rec.MustChangePassword = 'false';
      rec.UpdatedAt = tsNow;
      return rec;
    });

    TM_Audit.logEvent({
      userId: user.UserID,
      action: 'PASSWORD_CHANGED',
      entityType: 'Users',
      entityId: user.UserID,
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Pengguna mengganti password'
    });

    return {
      changed: true,
      user: sanitizeUser(updated)
    };
  }

  return {
    sanitizeUser: sanitizeUser,
    identityMayAccess: identityMayAccess,
    login: login,
    requireAuth: requireAuth,
    logout: logout,
    revokeAllUserSessions: revokeAllUserSessions,
    requestPasswordReset: requestPasswordReset,
    confirmPasswordReset: confirmPasswordReset,
    changePasswordRequired: changePasswordRequired
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Auth: TM_Auth };
}
