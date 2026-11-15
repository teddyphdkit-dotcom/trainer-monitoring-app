/**
 * scripts/build-cloudflare.js
 * Memaketkan seluruh aplikasi Trainer Monitoring (Frontend HTML/CSS/JS + Backend 21 modul .gs)
 * menjadi Cloudflare Worker + Cloudflare D1 SQLite tanpa mengubah satu pun desain UI maupun logika bisnis.
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CLIENT_DIR = path.join(ROOT_DIR, 'src', 'client');
const SERVER_DIR = path.join(ROOT_DIR, 'src', 'server');
const CF_DIR = path.join(ROOT_DIR, 'cloudflare');

if (!fs.existsSync(CF_DIR)) {
  fs.mkdirSync(CF_DIR, { recursive: true });
}

// 1. Urutan pemuatan modul server (.gs) sesuai arsitektur
const SERVER_LOAD_ORDER = [
  'Config.gs',
  'Db.gs',
  'Security.gs',
  'Audit.gs',
  'Settings.gs',
  'Bootstrap.gs',
  'Auth.gs',
  'Users.gs',
  'MasterData.gs',
  'Outlets.gs',
  'Sessions.gs',
  'Findings.gs',
  'Photos.gs',
  'Dashboard.gs',
  'Drafts.gs',
  'Sync.gs',
  'Reporting.gs',
  'Export.gs',
  'Notifications.gs',
  'Backup.gs',
  'Main.gs'
];

// 2. Rakitan HTML Frontend (menggabungkan index.html + seluruh include partial)
function buildClientHtmlTemplate() {
  const indexPath = path.join(CLIENT_DIR, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  html = html.replace(/<\?!=\s*include\(['"]([^'"]+)['"]\);\s*\?>/g, (_, includePath) => {
    const rel = includePath.replace(/^client\//, '');
    let targetFile = path.join(CLIENT_DIR, rel);
    if (!fs.existsSync(targetFile) && !targetFile.endsWith('.html')) {
      targetFile += '.html';
    }
    if (!fs.existsSync(targetFile)) {
      throw new Error(`File partial client tidak ditemukan: ${includePath} (${targetFile})`);
    }
    return fs.readFileSync(targetFile, 'utf8');
  });

  // Ganti scriplet initialMode & initialResetToken dengan placeholder yang diisi saat request GET /
  html = html.replace(/<\?=\s*initialMode\s*\?>/g, '__TM_INITIAL_MODE__');
  html = html.replace(/<\?=\s*initialResetToken\s*\?>/g, '__TM_INITIAL_RESET_TOKEN__');

  return html;
}

// 3. Baca Config.gs untuk mengekstrak skema 20 tabel D1
const { TM_CONFIG } = require(path.join(SERVER_DIR, 'Config.gs'));

function buildD1SchemaSql() {
  const lines = [
    '-- ============================================================================',
    '-- Cloudflare D1 (SQLite) Schema untuk Trainer Monitoring App (20 Sheet + Storage)',
    '-- ============================================================================',
    '',
    'CREATE TABLE IF NOT EXISTS "tm_sys_properties" (',
    '  "PropKey" TEXT PRIMARY KEY,',
    '  "PropValue" TEXT NOT NULL DEFAULT \'\'',
    ');',
    '',
    'CREATE TABLE IF NOT EXISTS "tm_sys_folders" (',
    '  "FolderID" TEXT PRIMARY KEY,',
    '  "FolderName" TEXT NOT NULL DEFAULT \'\',',
    '  "ParentID" TEXT NOT NULL DEFAULT \'\',',
    '  "Access" TEXT NOT NULL DEFAULT \'PRIVATE\',',
    '  "Permission" TEXT NOT NULL DEFAULT \'NONE\'',
    ');',
    '',
    'CREATE TABLE IF NOT EXISTS "tm_sys_files" (',
    '  "FileID" TEXT PRIMARY KEY,',
    '  "FolderID" TEXT NOT NULL DEFAULT \'\',',
    '  "FileName" TEXT NOT NULL DEFAULT \'\',',
    '  "MimeType" TEXT NOT NULL DEFAULT \'application/octet-stream\',',
    '  "Base64Data" TEXT NOT NULL DEFAULT \'\',',
    '  "Trashed" INTEGER NOT NULL DEFAULT 0,',
    '  "CreatedAt" TEXT NOT NULL DEFAULT \'\'',
    ');',
    '',
    'CREATE TABLE IF NOT EXISTS "tm_sys_file_chunks" (',
    '  "FileID" TEXT NOT NULL,',
    '  "ChunkIndex" INTEGER NOT NULL,',
    '  "ChunkData" TEXT NOT NULL DEFAULT \'\',',
    '  PRIMARY KEY ("FileID", "ChunkIndex")',
    ');',
    ''
  ];

  for (const [sheetName, headers] of Object.entries(TM_CONFIG.SHEETS)) {
    const colDefs = [
      '  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT',
      ...headers.map((h) => `  "${h}" TEXT NOT NULL DEFAULT ''`)
    ];
    lines.push(`CREATE TABLE IF NOT EXISTS "${sheetName}" (\n${colDefs.join(',\n')}\n);`);
    lines.push(`CREATE INDEX IF NOT EXISTS "idx_${sheetName}_${headers[0]}" ON "${sheetName}" ("${headers[0]}");`);
    lines.push('');
  }

  return lines.join('\n');
}

// 4. Gabungkan seluruh kode server .gs
function buildServerConcatenatedCode() {
  const chunks = [];
  for (const file of SERVER_LOAD_ORDER) {
    const fullPath = path.join(SERVER_DIR, file);
    let code = fs.readFileSync(fullPath, 'utf8');
    // Hapus blok CommonJS module.exports di bagian akhir file agar bersih di dalam factory function
    code = code.replace(/if\s*\(\s*typeof\s+module\s*!==\s*['"]undefined['"]\s*&&\s*module\.exports\s*\)\s*\{[\s\S]*?\}\s*$/m, '');
    chunks.push(`/* ==================== FILE: ${file} ==================== */\n${code}`);
  }

  // Temukan seluruh nama fungsi api_* dan cron_* dari Main.gs
  const mainCode = fs.readFileSync(path.join(SERVER_DIR, 'Main.gs'), 'utf8');
  const rpcNames = [];
  const cronNames = [];
  const fnRegex = /function\s+((?:api|cron)_[a-zA-Z0-9_]+)\s*\(/g;
  let m;
  while ((m = fnRegex.exec(mainCode)) !== null) {
    if (m[1].startsWith('api_')) rpcNames.push(m[1]);
    else if (m[1].startsWith('cron_')) cronNames.push(m[1]);
  }

  return {
    serverCode: chunks.join('\n\n'),
    rpcNames,
    cronNames
  };
}

function buildWorkerScript() {
  const clientHtml = buildClientHtmlTemplate();
  const schemaSql = buildD1SchemaSql();
  const { serverCode, rpcNames, cronNames } = buildServerConcatenatedCode();

  fs.writeFileSync(path.join(CF_DIR, 'schema.sql'), schemaSql, 'utf8');

  const workerSource = `/**
 * cloudflare/worker.js — Dihasilkan otomatis oleh scripts/build-cloudflare.js
 * Menjalankan seluruh Frontend & Backend Trainer Monitoring di atas Cloudflare Workers + Cloudflare D1.
 */

