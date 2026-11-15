/**
 * Users.gs — Pengelolaan akun pengguna oleh Super Admin (tanpa penghapusan permanen).
 */

var TM_Users = (function () {
  var ALLOWED_ROLES = [
    TM_CONFIG.ROLES.SUPER_ADMIN,
    TM_CONFIG.ROLES.TRAINER,
    TM_CONFIG.ROLES.MANAJEMEN
  ];

  function countActiveSuperAdmins(excludeUserId) {
    var users = TM_Db.getAllRecords('Users');
    var count = 0;
    for (var i = 0; i < users.length; i++) {
      if (
        users[i].UserID !== excludeUserId &&
        users[i].Role === TM_CONFIG.ROLES.SUPER_ADMIN &&
        users[i].Status === TM_CONFIG.STATUS.ACTIVE
      ) {
        count++;
      }
    }
    return count;
  }

  function listUsers(token) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var users = TM_Db.getAllRecords('Users');
    users.sort(function (a, b) {
      return String(b.CreatedAt).localeCompare(String(a.CreatedAt));
    });
    return users.map(TM_Auth.sanitizeUser);
  }

  function createUser(token, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var p = dto || {};
    var name = TM_Utils.sanitizeText(p.name);
    var username = TM_Utils.sanitizeText(p.username).toLowerCase();
    var email = TM_Utils.sanitizeText(p.email).toLowerCase();
    var role = TM_Utils.sanitizeText(p.role);
    var password = String(p.password || '');

    if (!name || name.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama pengguna wajib diisi (minimal 2 karakter).');
    }
    if (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Username harus 3–32 karakter (huruf kecil, angka, ., _, -).');
    }
    if (!TM_Utils.isValidEmail(email)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Format email tidak valid.');
    }
    if (ALLOWED_ROLES.indexOf(role) === -1) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Role tidak valid.');
    }
    var pwErr = TM_Security.validatePasswordStrength(password);
    if (pwErr) {
      throw TM_Utils.AppError('ERR_VALIDATION', pwErr);
    }

    return TM_Db.withLock(function () {
      var existing = TM_Db.getAllRecords('Users');
      for (var i = 0; i < existing.length; i++) {
        if (String(existing[i].Username).toLowerCase() === username) {
          throw TM_Utils.AppError('ERR_DUPLICATE', 'Username "' + username + '" sudah digunakan.');
        }
        if (String(existing[i].Email).toLowerCase() === email) {
          throw TM_Utils.AppError('ERR_DUPLICATE', 'Email "' + email + '" sudah digunakan.');
        }
      }

      var ts = TM_Utils.formatWibIso();
      var newUser = {
        UserID: TM_Utils.generateId('USR'),
        Name: name,
        Username: username,
        Email: email,
        PasswordHash: TM_Security.hashPassword(password),
        Role: role,
        Status: TM_CONFIG.STATUS.ACTIVE,
        FailedLoginCount: '0',
        LockedUntil: '',
        MustChangePassword: 'true',
        ResetTokenHash: '',
        ResetTokenExpiresAt: '',
        CreatedAt: ts,
        UpdatedAt: ts
      };

      TM_Db.insertRecord('Users', newUser);

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'USER_CREATED',
        entityType: 'Users',
        entityId: newUser.UserID,
        afterData: TM_Auth.sanitizeUser(newUser),
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Membuat akun pengguna baru: ' + newUser.Username + ' (' + newUser.Role + ')'
      });

      return TM_Auth.sanitizeUser(newUser);
    });
  }

  function updateUser(token, userId, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var p = dto || {};
    var name = TM_Utils.sanitizeText(p.name);
    var email = TM_Utils.sanitizeText(p.email).toLowerCase();
    var role = TM_Utils.sanitizeText(p.role);

    if (!name || name.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama pengguna wajib diisi.');
    }
    if (!TM_Utils.isValidEmail(email)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Format email tidak valid.');
    }
    if (ALLOWED_ROLES.indexOf(role) === -1) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Role tidak valid.');
    }

    return TM_Db.withLock(function () {
      var target = TM_Db.findById('Users', 'UserID', userId);
      if (!target) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Pengguna tidak ditemukan.');
      }

      if (
        target.Role === TM_CONFIG.ROLES.SUPER_ADMIN &&
        role !== TM_CONFIG.ROLES.SUPER_ADMIN &&
        countActiveSuperAdmins(target.UserID) === 0
      ) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Tidak dapat menurunkan role Super Admin aktif terakhir.');
      }

      var allUsers = TM_Db.getAllRecords('Users');
      for (var i = 0; i < allUsers.length; i++) {
        if (allUsers[i].UserID !== userId && String(allUsers[i].Email).toLowerCase() === email) {
          throw TM_Utils.AppError('ERR_DUPLICATE', 'Email "' + email + '" sudah digunakan pengguna lain.');
        }
      }

      var before = TM_Auth.sanitizeUser(target);
      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Users', 'UserID', userId, function (rec) {
        rec.Name = name;
        rec.Email = email;
        rec.Role = role;
        rec.UpdatedAt = ts;
        return rec;
      });

      if (target.Role !== role) {
        TM_Auth.revokeAllUserSessions(userId);
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'USER_UPDATED',
        entityType: 'Users',
        entityId: userId,
        beforeData: before,
        afterData: TM_Auth.sanitizeUser(updated),
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Memperbarui profil/role pengguna ' + target.Username
      });

      return TM_Auth.sanitizeUser(updated);
    });
  }

  function setUserStatus(token, userId, status) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    if (status !== TM_CONFIG.STATUS.ACTIVE && status !== TM_CONFIG.STATUS.INACTIVE) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Status akun tidak valid.');
    }

    return TM_Db.withLock(function () {
      var target = TM_Db.findById('Users', 'UserID', userId);
      if (!target) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Pengguna tidak ditemukan.');
      }
      if (target.UserID === ctx.user.UserID && status === TM_CONFIG.STATUS.INACTIVE) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Anda tidak dapat menonaktifkan akun Anda sendiri.');
      }
      if (
        target.Role === TM_CONFIG.ROLES.SUPER_ADMIN &&
        status === TM_CONFIG.STATUS.INACTIVE &&
        countActiveSuperAdmins(target.UserID) === 0
      ) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Minimal harus ada satu Super Admin aktif.');
      }

      var before = TM_Auth.sanitizeUser(target);
      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Users', 'UserID', userId, function (rec) {
        rec.Status = status;
        rec.UpdatedAt = ts;
        return rec;
      });

      if (status === TM_CONFIG.STATUS.INACTIVE) {
        TM_Auth.revokeAllUserSessions(userId);
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: status === TM_CONFIG.STATUS.ACTIVE ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'Users',
        entityId: userId,
        beforeData: before,
        afterData: TM_Auth.sanitizeUser(updated),
        deviceInfo: ctx.session.DeviceInfo,
        description: (status === TM_CONFIG.STATUS.ACTIVE ? 'Mengaktifkan' : 'Menonaktifkan') + ' akun ' + target.Username
      });

      return TM_Auth.sanitizeUser(updated);
    });
  }

  function unlockUser(token, userId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var target = TM_Db.findById('Users', 'UserID', userId);
    if (!target) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Pengguna tidak ditemukan.');
    }

    var before = TM_Auth.sanitizeUser(target);
    var ts = TM_Utils.formatWibIso();
    var updated = TM_Db.updateRecordById('Users', 'UserID', userId, function (rec) {
      rec.FailedLoginCount = '0';
      rec.LockedUntil = '';
      rec.UpdatedAt = ts;
      return rec;
    });

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'USER_UNLOCKED',
      entityType: 'Users',
      entityId: userId,
      beforeData: before,
      afterData: TM_Auth.sanitizeUser(updated),
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Super Admin membuka kunci login akun ' + target.Username + ' lebih awal'
    });

    return TM_Auth.sanitizeUser(updated);
  }

  function adminResetPassword(token, userId, tempPassword) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var target = TM_Db.findById('Users', 'UserID', userId);
    if (!target) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Pengguna tidak ditemukan.');
    }

    var newTempPw = String(tempPassword || '');
    var pwErr = TM_Security.validatePasswordStrength(newTempPw);
    if (pwErr) {
      throw TM_Utils.AppError('ERR_VALIDATION', pwErr);
    }

    var ts = TM_Utils.formatWibIso();
    var updated = TM_Db.updateRecordById('Users', 'UserID', userId, function (rec) {
      rec.PasswordHash = TM_Security.hashPassword(newTempPw);
      rec.MustChangePassword = 'true';
      rec.FailedLoginCount = '0';
      rec.LockedUntil = '';
      rec.ResetTokenHash = '';
      rec.ResetTokenExpiresAt = '';
      rec.UpdatedAt = ts;
      return rec;
    });

    TM_Auth.revokeAllUserSessions(userId);

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'ADMIN_PASSWORD_RESET',
      entityType: 'Users',
      entityId: userId,
      afterData: { targetUsername: target.Username, mustChangePassword: true },
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Super Admin mereset password akun ' + target.Username + ' (wajib ganti saat login berikutnya)'
    });

    return TM_Auth.sanitizeUser(updated);
  }

  return {
    listUsers: listUsers,
    createUser: createUser,
    updateUser: updateUser,
    setUserStatus: setUserStatus,
    unlockUser: unlockUser,
    adminResetPassword: adminResetPassword
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Users: TM_Users };
}
