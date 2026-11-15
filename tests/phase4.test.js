const test = require('node:test');
const assert = require('node:assert/strict');
const { createGasEnv } = require('./mocks/gas-mocks');

const TINY_JPEG_B64 = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString('base64');

function createCompletedSession(env, token, opts) {
  const s = env.ctx.api_saveDraft(token, {
    inspectionDate: opts.date,
    outletName: opts.outletName,
    amId: opts.amId,
    mumId: opts.mumId,
    picName: opts.picName || 'PIC'
  }).data;

  const createdFindings = [];
  for (let i = 0; i < (opts.findings || []).length; i++) {
    const fSpec = opts.findings[i];
    const f = env.ctx.api_saveFindingDraft(token, s.SessionID, {
      categoryId: fSpec.categoryId,
      sectionId: fSpec.sectionId,
      masalah: fSpec.masalah || 'Masalah',
      mengapa: fSpec.mengapa || 'Mengapa',
      solusi: fSpec.solusi || ''
    }).data;
    env.ctx.api_uploadPhoto(token, {
      sessionId: s.SessionID,
      findingId: f.FindingID,
      fileName: 'bukti.jpg',
      mimeType: 'image/jpeg',
      base64Data: TINY_JPEG_B64,
      idempotencyKey: `IDEMP-${s.SessionID}-${f.FindingID}`
    });
    createdFindings.push(f);
  }

  const fin = env.ctx.api_finalizeSession(token, s.SessionID, createdFindings.length === 0);
  assert.equal(fin.ok, true, fin.error && fin.error.message);
  return { session: fin.data.session, findings: createdFindings };
}