const CLIENT_HTML_TEMPLATE = ${JSON.stringify(clientHtml)};
const SHEETS_SCHEMA = ${JSON.stringify(TM_CONFIG.SHEETS)};
const SHEET_NAMES = Object.keys(SHEETS_SCHEMA);
const DEFAULT_GAS_BRIDGE_URL = "https://script.google.com/macros/s/AKfycbyV5lj714EFILXUR2SwpyaYIdAz5KAkrlPSZkjqQf6o8CYeb5KKKMJJ6b9HdP7oZEA/exec";
const CF_BRIDGE_KEY = "TM_CF_BRIDGE_2026_SECURE_KEY";

// Cache in-memory untuk mempercepat CacheService lintas request dalam isolate yang sama
const ISOLATE_CACHE = new Map();
let SCHEMA_INITIALIZED = false;

function base64ToBytes(b64) {
  const clean = String(b64 || '').replace(/^data:[^;]+;base64,/, '').replace(/\\s+/g, '');
  const binStr = atob(clean);
  const len = binStr.length;
  const out = new Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = binStr.charCodeAt(i);
  }
  return out;
}

function bytesToBase64(bytes) {
  if (typeof bytes === 'string') {
    const enc = new TextEncoder().encode(bytes);
    let bin = '';
    for (let i = 0; i < enc.length; i++) bin += String.fromCharCode(enc[i]);
    return btoa(bin);
  }
  const arr = Array.isArray(bytes) || bytes instanceof Uint8Array ? bytes : [];
  let bin = '';
  const chunkSize = 8192;
  for (let i = 0; i < arr.length; i += chunkSize) {
    const slice = arr.slice(i, i + chunkSize);
    for (let j = 0; j < slice.length; j++) {
      bin += String.fromCharCode(slice[j] & 0xff);
    }
  }
  return btoa(bin);
}

function utf8ToBytes(str) {
  return Array.from(new TextEncoder().encode(String(str || '')));
}

