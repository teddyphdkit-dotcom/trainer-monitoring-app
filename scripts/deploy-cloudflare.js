/**
 * scripts/deploy-cloudflare.js
 * Otomatisasi penuh mutasi & deploy ke Cloudflare Workers + Cloudflare D1:
 * 1. Build ulang cloudflare/worker.js & cloudflare/schema.sql
 * 2. Cek / buat database Cloudflare D1 "trainer-monitoring-db" dan perbarui database_id di wrangler.toml
 * 3. Terapkan skema 20 tabel (schema.sql) & impor seluruh data aktif (seed-live-data.sql) ke Cloudflare D1
 * 4. Deploy aplikasi ke Cloudflare Workers (subdomain *.workers.dev gratis)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WRANGLER_TOML = path.join(ROOT, 'wrangler.toml');
const DB_NAME = 'trainer-monitoring-db';

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  return execSync(cmd, {
    cwd: ROOT,
    stdio: opts.capture ? 'pipe' : 'inherit',
    encoding: 'utf8'
  });
}

function ensureD1Database() {
  console.log('\n[1/4] Memeriksa database Cloudflare D1...');
  let listJson = '[]';
  try {
    listJson = run('npx wrangler d1 list --json', { capture: true });
  } catch (err) {
    console.error('Pastikan Anda sudah login dengan menjalankan: npm run cf:login');
    process.exit(1);
  }

  let list = [];
  try {
    list = JSON.parse(listJson);
  } catch (_) {}

  let found = list.find((d) => d.name === DB_NAME);
  if (!found) {
    console.log(`Database "${DB_NAME}" belum ada. Membuat database D1 baru...`);
    const createOut = run(`npx wrangler d1 create ${DB_NAME}`, { capture: true });
    console.log(createOut);
    const match = /database_id\s*=\s*"([0-9a-fA-F-]+)"/.exec(createOut);
    if (match) {
      found = { name: DB_NAME, uuid: match[1] };
    } else {
      const retryList = JSON.parse(run('npx wrangler d1 list --json', { capture: true }));
      found = retryList.find((d) => d.name === DB_NAME);
    }
  }

  if (!found || !found.uuid) {
    throw new Error('Gagal mendapatkan database_id dari Cloudflare D1.');
  }

  console.log(`Database D1 siap: ${found.name} (${found.uuid})`);
  let toml = fs.readFileSync(WRANGLER_TOML, 'utf8');
  toml = toml.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${found.uuid}"`);
  fs.writeFileSync(WRANGLER_TOML, toml, 'utf8');
  return found.uuid;
}

function main() {
  run('node scripts/build-cloudflare.js');
  if (fs.existsSync(path.join(ROOT, 'cloudflare', 'live-snapshot.json'))) {
    run('node scripts/generate-d1-seed.js');
  }

  ensureD1Database();

  console.log('\n[2/4] Menerapkan skema 20 tabel ke Cloudflare D1 (Remote)...');
  run(`npx wrangler d1 execute ${DB_NAME} --remote --file=cloudflare/schema.sql --yes`);

  if (fs.existsSync(path.join(ROOT, 'cloudflare', 'seed-live-data.sql'))) {
    console.log('\n[3/4] Memutasikan seluruh data & foto dari Google Spreadsheet/Drive ke Cloudflare D1 (Remote)...');
    run(`npx wrangler d1 execute ${DB_NAME} --remote --file=cloudflare/seed-live-data.sql --yes`);
  }

  console.log('\n[4/4] Men-deploy aplikasi ke Cloudflare Workers...');
  run('npx wrangler deploy');
}

main();
