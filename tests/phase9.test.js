const test = require('node:test');
const assert = require('node:assert/strict');
const { createGasEnv } = require('./mocks/gas-mocks');

const TINY_JPEG_B64 = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString('base64');

test('Phase 9.1 — Backup Harian, Backup Manual, Proteksi Label Important dari Retensi 90 Hari, & 8 Langkah Safe Restore (Validasi Relasi + Rollback Otomatis)', () => {
  const env = createGasEnv();
  let currentTime = new Date('2026-11-01T08:00:00+07:00').getTime();
  env.ctx.TM_Utils.setNowProvider(() => currentTime);

  env.ctx.api_runInitialBootstrap({
    companyName: 'PT Kuliner Nusantara',
    name: 'Super Admin',
    username: 'superadmin',
    email: 'admin@kuliner.id',
    password: 'Password123'
  });

  let adminTok = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;
  const am = env.ctx.api_saveMasterItem(adminTok, 'AM', { name: 'AM Utama' }).data;
  const mum = env.ctx.api_saveMasterItem(adminTok, 'MUM', { name: 'MUM Utama' }).data;
  const master = env.ctx.api_getMasterBundle(adminTok).data;
  const cat = master.active.categories[0];
  const sec = master.active.sections[0];

  env.ctx.api_createUser(adminTok, {
    name: 'Trainer Satu',
    username: 'trainer1',
    email: 'trainer1@kuliner.id',
    role: 'TRAINER',
    password: 'TempPassword1'
  });
  const tInit = env.ctx.api_login('trainer1', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(tInit, 'TempPassword1', 'TrainerPass1');
  let t1Tok = env.ctx.api_login('trainer1', 'TrainerPass1', 'Android').data.token;

  // Buat 1 sesi Selesai dengan 1 temuan dan 1 foto sebelum Backup #1
  const s1 = env.ctx.api_saveDraft(t1Tok, {
    inspectionDate: '2026-11-01',
    outletName: 'Outlet Sudirman',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC Sudirman'
  }).data;
  const f1 = env.ctx.api_saveFindingDraft(t1Tok, s1.SessionID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Masalah Awal Sebelum Backup',
    mengapa: 'Penyebab Awal',
    solusi: 'Solusi Awal'
  }).data;
  env.ctx.api_uploadPhoto(t1Tok, {
    sessionId: s1.SessionID,
    findingId: f1.FindingID,
    fileName: 'awal.jpg',
    mimeType: 'image/jpeg',
    base64Data: TINY_JPEG_B64,
    comment: 'Foto Awal',
    idempotencyKey: 'KEY-AWAL-1'
  });
  env.ctx.api_finalizeSession(t1Tok, s1.SessionID, false);

  // 1. Buat Backup Harian Otomatis (non-Important) & Backup Manual berlabel Important pada 2026-11-01
  const dailyBkp1 = env.ctx.api_runDailyAutomatedBackup(adminTok).data.backup;
  assert.equal(dailyBkp1.BackupType, 'DAILY_AUTO');
  assert.equal(dailyBkp1.Important, 'FALSE');

  const manualImpBkp = env.ctx.api_createManualBackup(adminTok, {
    important: true,
    description: 'Backup Milestone Penting'
  }).data.backup;
  assert.equal(manualImpBkp.BackupType, 'MANUAL');
  assert.equal(manualImpBkp.Important, 'TRUE');

  // 2. Majukan waktu +95 hari (> 90 hari retensi) -> jalankan pembersihan retensi
  currentTime += 95 * 24 * 3600000;
  adminTok = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;
  t1Tok = env.ctx.api_login('trainer1', 'TrainerPass1', 'Android').data.token;

  const cleanRes = env.ctx.api_cleanupExpiredBackups(adminTok).data;
  assert.equal(cleanRes.cleanedCount, 1);
  assert.ok(cleanRes.cleanedIds.includes(dailyBkp1.BackupID));

  const backupsAfterClean = env.ctx.api_listBackups(adminTok).data.items;
  const bDailyAfter = backupsAfterClean.find((b) => b.BackupID === dailyBkp1.BackupID);
  const bImpAfter = backupsAfterClean.find((b) => b.BackupID === manualImpBkp.BackupID);
  assert.equal(bDailyAfter.Status, 'EXPIRED_CLEANED');
  assert.equal(bImpAfter.Status, 'Berhasil'); // Backup Important TIDAK TERHAPUS otomatis!

  // 3. Buat Sesi #2 baru setelah backup manualImpBkp
  const todayStr = env.ctx.TM_Utils.formatWibIso().slice(0, 10);
  const s2 = env.ctx.api_saveDraft(t1Tok, {
    inspectionDate: todayStr,
    outletName: 'Outlet Baru Setelah Backup',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC Baru'
  }).data;
  env.ctx.api_finalizeSession(t1Tok, s2.SessionID, true);
  assert.equal(env.ctx.api_listCompletedSessions(adminTok, 50).data.length, 2);

  // 4. Uji Langkah 1 & Langkah 3 Safe Restore (Ringkasan & Konfirmasi Eksplisit)
  const summaryInfo = env.ctx.api_getBackupSummaryForRestore(adminTok, manualImpBkp.BackupID).data;
  assert.equal(summaryInfo.summary.sessionsCount, 1);

  const noConfirmRes = env.ctx.api_executeSafeRestore(adminTok, manualImpBkp.BackupID, {
    confirmRestore: true,
    confirmationText: 'SALAH'
  });
  assert.equal(noConfirmRes.ok, false);
  assert.equal(noConfirmRes.error.code, 'ERR_CONFIRMATION_REQUIRED');

  // 5. Uji Langkah 7 Safe Restore: Simulasi kegagalan di tengah proses restore -> harus ROLLBACK OTOMATIS ke Pre-Restore Backup!
  const rollbackRes = env.ctx.api_executeSafeRestore(adminTok, manualImpBkp.BackupID, {
    confirmRestore: true,
    confirmationText: 'RESTORE',
    simulateFailureAfterSheet: 'Sessions'
  });
  assert.equal(rollbackRes.ok, false);
  assert.equal(rollbackRes.error.code, 'ERR_RESTORE_ROLLED_BACK');
  assert.ok(rollbackRes.error.details.preRestoreBackupId);

  // Pastikan setelah rollback otomatis, Sesi #2 yang dibuat setelah backup tetap utuh (jumlah sesi tetap 2)!
  adminTok = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;
  assert.equal(env.ctx.api_listCompletedSessions(adminTok, 50).data.length, 2);

  // 6. Uji Langkah 5 Safe Restore: Validasi relasi menolak backup yang memiliki relasi rusak
  const corruptBkp = env.ctx.api_createManualBackup(adminTok, {
    important: false,
    description: 'Backup untuk uji korupsi relasi'
  }).data.backup;
  // Manipulasi file Drive dari corruptBkp agar memiliki temuan dengan SessionID yatim
  const corruptFile = env.driveFiles.get(corruptBkp.StorageReference);
  const corruptJson = JSON.parse(Buffer.from(corruptFile.getBlob().getBytes()).toString('utf8'));
  corruptJson.tables.Findings.push({
    FindingID: 'FND-ORPHAN-999',
    SessionID: 'SES-TIDAK-ADA-999',
    CategoryID: cat.CategoryID,
    SectionID: sec.SectionID,
    Masalah: 'Yatim'
  });
  corruptFile.blob = env.ctx.Utilities.newBlob(
    Array.from(Buffer.from(JSON.stringify(corruptJson), 'utf8')),
    'application/json',
    'corrupt.json'
  );

  const relFailRes = env.ctx.api_executeSafeRestore(adminTok, corruptBkp.BackupID, {
    confirmRestore: true,
    confirmationText: 'RESTORE'
  });
  assert.equal(relFailRes.ok, false);
  assert.equal(relFailRes.error.code, 'ERR_RESTORE_RELATION');

  // 7. Uji Safe Restore Berhasil dari manualImpBkp -> mengembalikan kondisi ke 1 sesi sambil mempertahankan seluruh AuditLog!
  const logsBeforeRestore = env.ctx.api_queryAuditLogs(adminTok, { limit: 500 }).data.total;
  const restoreOk = env.ctx.api_executeSafeRestore(adminTok, manualImpBkp.BackupID, {
    confirmRestore: true,
    confirmationText: 'RESTORE'
  });
  assert.equal(restoreOk.ok, true);
  assert.equal(restoreOk.data.status, 'RESTORED');

  adminTok = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;
  const sessionsAfterRestore = env.ctx.api_listCompletedSessions(adminTok, 50).data;
  assert.equal(sessionsAfterRestore.length, 1);
  assert.equal(sessionsAfterRestore[0].SessionID, s1.SessionID);

  // Pastikan Audit Log bersifat append-only (jumlah log setelah restore > jumlah log sebelum restore!)
  const logsAfterRestore = env.ctx.api_queryAuditLogs(adminTok, { limit: 500 }).data.total;
  assert.ok(logsAfterRestore > logsBeforeRestore);
});

