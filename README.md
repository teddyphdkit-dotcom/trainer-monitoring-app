# Trainer Monitoring (Final PRD v1.0)

Aplikasi web internal responsif (**Android & PC**) berbasis **Google Apps Script (V8)**, **Google Sheets**, dan **Google Drive** untuk pencatatan, pemantauan, analisis, pelaporan PDF/Excel/CSV, sinkronisasi offline, dan backup terproteksi hasil pemeriksaan operasional outlet.

---

## Ringkasan Modul (Phase 1 – Phase 10 Selesai)

1. **Phase 1 — Fondasi Aplikasi (`Config.gs`, `Db.gs`, `Security.gs`, `Audit.gs`, `Settings.gs`, `Bootstrap.gs`, `Auth.gs`, `Users.gs`)**
   - Auto-provisioning 20 Google Sheets & 4 folder Google Drive privat (`PRIVATE` / `NONE`).
   - Wizard Bootstrap Super Admin satu kali (tanpa password default hardcoded).
   - Autentikasi PBKDF2-HMAC-SHA256 (10.000 iterasi), lockout 5× gagal selama 15 menit, batas sesi 8 jam, idle timeout 30 menit, reset password sekali pakai via email, dan wajib ganti password setelah reset Admin.
   - Otorisasi berbasis peran (`SUPER_ADMIN`, `TRAINER`, `MANAJEMEN`) di seluruh endpoint backend dan `AuditLogs` bersifat *append-only*.
2. **Phase 2 — Master Data & Manajemen Outlet (`MasterData.gs`, `Outlets.gs`)**
   - CRUD & nonaktif/aktif untuk `Categories`, `Sections`, `Master_AM`, dan `Master_MUM`.
   - Normalisasi nama Outlet, deteksi kemiripan/duplikat otomatis, penomoran kode stabil `OUT001`, pengelolaan `OutletAliases`, serta *Logical Merge* & *Unmerge* Outlet tanpa merusak data historis.
3. **Phase 3 — Input Pemeriksaan, Foto & Finalisasi (`Photos.gs`, `Sessions.gs`, `Findings.gs`)**
   - Batas 5 Draft aktif per Trainer, validasi tanggal pemeriksaan (menolak tanggal masa depan), kompresi foto otomatis di sisi klien (≤ 1 MB dari maks 5 MB), antrean upload idempotent (1–5 foto per temuan), konfirmasi eksplisit untuk finalisasi 0 temuan, penomoran laporan terproteksi lock `TM-YYYYMMDD-OUT001-001`, serta batas waktu 24 jam bagi Trainer untuk mengedit/menghapus temuan miliknya.
4. **Phase 4 — Dashboard & Analisis (`Dashboard.gs`)**
   - 4 Tab utama (*Overview*, *Analisis*, *Top Issue*, *Detail Pemeriksaan*), Global Multi-Select Filter, 4 KPI utama, dan deteksi *Recurring Issue* berbasis jumlah sesi unik (≥ 2 sesi berbeda pada pasangan Outlet + Category yang sama).
5. **Phase 5 — Draft Management Lanjut (`Drafts.gs`)**
   - Monitoring Draft untuk Super Admin (5 metrik umur Draft), detail Draft 3-tab dalam mode *Read-Only*, penghapusan Draft oleh Super Admin dengan alasan wajib, pengajuan pemulihan oleh Trainer (≤ 7×24 jam), penguncian keputusan persetujuan/penolakan agar tidak terjadi pemrosesan ganda, serta penanda Draft dipulihkan selama 7×24 jam.
6. **Phase 6 — Offline & Sinkronisasi (`Sync.gs`, `idb.js.html`, `sync.js.html`)**
   - Penyimpanan lokal persisten berbasis **IndexedDB**, sinkronisasi batch idempotent saat koneksi pulih, deteksi & resolusi konflik lintas perangkat / pasca-pemulihan tanpa menimpa server otomatis, prioritas penghapusan Super Admin saat sinkronisasi berjalan (`DELETED_LOCKED`), serta kebijakan retensi data lokal 30 hari dengan peringatan 7 hari sebelumnya.