test('Phase 4: KPI, sesi tanpa temuan, eksklusi Draft/soft-delete, Recurring Issue (sesi unik), Merge Outlet, & Global Filter', () => {
  const env = createGasEnv();
  env.ctx.TM_Utils.setNowProvider(() => new Date('2026-11-10T12:00:00+07:00').getTime());

  env.ctx.api_runInitialBootstrap({
    companyName: 'PT Nusantara Food',
    name: 'Admin Utama',
    username: 'superadmin',
    email: 'admin@nusantara.test',
    password: 'Password123'
  });
  const adminToken = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;

  const am1 = env.ctx.api_saveMasterItem(adminToken, 'AM', { name: 'AM Satu' }).data;
  const am2 = env.ctx.api_saveMasterItem(adminToken, 'AM', { name: 'AM Dua' }).data;
  const mum1 = env.ctx.api_saveMasterItem(adminToken, 'MUM', { name: 'MUM Satu' }).data;
  const master = env.ctx.api_getMasterBundle(adminToken).data;
  const catFoodSafety = master.active.categories[0];
  const catHygiene = master.active.categories[1];
  const secTopping = master.active.sections[0];
  const secDough = master.active.sections[6];

  env.ctx.api_createUser(adminToken, { name: 'Trainer A', username: 'trainera', email: 'ta@test.id', role: 'TRAINER', password: 'TempPassword1' });
  const tTok = env.ctx.api_login('trainera', 'TempPassword1', 'Android').data.token;
  env.ctx.api_changePasswordRequired(tTok, 'TempPassword1', 'TrainerSatu1');

  // 1. Buat 1 Draft (tidak boleh masuk Dashboard)
  env.ctx.api_saveDraft(tTok, {
    inspectionDate: '2026-11-05',
    outletName: 'Outlet Draft Saja',
    amId: am1.AM_ID,
    mumId: mum1.MUM_ID,
    picName: 'PIC Draft'
  });

  // 2. Sesi 1: Selesai TANPA temuan di Outlet Tebet
  createCompletedSession(env, tTok, {
    date: '2026-11-01',
    outletName: 'Outlet Tebet',
    amId: am1.AM_ID,
    mumId: mum1.MUM_ID,
    findings: []
  });

  // 3. Sesi 2: Outlet Menteng dengan 2 temuan di Category yang SAMA dalam 1 sesi -> BUKAN Recurring Issue!
  createCompletedSession(env, tTok, {
    date: '2026-11-02',
    outletName: 'Outlet Menteng',
    amId: am1.AM_ID,
    mumId: mum1.MUM_ID,
    findings: [
      { categoryId: catFoodSafety.CategoryID, sectionId: secTopping.SectionID, masalah: 'M1', mengapa: 'W1' },
      { categoryId: catFoodSafety.CategoryID, sectionId: secDough.SectionID, masalah: 'M2', mengapa: 'W2' }
    ]
  });

  let dash = env.ctx.api_getDashboardData(tTok, {}).data;
  assert.equal(dash.kpi.totalInspections, 2); // Sesi tanpa temuan + Sesi Menteng (Draft tidak dihitung)
  assert.equal(dash.kpi.inspectedOutlets, 2);
  assert.equal(dash.kpi.totalActiveFindings, 2);
  assert.equal(dash.kpi.recurringIssuesCount, 0); // 2 temuan dalam 1 sesi bukan recurring!

  // 4. Sesi 3: Outlet Menteng (nama duplikat "Menteng Raya" yang nanti di-merge) dengan Category Food Safety lagi
  const s3 = createCompletedSession(env, tTok, {
    date: '2026-11-06',
    outletName: 'Menteng Raya',
    amId: am2.AM_ID,
    mumId: mum1.MUM_ID,
    findings: [
      { categoryId: catFoodSafety.CategoryID, sectionId: secTopping.SectionID, masalah: 'M3', mengapa: 'W3' },
      { categoryId: catHygiene.CategoryID, sectionId: secDough.SectionID, masalah: 'M4', mengapa: 'W4' }
    ]
  });

  // Sebelum merge: "Outlet Menteng" & "Menteng Raya" masih 2 outlet berbeda -> Recurring = 0
  dash = env.ctx.api_getDashboardData(tTok, {}).data;
  assert.equal(dash.kpi.inspectedOutlets, 3);
  assert.equal(dash.kpi.recurringIssuesCount, 0);

  // Super Admin melakukan Logical Merge "Menteng Raya" ke "Outlet Menteng"
  const outlets = env.ctx.api_listOutlets(adminToken).data;
  const oMenteng = outlets.find((o) => o.CanonicalName === 'Outlet Menteng');
  const oMentengRaya = outlets.find((o) => o.CanonicalName === 'Menteng Raya');
  env.ctx.api_mergeOutlets(adminToken, oMenteng.OutletID, [oMentengRaya.OutletID], 'Cabang yang sama');

  // Setelah merge: "Outlet Menteng" + "Menteng Raya" digabung sebagai 1 Canonical Outlet -> Recurring Issue = 1!
  dash = env.ctx.api_getDashboardData(tTok, {}).data;
  assert.equal(dash.kpi.inspectedOutlets, 2); // Tebet + Menteng
  assert.equal(dash.kpi.recurringIssuesCount, 1);
  assert.equal(dash.kpi.recurringAffectedOutletsCount, 1);
  assert.equal(dash.recurringIssues[0].categoryId, catFoodSafety.CategoryID);
  assert.equal(dash.recurringIssues[0].sessionCount, 2);
  assert.equal(dash.recurringIssues[0].findingCount, 3);
  assert.equal(dash.recurringIssues[0].label, 'Perlu perhatian khusus');

  // 5. Uji Global Filter (Filter berdasarkan AM2 -> hanya Sesi 3 yang tampil -> hanya 1 sesi -> Recurring = 0 dalam filter ini)
  const filteredAm2 = env.ctx.api_getDashboardData(tTok, { amIds: [am2.AM_ID] }).data;
  assert.equal(filteredAm2.kpi.totalInspections, 1);
  assert.equal(filteredAm2.kpi.totalActiveFindings, 2);
  assert.equal(filteredAm2.kpi.recurringIssuesCount, 0);

  // 6. Soft delete temuan Food Safety pada Sesi 3 -> tidak lagi masuk Dashboard & Recurring kembali 0
  env.ctx.api_deleteFinding(tTok, s3.findings[0].FindingID, 'Koreksi temuan');
  const afterDelete = env.ctx.api_getDashboardData(tTok, {}).data;
  assert.equal(afterDelete.kpi.totalActiveFindings, 3);
  assert.equal(afterDelete.kpi.recurringIssuesCount, 0);
});