test('Phase 9.2 — Arsip Foto Permanen, Larangan Purge Foto Aktif / Direferensikan Backup, & Purge Manual dengan Alasan Wajib', () => {
  const env = createGasEnv();
  env.ctx.TM_Utils.setNowProvider(() => new Date('2026-11-11T16:00:00+07:00').getTime());

  env.ctx.api_runInitialBootstrap({
    companyName: 'PT Kuliner Nusantara',
    name: 'Super Admin',
    username: 'superadmin',
    email: 'admin@kuliner.id',
    password: 'Password123'
  });

  const adminTok = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;
  const am = env.ctx.api_saveMasterItem(adminTok, 'AM', { name: 'AM Satu' }).data;
  const mum = env.ctx.api_saveMasterItem(adminTok, 'MUM', { name: 'MUM Satu' }).data;
  const master = env.ctx.api_getMasterBundle(adminTok).data;
  const cat = master.active.categories[0];
  const sec = master.active.sections[0];

  env.ctx.api_createUser(adminTok, {
    name: 'Trainer Satu',
    username: 'trainer1',
    email: 'trainer1@kuliner.id',
    role: 'TRAINER',
    password: 'TempPassword1'
  });
  const tInit = env.ctx.api_login('trainer1', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(tInit, 'TempPassword1', 'TrainerPass1');
  const t1Tok = env.ctx.api_login('trainer1', 'TrainerPass1', 'Android').data.token;

  // Buat Sesi dengan 2 temuan dan 2 foto
  const s = env.ctx.api_saveDraft(t1Tok, {
    inspectionDate: '2026-11-11',
    outletName: 'Outlet Kelapa Gading',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC Gading'
  }).data;

  const fBackedUp = env.ctx.api_saveFindingDraft(t1Tok, s.SessionID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Temuan 1',
    mengapa: 'Mengapa 1'
  }).data;
  const phBackedUp = env.ctx.api_uploadPhoto(t1Tok, {
    sessionId: s.SessionID,
    findingId: fBackedUp.FindingID,
    fileName: 'foto_di_backup.jpg',
    mimeType: 'image/jpeg',
    base64Data: TINY_JPEG_B64,
    idempotencyKey: 'KEY-P1'
  }).data;

  // Buat Backup Important yang mereferensikan phBackedUp
  env.ctx.api_createManualBackup(adminTok, {
    important: true,
    description: 'Backup yang mereferensikan phBackedUp'
  });

  // Tambahkan Temuan ke-2 & Foto ke-2 SETELAH backup dibuat
  const fPostBackup = env.ctx.api_saveFindingDraft(t1Tok, s.SessionID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Temuan 2 Setelah Backup',
    mengapa: 'Mengapa 2'
  }).data;
  const phPostBackup = env.ctx.api_uploadPhoto(t1Tok, {
    sessionId: s.SessionID,
    findingId: fPostBackup.FindingID,
    fileName: 'foto_setelah_backup.jpg',
    mimeType: 'image/jpeg',
    base64Data: TINY_JPEG_B64,
    idempotencyKey: 'KEY-P2'
  }).data;

  env.ctx.api_finalizeSession(t1Tok, s.SessionID, false);

  // 1. Mencoba purge foto yang masih aktif digunakan -> DITOLAK (ERR_PHOTO_ACTIVE_REFERENCED)
  const tryPurgeActive = env.ctx.api_purgeArchivedPhoto(adminTok, phPostBackup.PhotoID, 'Coba hapus foto aktif');
  assert.equal(tryPurgeActive.ok, false);
  assert.equal(tryPurgeActive.error.code, 'ERR_PHOTO_ACTIVE_REFERENCED');

  // 2. Hapus kedua temuan (soft delete) -> kedua foto menjadi foto arsip (tidak langsung terhapus dari Drive)
  env.ctx.api_deleteFinding(adminTok, fBackedUp.FindingID, 'Temuan duplikat');
  env.ctx.api_deleteFinding(adminTok, fPostBackup.FindingID, 'Temuan salah input');

  const archivedList = env.ctx.api_listArchivedPhotos(adminTok).data;
  assert.equal(archivedList.length, 2);

  // 3. Mencoba purge phBackedUp yang masih direferensikan oleh Backup Important -> DITOLAK (ERR_PHOTO_REFERENCED_BY_BACKUP)
  const tryPurgeBackedUp = env.ctx.api_purgeArchivedPhoto(adminTok, phBackedUp.PhotoID, 'Ingin hemat ruang');
  assert.equal(tryPurgeBackedUp.ok, false);
  assert.equal(tryPurgeBackedUp.error.code, 'ERR_PHOTO_REFERENCED_BY_BACKUP');

  // 4. Mencoba purge phPostBackup tanpa alasan -> DITOLAK (ERR_VALIDATION)
  const tryPurgeNoReason = env.ctx.api_purgeArchivedPhoto(adminTok, phPostBackup.PhotoID, '   ');
  assert.equal(tryPurgeNoReason.ok, false);
  assert.equal(tryPurgeNoReason.error.code, 'ERR_VALIDATION');

  // 5. Purge phPostBackup (tidak aktif & tidak direferensikan backup) dengan alasan wajib -> BERHASIL & tercatat di Audit Log!
  const purgeOk = env.ctx.api_purgeArchivedPhoto(adminTok, phPostBackup.PhotoID, 'Pembersihan berkala foto arsip tidak terpakai');
  assert.equal(purgeOk.ok, true);
  assert.equal(purgeOk.data.Status, 'Purged');
  assert.ok(purgeOk.data.PurgedAt);

  const auditPurge = env.ctx.api_queryAuditLogs(adminTok, { action: 'PURGE_ARCHIVED_PHOTO' }).data;
  assert.equal(auditPurge.items.length, 1);
});
