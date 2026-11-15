const test = require('node:test');
const assert = require('node:assert/strict');
const { createGasEnv } = require('./mocks/gas-mocks');

function bootstrapDefault(env) {
  const res = env.ctx.api_runInitialBootstrap({
    companyName: 'PT Nusantara Food',
    name: 'Admin Utama',
    username: 'superadmin',
    email: 'admin@nusantara.test',
    password: 'Password123',
    deviceInfo: 'NodeTest'
  });
  assert.equal(res.ok, true, res.error && res.error.message);
  return res.data;
}

test('Phase 1: Bootstrap hanya bisa dijalankan sekali, membuat 20 sheet, Drive privat, seed Master Data, & hash password', () => {
  const env = createGasEnv();

  const statusBefore = env.ctx.api_getBootstrapStatus();
  assert.equal(statusBefore.ok, true);
  assert.equal(statusBefore.data.initialized, false);

  const boot = bootstrapDefault(env);
  assert.equal(boot.initialized, true);
  assert.equal(boot.superAdmin.Username, 'superadmin');

  // Verifikasi 20 Sheet dibuat
  const ss = env.spreadsheets.get(boot.spreadsheetId);
  assert.equal(ss.getSheets().length, 20);

  // Verifikasi seed 8 Categories & 7 Sections
  const cats = env.ctx.TM_Db.getAllRecords('Categories');
  const secs = env.ctx.TM_Db.getAllRecords('Sections');
  assert.equal(cats.length, 8);
  assert.equal(secs.length, 7);

  // Verifikasi Drive folders dibuat & PRIVATE
  assert.equal(env.driveFolders.size, 5);
  for (const folder of env.driveFolders.values()) {
    assert.equal(folder.access, 'PRIVATE');
    assert.equal(folder.permission, 'NONE');
  }

  // Verifikasi password tidak disimpan plaintext
  const users = env.ctx.TM_Db.getAllRecords('Users');
  assert.equal(users.length, 1);
  assert.ok(users[0].PasswordHash.startsWith('pbkdf2$10000$'));
  assert.notEqual(users[0].PasswordHash, 'Password123');

  // Bootstrap kedua harus ditolak
  const second = env.ctx.api_runInitialBootstrap({
    companyName: 'Hack Corp',
    name: 'Attacker',
    username: 'attacker',
    email: 'a@evil.test',
    password: 'Password123'
  });
  assert.equal(second.ok, false);
  assert.equal(second.error.code, 'ERR_BOOTSTRAP_DISABLED');
});

test('Phase 1: Login, lockout setelah 5 kali gagal selama 15 menit, & unlock oleh Super Admin', () => {
  const env = createGasEnv();
  let currentTime = new Date('2026-11-10T10:00:00+07:00').getTime();
  env.ctx.TM_Utils.setNowProvider(() => currentTime);

  bootstrapDefault(env);

  const loginAdmin = env.ctx.api_login('superadmin', 'Password123', 'PC-Chrome');
  assert.equal(loginAdmin.ok, true);
  const adminToken = loginAdmin.data.token;

  const created = env.ctx.api_createUser(adminToken, {
    name: 'Budi Trainer',
    username: 'budi.trainer',
    email: 'budi@nusantara.test',
    role: 'TRAINER',
    password: 'TempPassword1'
  });
  assert.equal(created.ok, true);

  // 5 kali password salah -> akun terkunci 15 menit
  for (let i = 1; i <= 4; i++) {
    const fail = env.ctx.api_login('budi.trainer', 'WrongPass1', 'Android-Chrome');
    assert.equal(fail.ok, false);
    assert.equal(fail.error.code, 'ERR_INVALID_CREDENTIALS');
  }
  const fifth = env.ctx.api_login('budi.trainer', 'WrongPass1', 'Android-Chrome');
  assert.equal(fifth.ok, false);
  assert.equal(fifth.error.code, 'ERR_ACCOUNT_LOCKED');

  // Login benar saat masih terkunci tetap ditolak
  currentTime += 5 * 60000; // +5 menit
  const blocked = env.ctx.api_login('budi.trainer', 'TempPassword1', 'Android-Chrome');
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error.code, 'ERR_ACCOUNT_LOCKED');

  // Super Admin membuka kunci lebih awal
  const unlocked = env.ctx.api_unlockUser(adminToken, created.data.UserID);
  assert.equal(unlocked.ok, true);

  // Login berhasil & wajib ganti password karena dibuat oleh Admin
  const okLogin = env.ctx.api_login('budi.trainer', 'TempPassword1', 'Android-Chrome');
  assert.equal(okLogin.ok, true);
  assert.equal(okLogin.data.mustChangePassword, true);

  // Endpoint lain ditolak sampai mengganti password
  const blockedSettings = env.ctx.api_getAppSettings(okLogin.data.token);
  assert.equal(blockedSettings.ok, false);
  assert.equal(blockedSettings.error.code, 'ERR_MUST_CHANGE_PASSWORD');

  // Ganti password wajib
  const changed = env.ctx.api_changePasswordRequired(okLogin.data.token, 'TempPassword1', 'BudiBaru2026');
  assert.equal(changed.ok, true);

  const allowedSettings = env.ctx.api_getAppSettings(okLogin.data.token);
  assert.equal(allowedSettings.ok, true);
  assert.equal(allowedSettings.data.companyName, 'PT Nusantara Food');
});

