const test = require('node:test');
const assert = require('node:assert/strict');
const { createGasEnv } = require('./mocks/gas-mocks');

function setupPhase6Env(nowProvider) {
  const env = createGasEnv();
  env.ctx.TM_Utils.setNowProvider(nowProvider);

  env.ctx.api_runInitialBootstrap({
    companyName: 'PT Trainer Monitoring',
    name: 'Super Admin',
    username: 'superadmin',
    email: 'admin@company.id',
    password: 'AdminPassword123'
  });

  const adminLogin = env.ctx.api_login('superadmin', 'AdminPassword123', 'PC-Admin').data;

  env.ctx.api_createUser(adminLogin.token, {
    username: 'trainer1',
    name: 'Trainer Satu',
    email: 'trainer1@company.id',
    role: 'TRAINER',
    password: 'TempPassword123'
  });

  const trainerLogin = env.ctx.api_login('trainer1', 'TempPassword123', 'DEV-ANDROID-01').data;
  env.ctx.api_changePasswordRequired(trainerLogin.token, 'TempPassword123', 'NewTrainerPass999');

  const am = env.ctx.api_saveMasterItem(adminLogin.token, 'AM', { name: 'AM Barat' }).data;
  const mum = env.ctx.api_saveMasterItem(adminLogin.token, 'MUM', { name: 'MUM Barat' }).data;
  const master = env.ctx.api_getMasterBundle(adminLogin.token).data;
  const cat = master.active.categories[0];
  const sec = master.active.sections[0];

  return {
    env,
    ctx: env.ctx,
    am,
    mum,
    cat,
    sec,
    reloginAdmin: () => env.ctx.api_login('superadmin', 'AdminPassword123', 'PC-Admin').data.token,
    reloginTrainer: (dev = 'DEV-ANDROID-01') => env.ctx.api_login('trainer1', 'NewTrainerPass999', dev).data.token
  };
}

test('Phase 6.1 — Sinkronisasi Offline Batch, Idempotency Replay, & Konflik Lintas Perangkat', () => {
  let currentTime = new Date('2026-11-11T08:00:00+07:00').getTime();
  const h = setupPhase6Env(() => currentTime);
  const { ctx, am, mum, cat, sec } = h;
  const trainerToken = h.reloginTrainer('DEV-ANDROID-01');

  // 1. Sinkronisasi pertama dari offline queue (device A)
  const batchRes1 = ctx.api_syncBatch(trainerToken, {
    deviceId: 'DEV-ANDROID-01',
    operations: [
      {
        sessionId: 'SES-OFFLINE-001',
        idempotencyKey: 'KEY-SYNC-1001',
        localVersion: 1,
        baseServerVersion: 0,
        draft: {
          inspectionDate: '2026-11-11',
          outletName: 'Outlet Offline Kemang',
          amId: am.AM_ID,
          mumId: mum.MUM_ID,
          picName: 'Budi Kemang',
          findings: [
            {
              findingId: 'FND-OFFLINE-001',
              categoryId: cat.CategoryID,
              sectionId: sec.SectionID,
              masalah: 'Meja persiapan basah',
              mengapa: 'Lap kering habis',
              solusi: 'Sediakan lap bersih cadangan'
            }
          ]
        }
      }
    ]
  }).data;

  assert.equal(batchRes1.results.length, 1);
  assert.equal(batchRes1.results[0].status, 'SYNCED');
  assert.equal(batchRes1.results[0].idempotentReplay, false);
  assert.equal(batchRes1.results[0].snapshot.findings.length, 1);
  const vAfterFirstSync = batchRes1.results[0].serverVersion;
  assert.equal(vAfterFirstSync, 1);

  // 2. Idempotency replay dengan idempotencyKey yang sama -> tidak menduplikasi atau menaikkan versi
  const replayRes = ctx.api_syncDraftOperation(trainerToken, {
    sessionId: 'SES-OFFLINE-001',
    deviceId: 'DEV-ANDROID-01',
    idempotencyKey: 'KEY-SYNC-1001',
    localVersion: 1,
    baseServerVersion: 0,
    draft: {
      inspectionDate: '2026-11-11',
      outletName: 'Outlet Offline Kemang',
      amId: am.AM_ID,
      mumId: mum.MUM_ID,
      picName: 'Budi Kemang'
    }
  }).data;
  assert.equal(replayRes.status, 'SYNCED');
  assert.equal(replayRes.idempotentReplay, true);
  assert.equal(replayRes.serverVersion, 1);

  // 3. Perangkat B mengedit Draft di server sehingga ServerVersion naik menjadi 2
  const trainerTokenDevB = h.reloginTrainer('DEV-PC-02');
  ctx.api_saveDraft(trainerTokenDevB, {
    sessionId: 'SES-OFFLINE-001',
    inspectionDate: '2026-11-11',
    outletName: 'Outlet Offline Kemang',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC Diubah dari PC Perangkat B'
  });

  // 4. Perangkat A (masih memegang baseServerVersion = 1) mencoba sync perubahan berbeda -> CONFLICT!
  const conflictRes = ctx.api_syncDraftOperation(trainerToken, {
    sessionId: 'SES-OFFLINE-001',
    deviceId: 'DEV-ANDROID-01',
    idempotencyKey: 'KEY-SYNC-1002',
    localVersion: 2,
    baseServerVersion: 1, // lebih rendah dari serverVersion = 2
    draft: {
      inspectionDate: '2026-11-11',
      outletName: 'Outlet Offline Kemang',
      amId: am.AM_ID,
      mumId: mum.MUM_ID,
      picName: 'PIC Diubah Offline dari Android A',
      findings: [
        {
          findingId: 'FND-OFFLINE-001',
          categoryId: cat.CategoryID,
          sectionId: sec.SectionID,
          masalah: 'Meja persiapan basah (diedit di Android A)',
          mengapa: 'Lap kering habis',
          solusi: 'Sediakan lap bersih cadangan'
        }
      ]
    }
  }).data;

  assert.equal(conflictRes.status, 'CONFLICT');
  // Pastikan data server TIDAK tertimpa otomatis
  const serverDetailBeforeResolve = ctx.api_getSessionDetail(trainerToken, 'SES-OFFLINE-001').data;
  assert.equal(serverDetailBeforeResolve.session.PIC_Name, 'PIC Diubah dari PC Perangkat B');

  // 5. Resolusi Konflik oleh Trainer (pilih APPLY_LOCAL) -> tercatat di AuditLog & menerapkan data lokal
  const resolved = ctx.api_resolveSyncConflict(trainerToken, 'SES-OFFLINE-001', {
    strategy: 'APPLY_LOCAL',
    deviceId: 'DEV-ANDROID-01',
    localDraft: {
      inspectionDate: '2026-11-11',
      outletName: 'Outlet Offline Kemang',
      amId: am.AM_ID,
      mumId: mum.MUM_ID,
      picName: 'PIC Diubah Offline dari Android A',
      findings: [
        {
          findingId: 'FND-OFFLINE-001',
          categoryId: cat.CategoryID,
          sectionId: sec.SectionID,
          masalah: 'Meja persiapan basah (diedit di Android A)',
          mengapa: 'Lap kering habis',
          solusi: 'Sediakan lap bersih cadangan'
        }
      ]
    }
  }).data;

  assert.equal(resolved.status, 'SYNCED');
  assert.equal(resolved.snapshot.session.PIC_Name, 'PIC Diubah Offline dari Android A');
  assert.equal(resolved.snapshot.findings[0].Masalah, 'Meja persiapan basah (diedit di Android A)');

  const adminToken = h.reloginAdmin();
  const logs = ctx.api_queryAuditLogs(adminToken, {}).data;
  assert.ok(logs.items.some((l) => l.Action === 'SYNC_CONFLICT_RESOLVED'));
});

