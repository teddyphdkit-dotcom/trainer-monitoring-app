const test = require('node:test');
const assert = require('node:assert/strict');
const { createGasEnv } = require('./mocks/gas-mocks');

function setupUsers(env) {
  env.ctx.api_runInitialBootstrap({
    companyName: 'PT Nusantara Food',
    name: 'Admin Utama',
    username: 'superadmin',
    email: 'admin@nusantara.test',
    password: 'Password123'
  });
  const adminToken = env.ctx.api_login('superadmin', 'Password123', 'PC').data.token;

  env.ctx.api_createUser(adminToken, {
    name: 'Andi Trainer',
    username: 'andi.trainer',
    email: 'andi@nusantara.test',
    role: 'TRAINER',
    password: 'TempPassword1'
  });
  const trainerLogin = env.ctx.api_login('andi.trainer', 'TempPassword1', 'Android').data;
  env.ctx.api_changePasswordRequired(trainerLogin.token, 'TempPassword1', 'AndiSecure99');

  return { adminToken, trainerToken: trainerLogin.token };
}

test('Phase 2: Master Data Category, Section, AM, MUM CRUD, nonaktif/aktif, & RBAC', () => {
  const env = createGasEnv();
  const { adminToken, trainerToken } = setupUsers(env);

  // Trainer boleh membaca Master Bundle, tapi ditolak mengubah Master Data
  const bundleTrainer = env.ctx.api_getMasterBundle(trainerToken);
  assert.equal(bundleTrainer.ok, true);
  assert.equal(bundleTrainer.data.active.categories.length, 8);
  assert.equal(bundleTrainer.data.active.sections.length, 7);

  const forbiddenAdd = env.ctx.api_saveMasterItem(trainerToken, 'AM', { name: 'AM Baru' });
  assert.equal(forbiddenAdd.ok, false);
  assert.equal(forbiddenAdd.error.code, 'ERR_FORBIDDEN');

  // Super Admin menambah AM & MUM terpisah
  const am1 = env.ctx.api_saveMasterItem(adminToken, 'AM', { name: '  Bapak   Hendra  ' });
  assert.equal(am1.ok, true);
  assert.equal(am1.data.AM_Name, 'Bapak Hendra');

  const mum1 = env.ctx.api_saveMasterItem(adminToken, 'MUM', { name: 'Ibu Ratna' });
  assert.equal(mum1.ok, true);
  assert.equal(mum1.data.MUM_Name, 'Ibu Ratna');

  // Duplikat AM ditolak (case-insensitive)
  const dupAm = env.ctx.api_saveMasterItem(adminToken, 'AM', { name: 'bapak hendra' });
  assert.equal(dupAm.ok, false);
  assert.equal(dupAm.error.code, 'ERR_DUPLICATE');

  // Rename & nonaktifkan lalu aktifkan kembali Category
  const cat1 = bundleTrainer.data.categories[0];
  const renamed = env.ctx.api_saveMasterItem(adminToken, 'CATEGORY', { id: cat1.CategoryID, name: 'Food Safety & HACCP' });
  assert.equal(renamed.ok, true);
  assert.equal(renamed.data.CategoryName, 'Food Safety & HACCP');

  const deactivated = env.ctx.api_setMasterStatus(adminToken, 'AM', am1.data.AM_ID, 'INACTIVE');
  assert.equal(deactivated.ok, true);
  assert.equal(deactivated.data.Status, 'INACTIVE');

  const afterDeactivateBundle = env.ctx.api_getMasterBundle(trainerToken).data;
  assert.equal(afterDeactivateBundle.active.ams.length, 0);
  assert.equal(afterDeactivateBundle.ams.length, 1);

  const reactivated = env.ctx.api_setMasterStatus(adminToken, 'AM', am1.data.AM_ID, 'ACTIVE');
  assert.equal(reactivated.ok, true);
  assert.equal(env.ctx.api_getMasterBundle(trainerToken).data.active.ams.length, 1);
});

test('Phase 2: Normalisasi Outlet, saran duplikat, Canonical ID, & kode OUT001', () => {
  const env = createGasEnv();
  const { trainerToken } = setupUsers(env);

  const o1 = env.ctx.api_resolveOrCreateOutlet(trainerToken, '  Outlet   Kemang  Raya ');
  assert.equal(o1.ok, true);
  assert.equal(o1.data.created, true);
  assert.equal(o1.data.outlet.CanonicalName, 'Outlet Kemang Raya');
  assert.equal(o1.data.outlet.OutletCode, 'OUT001');

  // Input dengan spasi/tanda baca berbeda tapi normalisasi sama -> pakai Outlet yang ada
  const o1Same = env.ctx.api_resolveOrCreateOutlet(trainerToken, 'outlet kemang - raya!');
  assert.equal(o1Same.ok, true);
  assert.equal(o1Same.data.created, false);
  assert.equal(o1Same.data.outlet.OutletID, o1.data.outlet.OutletID);

  // Saran duplikat untuk typo ringan
  const suggestions = env.ctx.api_suggestOutlets(trainerToken, 'Outlt Kemang Rayaa');
  assert.equal(suggestions.ok, true);
  assert.ok(suggestions.data.length >= 1);
  assert.equal(suggestions.data[0].OutletID, o1.data.outlet.OutletID);

  // Outlet kedua mendapat kode OUT002
  const o2 = env.ctx.api_resolveOrCreateOutlet(trainerToken, 'Outlet Sudirman');
  assert.equal(o2.ok, true);
  assert.equal(o2.data.outlet.OutletCode, 'OUT002');
});

