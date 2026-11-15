const test = require('node:test');
const assert = require('node:assert/strict');
const { createGasEnv } = require('./mocks/gas-mocks');

test('Phase 8 — Notification Center (Read/Unread/All), Preferensi Opsional vs Wajib/Kritis, Larangan Pengingat Draft, & Retry Email Gagal', () => {
  const env = createGasEnv();
  env.ctx.TM_Utils.setNowProvider(() => new Date('2026-11-11T15:00:00+07:00').getTime());

  env.ctx.api_runInitialBootstrap({
    companyName: 'PT Kuliner Nusantara',
    name: 'Super Admin',
    username: 'superadmin',
    email: 'admin@kuliner.id',
    password: 'Password123'
  });

  const adminTok = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;
  env.ctx.api_createUser(adminTok, {
    name: 'Trainer Satu',
    username: 'trainer1',
    email: 'trainer1@kuliner.id',
    role: 'TRAINER',
    password: 'TempPassword1'
  });

  const t1Init = env.ctx.api_login('trainer1', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(t1Init, 'TempPassword1', 'TrainerPass1');
  const t1Tok = env.ctx.api_login('trainer1', 'TrainerPass1', 'Android').data.token;
  const trainerUser = env.ctx.api_validateSession(t1Tok).data.user;

  // 1. Cek Preferensi Default & Pastikan Keamanan Akun / Kegagalan Backup Kritis TIDAK BISA dinonaktifkan (PRD 14.2)
  const prefsInit = env.ctx.api_getMyNotificationPreferences(t1Tok).data;
  const secPref = prefsInit.preferences.find((p) => p.type === 'ACCOUNT_SECURITY');
  const bkpFailPref = prefsInit.preferences.find((p) => p.type === 'BACKUP_FAILURE');
  assert.equal(secPref.systemLockedMandatory, true);
  assert.equal(bkpFailPref.systemLockedMandatory, true);

  const disableSecRes = env.ctx.api_updateMyNotificationPreference(t1Tok, {
    type: 'ACCOUNT_SECURITY',
    inAppEnabled: false,
    emailEnabled: false
  });
  assert.equal(disableSecRes.ok, false);
  assert.equal(disableSecRes.error.code, 'ERR_MANDATORY_NOTIFICATION');

  const disableBkpFailRes = env.ctx.api_updateMyNotificationPreference(adminTok, {
    type: 'BACKUP_FAILURE',
    inAppEnabled: true,
    emailEnabled: false
  });
  assert.equal(disableBkpFailRes.ok, false);
  assert.equal(disableBkpFailRes.error.code, 'ERR_MANDATORY_NOTIFICATION');

  // 2. Pengguna dapat mengubah preferensi untuk notifikasi opsional (mis. SESSION_ACTIVITY)
  const optUpdate = env.ctx.api_updateMyNotificationPreference(t1Tok, {
    type: 'SESSION_ACTIVITY',
    inAppEnabled: false,
    emailEnabled: false
  });
  assert.equal(optUpdate.ok, true);
  assert.equal(optUpdate.data.inAppEnabled, false);

  // Ketika SESSION_ACTIVITY dikirim saat dinonaktifkan oleh Trainer, tidak membuat notifikasi In-App
  const suppressed = env.ctx.TM_Notifications.dispatchNotification({
    userId: trainerUser.UserID,
    type: 'SESSION_ACTIVITY',
    title: 'Sesi Disimpan',
    message: 'Sesi Anda telah disimpan.'
  });
  assert.equal(suppressed, null);

  // 3. Super Admin menetapkan SESSION_ACTIVITY sebagai Notifikasi Wajib organisasi (PRD 14.2)
  const policyRes = env.ctx.api_updateMandatoryNotificationPolicy(adminTok, [
    'SESSION_ACTIVITY',
    'DATA_MODIFICATION_DELETION',
    'DRAFT_RESTORE_WORKFLOW'
  ]).data;
  // ACCOUNT_SECURITY dan BACKUP_FAILURE tetap otomatis terkunci di dalam daftar wajib meskipun tidak disebut
  assert.ok(policyRes.mandatoryTypes.includes('ACCOUNT_SECURITY'));
  assert.ok(policyRes.mandatoryTypes.includes('BACKUP_FAILURE'));
  assert.ok(policyRes.mandatoryTypes.includes('SESSION_ACTIVITY'));

  // Sekarang SESSION_ACTIVITY bersifat wajib sehingga Trainer tidak boleh mematikannya dan pengiriman aktif kembali
  const tryDisableNowMandatory = env.ctx.api_updateMyNotificationPreference(t1Tok, {
    type: 'SESSION_ACTIVITY',
    inAppEnabled: false,
    emailEnabled: false
  });
  assert.equal(tryDisableNowMandatory.ok, false);
  assert.equal(tryDisableNowMandatory.error.code, 'ERR_MANDATORY_NOTIFICATION');

  const deliveredAfterMandatory = env.ctx.TM_Notifications.dispatchNotification({
    userId: trainerUser.UserID,
    type: 'SESSION_ACTIVITY',
    title: 'Sesi Difinalisasi',
    message: 'Sesi pemeriksaan berhasil difinalisasi.'
  });
  assert.ok(deliveredAfterMandatory.NotificationID);

  // 4. Larangan pengingat berkala khusus untuk Draft (PRD 14.3)
  assert.throws(() => {
    env.ctx.TM_Notifications.dispatchNotification({
      userId: trainerUser.UserID,
      type: 'DRAFT_REMINDER',
      title: 'Pengingat Draft',
      message: 'Jangan lupa selesaikan Draft'
    });
  }, /Pengingat berkala atau email khusus Draft tidak diizinkan/);

  // 5. Kegagalan pengiriman Email Notifikasi dicatat di EmailLogs & dapat di-retry oleh Super Admin (PRD 14.4)
  env.setFailNextEmail('SMTP sementara sibuk');
  const secNotif = env.ctx.TM_Notifications.dispatchNotification({
    userId: trainerUser.UserID,
    type: 'ACCOUNT_SECURITY',
    title: 'Peringatan Keamanan Akun',
    message: 'Terdeteksi perubahan keamanan pada akun Anda.',
    relatedEntityId: trainerUser.UserID
  });
  assert.ok(secNotif.NotificationID);

  // Cek EmailLogs untuk kegagalan tersebut
  const failedEmailLogs = env.ctx.api_listEmailLogsForAdmin(adminTok, 'Gagal').data;
  assert.equal(failedEmailLogs.length, 1);
  assert.equal(failedEmailLogs[0].Recipient, 'trainer1@kuliner.id');
  assert.ok(failedEmailLogs[0].FailureReason.includes('SMTP sementara sibuk'));

  // Super Admin melakukan Retry pengiriman email yang gagal -> Berhasil!
  const retryRes = env.ctx.api_retryFailedEmailLog(adminTok, failedEmailLogs[0].EmailLogID).data;
  assert.equal(retryRes.status, 'Berhasil');
  assert.equal(env.ctx.api_listEmailLogsForAdmin(adminTok, 'Gagal').data.length, 0);

  // 6. Uji Notification Center: Filter UNREAD/READ, Tandai Belum Dibaca, & Tandai Semua Sudah Dibaca
  const centerAll = env.ctx.api_listMyNotificationsCenter(t1Tok, { status: 'ALL' }).data;
  assert.equal(centerAll.totalCount, 2);
  assert.equal(centerAll.unreadCount, 2);

  // Tandai 1 notifikasi sebagai sudah dibaca
  const firstId = centerAll.items[0].NotificationID;
  env.ctx.api_setNotificationReadStatus(t1Tok, firstId, true);
  assert.equal(env.ctx.api_listMyNotificationsCenter(t1Tok, { status: 'UNREAD' }).data.items.length, 1);
  assert.equal(env.ctx.api_listMyNotificationsCenter(t1Tok, { status: 'READ' }).data.items.length, 1);

  // Kembalikan menjadi belum dibaca
  env.ctx.api_setNotificationReadStatus(t1Tok, firstId, false);
  assert.equal(env.ctx.api_listMyNotificationsCenter(t1Tok, { status: 'UNREAD' }).data.unreadCount, 2);

  // Tandai semua sudah dibaca
  const markAll = env.ctx.api_markAllMyNotificationsRead(t1Tok).data;
  assert.equal(markAll.markedCount, 2);
  assert.equal(env.ctx.api_listMyNotificationsCenter(t1Tok, { status: 'UNREAD' }).data.unreadCount, 0);
});