async function ensureD1Schema(db) {
  if (SCHEMA_INITIALIZED) return;
  const stmts = [
    db.prepare('CREATE TABLE IF NOT EXISTS "tm_sys_properties" ("PropKey" TEXT PRIMARY KEY, "PropValue" TEXT NOT NULL DEFAULT \\'\\')'),
    db.prepare('CREATE TABLE IF NOT EXISTS "tm_sys_folders" ("FolderID" TEXT PRIMARY KEY, "FolderName" TEXT NOT NULL DEFAULT \\'\\', "ParentID" TEXT NOT NULL DEFAULT \\'\\', "Access" TEXT NOT NULL DEFAULT \\'PRIVATE\\', "Permission" TEXT NOT NULL DEFAULT \\'NONE\\')'),
    db.prepare('CREATE TABLE IF NOT EXISTS "tm_sys_files" ("FileID" TEXT PRIMARY KEY, "FolderID" TEXT NOT NULL DEFAULT \\'\\', "FileName" TEXT NOT NULL DEFAULT \\'\\', "MimeType" TEXT NOT NULL DEFAULT \\'application/octet-stream\\', "Base64Data" TEXT NOT NULL DEFAULT \\'\\', "Trashed" INTEGER NOT NULL DEFAULT 0, "CreatedAt" TEXT NOT NULL DEFAULT \\'\\')'),
    db.prepare('CREATE TABLE IF NOT EXISTS "tm_sys_file_chunks" ("FileID" TEXT NOT NULL, "ChunkIndex" INTEGER NOT NULL, "ChunkData" TEXT NOT NULL DEFAULT \\'\\', PRIMARY KEY ("FileID", "ChunkIndex"))')
  ];
  for (const sName of SHEET_NAMES) {
    const cols = SHEETS_SCHEMA[sName];
    const colDefs = ['"_row_order" INTEGER PRIMARY KEY AUTOINCREMENT', ...cols.map((c) => \`"\${c}" TEXT NOT NULL DEFAULT ''\`)].join(', ');
    stmts.push(db.prepare(\`CREATE TABLE IF NOT EXISTS "\${sName}" (\${colDefs})\`));
  }
  await db.batch(stmts);
  SCHEMA_INITIALIZED = true;
}

async function loadStateFromD1(db, fnName, args) {
  await ensureD1Schema(db);

  const queries = [
    db.prepare('SELECT "PropKey", "PropValue" FROM "tm_sys_properties"'),
    db.prepare('SELECT "FolderID", "FolderName", "ParentID", "Access", "Permission" FROM "tm_sys_folders"'),
    db.prepare('SELECT "FileID", "FolderID", "FileName", "MimeType", "Trashed", "CreatedAt" FROM "tm_sys_files"'),
    ...SHEET_NAMES.map((sName) => {
      const cols = SHEETS_SCHEMA[sName].map((c) => \`"\${c}"\`).join(', ');
      return db.prepare(\`SELECT \${cols} FROM "\${sName}" ORDER BY "_row_order" ASC\`);
    })
  ];

  const results = await db.batch(queries);

  const scriptProps = new Map();
  for (const r of (results[0].results || [])) {
    scriptProps.set(String(r.PropKey), String(r.PropValue));
  }

  const driveFolders = new Map();
  for (const r of (results[1].results || [])) {
    driveFolders.set(String(r.FolderID), {
      id: String(r.FolderID),
      name: String(r.FolderName),
      parentId: String(r.ParentID || ''),
      access: String(r.Access || 'PRIVATE'),
      permission: String(r.Permission || 'NONE')
    });
  }

  const driveFiles = new Map();
  for (const r of (results[2].results || [])) {
    driveFiles.set(String(r.FileID), {
      id: String(r.FileID),
      folderId: String(r.FolderID || ''),
      name: String(r.FileName || ''),
      mimeType: String(r.MimeType || 'application/octet-stream'),
      base64Data: '',
      trashed: Boolean(r.Trashed),
      createdAt: String(r.CreatedAt || '')
    });
  }

  const sheetsRows = new Map();
  for (let i = 0; i < SHEET_NAMES.length; i++) {
    const sName = SHEET_NAMES[i];
    const headers = SHEETS_SCHEMA[sName];
    const dbRows = results[3 + i].results || [];
    const matrix = [headers.slice()];
    for (const rowObj of dbRows) {
      matrix.push(headers.map((h) => (rowObj[h] === undefined || rowObj[h] === null ? '' : String(rowObj[h]))));
    }
    sheetsRows.set(sName, matrix);
  }

  // Tentukan FileID mana yang perlu dimuat Base64Data-nya untuk RPC ini
  const neededFileIds = new Set();
  const appSettingsMatrix = sheetsRows.get('AppSettings') || [];
  for (let r = 1; r < appSettingsMatrix.length; r++) {
    if (appSettingsMatrix[r][0] === 'COMPANY_LOGO_FILE_ID' && appSettingsMatrix[r][1]) {
      neededFileIds.add(appSettingsMatrix[r][1]);
    }
  }

  if (fnName === 'api_getPhotoDataUrl' && args && args[1]) {
    const targetPhotoId = String(args[1]);
    const photosMatrix = sheetsRows.get('Photos') || [];
    for (let r = 1; r < photosMatrix.length; r++) {
      if (photosMatrix[r][0] === targetPhotoId && photosMatrix[r][3]) {
        neededFileIds.add(photosMatrix[r][3]);
      }
    }
  } else if (
    fnName === 'api_generateSessionPdf' ||
    fnName === 'api_sendSessionPdfEmail'
  ) {
    const targetSessionId = args && args[1] ? String(args[1]) : '';
    const photosMatrix = sheetsRows.get('Photos') || [];
    for (let r = 1; r < photosMatrix.length; r++) {
      if (photosMatrix[r][2] === targetSessionId && photosMatrix[r][3]) {
        neededFileIds.add(photosMatrix[r][3]);
      }
    }
  } else if (
    fnName === 'api_generateDashboardReportPdf' ||
    fnName === 'api_createManualBackup' ||
    fnName === 'api_runDailyAutomatedBackup' ||
    fnName === 'api_getBackupSummaryForRestore' ||
    fnName === 'api_executeSafeRestore' ||
    fnName === 'cron_runDailyAutomatedBackup'
  ) {
    for (const fid of driveFiles.keys()) {
      neededFileIds.add(fid);
    }
  }

  if (neededFileIds.size > 0) {
    const idList = Array.from(neededFileIds);
    const chunkSize = 40;
    const fileQueries = [];
    for (let i = 0; i < idList.length; i += chunkSize) {
      const slice = idList.slice(i, i + chunkSize);
      const placeholders = slice.map(() => '?').join(', ');
      fileQueries.push(
        db.prepare(\`SELECT "FileID", "ChunkIndex", "ChunkData" FROM "tm_sys_file_chunks" WHERE "FileID" IN (\${placeholders}) ORDER BY "FileID" ASC, "ChunkIndex" ASC\`).bind(...slice)
      );
    }
    const fileRes = await db.batch(fileQueries);
    const chunksByFile = new Map();
    for (const batchItem of fileRes) {
      for (const row of (batchItem.results || [])) {
        const fid = String(row.FileID);
        if (!chunksByFile.has(fid)) chunksByFile.set(fid, []);
        chunksByFile.get(fid).push(String(row.ChunkData || ''));
      }
    }
    for (const [fid, parts] of chunksByFile.entries()) {
      const fObj = driveFiles.get(fid);
      if (fObj) {
        fObj.base64Data = parts.join('');
      }
    }
  }

  return {
    scriptProps,
    driveFolders,
    driveFiles,
    sheetsRows,
    dirtyProps: new Set(),
    dirtyFolders: new Set(),
    dirtyFiles: new Set(),
    dirtySheets: new Set(),
    pendingEmails: []
  };
}

async function commitStateToD1(db, state) {
  const stmts = [];

  for (const k of state.dirtyProps) {
    const v = state.scriptProps.get(k) || '';
    stmts.push(
      db.prepare('INSERT OR REPLACE INTO "tm_sys_properties" ("PropKey", "PropValue") VALUES (?, ?)').bind(k, v)
    );
  }

  for (const fid of state.dirtyFolders) {
    const f = state.driveFolders.get(fid);
    if (f) {
      stmts.push(
        db.prepare('INSERT OR REPLACE INTO "tm_sys_folders" ("FolderID", "FolderName", "ParentID", "Access", "Permission") VALUES (?, ?, ?, ?, ?)')
          .bind(f.id, f.name, f.parentId || '', f.access || 'PRIVATE', f.permission || 'NONE')
      );
    }
  }

  for (const fileId of state.dirtyFiles) {
    const fl = state.driveFiles.get(fileId);
    if (fl) {
      stmts.push(
        db.prepare('INSERT OR REPLACE INTO "tm_sys_files" ("FileID", "FolderID", "FileName", "MimeType", "Base64Data", "Trashed", "CreatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(fl.id, fl.folderId || '', fl.name || '', fl.mimeType || 'application/octet-stream', '', fl.trashed ? 1 : 0, fl.createdAt || new Date().toISOString())
      );
      stmts.push(db.prepare('DELETE FROM "tm_sys_file_chunks" WHERE "FileID" = ?').bind(fl.id));
      const b64 = String(fl.base64Data || '');
      const CHUNK_LEN = 50000;
      let cIdx = 0;
      for (let pos = 0; pos < b64.length; pos += CHUNK_LEN) {
        stmts.push(
          db.prepare('INSERT INTO "tm_sys_file_chunks" ("FileID", "ChunkIndex", "ChunkData") VALUES (?, ?, ?)')
            .bind(fl.id, cIdx++, b64.slice(pos, pos + CHUNK_LEN))
        );
      }
    }
  }

  for (const sName of state.dirtySheets) {
    const headers = SHEETS_SCHEMA[sName];
    if (!headers) continue;
    stmts.push(db.prepare(\`DELETE FROM "\${sName}"\`));

    const matrix = state.sheetsRows.get(sName) || [];
    if (matrix.length > 1) {
      const fileHeaders = matrix[0] || headers;
      const colListSql = headers.map((c) => \`"\${c}"\`).join(', ');
      // D1 membatasi maksimal 100 bound parameters per statement
      const maxRowsPerInsert = Math.max(1, Math.floor(90 / headers.length));
      const dataRows = [];
      for (let r = 1; r < matrix.length; r++) {
        const row = matrix[r] || [];
        const isEmpty = row.every((cell) => cell === '' || cell === null || cell === undefined);
        if (isEmpty) continue;
        const mapped = headers.map((h) => {
          const idx = fileHeaders.indexOf(h);
          const val = idx >= 0 ? row[idx] : '';
          return val === undefined || val === null ? '' : String(val);
        });
        dataRows.push(mapped);
      }

      for (let i = 0; i < dataRows.length; i += maxRowsPerInsert) {
        const slice = dataRows.slice(i, i + maxRowsPerInsert);
        const rowPlaceholders = slice.map(() => \`(\${headers.map(() => '?').join(', ')})\`).join(', ');
        const flatParams = [];
        for (const r of slice) {
          flatParams.push(...r);
        }
        stmts.push(
          db.prepare(\`INSERT INTO "\${sName}" (\${colListSql}) VALUES \${rowPlaceholders}\`).bind(...flatParams)
        );
      }
    }
  }

  if (stmts.length > 0) {
    await db.batch(stmts);
  }
}

function createGasContext(state, appOriginUrl) {
  const nextId = (prefix) => \`\${prefix}_\${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}\`;

  class D1Range {
    constructor(sheet, row, col, numRows, numCols) {
      this.sheet = sheet;
      this.row = row;
      this.col = col;
      this.numRows = numRows;
      this.numCols = numCols;
    }
    getValues() {
      const out = [];
      for (let r = 0; r < this.numRows; r++) {
        const rowArr = [];
        const targetRow = this.sheet._rows[this.row - 1 + r] || [];
        for (let c = 0; c < this.numCols; c++) {
          const v = targetRow[this.col - 1 + c];
          rowArr.push(v === undefined ? '' : v);
        }
        out.push(rowArr);
      }
      return out;
    }
    setValues(values) {
      for (let r = 0; r < values.length; r++) {
        const rIdx = this.row - 1 + r;
        if (!this.sheet._rows[rIdx]) this.sheet._rows[rIdx] = [];
        for (let c = 0; c < values[r].length; c++) {
          this.sheet._rows[rIdx][this.col - 1 + c] = values[r][c];
        }
      }
      state.dirtySheets.add(this.sheet.name);
      return this;
    }
    setFontWeight() { return this; }
    setNumberFormat() { return this; }
  }

  class D1Sheet {
    constructor(name, rowsRef) {
      this.name = name;
      this._rows = rowsRef;
    }
    getName() { return this.name; }
    setName(n) {
      const oldName = this.name;
      this.name = n;
      state.sheetsRows.delete(oldName);
      state.sheetsRows.set(n, this._rows);
      state.dirtySheets.add(n);
    }
    getLastRow() { return this._rows.length; }
    getLastColumn() {
      return this._rows.reduce((max, r) => Math.max(max, r ? r.length : 0), 0);
    }
    setFrozenRows() {}
    clear() {
      this._rows.length = 0;
      state.dirtySheets.add(this.name);
    }
    clearContents() {
      this._rows.length = 0;
      state.dirtySheets.add(this.name);
    }
    getRange(row, col, numRows = 1, numCols = 1) {
      return new D1Range(this, row, col, numRows, numCols);
    }
  }

  const spreadsheetObj = {
    getId: () => state.scriptProps.get('SPREADSHEET_ID') || 'CF_D1_SPREADSHEET',
    getSheets: () => Array.from(state.sheetsRows.entries()).map(([n, r]) => new D1Sheet(n, r)),
    getSheetByName: (name) => {
      if (!state.sheetsRows.has(name)) return null;
      return new D1Sheet(name, state.sheetsRows.get(name));
    },
    insertSheet: (name) => {
      if (!state.sheetsRows.has(name)) {
        state.sheetsRows.set(name, []);
      }
      state.dirtySheets.add(name);
      return new D1Sheet(name, state.sheetsRows.get(name));
    }
  };

  function makeFileWrapper(fileRec) {
    return {
      getId: () => fileRec.id,
      getBlob: () => ({
        getBytes: () => base64ToBytes(fileRec.base64Data || ''),
        getContentType: () => fileRec.mimeType || 'application/octet-stream',
        getName: () => fileRec.name || fileRec.id
      }),
      setTrashed: (flag) => {
        fileRec.trashed = Boolean(flag);
        state.dirtyFiles.add(fileRec.id);
      },
      isTrashed: () => Boolean(fileRec.trashed),
      setSharing: () => {},
      moveTo: (targetFolder) => {
        if (targetFolder && typeof targetFolder.getId === 'function') {
          fileRec.folderId = targetFolder.getId();
          state.dirtyFiles.add(fileRec.id);
        }
      }
    };
  }

  function makeFolderWrapper(folderRec) {
    return {
      getId: () => folderRec.id,
      getName: () => folderRec.name,
      setSharing: (access, perm) => {
        folderRec.access = access;
        folderRec.permission = perm;
        state.dirtyFolders.add(folderRec.id);
      },
      createFolder: (name) => {
        const f = {
          id: nextId('FLD'),
          name: String(name),
          parentId: folderRec.id,
          access: 'PRIVATE',
          permission: 'NONE'
        };
        state.driveFolders.set(f.id, f);
        state.dirtyFolders.add(f.id);
        return makeFolderWrapper(f);
      },
      createFile: (blob) => {
        const f = {
          id: nextId('FIL'),
          folderId: folderRec.id,
          name: String(blob.getName() || 'file.bin'),
          mimeType: String(blob.getContentType() || 'application/octet-stream'),
          base64Data: bytesToBase64(blob.getBytes()),
          trashed: false,
          createdAt: new Date().toISOString()
        };
        state.driveFiles.set(f.id, f);
        state.dirtyFiles.add(f.id);
        return makeFileWrapper(f);
      },
      addFile: (fileWrapper) => {
        const rec = state.driveFiles.get(fileWrapper.getId());
        if (rec) {
          rec.folderId = folderRec.id;
          state.dirtyFiles.add(rec.id);
        }
      },
      removeFile: () => {}
    };
  }

  const globals = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (state.scriptProps.has(k) ? state.scriptProps.get(k) : null),
        getProperties: () => Object.fromEntries(state.scriptProps.entries()),
        setProperty: (k, v) => {
          state.scriptProps.set(String(k), String(v));
          state.dirtyProps.add(String(k));
        },
        setProperties: (obj) => {
          for (const [k, v] of Object.entries(obj || {})) {
            state.scriptProps.set(String(k), String(v));
            state.dirtyProps.add(String(k));
          }
        }
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (ISOLATE_CACHE.has(k) ? ISOLATE_CACHE.get(k) : null),
        put: (k, v) => { ISOLATE_CACHE.set(String(k), String(v)); },
        remove: (k) => { ISOLATE_CACHE.delete(String(k)); }
      })
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    },
    SpreadsheetApp: {
      create: () => {
        const id = 'CF_D1_MAIN_DB';
        state.scriptProps.set('SPREADSHEET_ID', id);
        state.dirtyProps.add('SPREADSHEET_ID');
        return spreadsheetObj;
      },
      openById: () => spreadsheetObj
    },
    DriveApp: {
      Access: { PRIVATE: 'PRIVATE' },
      Permission: { NONE: 'NONE' },
      createFolder: (name) => {
        const f = {
          id: nextId('FLD'),
          name: String(name),
          parentId: '',
          access: 'PRIVATE',
          permission: 'NONE'
        };
        state.driveFolders.set(f.id, f);
        state.dirtyFolders.add(f.id);
        return makeFolderWrapper(f);
      },
      getFolderById: (id) => {
        let f = state.driveFolders.get(String(id));
        if (!f) {
          f = { id: String(id), name: String(id), parentId: '', access: 'PRIVATE', permission: 'NONE' };
          state.driveFolders.set(f.id, f);
        }
        return makeFolderWrapper(f);
      },
      getFileById: (id) => {
        const fl = state.driveFiles.get(String(id));
        if (!fl) throw new Error('File tidak ditemukan di penyimpanan Cloudflare: ' + id);
        return makeFileWrapper(fl);
      }
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      base64Decode: (b64) => base64ToBytes(b64),
      base64Encode: (bytes) => bytesToBase64(bytes),
      newBlob: (bytes, mimeType, name) => ({
        getBytes: () => (typeof bytes === 'string' ? utf8ToBytes(bytes) : bytes),
        getContentType: () => mimeType || 'application/octet-stream',
        getName: () => name || 'blob'
      })
    },
    MailApp: {
      sendEmail: (opts) => {
        state.pendingEmails.push(opts);
      }
    },
    HtmlService: {
      createHtmlOutput: (html) => ({
        getContent: () => String(html || ''),
        getAs: (mimeType) => ({
          _name: 'report.pdf',
          _html: String(html || ''),
          setName(n) { this._name = n; return this; },
          getName() { return this._name; },
          getContentType() { return mimeType || 'application/pdf'; },
          getBytes() { return utf8ToBytes(this._html); }
        })
      })
    },
    ScriptApp: {
      getService: () => ({ getUrl: () => appOriginUrl || '' })
    }
  };

  const { PropertiesService, CacheService, LockService, SpreadsheetApp, DriveApp, Utilities, MailApp, HtmlService, ScriptApp } = globals;

${serverCode}

  return {
    TM_CONFIG,
    TM_Utils,
    TM_Db,
    rpc: {
      ${rpcNames.join(',\n      ')}
    },
    cron: {
      ${cronNames.join(',\n      ')}
    }
  };
}

async function callGasBridge(env, payload) {
  const bridgeUrl = (env && env.GAS_BRIDGE_URL) ? env.GAS_BRIDGE_URL : DEFAULT_GAS_BRIDGE_URL;
  if (!bridgeUrl) return null;
  try {
    const resp = await fetch(bridgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bridgeKey: CF_BRIDGE_KEY,
        ...payload
      }),
      redirect: 'follow'
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json;
  } catch (_) {
    return null;
  }
}

async function importSnapshotIntoD1(db, snapshot) {
  await ensureD1Schema(db);
  const stmts = [
    db.prepare('DELETE FROM "tm_sys_properties"'),
    db.prepare('DELETE FROM "tm_sys_files"'),
    db.prepare('DELETE FROM "tm_sys_file_chunks"')
  ];

  const props = snapshot.properties || {};
  for (const [k, v] of Object.entries(props)) {
    stmts.push(
      db.prepare('INSERT OR REPLACE INTO "tm_sys_properties" ("PropKey", "PropValue") VALUES (?, ?)').bind(String(k), String(v))
    );
  }

  const sheets = snapshot.sheets || {};
  for (const sName of SHEET_NAMES) {
    const headers = SHEETS_SCHEMA[sName];
    stmts.push(db.prepare(\`DELETE FROM "\${sName}"\`));
    const rows = Array.isArray(sheets[sName]) ? sheets[sName] : [];
    if (rows.length > 0) {
      const colListSql = headers.map((c) => \`"\${c}"\`).join(', ');
      const maxRowsPerInsert = Math.max(1, Math.floor(90 / headers.length));
      for (let i = 0; i < rows.length; i += maxRowsPerInsert) {
        const slice = rows.slice(i, i + maxRowsPerInsert);
        const placeholders = slice.map(() => \`(\${headers.map(() => '?').join(', ')})\`).join(', ');
        const flat = [];
        for (const rObj of slice) {
          for (const h of headers) {
            const val = rObj[h];
            flat.push(val === undefined || val === null ? '' : String(val));
          }
        }
        stmts.push(
          db.prepare(\`INSERT INTO "\${sName}" (\${colListSql}) VALUES \${placeholders}\`).bind(...flat)
        );
      }
    }
  }

  // Eksekusi batch tabel utama terlebih dahulu
  await db.batch(stmts);

  // Masukkan file dalam potongan 50 KB per baris agar selalu di bawah batas 100 KB per statement Cloudflare D1
  const files = Array.isArray(snapshot.files) ? snapshot.files : [];
  const fileStmts = [];
  const CHUNK_LEN = 50000;
  for (const f of files) {
    const fid = String(f.FileID || '');
    fileStmts.push(
      db.prepare('INSERT OR REPLACE INTO "tm_sys_files" ("FileID", "FolderID", "FileName", "MimeType", "Base64Data", "Trashed", "CreatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(
          fid,
          String(f.FolderID || ''),
          String(f.FileName || ''),
          String(f.MimeType || 'image/jpeg'),
          '',
          f.Trashed ? 1 : 0,
          String(f.CreatedAt || new Date().toISOString())
        )
    );
    const b64 = String(f.Base64Data || '');
    let cIdx = 0;
    for (let pos = 0; pos < b64.length; pos += CHUNK_LEN) {
      fileStmts.push(
        db.prepare('INSERT INTO "tm_sys_file_chunks" ("FileID", "ChunkIndex", "ChunkData") VALUES (?, ?, ?)')
          .bind(fid, cIdx++, b64.slice(pos, pos + CHUNK_LEN))
      );
    }
  }
  if (fileStmts.length > 0) {
    await db.batch(fileStmts);
  }

  ISOLATE_CACHE.clear();
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Endpoint Migrasi Otomatis dari Google Spreadsheet & Drive -> Cloudflare D1
    if (url.pathname === '/api/migrate-from-gas' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        let snapshot = body.snapshot;
        if (!snapshot) {
          const bridgeRes = await callGasBridge(env, { action: 'EXPORT_ALL' });
          if (!bridgeRes || !bridgeRes.ok || !bridgeRes.data) {
            return Response.json({ ok: false, error: 'Gagal mengambil snapshot dari Google Apps Script.' }, { status: 502 });
          }
          snapshot = bridgeRes.data;
        }
        await importSnapshotIntoD1(env.DB, snapshot);
        return Response.json({
          ok: true,
          migratedAt: new Date().toISOString(),
          sheetsCount: Object.keys(snapshot.sheets || {}).length,
          filesCount: (snapshot.files || []).length
        });
      } catch (err) {
        return Response.json({ ok: false, error: err && err.message ? err.message : String(err) }, { status: 500 });
      }
    }

    // 2. Endpoint Utama RPC (/api/rpc) pengganti google.script.run
    if (url.pathname === '/api/rpc' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const fnName = String(payload.fn || '');
        const args = Array.isArray(payload.args) ? payload.args : [];

        let state = await loadStateFromD1(env.DB, fnName, args);

        // Auto-mutasi otomatis pada boot pertama jika database D1 masih kosong
        if (fnName === 'api_getBootstrapStatus' && state.scriptProps.get('APP_INITIALIZED') !== 'true') {
          const bridgeRes = await callGasBridge(env, { action: 'EXPORT_ALL' });
          if (bridgeRes && bridgeRes.ok && bridgeRes.data && bridgeRes.data.properties && bridgeRes.data.properties.APP_INITIALIZED === 'true') {
            await importSnapshotIntoD1(env.DB, bridgeRes.data);
            state = await loadStateFromD1(env.DB, fnName, args);
          }
        }

        const runtime = createGasContext(state, url.origin);

        if (!runtime.rpc[fnName]) {
          return Response.json({
            ok: false,
            error: { code: 'ERR_NOT_FOUND', message: 'Fungsi RPC tidak ditemukan: ' + fnName }
          }, { status: 404 });
        }

        const result = runtime.rpc[fnName].apply(null, args);

        // Jika RPC membuat PDF (Session PDF atau Dashboard PDF), konversi HTML ke binary PDF asli via GAS Bridge
        if (
          result &&
          result.ok &&
          result.data &&
          result.data.htmlPreview &&
          (fnName === 'api_generateSessionPdf' || fnName === 'api_generateDashboardReportPdf')
        ) {
          const pdfBridge = await callGasBridge(env, {
            action: 'RENDER_PDF',
            html: result.data.htmlPreview,
            fileName: result.data.fileName || 'report.pdf'
          });
          if (pdfBridge && pdfBridge.ok && pdfBridge.data && pdfBridge.data.base64Data) {
            result.data.base64Data = pdfBridge.data.base64Data;
          }
        }

        // Jika ada email yang dikirim selama eksekusi RPC (mis. Reset Password atau Kirim PDF Sesi)
        if (state.pendingEmails.length > 0) {
          for (const mail of state.pendingEmails) {
            let pdfHtml = '';
            let pdfFileName = 'report.pdf';
            if (mail.attachments && mail.attachments.length > 0) {
              const att = mail.attachments[0];
              if (att && typeof att.getBytes === 'function') {
                pdfHtml = new TextDecoder().decode(new Uint8Array(att.getBytes()));
                pdfFileName = typeof att.getName === 'function' ? att.getName() : 'report.pdf';
              }
            }
            await callGasBridge(env, {
              action: 'SEND_EMAIL',
              to: mail.to,
              subject: mail.subject,
              body: mail.body,
              pdfHtml,
              pdfFileName
            });
          }
        }

        await commitStateToD1(env.DB, state);

        return Response.json(result);
      } catch (err) {
        return Response.json({
          ok: false,
          error: {
            code: 'ERR_SERVER',
            message: err && err.message ? err.message : String(err)
          }
        }, { status: 500 });
      }
    }

    // 3. Halaman Utama Aplikasi Web (GET /)
    const mode = url.searchParams.get('mode') || '';
    const token = url.searchParams.get('token') || '';
    const safeMode = mode.replace(/["'<>\\\\]/g, '');
    const safeToken = token.replace(/["'<>\\\\]/g, '');

    const html = CLIENT_HTML_TEMPLATE
      .replace('__TM_INITIAL_MODE__', safeMode)
      .replace('__TM_INITIAL_RESET_TOKEN__', safeToken);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });
  },

  // 4. Cloudflare Cron Trigger (menjalankan pengingat Draft & Backup Harian otomatis)
  async scheduled(event, env, ctx) {
    try {
      const state = await loadStateFromD1(env.DB, 'cron_runDailyAutomatedBackup', []);
      const runtime = createGasContext(state, '');
      runtime.cron.cron_checkStaleDraftsAndNotify();
      runtime.cron.cron_runDailyAutomatedBackup();
      await commitStateToD1(env.DB, state);
    } catch (err) {
      console.error('Scheduled cron error:', err);
    }
  }
};
`;

  fs.writeFileSync(path.join(CF_DIR, 'worker.js'), workerSource, 'utf8');
  console.log('Berhasil membangun cloudflare/schema.sql dan cloudflare/worker.js!');
  console.log('Total fungsi RPC terpaketkan:', rpcNames.length);
}

buildWorkerScript();