test('Phase 1: Session idle timeout 30 menit, maksimum 8 jam, dan logout membatalkan token', () => {
  const env = createGasEnv();
  let currentTime = new Date('2026-11-10T08:00:00+07:00').getTime();
  env.ctx.TM_Utils.setNowProvider(() => currentTime);

  bootstrapDefault(env);
  const login1 = env.ctx.api_login('superadmin', 'Password123', 'PC');
  const token1 = login1.data.token;

  // Idle 31 menit -> ditolak
  currentTime += 31 * 60000;
  const idleRes = env.ctx.api_validateSession(token1);
  assert.equal(idleRes.ok, false);
  assert.equal(idleRes.error.code, 'ERR_SESSION_IDLE_TIMEOUT');

  // Login baru dan tetap aktif setiap 20 menit hingga lewat 8 jam -> tetap ditolak pada jam ke-8
  const login2 = env.ctx.api_login('superadmin', 'Password123', 'PC');
  const token2 = login2.data.token;
  for (let i = 0; i < 23; i++) {
    currentTime += 20 * 60000; // total 460 menit (7j 40m)
    assert.equal(env.ctx.api_validateSession(token2).ok, true);
  }
  currentTime += 25 * 60000; // total 485 menit (> 8 jam)
  const maxRes = env.ctx.api_validateSession(token2);
  assert.equal(maxRes.ok, false);
  assert.equal(maxRes.error.code, 'ERR_SESSION_EXPIRED');

  // Logout manual langsung menghanguskan token
  const login3 = env.ctx.api_login('superadmin', 'Password123', 'PC');
  const token3 = login3.data.token;
  assert.equal(env.ctx.api_logout(token3).ok, true);
  const afterLogout = env.ctx.api_validateSession(token3);
  assert.equal(afterLogout.ok, false);
  assert.equal(afterLogout.error.code, 'ERR_SESSION_REVOKED');
});

test('Phase 1: Reset password email sekali pakai & RBAC penolakan akses di backend', () => {
  const env = createGasEnv();
  let currentTime = new Date('2026-11-10T10:00:00+07:00').getTime();
  env.ctx.TM_Utils.setNowProvider(() => currentTime);

  bootstrapDefault(env);
  const adminToken = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;

  const mgmt = env.ctx.api_createUser(adminToken, {
    name: 'Siti Manajemen',
    username: 'siti.mgmt',
    email: 'siti@nusantara.test',
    role: 'MANAJEMEN',
    password: 'MgmtPassword1'
  }).data;

  // Manajemen login & ganti password wajib
  const mgmtLogin = env.ctx.api_login('siti.mgmt', 'MgmtPassword1', 'PC').data;
  env.ctx.api_changePasswordRequired(mgmtLogin.token, 'MgmtPassword1', 'MgmtSecure99');

  // Manajemen ditolak mengakses endpoint Super Admin
  assert.equal(env.ctx.api_listUsers(mgmtLogin.token).error.code, 'ERR_FORBIDDEN');
  assert.equal(env.ctx.api_queryAuditLogs(mgmtLogin.token, {}).error.code, 'ERR_FORBIDDEN');
  assert.equal(env.ctx.api_updateAppSettings(mgmtLogin.token, { companyName: 'X', maxActiveDrafts: 3 }).error.code, 'ERR_FORBIDDEN');

  // Request reset password via email
  const reqReset = env.ctx.api_requestPasswordReset('siti@nusantara.test', 'https://app.test/exec');
  assert.equal(reqReset.ok, true);
  assert.equal(env.sentEmails.length, 1);
  const body = env.sentEmails[0].body;
  const match = body.match(/Token Reset:\s*([a-f0-9]+)/i);
  assert.ok(match, 'Reset token harus terkirim pada email');
  const resetToken = match[1];

  // Konfirmasi reset
  const confirm = env.ctx.api_confirmPasswordReset(resetToken, 'SitiBaru2026');
  assert.equal(confirm.ok, true);

  // Token sekali pakai tidak boleh berhasil lagi
  const reuse = env.ctx.api_confirmPasswordReset(resetToken, 'SitiLagi2026');
  assert.equal(reuse.ok, false);
  assert.equal(reuse.error.code, 'ERR_INVALID_RESET_TOKEN');

  // Sesi lama milik Siti harus sudah ter-revoke setelah reset password
  assert.equal(env.ctx.api_validateSession(mgmtLogin.token).error.code, 'ERR_SESSION_REVOKED');

  // Login dengan password baru berhasil
  assert.equal(env.ctx.api_login('siti.mgmt', 'SitiBaru2026', 'PC').ok, true);

  // Super Admin query Audit Log mencatat akses ke Audit Log itu sendiri
  const auditRes = env.ctx.api_queryAuditLogs(adminToken, {});
  assert.equal(auditRes.ok, true);
  assert.ok(auditRes.data.items.some((x) => x.Action === 'AUDIT_LOG_ACCESSED'));

  // Verifikasi pola Orca: Structured 3-part Claims Token, Bearer prefix, & Route Matrix identityMayAccess
  assert.equal(adminToken.split('.').length, 3);
  const claims = env.ctx.TM_Security.verifySessionTokenClaims('Bearer ' + adminToken);
  assert.equal(claims.purpose, 'session-auth');
  assert.equal(claims.role, 'SUPER_ADMIN');
  assert.equal(env.ctx.api_validateSession('Bearer ' + adminToken).ok, true);
  assert.equal(env.ctx.TM_Auth.identityMayAccess('SUPER_ADMIN', 'api_listUsers'), true);
  assert.equal(env.ctx.TM_Auth.identityMayAccess('TRAINER', 'api_saveDraft'), true);
  assert.equal(env.ctx.TM_Auth.identityMayAccess('TRAINER', 'api_listUsers'), false);
  assert.equal(env.ctx.TM_Auth.identityMayAccess('MANAJEMEN', 'api_getDashboardData'), true);
  assert.equal(env.ctx.TM_Auth.identityMayAccess('MANAJEMEN', 'api_saveDraft'), false);
});
