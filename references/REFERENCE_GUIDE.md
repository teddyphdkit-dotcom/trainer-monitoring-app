# Panduan Referensi Arsitektur Autentikasi & Desain UI/UX (`references/`)

Folder `references/` ini merupakan **Sub-Folder Referensi Resmi** untuk proyek **Trainer Monitoring**. Setiap pengembangan fitur baru, pembaruan API autentikasi/keamanan, maupun pembaruan tampilan (UI/UX) wajib mengacu pada aset dan pola kode di dalam folder ini.

---

## 1. Struktur Sub-Folder Referensi

1. **`references/orca-auth-patterns/`** (Referensi Arsitektur Autentikasi & Sesi dari `orca`):
   - `apns-authentication-token.ts` — Pola pembuatan token terstruktur berbasis `base64Url(header).base64Url(payload).signature` dengan caching & rotasi waktu (`issuedAtMs`, `iat`, `exp`).
   - `relay-token-verifier.ts` — Pola verifikasi klaim token (`sub`, `sid`, `role`, `purpose: 'session-auth'`, `exp`) serta ekstraksi header `Bearer <token>`.
   - `admin-token-verifier.ts` — Pola matriks otorisasi berbasis rute/aksi (`identityMayAccess(role, routeOrAction)`).
   - `client-ip-rate-limit.ts` — Pola *Token-Bucket Rate Limiter* dengan pengisian ulang (*continuous refill* `tokensAt`) dan eviksi LRU (`maxTrackedIps`).
   - `integration-token-file-cache.ts` — Pola cache status token dengan batas kapasitas LRU (`MAX_CREDENTIAL_ENTRIES = 128`), `has()`, `read()`, `forget()`, dan `clear()`.
   - `agent-auth-restart-preservation.ts` & `use-app-session-persistence.ts` — Pola penjagaan sesi & sinkronisasi state (`visibilitychange` / `beforeunload` checkpoint) dengan batas waktu (*lifecycle timeout*) agar tidak kehilangan state saat aplikasi ditutup atau dimuat ulang.

2. **`references/design-dashboard/`** (Referensi Video Desain Visual):
   - `login page.mp4` (**Glassy Login Form v2**) — Desain halaman login berkonsep *Dark Glassmorphism Split-Card* (`backdrop-filter: blur(20px)`, latar geometris gelap, panel sambutan interaktif *"WELCOME BACK!"* di sisi kiri/kanan, dan form login berbingkai kaca tipis).
   - `side bar.mp4` (**SideBar UI**) — Desain navigasi samping melayang (*floating dark glass sidebar*) dengan kartu profil pengguna di atas, pengelompokan kategori menu (`MENU UTAMA`, `UMUM / SISTEM`), indikator menu aktif berwarna tegas, serta tombol *Collapse* bulat yang mengubah sidebar menjadi *compact icon dock*.
   - `main dasboard.mp4` (**Smart Control Dashboard**) — Desain *Bento Grid Dashboard* dengan sapaan kontekstual (*"Selamat Pagi/Siang/Sore/Malam, <Nama>"*), kartu KPI transparan berlapis kaca, lencana status bercahaya halus, dan transisi antar-panel yang mulus.

3. **`references/ui-ux-pro-max/`** (Toolkit & Database Desain UI/UX Pro Max):
   - `data/` — Database CSV kanonik (`styles.csv`, `colors.csv`, `typography.csv`, `charts.csv`, `ux-guidelines.csv`, `motion.csv`, serta panduan `stacks/`).
   - `scripts/search.py` — Mesin pencari desain BM25 + Regex untuk mengambil rekomendasi palet warna, tipografi, komponen, dan animasi:
     ```bash
     python references/ui-ux-pro-max/scripts/search.py "glassmorphism dashboard" --design-system
     ```
   - `CLAUDE.md` — Dokumentasi penggunaan *UI/UX Pro Max*.
