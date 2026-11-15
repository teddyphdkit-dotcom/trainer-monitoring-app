const test = require('node:test');
const assert = require('node:assert/strict');
const { createGasEnv } = require('./mocks/gas-mocks');

const TINY_JPEG_B64 = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString('base64');

test('Phase 5: Monitoring Draft (5 metrik umur), Detail 3-tab Read-Only, Hapus Draft oleh Admin, Notifikasi per Super Admin, Pemulihan 7x24 jam & Locking', () => {
  const env = createGasEnv();
  let currentTime = new Date('2026-11-01T10:00:00+07:00').getTime();
  env.ctx.TM_Utils.setNowProvider(() => currentTime);

  env.ctx.api_runInitialBootstrap({
    companyName: 'PT Nusantara Food',
    name: 'Super Admin 1',
    username: 'admin1',
    email: 'admin1@test.id',
    password: 'Password123'
  });
  let admin1Tok = env.ctx.api_login('admin1', 'Password123', 'PC').data.token;

  // Buat Super Admin 2 & Trainer 1 & Trainer 2
  assert.equal(env.ctx.api_createUser(admin1Tok, { name: 'Super Admin 2', username: 'admin2', email: 'admin2@test.id', role: 'SUPER_ADMIN', password: 'TempPassword1' }).ok, true);
  assert.equal(env.ctx.api_createUser(admin1Tok, { name: 'Trainer Satu', username: 'trainer1', email: 't1@test.id', role: 'TRAINER', password: 'TempPassword1' }).ok, true);
  assert.equal(env.ctx.api_createUser(admin1Tok, { name: 'Trainer Dua', username: 'trainer2', email: 't2@test.id', role: 'TRAINER', password: 'TempPassword1' }).ok, true);

  let admin2Tok = env.ctx.api_login('admin2', 'TempPassword1', 'PC').data.token;
  env.ctx.api_changePasswordRequired(admin2Tok, 'TempPassword1', 'AdminDua123');

  let t1Tok = env.ctx.api_login('trainer1', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(t1Tok, 'TempPassword1', 'TrainerSatu1');

  let t2Tok = env.ctx.api_login('trainer2', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(t2Tok, 'TempPassword1', 'TrainerDua2');

  const master = env.ctx.api_getMasterBundle(admin1Tok).data;
  const cat = master.active.categories[0];
  const sec = master.active.sections[0];

  // 1. Buat Draft dengan variasi umur:
  // Draft 1 (2026-11-01 -> nanti berumur 9 hari pada 2026-11-10 -> > 7 hari)
  const dOld = env.ctx.api_saveDraft(t1Tok, { inspectionDate: '2026-11-01', outletName: 'Outlet Lama Sekali' }).data;
  const fOld = env.ctx.api_saveFindingDraft(t1Tok, dOld.SessionID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Lantai licin',
    mengapa: 'Drainase mampet'
  }).data;
  env.ctx.api_uploadPhoto(t1Tok, {
    sessionId: dOld.SessionID,
    findingId: fOld.FindingID,
    fileName: 'lantai.jpg',
    mimeType: 'image/jpeg',
    base64Data: TINY_JPEG_B64,
    idempotencyKey: 'KEY-OLD-1'
  });

  // Draft 2 pada 2026-11-05 (berumur 5 hari pada 2026-11-10 -> 3-7 hari)
  currentTime = new Date('2026-11-05T10:00:00+07:00').getTime();
  t1Tok = env.ctx.api_login('trainer1', 'TrainerSatu1', 'Android').data.token;
  const dMid = env.ctx.api_saveDraft(t1Tok, { inspectionDate: '2026-11-05', outletName: 'Outlet Menengah' }).data;

  // Draft 3 pada 2026-11-09 oleh Trainer 2 (berumur 1 hari pada 2026-11-10 -> < 3 hari)
  currentTime = new Date('2026-11-09T10:00:00+07:00').getTime();
  t2Tok = env.ctx.api_login('trainer2', 'TrainerDua2', 'Android').data.token;
  const dNew = env.ctx.api_saveDraft(t2Tok, { inspectionDate: '2026-11-09', outletName: 'Outlet Baru' }).data;

  // 2. Cek Monitoring Draft pada 2026-11-10
  currentTime = new Date('2026-11-10T10:00:00+07:00').getTime();
  admin1Tok = env.ctx.api_login('admin1', 'Password123', 'PC').data.token;
  admin2Tok = env.ctx.api_login('admin2', 'AdminDua123', 'PC').data.token;
  t1Tok = env.ctx.api_login('trainer1', 'TrainerSatu1', 'Android').data.token;

  const mon = env.ctx.api_listMonitoringDrafts(admin1Tok, {}).data;
  assert.equal(mon.summary.totalActiveDrafts, 3);
  assert.equal(mon.summary.under3Days, 1);
  assert.equal(mon.summary.days3To7, 1);
  assert.equal(mon.summary.over7Days, 1);
  assert.equal(mon.summary.uniqueTrainers, 2);
  // Terbaru di atas
  assert.equal(mon.items[0].SessionID, dNew.SessionID);

  // 3. Cek Detail Draft Read-Only (3 tab) & pastikan Super Admin tidak bisa edit/finalisasi sebagai Trainer
  const detail = env.ctx.api_getMonitoringDraftDetail(admin1Tok, dOld.SessionID).data;
  assert.equal(detail.readOnly, true);
  assert.equal(detail.findings.length, 1);
  assert.equal(detail.findings[0].IsComplete, true);
  assert.equal(detail.photos.length, 1);
  assert.equal(env.ctx.api_saveDraft(admin1Tok, { sessionId: dOld.SessionID, picName: 'Hack' }).error.code, 'ERR_FORBIDDEN');

  // 4. Penghapusan Draft oleh Super Admin wajib alasan & mengirim notifikasi ke Trainer
  assert.equal(env.ctx.api_adminDeleteDraft(admin1Tok, dOld.SessionID, '').error.code, 'ERR_VALIDATION');
  const del1 = env.ctx.api_adminDeleteDraft(admin1Tok, dOld.SessionID, 'Draft terbengkalai > 7 hari');
  assert.equal(del1.ok, true);
  const del2 = env.ctx.api_adminDeleteDraft(admin1Tok, dMid.SessionID, 'Draft duplikat');
  assert.equal(del2.ok, true);

  // Trainer 1 menerima notifikasi belum dibaca & dapat menandai sudah dibaca
  const t1Notifs = env.ctx.api_listMyNotifications(t1Tok).data;
  assert.equal(t1Notifs.unreadCount, 2);
  env.ctx.api_markNotificationRead(t1Tok, t1Notifs.items[0].NotificationID);
  assert.equal(env.ctx.api_listMyNotifications(t1Tok).data.unreadCount, 1);

  // 5. Trainer 1 membuat 4 Draft baru sehingga punya 4 Draft aktif (total sempat 5 bersama dMid jika belum dihapus)
  for (let i = 1; i <= 4; i++) {
    assert.equal(env.ctx.api_saveDraft(t1Tok, { inspectionDate: '2026-11-10', outletName: 'Outlet Extra ' + i }).ok, true);
  }
  // Tambah 1 lagi sehingga Trainer 1 mencapai batas penuh 5 Draft aktif!
  assert.equal(env.ctx.api_saveDraft(t1Tok, { inspectionDate: '2026-11-10', outletName: 'Outlet Extra 5' }).ok, true);

  // 6. Trainer 1 mengajukan pemulihan untuk dOld dalam waktu <= 7x24 jam
  const req1 = env.ctx.api_requestDraftRestore(t1Tok, dOld.SessionID, 'Masih menunggu konfirmasi PIC');
  assert.equal(req1.ok, true);

  // Setiap Super Admin aktif menerima 1 notifikasi dengan status baca masing-masing!
  const a1Notifs = env.ctx.api_listMyNotifications(admin1Tok).data;
  const a2Notifs = env.ctx.api_listMyNotifications(admin2Tok).data;
  assert.equal(a1Notifs.unreadCount, 1);
  assert.equal(a2Notifs.unreadCount, 1);
  env.ctx.api_markNotificationRead(admin1Tok, a1Notifs.items[0].NotificationID);
  assert.equal(env.ctx.api_listMyNotifications(admin1Tok).data.unreadCount, 0);
  assert.equal(env.ctx.api_listMyNotifications(admin2Tok).data.unreadCount, 1); // Admin 2 tetap unread!

  // 7. Super Admin 1 menyetujui pemulihan dOld -> Super Admin 2 tidak bisa memproses ulang!
  const approve = env.ctx.api_processDraftRestoreRequest(admin1Tok, req1.data.RequestID, 'Disetujui', 'Silakan segera diselesaikan');
  assert.equal(approve.ok, true);

  const doubleProcess = env.ctx.api_processDraftRestoreRequest(admin2Tok, req1.data.RequestID, 'Ditolak', 'Terlambat');
  assert.equal(doubleProcess.ok, false);
  assert.equal(doubleProcess.error.code, 'ERR_ALREADY_PROCESSED');

  // 8. Setelah dOld dipulihkan, jumlah Draft aktif Trainer 1 menjadi 6 (boleh melebihi 5 sementara!),
  // label IsRestoredFlagUntil aktif 7x24 jam, dan Trainer 1 tidak bisa buat Draft baru sampai < 5!
  const myDrafts = env.ctx.api_listMyDrafts(t1Tok).data;
  assert.equal(myDrafts.activeCount, 6);
  const restoredDraft = myDrafts.drafts.find((x) => x.SessionID === dOld.SessionID);
  assert.ok(restoredDraft.IsRestoredFlagUntil);
  assert.equal(restoredDraft.FindingCount, 1);
  assert.equal(env.ctx.api_saveDraft(t1Tok, { inspectionDate: '2026-11-10', outletName: 'Outlet Ke-7' }).error.code, 'ERR_DRAFT_LIMIT_REACHED');

  // 9. Lewat 8 hari (> 7x24 jam) sejak dMid dihapus -> pengajuan pemulihan dMid ditolak
  currentTime += 8 * 24 * 3600000;
  t1Tok = env.ctx.api_login('trainer1', 'TrainerSatu1', 'Android').data.token;
  const expiredRestore = env.ctx.api_requestDraftRestore(t1Tok, dMid.SessionID, 'Terlambat ajukan');
  assert.equal(expiredRestore.ok, false);
  assert.equal(expiredRestore.error.code, 'ERR_RESTORE_WINDOW_EXPIRED');
});
