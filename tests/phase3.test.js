const test = require('node:test');
const assert = require('node:assert/strict');
const { createGasEnv } = require('./mocks/gas-mocks');

const TINY_JPEG_B64 = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString('base64');

function setupPhase3Env(env, nowProvider) {
  if (typeof nowProvider === 'function') {
    env.ctx.TM_Utils.setNowProvider(nowProvider);
  } else if (nowProvider) {
    env.ctx.TM_Utils.setNowProvider(() => nowProvider);
  }
  env.ctx.api_runInitialBootstrap({
    companyName: 'PT Nusantara Food',
    name: 'Admin Utama',
    username: 'superadmin',
    email: 'admin@nusantara.test',
    password: 'Password123'
  });
  const adminToken = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;

  // Master AM & MUM
  const am = env.ctx.api_saveMasterItem(adminToken, 'AM', { name: 'AM Budi' }).data;
  const mum = env.ctx.api_saveMasterItem(adminToken, 'MUM', { name: 'MUM Sari' }).data;
  const master = env.ctx.api_getMasterBundle(adminToken).data;

  // Trainer 1 & Trainer 2 & Manajemen
  env.ctx.api_createUser(adminToken, { name: 'T1', username: 'trainer1', email: 't1@test.id', role: 'TRAINER', password: 'TempPassword1' });
  env.ctx.api_createUser(adminToken, { name: 'T2', username: 'trainer2', email: 't2@test.id', role: 'TRAINER', password: 'TempPassword1' });
  env.ctx.api_createUser(adminToken, { name: 'M1', username: 'mgmt1', email: 'm1@test.id', role: 'MANAJEMEN', password: 'TempPassword1' });

  const t1Tok = env.ctx.api_login('trainer1', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(t1Tok, 'TempPassword1', 'TrainerSatu1');

  const t2Tok = env.ctx.api_login('trainer2', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(t2Tok, 'TempPassword1', 'TrainerDua2');

  const m1Tok = env.ctx.api_login('mgmt1', 'TempPassword1', 'PC').data.token;
  env.ctx.api_changePasswordRequired(m1Tok, 'TempPassword1', 'MgmtSatu1');

  return { adminToken, t1Tok, t2Tok, m1Tok, am, mum, master };
}

test('Phase 3: Batas 5 Draft, penurunan batas tetap pertahankan draft lama, & tanggal masa depan ditolak', () => {
  const env = createGasEnv();
  const baseMs = new Date('2026-11-10T09:00:00+07:00').getTime();
  const { adminToken, t1Tok, m1Tok } = setupPhase3Env(env, baseMs);

  // Tanggal masa depan ditolak
  const futureRes = env.ctx.api_saveDraft(t1Tok, { inspectionDate: '2026-11-11', outletName: 'Outlet Masa Depan' });
  assert.equal(futureRes.ok, false);
  assert.equal(futureRes.error.code, 'ERR_FUTURE_DATE');

  // Buat 5 Draft aktif
  const draftIds = [];
  for (let i = 1; i <= 5; i++) {
    const d = env.ctx.api_saveDraft(t1Tok, { inspectionDate: '2026-11-10', outletName: 'Outlet Draft ' + i });
    assert.equal(d.ok, true);
    draftIds.push(d.data.SessionID);
  }

  // Draft ke-6 ditolak
  const sixth = env.ctx.api_saveDraft(t1Tok, { inspectionDate: '2026-11-10', outletName: 'Outlet Draft 6' });
  assert.equal(sixth.ok, false);
  assert.equal(sixth.error.code, 'ERR_DRAFT_LIMIT_REACHED');

  // Turunkan batas menjadi 3 -> Draft lama tetap bisa diedit, tapi tidak bisa buat baru
  env.ctx.api_updateAppSettings(adminToken, { companyName: 'PT Nusantara Food', maxActiveDrafts: 3 });
  const editOld = env.ctx.api_saveDraft(t1Tok, { sessionId: draftIds[0], picName: 'PIC Updated' });
  assert.equal(editOld.ok, true);
  assert.equal(editOld.data.PIC_Name, 'PIC Updated');

  // Manajemen tidak boleh melihat Draft
  const mgmtReadDraft = env.ctx.api_getSessionDetail(m1Tok, draftIds[0]);
  assert.equal(mgmtReadDraft.ok, false);
  assert.equal(mgmtReadDraft.error.code, 'ERR_FORBIDDEN');
});

test('Phase 3: Input temuan, upload foto idempotent & limit 5, finalisasi 0 temuan & penomoran laporan', () => {
  const env = createGasEnv();
  const baseMs = new Date('2026-11-10T10:00:00+07:00').getTime();
  const { adminToken, t1Tok, t2Tok, m1Tok, am, mum, master } = setupPhase3Env(env, baseMs);

  // Sesi 1: Finalisasi tanpa temuan membutuhkan konfirmasi eksplisit
  const dEmpty = env.ctx.api_saveDraft(t1Tok, {
    inspectionDate: '2026-11-10',
    outletName: 'Outlet Sudirman',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'Pak Joko'
  }).data;

  const needConfirm = env.ctx.api_finalizeSession(t1Tok, dEmpty.SessionID, false);
  assert.equal(needConfirm.ok, false);
  assert.equal(needConfirm.error.code, 'ERR_CONFIRM_EMPTY_SESSION');

  const finEmpty = env.ctx.api_finalizeSession(t1Tok, dEmpty.SessionID, true);
  assert.equal(finEmpty.ok, true);
  assert.equal(finEmpty.data.session.ReportNumber, 'TM-20261110-OUT001-001');

  // Sesi 2 di Outlet & tanggal yang sama -> urutan 002
  const d2 = env.ctx.api_saveDraft(t2Tok, {
    inspectionDate: '2026-11-10',
    outletName: 'Outlet Sudirman',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'Ibu Ani'
  }).data;

  const cat = master.active.categories[0];
  const sec = master.active.sections[0];
  const f1 = env.ctx.api_saveFindingDraft(t2Tok, d2.SessionID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Suhu chiller 9C',
    mengapa: 'Berisiko kontaminasi bakteri',
    solusi: '' // opsional
  }).data;

  // Finalisasi tanpa foto ditolak
  const noPhoto = env.ctx.api_finalizeSession(t2Tok, d2.SessionID, false);
  assert.equal(noPhoto.ok, false);
  assert.equal(noPhoto.error.code, 'ERR_PHOTO_REQUIRED');

  // Upload 5 foto (1 key diulang untuk uji idempotency)
  const p1 = env.ctx.api_uploadPhoto(t2Tok, {
    sessionId: d2.SessionID,
    findingId: f1.FindingID,
    fileName: 'chiller-1.jpg',
    mimeType: 'image/jpeg',
    base64Data: TINY_JPEG_B64,
    comment: 'Termometer digital',
    idempotencyKey: 'KEY-UNIK-1'
  });
  assert.equal(p1.ok, true);

  const p1Retry = env.ctx.api_uploadPhoto(t2Tok, {
    sessionId: d2.SessionID,
    findingId: f1.FindingID,
    fileName: 'chiller-1.jpg',
    mimeType: 'image/jpeg',
    base64Data: TINY_JPEG_B64,
    comment: 'Termometer digital',
    idempotencyKey: 'KEY-UNIK-1'
  });
  assert.equal(p1Retry.data.PhotoID, p1.data.PhotoID);

  for (let i = 2; i <= 5; i++) {
    assert.equal(env.ctx.api_uploadPhoto(t2Tok, {
      sessionId: d2.SessionID,
      findingId: f1.FindingID,
      fileName: `chiller-${i}.jpg`,
      mimeType: 'image/jpeg',
      base64Data: TINY_JPEG_B64,
      idempotencyKey: `KEY-UNIK-${i}`
    }).ok, true);
  }

  // Foto ke-6 ditolak
  const p6 = env.ctx.api_uploadPhoto(t2Tok, {
    sessionId: d2.SessionID,
    findingId: f1.FindingID,
    fileName: 'chiller-6.jpg',
    mimeType: 'image/jpeg',
    base64Data: TINY_JPEG_B64,
    idempotencyKey: 'KEY-UNIK-6'
  });
  assert.equal(p6.ok, false);
  assert.equal(p6.error.code, 'ERR_PHOTO_LIMIT');

  // Finalisasi berhasil -> nomor laporan OUT001-002
  const fin2 = env.ctx.api_finalizeSession(t2Tok, d2.SessionID, false);
  assert.equal(fin2.ok, true);
  assert.equal(fin2.data.session.ReportNumber, 'TM-20261110-OUT001-002');

  // Snapshot AM & Category tidak berubah meski Master Data diubah setelah finalisasi
  env.ctx.api_saveMasterItem(adminToken, 'AM', { id: am.AM_ID, name: 'AM Budi Renamed' });
  const detail = env.ctx.api_getSessionDetail(m1Tok, d2.SessionID).data;
  assert.equal(detail.session.AM_Name_Snapshot, 'AM Budi');

  // Download foto via RPC tercatat di AuditLog
  const dl = env.ctx.api_getPhotoData(m1Tok, p1.data.PhotoID, true);
  assert.equal(dl.ok, true);
  assert.ok(dl.data.dataUrl.startsWith('data:image/jpeg;base64,'));
});

test('Phase 3: Batas edit/hapus temuan 24 jam, larangan lintas Trainer, & pemulihan sesi vs temuan individual', () => {
  const env = createGasEnv();
  let currentTime = new Date('2026-11-10T10:00:00+07:00').getTime();
  const { t1Tok, t2Tok, m1Tok, am, mum, master } = setupPhase3Env(env, () => currentTime);

  const d = env.ctx.api_saveDraft(t1Tok, {
    inspectionDate: '2026-11-10',
    outletName: 'Outlet Kemang',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'Rina'
  }).data;

  const cat = master.active.categories[0];
  const sec = master.active.sections[0];
  const fA = env.ctx.api_saveFindingDraft(t1Tok, d.SessionID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Temuan A',
    mengapa: 'Alasan A'
  }).data;
  const fB = env.ctx.api_saveFindingDraft(t1Tok, d.SessionID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Temuan B',
    mengapa: 'Alasan B'
  }).data;

  env.ctx.api_uploadPhoto(t1Tok, { sessionId: d.SessionID, findingId: fA.FindingID, mimeType: 'image/jpeg', base64Data: TINY_JPEG_B64, idempotencyKey: 'KA' });
  env.ctx.api_uploadPhoto(t1Tok, { sessionId: d.SessionID, findingId: fB.FindingID, mimeType: 'image/jpeg', base64Data: TINY_JPEG_B64, idempotencyKey: 'KB' });
  env.ctx.api_finalizeSession(t1Tok, d.SessionID, false);

  // Trainer lain & Manajemen tidak boleh edit/hapus
  assert.equal(env.ctx.api_updateFinding(t2Tok, fA.FindingID, { categoryId: cat.CategoryID, sectionId: sec.SectionID, masalah: 'X', mengapa: 'Y' }).error.code, 'ERR_FORBIDDEN');
  assert.equal(env.ctx.api_deleteFinding(m1Tok, fA.FindingID, 'Hapus').error.code, 'ERR_FORBIDDEN');

  // Dalam 24 jam (+5 jam, login ulang karena melewati idle 30 menit): Trainer pemilik boleh edit fA dan hapus individual fB
  currentTime += 5 * 3600000;
  const t1Fresh1 = env.ctx.api_login('trainer1', 'TrainerSatu1', 'Android').data.token;
  assert.equal(env.ctx.api_updateFinding(t1Fresh1, fA.FindingID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Temuan A Revisi',
    mengapa: 'Alasan A Revisi'
  }).ok, true);
  assert.equal(env.ctx.api_deleteFinding(t1Fresh1, fB.FindingID, 'Salah input').ok, true);

  // Setelah > 24 jam (total +25 jam): Trainer ditolak edit, hanya Super Admin yang boleh
  currentTime += 20 * 3600000;
  const t1Fresh2 = env.ctx.api_login('trainer1', 'TrainerSatu1', 'Android').data.token;
  const expiredEdit = env.ctx.api_updateFinding(t1Fresh2, fA.FindingID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Telat',
    mengapa: 'Telat'
  });
  assert.equal(expiredEdit.ok, false);
  assert.equal(expiredEdit.error.code, 'ERR_EDIT_WINDOW_EXPIRED');

  // Super Admin login ulang & hapus sesi lalu pulihkan sesi -> fA pulih, fB (INDIVIDUAL) tetap terhapus!
  const adminFresh = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;
  assert.equal(env.ctx.api_deleteSession(adminFresh, d.SessionID, 'Audit koreksi').ok, true);
  assert.equal(env.ctx.api_restoreSession(adminFresh, d.SessionID).ok, true);

  const afterRestore = env.ctx.api_getSessionDetail(t1Fresh2, d.SessionID).data;
  assert.equal(afterRestore.findings.length, 1);
  assert.equal(afterRestore.findings[0].FindingID, fA.FindingID);
});