7. **Phase 7 — Reporting & Export (`Reporting.gs`, `Export.gs`)**
   - PDF per Sesi ukuran A4 print-friendly (tanpa menampilkan AM, MUM, Nomor Laporan, dan Waktu Generate pada isi PDF sesi; tata letak foto maks 2 per baris dengan komentar di bawah foto dan proteksi `page-break-inside: avoid`), penomoran versi di `PDFHistory`, pengiriman & pengiriman ulang email ke 1 penerima via `MailApp` (`EmailLogs`), PDF Dashboard (*Summary Report* & *Full Report*), serta ekspor **Excel (`.xlsx`)** dan **CSV (`.csv`)** dalam mode *Simple* (1 tabel gabungan) dan *Structured* (5 bagian).
8. **Phase 8 — Notification (`Notifications.gs`)**
   - Pusat Notifikasi (*Read*, *Unread*, *Mark All Read*), pengaturan preferensi kanal (*In-App* & *Email*) di `NotificationPreferences`, penetapan kebijakan notifikasi wajib oleh Super Admin, penguncian notifikasi keamanan & kegagalan backup kritis, larangan pengingat berkala khusus Draft, serta pemantauan dan *retry* pengiriman email yang gagal.
9. **Phase 9 — Backup, Safe Restore & Photo Archive (`Backup.gs`)**
   - Backup otomatis harian & backup manual ke folder Drive privat, proteksi label `Important` dari pembersihan otomatis retensi 90 hari, prosedur **8 Langkah Safe Restore** (ringkasan, *pre-restore backup*, konfirmasi eksplisit, validasi integritas, validasi relasi & referensi foto, eksekusi terproteksi lock, *rollback* otomatis bila gagal, dan pencatatan Audit Log), serta manajemen arsip foto permanen dan *purge* manual dengan alasan wajib.
10. **Phase 10 — QA Menyeluruh & Deployment (`tests/phase1.test.js` – `tests/phase10.test.js`)**
    - Seluruh daftar periksa PRD Bagian 22.1–22.9 terverifikasi melalui pengujian otomatis lokal.

---

## Menjalankan Rangkaian Pengujian Unit (Node.js)

```bash
npm test
```

---

## Panduan Deployment Produksi ke Google Apps Script (`clasp`)

1. **Instalasi Dependensi:**
   ```bash
   npm install
   ```
2. **Login ke Google Apps Script CLI:**
   ```bash
   npm run clasp:login
   ```
3. **Buat Proyek Apps Script Baru (atau arahkan `.clasp.json` ke `scriptId` Anda):**
   ```bash
   npx clasp create --type webapp --title "Trainer Monitoring" --rootDir src
   ```
4. **Unggah Seluruh Kode ke Google Apps Script:**
   ```bash
   npm run clasp:push
   ```
5. **Deploy sebagai Web App:**
   - Buka proyek di editor Apps Script (`npm run clasp:open`).
   - Pilih **Deploy > New deployment > Web app**.
   - Atur **Execute as:** *Me* (akun pemilik sistem yang mengelola Spreadsheet & Drive privat).
   - Atur **Who has access:** *Anyone* (karena autentikasi aplikasi dikelola secara mandiri oleh modul `Auth.gs` dengan token sesi dan RBAC).
   - Buka URL Web App yang dihasilkan dan jalankan **Wizard Bootstrap Awal** satu kali untuk membuat database 20 Sheet, folder Drive privat, dan akun Super Admin pertama.
6. **Konfigurasi Trigger Backup Otomatis Harian (Opsional / Direkomendasikan):**
   - Di editor Apps Script, buka menu **Triggers (Pemicu)** di sisi kiri.
   - Klik **+ Add Trigger**:
     - **Choose which function to run:** `cron_runDailyAutomatedBackup`
     - **Select event source:** *Time-driven*
     - **Select type of time based trigger:** *Day timer* (misalnya pukul `01:00 to 02:00` WIB).
