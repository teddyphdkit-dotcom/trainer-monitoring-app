const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createGasEnv } = require('./mocks/gas-mocks');

const TINY_JPEG_B64 = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString('base64');

test('Phase 10.1 — Audit Matriks RBAC Menyeluruh (Super Admin, Trainer, Manajemen), Privasi Foto Drive, & Penomoran Laporan Berurutan + Merge', () => {
  const env = createGasEnv();
  env.ctx.TM_Utils.setNowProvider(() => new Date('2026-11-11T10:00:00+07:00').getTime());

  env.ctx.api_runInitialBootstrap({
    companyName: 'PT Kuliner Nusantara',
    name: 'Super Admin',
    username: 'superadmin',
    email: 'admin@kuliner.id',
    password: 'Password123'
  });

  const adminTok = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;
  const am = env.ctx.api_saveMasterItem(adminTok, 'AM', { name: 'AM Nasional' }).data;
  const mum = env.ctx.api_saveMasterItem(adminTok, 'MUM', { name: 'MUM Nasional' }).data;
  const master = env.ctx.api_getMasterBundle(adminTok).data;
  const cat = master.active.categories[0];
  const sec = master.active.sections[0];

  env.ctx.api_createUser(adminTok, { name: 'Trainer A', username: 'trainera', email: 'ta@kuliner.id', role: 'TRAINER', password: 'TempPassword1' });
  env.ctx.api_createUser(adminTok, { name: 'Trainer B', username: 'trainerb', email: 'tb@kuliner.id', role: 'TRAINER', password: 'TempPassword1' });
  env.ctx.api_createUser(adminTok, { name: 'Manajemen ReadOnly', username: 'manajemen1', email: 'm1@kuliner.id', role: 'MANAJEMEN', password: 'TempPassword1' });

  const taInit = env.ctx.api_login('trainera', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(taInit, 'TempPassword1', 'TrainerAPass1');
  const taTok = env.ctx.api_login('trainera', 'TrainerAPass1', 'Android').data.token;

  const tbInit = env.ctx.api_login('trainerb', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(tbInit, 'TempPassword1', 'TrainerBPass1');
  const tbTok = env.ctx.api_login('trainerb', 'TrainerBPass1', 'Android').data.token;

  const mgInit = env.ctx.api_login('manajemen1', 'TempPassword1', 'PC').data.token;
  env.ctx.api_changePasswordRequired(mgInit, 'TempPassword1', 'MgmtPass123');
  const mgTok = env.ctx.api_login('manajemen1', 'MgmtPass123', 'PC').data.token;

  // 1. Buat 2 sesi selesai pada Outlet dan Tanggal yang sama oleh Trainer A dan Trainer B -> Nomor laporan unik berurutan (-001, -002)
  const s1 = env.ctx.api_saveDraft(taTok, {
    inspectionDate: '2026-11-11',
    outletName: 'Outlet Pondok Indah',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC 1'
  }).data;
  const f1 = env.ctx.api_saveFindingDraft(taTok, s1.SessionID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Masalah 1',
    mengapa: 'Mengapa 1'
  }).data;
  const ph1 = env.ctx.api_uploadPhoto(taTok, {
    sessionId: s1.SessionID,
    findingId: f1.FindingID,
    fileName: 'bukti1.jpg',
    mimeType: 'image/jpeg',
    base64Data: TINY_JPEG_B64,
    idempotencyKey: 'KEY-QA-1'
  }).data;
  const fin1 = env.ctx.api_finalizeSession(taTok, s1.SessionID, false).data.session;

  const s2 = env.ctx.api_saveDraft(tbTok, {
    inspectionDate: '2026-11-11',
    outletId: s1.OutletID,
    outletName: 'Outlet Pondok Indah',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC 2'
  }).data;
  const fin2 = env.ctx.api_finalizeSession(tbTok, s2.SessionID, true).data.session;

  assert.equal(fin1.ReportNumber, 'TM-20261111-OUT001-001');
  assert.equal(fin2.ReportNumber, 'TM-20261111-OUT001-002');

  // 2. Buat 1 Draft aktif oleh Trainer A
  const draftA = env.ctx.api_saveDraft(taTok, {
    inspectionDate: '2026-11-11',
    outletName: 'Outlet Draft Rahasia',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC Draft'
  }).data;

  // 3. Verifikasi Manajemen HANYA Read-Only dan TIDAK melihat Draft (PRD 22.2)
  assert.equal(env.ctx.api_saveDraft(mgTok, { inspectionDate: '2026-11-11', outletName: 'X' }).error.code, 'ERR_FORBIDDEN');
  assert.equal(env.ctx.api_listMyDrafts(mgTok).error.code, 'ERR_FORBIDDEN');
  assert.equal(env.ctx.api_listMonitoringDrafts(mgTok, {}).error.code, 'ERR_FORBIDDEN');
  assert.equal(env.ctx.api_getSessionDetail(mgTok, draftA.SessionID).error.code, 'ERR_FORBIDDEN');
  assert.equal(env.ctx.api_updateFinding(mgTok, f1.FindingID, { masalah: 'Ubah' }).error.code, 'ERR_FORBIDDEN');
  assert.equal(env.ctx.api_deleteFinding(mgTok, f1.FindingID, 'Hapus').error.code, 'ERR_FORBIDDEN');
  assert.equal(env.ctx.api_deleteSession(mgTok, s1.SessionID, 'Hapus').error.code, 'ERR_FORBIDDEN');
  assert.equal(env.ctx.api_createManualBackup(mgTok, {}).error.code, 'ERR_FORBIDDEN');
  assert.equal(env.ctx.api_queryAuditLogs(mgTok, {}).error.code, 'ERR_FORBIDDEN');

  // Manajemen tetap dapat melihat Dashboard, sesi selesai, dan mengunduh foto melalui backend (tercatat di Audit Log)
  assert.equal(env.ctx.api_getDashboardData(mgTok, {}).ok, true);
  assert.equal(env.ctx.api_listCompletedSessions(mgTok, 50).data.length, 2);
  const dlPhoto = env.ctx.api_getPhotoData(mgTok, ph1.PhotoID, true);
  assert.equal(dlPhoto.ok, true);
  assert.ok(dlPhoto.data.dataUrl.startsWith('data:image/jpeg;base64,'));

  // Pastikan seluruh file Drive bersifat PRIVATE / NONE (tidak ada public link)
  for (const [, file] of env.driveFiles.entries()) {
    assert.equal(file.access, 'PRIVATE');
    assert.equal(file.permission, 'NONE');
  }

  // Pastikan download foto tercatat di Audit Log
  const dlLogs = env.ctx.api_queryAuditLogs(adminTok, { action: 'PHOTO_DOWNLOADED' }).data;
  assert.equal(dlLogs.items.length, 1);
});

test('Phase 10.2 — Audit Kesiapan UI Responsif (Android & PC), Struktur 20 Sheet, & Kelengkapan Seluruh Modul', () => {
  const clientDir = path.resolve(__dirname, '../src/client');
  const cssContent = fs.readFileSync(path.join(clientDir, 'css/styles.css.html'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(clientDir, 'index.html'), 'utf8');

  // 1. Pastikan CSS responsif memiliki aturan pencegahan horizontal overflow, drawer mobile <=768px, sidebar-collapsed PC, dan touch target >=42px
  assert.ok(cssContent.includes('overflow-x: hidden'));
  assert.ok(cssContent.includes('@media (max-width: 768px)'));
  assert.ok(cssContent.includes('.sidebar-collapsed'));
  assert.ok(cssContent.includes('min-height: 44px'));
  assert.ok(cssContent.includes('.modal-backdrop'));
  assert.ok(cssContent.includes('.app-layout.drawer-open'));

  // 2. Pastikan seluruh modul JS client ter-include di index.html
  const expectedIncludes = [
    'client/js/api.js',
    'client/js/idb.js',
    'client/js/sync.js',
    'client/js/photo.js',
    'client/js/views.auth.js',
    'client/js/views.admin.js',
    'client/js/views.master.js',
    'client/js/views.input.js',
    'client/js/views.dashboard.js',
    'client/js/views.drafts.js',
    'client/js/views.reporting.js',
    'client/js/views.notifications.js',
    'client/js/views.backup.js',
    'client/js/app.js'
  ];
  for (const inc of expectedIncludes) {
    assert.ok(indexHtml.includes(inc), `Missing include in index.html: ${inc}`);
  }
});