test('Phase 3: Mendukung berbagai format tanggal kalender (06/11/2026, 6 Nov 2026, YYYY-MM-DD, & Date object Google Sheets)', () => {
  const env = createGasEnv();
  const baseMs = new Date('2026-11-12T10:00:00+07:00').getTime();
  const { t1Tok, am, mum } = setupPhase3Env(env, baseMs);

  // 1. Format DD/MM/YYYY (06/11/2026)
  const dSlash = env.ctx.api_saveDraft(t1Tok, {
    inspectionDate: '06/11/2026',
    outletName: 'DSB-DMM-P117',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC 1'
  });
  assert.equal(dSlash.ok, true);
  assert.equal(dSlash.data.InspectionDate, '2026-11-06');

  // 2. Format D MMM YYYY (6 Nov 2026) pada update draft
  const dText = env.ctx.api_saveDraft(t1Tok, {
    sessionId: dSlash.data.SessionID,
    inspectionDate: '6 Nov 2026',
    outletName: 'DSB-DMM-P117',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC 1'
  });
  assert.equal(dText.ok, true);
  assert.equal(dText.data.InspectionDate, '2026-11-06');

  // 3. Simulasikan Google Sheets mengonversi sel InspectionDate menjadi objek Date atau Date.toString()
  const ss = env.ctx.TM_Db.getSpreadsheet();
  const sesSheet = ss.getSheetByName('Sessions');
  sesSheet._rows[1][2] = new Date('2026-11-06T00:00:00+07:00');

  const finRes = env.ctx.api_finalizeSession(t1Tok, dSlash.data.SessionID, true);
  assert.equal(finRes.ok, true);
  assert.equal(finRes.data.session.ReportNumber, 'TM-20261106-OUT001-001');
});
