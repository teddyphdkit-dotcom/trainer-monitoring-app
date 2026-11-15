/**
 * scripts/generate-d1-seed.js
 * Mengonversi cloudflare/live-snapshot.json (hasil ekspor Google Spreadsheet + Google Drive)
 * menjadi file SQL D1 (cloudflare/seed-live-data.sql) untuk mutasi database ke Cloudflare D1.
 */
const fs = require('fs');
const path = require('path');
const { TM_CONFIG } = require('../src/server/Config.gs');

const SNAPSHOT_PATH = path.resolve(__dirname, '../cloudflare/live-snapshot.json');
const OUT_SQL_PATH = path.resolve(__dirname, '../cloudflare/seed-live-data.sql');

if (!fs.existsSync(SNAPSHOT_PATH)) {
  console.error('File cloudflare/live-snapshot.json belum tersedia.');
  process.exit(1);
}

const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));

function sqlStr(val) {
  if (val === undefined || val === null) return "''";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

const lines = [
  '-- ============================================================================',
  '-- Seed Data Mutasi dari Google Spreadsheet & Google Drive ke Cloudflare D1',
  `-- Diekspor pada: ${snapshot.exportedAt || new Date().toISOString()}`,
  '-- ============================================================================',
  '',
  'DELETE FROM "tm_sys_properties";',
  'DELETE FROM "tm_sys_files";',
  'DELETE FROM "tm_sys_file_chunks";',
  ''
];

for (const [k, v] of Object.entries(snapshot.properties || {})) {
  lines.push(
    `INSERT OR REPLACE INTO "tm_sys_properties" ("PropKey", "PropValue") VALUES (${sqlStr(k)}, ${sqlStr(v)});`
  );
}
lines.push('');

for (const [sheetName, headers] of Object.entries(TM_CONFIG.SHEETS)) {
  lines.push(`DELETE FROM "${sheetName}";`);
  const rows = (snapshot.sheets && snapshot.sheets[sheetName]) || [];
  const colList = headers.map((h) => `"${h}"`).join(', ');
  for (const r of rows) {
    const vals = headers.map((h) => sqlStr(r[h])).join(', ');
    lines.push(`INSERT INTO "${sheetName}" (${colList}) VALUES (${vals});`);
  }
  lines.push('');
}

const CHUNK_LEN = 50000;
for (const f of (snapshot.files || [])) {
  lines.push(
    `INSERT OR REPLACE INTO "tm_sys_files" ("FileID", "FolderID", "FileName", "MimeType", "Base64Data", "Trashed", "CreatedAt") VALUES (` +
      `${sqlStr(f.FileID)}, ${sqlStr(f.FolderID)}, ${sqlStr(f.FileName)}, ${sqlStr(f.MimeType)}, '', ${f.Trashed ? 1 : 0}, ${sqlStr(f.CreatedAt)}` +
    `);`
  );
  const b64 = String(f.Base64Data || '');
  let cIdx = 0;
  for (let pos = 0; pos < b64.length; pos += CHUNK_LEN) {
    const slice = b64.slice(pos, pos + CHUNK_LEN);
    lines.push(
      `INSERT INTO "tm_sys_file_chunks" ("FileID", "ChunkIndex", "ChunkData") VALUES (${sqlStr(f.FileID)}, ${cIdx++}, ${sqlStr(slice)});`
    );
  }
}

fs.writeFileSync(OUT_SQL_PATH, lines.join('\n'), 'utf8');
console.log('Berhasil membuat cloudflare/seed-live-data.sql (' + lines.length + ' baris SQL).');