test('Phase 6.2 — Prioritas Penghapusan Super Admin saat Sync, Retensi Data Lokal, & Pasca-Pemulihan', () => {
  let currentTime = new Date('2026-11-11T09:00:00+07:00').getTime();
  const h = setupPhase6Env(() => currentTime);
  const { ctx, am, mum } = h;
  let trainerToken = h.reloginTrainer('DEV-ORIGIN-01');
  let adminToken = h.reloginAdmin();

  // 1. Trainer membuat dan menyinkronkan Draft dari perangkat asal DEV-ORIGIN-01
  ctx.api_syncDraftOperation(trainerToken, {
    sessionId: 'SES-DEL-SYNC-01',
    deviceId: 'DEV-ORIGIN-01',
    idempotencyKey: 'KEY-INIT-01',
    localVersion: 1,
    baseServerVersion: 0,
    draft: {
      inspectionDate: '2026-11-11',
      outletName: 'Outlet Tebet',
      amId: am.AM_ID,
      mumId: mum.MUM_ID,
      picName: 'PIC Tebet Awal'
    }
  });

  // 2. Super Admin menghapus Draft saat Trainer sedang mengedit secara offline
  ctx.api_adminDeleteDraft(adminToken, 'SES-DEL-SYNC-01', 'Draft gantung terlalu lama');

  // 3. Saat koneksi Trainer pulih, sinkronisasi tertunda berjalan -> harus DIHENTIKAN (DELETED_LOCKED) & TIDAK membuat ulang Draft!
  const syncAfterDelete = ctx.api_syncDraftOperation(trainerToken, {
    sessionId: 'SES-DEL-SYNC-01',
    deviceId: 'DEV-ORIGIN-01',
    idempotencyKey: 'KEY-PENDING-AFTER-DEL',
    localVersion: 2,
    baseServerVersion: 1,
    draft: {
      inspectionDate: '2026-11-11',
      outletName: 'Outlet Tebet',
      amId: am.AM_ID,
      mumId: mum.MUM_ID,
      picName: 'PIC Tebet Offline Baru (Belum Tersinkron)'
    }
  }).data;

  assert.equal(syncAfterDelete.status, 'DELETED_LOCKED');
  assert.equal(syncAfterDelete.isOriginDevice, true);
  assert.equal(syncAfterDelete.retention.state, 'DELETED_WITHIN_REQUEST_WINDOW');

  // Pastikan Draft tetap berstatus Dihapus di server (tidak terbuat ulang)
  const activeDrafts = ctx.api_listMyDrafts(trainerToken).data;
  assert.equal(activeDrafts.activeCount, 0);

  // Pastikan informasi lintas perangkat memberi tahu jika dibuka dari perangkat lain (DEV-OTHER-99)
  const statusOnOtherDevice = ctx.api_getDraftSyncAndRetentionStatus(
    trainerToken,
    ['SES-DEL-SYNC-01'],
    'DEV-OTHER-99'
  ).data;
  assert.equal(statusOnOtherDevice[0].isOriginDevice, false);
  assert.ok(statusOnOtherDevice[0].otherDeviceNotice.includes('DEV-ORIGIN-01'));

  // 4. Trainer mengajukan pemulihan -> retensi lokal menjadi tanpa batas waktu selama status Menunggu (PRD 7.11)
  currentTime += 2 * 24 * 3600000; // +2 hari
  trainerToken = h.reloginTrainer('DEV-ORIGIN-01');
  const req = ctx.api_requestDraftRestore(trainerToken, 'SES-DEL-SYNC-01', 'Masih ada data temuan lokal penting').data;

  const statusWhileWaiting = ctx.api_getDraftSyncAndRetentionStatus(
    trainerToken,
    ['SES-DEL-SYNC-01'],
    'DEV-ORIGIN-01'
  ).data;
  assert.equal(statusWhileWaiting[0].retention.state, 'WAITING_DECISION');
  assert.equal(statusWhileWaiting[0].retention.unlimitedRetention, true);
  assert.equal(statusWhileWaiting[0].retention.shouldPurgeLocal, false);

  // 5. Super Admin menyetujui pemulihan Draft -> saat perangkat asal melakukan sync perubahan pra-hapus,
  //    sistem melakukan pemeriksaan konflik terlebih dahulu agar tidak menimpa tanpa konfirmasi (PRD 7.10)
  adminToken = h.reloginAdmin();
  ctx.api_processDraftRestoreRequest(adminToken, req.RequestID, 'Disetujui', 'Disetujui untuk disinkronkan');

  const syncPostRestore = ctx.api_syncDraftOperation(trainerToken, {
    sessionId: 'SES-DEL-SYNC-01',
    deviceId: 'DEV-ORIGIN-01',
    idempotencyKey: 'KEY-POST-RESTORE-CHECK',
    localVersion: 2,
    baseServerVersion: 1,
    hasUnsyncedPreDeleteChanges: true,
    draft: {
      inspectionDate: '2026-11-11',
      outletName: 'Outlet Tebet',
      amId: am.AM_ID,
      mumId: mum.MUM_ID,
      picName: 'PIC Tebet Offline Baru (Belum Tersinkron)'
    }
  }).data;
  assert.equal(syncPostRestore.status, 'CONFLICT');

  // 6. Uji Kebijakan Retensi Lokal 30 Hari & Peringatan 7 Hari saat Permintaan Ditolak (PRD 7.11)
  ctx.api_syncDraftOperation(trainerToken, {
    sessionId: 'SES-RETENTION-02',
    deviceId: 'DEV-ORIGIN-01',
    idempotencyKey: 'KEY-RET-02',
    localVersion: 1,
    baseServerVersion: 0,
    draft: {
      inspectionDate: '2026-11-11',
      outletName: 'Outlet Senayan',
      amId: am.AM_ID,
      mumId: mum.MUM_ID,
      picName: 'PIC Senayan'
    }
  });
  ctx.api_adminDeleteDraft(adminToken, 'SES-RETENTION-02', 'Duplikat sesi');
  const req2 = ctx.api_requestDraftRestore(trainerToken, 'SES-RETENTION-02', 'Mohon cek lagi').data;
  ctx.api_processDraftRestoreRequest(adminToken, req2.RequestID, 'Ditolak', 'Sudah diinput oleh tim lain');

  // Majukan waktu +25 hari sejak penolakan -> harus muncul peringatan 7 hari sebelum penghapusan lokal (hari ke-23 s/d 30)
  currentTime += 25 * 24 * 3600000;
  trainerToken = h.reloginTrainer('DEV-ORIGIN-01');
  const statusDay25 = ctx.api_getDraftSyncAndRetentionStatus(trainerToken, ['SES-RETENTION-02'], 'DEV-ORIGIN-01').data;
  assert.equal(statusDay25[0].retention.state, 'REJECTED_RETENTION');
  assert.equal(statusDay25[0].retention.show7DayWarning, true);
  assert.equal(statusDay25[0].retention.shouldPurgeLocal, false);

  // Majukan waktu +6 hari lagi (total 31 hari sejak penolakan) -> shouldPurgeLocal = true
  currentTime += 6 * 24 * 3600000;
  trainerToken = h.reloginTrainer('DEV-ORIGIN-01');
  const statusDay31 = ctx.api_getDraftSyncAndRetentionStatus(trainerToken, ['SES-RETENTION-02'], 'DEV-ORIGIN-01').data;
  assert.equal(statusDay31[0].retention.shouldPurgeLocal, true);
});