test('Phase 2: Logical Merge Outlet, resolusi alias, & pembatalan Merge (Unmerge)', () => {
  const env = createGasEnv();
  const { adminToken, trainerToken } = setupUsers(env);

  const primary = env.ctx.api_resolveOrCreateOutlet(trainerToken, 'Outlet Senayan City').data.outlet;
  const dup = env.ctx.api_resolveOrCreateOutlet(trainerToken, 'Senayan City Mall').data.outlet;

  // Trainer tidak boleh merge Outlet
  const forbiddenMerge = env.ctx.api_mergeOutlets(trainerToken, primary.OutletID, [dup.OutletID], 'Duplikat');
  assert.equal(forbiddenMerge.ok, false);
  assert.equal(forbiddenMerge.error.code, 'ERR_FORBIDDEN');

  // Super Admin merge tanpa alasan ditolak
  const noReason = env.ctx.api_mergeOutlets(adminToken, primary.OutletID, [dup.OutletID], '');
  assert.equal(noReason.ok, false);
  assert.equal(noReason.error.code, 'ERR_VALIDATION');

  // Super Admin menjalankan merge
  const merged = env.ctx.api_mergeOutlets(adminToken, primary.OutletID, [dup.OutletID], 'Penulisan ganda cabang Senayan');
  assert.equal(merged.ok, true);
  assert.equal(merged.data.aliasesAdded.length, 1);
  assert.equal(merged.data.aliasesAdded[0].AliasName, 'Senayan City Mall');

  // Input nama lama "Senayan City Mall" kini ter-resolve ke Canonical Outlet utama
  const resolvedViaAlias = env.ctx.api_resolveOrCreateOutlet(trainerToken, 'Senayan City Mall');
  assert.equal(resolvedViaAlias.ok, true);
  assert.equal(resolvedViaAlias.data.created, false);
  assert.equal(resolvedViaAlias.data.outlet.OutletID, primary.OutletID);

  // Super Admin membatalkan merge (Unmerge)
  const unmerged = env.ctx.api_unmergeOutlet(adminToken, dup.OutletID, 'Ternyata cabang berbeda');
  assert.equal(unmerged.ok, true);
  assert.equal(unmerged.data.Status, 'ACTIVE');
  assert.equal(unmerged.data.MergedIntoOutletID, '');
  assert.equal(unmerged.data.OutletCode, dup.OutletCode);

  // Setelah unmerge, "Senayan City Mall" kembali ter-resolve ke Outlet aslinya
  const afterUnmerge = env.ctx.api_resolveOrCreateOutlet(trainerToken, 'Senayan City Mall');
  assert.equal(afterUnmerge.data.outlet.OutletID, dup.OutletID);

  // Audit Log mencatat MERGE & UNMERGE
  const logs = env.ctx.api_queryAuditLogs(adminToken, {}).data.items;
  assert.ok(logs.some((x) => x.Action === 'OUTLET_MERGED'));
  assert.ok(logs.some((x) => x.Action === 'OUTLET_UNMERGED'));
});

test('Phase 2: Hapus permanen Master Data & Outlet yang sudah dinonaktifkan', () => {
  const env = createGasEnv();
  const { adminToken } = setupUsers(env);

  const cat = env.ctx.api_saveMasterItem(adminToken, 'Category', { name: 'KategoriSementara' }).data;
  // Tidak boleh langsung dihapus jika masih ACTIVE
  const failActive = env.ctx.api_deleteMasterItem(adminToken, 'Category', cat.CategoryID);
  assert.equal(failActive.ok, false);

  // Nonaktifkan lalu hapus permanen
  env.ctx.api_setMasterStatus(adminToken, 'Category', cat.CategoryID, 'INACTIVE');
  const delCat = env.ctx.api_deleteMasterItem(adminToken, 'Category', cat.CategoryID);
  assert.equal(delCat.ok, true);
  assert.equal(delCat.data.deleted, true);

  const allMaster = env.ctx.api_getMasterBundle(adminToken).data;
  assert.ok(!allMaster.categories.some((x) => x.CategoryID === cat.CategoryID));

  // Outlet: nonaktifkan lalu hapus permanen
  const out = env.ctx.api_resolveOrCreateOutlet(adminToken, 'Outlet Sementara Uji').data.outlet;
  const failOutActive = env.ctx.api_deleteOutlet(adminToken, out.OutletID);
  assert.equal(failOutActive.ok, false);

  const setOutInactive = env.ctx.api_setOutletStatus(adminToken, out.OutletID, 'INACTIVE');
  assert.equal(setOutInactive.ok, true);
  assert.equal(setOutInactive.data.Status, 'INACTIVE');

  const delOut = env.ctx.api_deleteOutlet(adminToken, out.OutletID);
  assert.equal(delOut.ok, true);
  assert.equal(delOut.data.deleted, true);

  const outletsAfter = env.ctx.api_listOutlets(adminToken, true).data;
  assert.ok(!outletsAfter.some((x) => x.OutletID === out.OutletID));
});
