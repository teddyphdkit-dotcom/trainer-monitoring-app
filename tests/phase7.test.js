const test = require('node:test');
const assert = require('node:assert/strict');
const { createGasEnv } = require('./mocks/gas-mocks');

const TINY_JPEG_B64 = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString('base64');

test('Phase 7.1 — PDF per Sesi A4 (Tanpa AM/MUM/NoLaporan/WaktuGenerate), Tata Letak Maks 2 Foto/Baris, Versioning, & Pengiriman Email 1 Penerima', () => {
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
  const am = env.ctx.api_saveMasterItem(adminTok, 'AM', { name: 'AM Rahasia Tidak Tampil' }).data;
  const mum = env.ctx.api_saveMasterItem(adminTok, 'MUM', { name: 'MUM Rahasia Tidak Tampil' }).data;
  const master = env.ctx.api_getMasterBundle(adminTok).data;
  const cat = master.active.categories[0];
  const sec = master.active.sections[0];

  env.ctx.api_createUser(adminTok, { name: 'Trainer Satu', username: 'trainer1', email: 'trainer1@kuliner.id', role: 'TRAINER', password: 'TempPassword1' });
  env.ctx.api_createUser(adminTok, { name: 'Trainer Dua', username: 'trainer2', email: 'trainer2@kuliner.id', role: 'TRAINER', password: 'TempPassword1' });
  env.ctx.api_createUser(adminTok, { name: 'Manajemen Viewer', username: 'mgmt1', email: 'mgmt1@kuliner.id', role: 'MANAJEMEN', password: 'TempPassword1' });

  const t1Init = env.ctx.api_login('trainer1', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(t1Init, 'TempPassword1', 'TrainerPass1');
  const t1Tok = env.ctx.api_login('trainer1', 'TrainerPass1', 'Android').data.token;

  const t2Init = env.ctx.api_login('trainer2', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(t2Init, 'TempPassword1', 'TrainerPass2');
  const t2Tok = env.ctx.api_login('trainer2', 'TrainerPass2', 'Android').data.token;

  const mgmtInit = env.ctx.api_login('mgmt1', 'TempPassword1', 'PC').data.token;
  env.ctx.api_changePasswordRequired(mgmtInit, 'TempPassword1', 'MgmtPass123');
  const mgmtTok = env.ctx.api_login('mgmt1', 'MgmtPass123', 'PC').data.token;

  // Buat 1 sesi oleh Trainer 1 dengan 1 temuan dan 3 foto (untuk menguji maks 2 foto per baris -> 2 baris)
  const draft = env.ctx.api_saveDraft(t1Tok, {
    inspectionDate: '2026-11-11',
    outletName: 'Outlet Grand Indonesia',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'Bapak Hendra PIC'
  }).data;

  const f1 = env.ctx.api_saveFindingDraft(t1Tok, draft.SessionID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Suhu chiller di atas 8 derajat',
    mengapa: 'Karet pintu chiller renggang',
    solusi: 'Ganti gasket karet pintu chiller'
  }).data;

  for (let i = 1; i <= 3; i++) {
    env.ctx.api_uploadPhoto(t1Tok, {
      sessionId: draft.SessionID,
      findingId: f1.FindingID,
      fileName: `foto_${i}.jpg`,
      mimeType: 'image/jpeg',
      base64Data: TINY_JPEG_B64,
      comment: `Komentar bukti ke-${i}`,
      idempotencyKey: `PHT-KEY-${i}`
    });
  }

  const fin = env.ctx.api_finalizeSession(t1Tok, draft.SessionID, false).data.session;
  assert.ok(fin.ReportNumber.startsWith('TM-20261111-'));

  // 1. Generate PDF Sesi v1 (oleh Manajemen — boleh unduh PDF)
  const pdf1 = env.ctx.api_generateSessionPdf(mgmtTok, draft.SessionID).data;
  assert.equal(pdf1.pdfVersion.VersionNumber, '1');
  assert.ok(pdf1.htmlPreview.includes('@page { size: A4 portrait;'));
  assert.ok(pdf1.htmlPreview.includes('PT Kuliner Nusantara'));
  assert.ok(pdf1.htmlPreview.includes('Outlet Grand Indonesia'));
  assert.ok(pdf1.htmlPreview.includes('Trainer Satu'));
  assert.ok(pdf1.htmlPreview.includes('Bapak Hendra PIC'));
  assert.ok(pdf1.htmlPreview.includes('Suhu chiller di atas 8 derajat'));
  assert.ok(pdf1.htmlPreview.includes('Komentar bukti ke-1'));
  assert.ok(pdf1.htmlPreview.includes('Komentar bukti ke-3'));
  assert.ok(pdf1.htmlPreview.includes('page-break-inside: avoid'));

  // Pastikan 3 foto menghasilkan 2 baris (<tr class="pdf-photo-row">) karena maksimal 2 foto per baris (PRD 11.3)
  const photoRowMatches = pdf1.htmlPreview.match(/<tr class="pdf-photo-row">/g) || [];
  assert.equal(photoRowMatches.length, 2);

  // Pastikan TIDAK menampilkan AM, MUM, Nomor Laporan, dan Waktu Generate pada isi PDF per sesi (PRD 11.2)!
  assert.equal(pdf1.htmlPreview.includes('AM Rahasia Tidak Tampil'), false);
  assert.equal(pdf1.htmlPreview.includes('MUM Rahasia Tidak Tampil'), false);
  assert.equal(pdf1.htmlPreview.includes(fin.ReportNumber), false);
  assert.equal(pdf1.htmlPreview.includes(pdf1.pdfVersion.GeneratedAt), false);

  // 2. Ubah nama perusahaan di Pengaturan Aplikasi -> PDF berikutnya (v2) menggunakan pengaturan terbaru (PRD 11.5 & 11.6)
  env.ctx.api_updateAppSettings(adminTok, { companyName: 'PT Restoran Modern Baru' });
  const pdf2 = env.ctx.api_generateSessionPdf(t1Tok, draft.SessionID).data;
  assert.equal(pdf2.pdfVersion.VersionNumber, '2');
  assert.ok(pdf2.htmlPreview.includes('PT Restoran Modern Baru'));

  // 3. Validasi Hak Akses & Aturan Pengiriman Email (PRD 11.7)
  // Manajemen tidak boleh mengirim email PDF
  assert.equal(env.ctx.api_sendSessionPdfEmail(mgmtTok, draft.SessionID, 'mgmt1@kuliner.id', false).error.code, 'ERR_FORBIDDEN');
  // Trainer 2 tidak boleh mengirim email PDF milik Trainer 1
  assert.equal(env.ctx.api_sendSessionPdfEmail(t2Tok, draft.SessionID, 'trainer2@kuliner.id', false).error.code, 'ERR_FORBIDDEN');
  // Menolak lebih dari 1 alamat email (CC / koma / titik koma)
  assert.equal(env.ctx.api_sendSessionPdfEmail(t1Tok, draft.SessionID, 'a@b.id, c@d.id', false).error.code, 'ERR_VALIDATION');

  // 4. Simulasi kegagalan pengiriman email -> status sesi tetap Selesai, tercatat Gagal di EmailLogs, lalu dapat dikirim ulang!
  env.setFailNextEmail('Quota MailApp harian terlampaui');
  const failedMail = env.ctx.api_sendSessionPdfEmail(t1Tok, draft.SessionID, '', false).data;
  assert.equal(failedMail.status, 'Gagal');
  assert.equal(failedMail.emailLog.Recipient, 'trainer1@kuliner.id'); // Otomatis terisi dari email akun Trainer
  assert.ok(failedMail.failureReason.includes('Quota MailApp'));

  // Pastikan sesi tetap Selesai
  const sesAfterFail = env.ctx.api_getSessionDetail(t1Tok, draft.SessionID).data.session;
  assert.equal(sesAfterFail.Status, 'Selesai');

  // Super Admin dapat memantau kegagalan pengiriman email
  const failedLogsAdmin = env.ctx.api_listEmailLogsForAdmin(adminTok, 'Gagal').data;
  assert.equal(failedLogsAdmin.length, 1);

  // Trainer mengirim ulang (Resend) ke alamat yang diperiksa/diubah -> Berhasil!
  const resendOk = env.ctx.api_sendSessionPdfEmail(t1Tok, draft.SessionID, 'spv.outlet@kuliner.id', true).data;
  assert.equal(resendOk.status, 'Berhasil');
  assert.equal(resendOk.emailLog.Recipient, 'spv.outlet@kuliner.id');
  assert.equal(resendOk.pdfVersion.VersionNumber, '4');

  const hist = env.ctx.api_getSessionPdfHistory(t1Tok, draft.SessionID).data;
  assert.equal(hist.pdfVersions.length, 4);
  assert.equal(hist.emailLogs.length, 2);
});

test('Phase 7.2 — Dashboard PDF (Summary & Full) serta Ekspor Excel (.xlsx) & CSV (Simple & Structured 5 Bagian)', () => {
  const env = createGasEnv();
  env.ctx.TM_Utils.setNowProvider(() => new Date('2026-11-11T14:00:00+07:00').getTime());

  env.ctx.api_runInitialBootstrap({
    companyName: 'PT Nusantara Jaya',
    name: 'Admin',
    username: 'superadmin',
    email: 'admin@nusantara.id',
    password: 'Password123'
  });
  const adminTok = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;
  const am = env.ctx.api_saveMasterItem(adminTok, 'AM', { name: 'AM Timur' }).data;
  const mum = env.ctx.api_saveMasterItem(adminTok, 'MUM', { name: 'MUM Timur' }).data;
  const master = env.ctx.api_getMasterBundle(adminTok).data;
  const cat = master.active.categories[0];
  const sec = master.active.sections[0];

  env.ctx.api_createUser(adminTok, { name: 'Trainer Export', username: 'trainerex', email: 'tex@nusantara.id', role: 'TRAINER', password: 'TempPassword1' });
  const tInit = env.ctx.api_login('trainerex', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(tInit, 'TempPassword1', 'TrainerEx123');
  const tTok = env.ctx.api_login('trainerex', 'TrainerEx123', 'Android').data.token;

  // 1. Sesi Selesai #1 di Outlet Bekasi (2026-11-05)
  const s1 = env.ctx.api_saveDraft(tTok, {
    inspectionDate: '2026-11-05',
    outletName: 'Outlet Bekasi Barat',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC Bekasi 1'
  }).data;
  const f1 = env.ctx.api_saveFindingDraft(tTok, s1.SessionID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Masalah Bekasi Sesi 1',
    mengapa: 'Penyebab 1',
    solusi: 'Solusi 1'
  }).data;
  env.ctx.api_uploadPhoto(tTok, {
    sessionId: s1.SessionID,
    findingId: f1.FindingID,
    fileName: 'bekasi1.jpg',
    mimeType: 'image/jpeg',
    base64Data: TINY_JPEG_B64,
    comment: 'Foto Bekasi 1',
    idempotencyKey: 'KEY-BKS-1'
  });
  env.ctx.api_finalizeSession(tTok, s1.SessionID, false);

  // 2. Sesi Selesai #2 di Outlet Bekasi (2026-11-08) dengan kategori sama -> memicu Recurring Issue!
  const s2 = env.ctx.api_saveDraft(tTok, {
    inspectionDate: '2026-11-08',
    outletId: s1.OutletID,
    outletName: 'Outlet Bekasi Barat',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC Bekasi 2'
  }).data;
  const f2 = env.ctx.api_saveFindingDraft(tTok, s2.SessionID, {
    categoryId: cat.CategoryID,
    sectionId: sec.SectionID,
    masalah: 'Masalah Bekasi Sesi 2 Berulang',
    mengapa: 'Penyebab 2',
    solusi: 'Solusi 2'
  }).data;
  env.ctx.api_uploadPhoto(tTok, {
    sessionId: s2.SessionID,
    findingId: f2.FindingID,
    fileName: 'bekasi2.jpg',
    mimeType: 'image/jpeg',
    base64Data: TINY_JPEG_B64,
    comment: 'Foto Bekasi 2',
    idempotencyKey: 'KEY-BKS-2'
  });
  env.ctx.api_finalizeSession(tTok, s2.SessionID, false);

  // 3. Sesi Selesai #3 di Outlet Depok (dihapus soft-delete oleh Super Admin -> TIDAK boleh ikut ekspor!)
  const sDeleted = env.ctx.api_saveDraft(tTok, {
    inspectionDate: '2026-11-09',
    outletName: 'Outlet Depok Terhapus',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC Depok'
  }).data;
  env.ctx.api_finalizeSession(tTok, sDeleted.SessionID, true);
  env.ctx.api_deleteSession(adminTok, sDeleted.SessionID, 'Sesi uji coba dihapus');

  // 4. Sesi Draft #4 di Outlet Bogor (masih Draft -> TIDAK boleh ikut ekspor!)
  env.ctx.api_saveDraft(tTok, {
    inspectionDate: '2026-11-10',
    outletName: 'Outlet Bogor Masih Draft',
    amId: am.AM_ID,
    mumId: mum.MUM_ID,
    picName: 'PIC Bogor'
  });

  // 5. Generate Summary Report PDF & Full Report PDF
  const sumPdf = env.ctx.api_generateDashboardReportPdf(adminTok, 'SUMMARY', {}).data;
  assert.ok(sumPdf.htmlPreview.includes('Laporan Ringkasan Pemeriksaan Outlet'));
  assert.ok(sumPdf.htmlPreview.includes('1. Ringkasan Pemeriksaan per Outlet'));
  assert.equal(sumPdf.htmlPreview.includes('Masalah Bekasi Sesi 1'), false); // Summary tidak memuat detail temuan per sesi
  assert.equal(sumPdf.htmlPreview.includes('Outlet Depok Terhapus'), false);
  assert.equal(sumPdf.htmlPreview.includes('Outlet Bogor Masih Draft'), false);

  const fullPdf = env.ctx.api_generateDashboardReportPdf(adminTok, 'FULL', {}).data;
  assert.ok(fullPdf.htmlPreview.includes('Laporan Lengkap Pemeriksaan Outlet'));
  assert.ok(fullPdf.htmlPreview.includes('6. Rincian Pemeriksaan per Outlet &amp; Dokumentasi Bukti Temuan'));
  assert.ok(fullPdf.htmlPreview.includes('Masalah Bekasi Sesi 1'));
  assert.ok(fullPdf.htmlPreview.includes('Masalah Bekasi Sesi 2 Berulang'));
  assert.ok(fullPdf.htmlPreview.includes('pdf-photo-img'));
  assert.ok(fullPdf.htmlPreview.includes('data:image/jpeg;base64,'));
  assert.ok(fullPdf.htmlPreview.includes('Foto Bekasi 1'));
  assert.ok(fullPdf.htmlPreview.includes('Foto Bekasi 2'));
  assert.equal(fullPdf.htmlPreview.includes('Outlet Depok Terhapus'), false);
  assert.equal(fullPdf.htmlPreview.includes('Outlet Bogor Masih Draft'), false);

  // 6. Ekspor Excel SIMPLE & STRUCTURED (.xlsx valid dengan signature ZIP PK\x03\x04)
  const xlsSimple = env.ctx.api_exportData(adminTok, 'EXCEL', 'SIMPLE', {}).data;
  assert.equal(xlsSimple.sheetNames.length, 1);
  assert.equal(xlsSimple.sheetNames[0], 'Data_Pemeriksaan_Gabungan');
  const zipBufSimple = Buffer.from(xlsSimple.base64Data, 'base64');
  assert.equal(zipBufSimple[0], 0x50); // 'P'
  assert.equal(zipBufSimple[1], 0x4b); // 'K'

  const xlsStruct = env.ctx.api_exportData(adminTok, 'EXCEL', 'STRUCTURED', {}).data;
  assert.deepEqual(Array.from(xlsStruct.sheetNames), [
    '1_Ringkasan_KPI',
    '2_Data_Sesi_Pemeriksaan',
    '3_Detail_Temuan',
    '4_Data_Foto_Bukti',
    '5_Top_Dan_Recurring'
  ]);
  // Pastikan hanya 2 sesi aktif yang masuk (Draft & soft-delete tidak masuk)
  assert.equal(xlsStruct.previewTables[1].rows.length, 2);
  assert.equal(xlsStruct.previewTables[2].rows.length, 2);
  assert.equal(xlsStruct.previewTables[3].rows.length, 2);

  // 7. Ekspor CSV SIMPLE (1 file) & STRUCTURED (5 file terpisah) dengan filter tanggal
  const csvSimpleFiltered = env.ctx.api_exportData(adminTok, 'CSV', 'SIMPLE', {
    dateFrom: '2026-11-07',
    dateTo: '2026-11-11'
  }).data;
  assert.equal(csvSimpleFiltered.files.length, 1);
  assert.ok(csvSimpleFiltered.files[0].csvContent.includes('Masalah Bekasi Sesi 2 Berulang'));
  assert.equal(csvSimpleFiltered.files[0].csvContent.includes('Masalah Bekasi Sesi 1'), false);

  const csvStruct = env.ctx.api_exportData(adminTok, 'CSV', 'STRUCTURED', {}).data;
  assert.equal(csvStruct.files.length, 5);
  assert.ok(csvStruct.files[4].csvContent.includes('RECURRING_ISSUE'));
  assert.ok(csvStruct.files[4].csvContent.includes('Perlu perhatian khusus'));

  // 8. Pastikan Audit Log mencatat setiap ekspor (Pengguna, Waktu, Format, Filter, Jenis Laporan — PRD 12.4)
  const auditExport = env.ctx.api_queryAuditLogs(adminTok, { action: 'EXPORT_DATA' }).data;
  assert.ok(auditExport.items.length >= 6);
});
