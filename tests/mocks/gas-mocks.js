/**
 * In-memory Google Apps Script mocks for Node.js unit tests.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

function createGasEnv() {
  const scriptProps = new Map();
  const cacheMap = new Map();
  const spreadsheets = new Map();
  const driveFiles = new Map();
  const driveFolders = new Map();
  const sentEmails = [];
  let failNextEmailError = null;
  let idSeq = 1;
  const nextId = (prefix) => `${prefix}_MOCK_${idSeq++}`;

  class MockRange {
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
      return this;
    }
    setFontWeight() { return this; }
  }

  class MockSheet {
    constructor(name) {
      this.name = name;
      this._rows = [];
    }
    getName() { return this.name; }
    setName(n) { this.name = n; }
    getLastRow() { return this._rows.length; }
    getLastColumn() {
      return this._rows.reduce((max, r) => Math.max(max, r ? r.length : 0), 0);
    }
    setFrozenRows() {}
    clear() { this._rows = []; }
    clearContents() { this._rows = []; }
    getRange(row, col, numRows = 1, numCols = 1) {
      return new MockRange(this, row, col, numRows, numCols);
    }
  }

  class MockSpreadsheet {
    constructor(id, name) {
      this.id = id;
      this.name = name;
      this._sheets = [new MockSheet('Sheet1')];
    }
    getId() { return this.id; }
    getSheets() { return this._sheets; }
    getSheetByName(name) {
      return this._sheets.find((s) => s.name === name) || null;
    }
    insertSheet(name) {
      const s = new MockSheet(name);
      this._sheets.push(s);
      return s;
    }
  }

  class MockFile {
    constructor(id, blob) {
      this.id = id;
      this.blob = blob;
      this.access = 'PRIVATE';
      this.permission = 'NONE';
      this.trashed = false;
    }
    getId() { return this.id; }
    getBlob() { return this.blob; }
    setTrashed(flag) { this.trashed = Boolean(flag); return this; }
    isTrashed() { return this.trashed; }
    setSharing(access, perm) {
      this.access = access;
      this.permission = perm;
    }
  }

  class MockFolder {
    constructor(id, name) {
      this.id = id;
      this.name = name;
      this.access = 'PRIVATE';
      this.permission = 'NONE';
      this.children = [];
      this.files = [];
    }
    getId() { return this.id; }
    getName() { return this.name; }
    setSharing(access, perm) {
      this.access = access;
      this.permission = perm;
    }
    createFolder(name) {
      const f = new MockFolder(nextId('FLD'), name);
      driveFolders.set(f.id, f);
      this.children.push(f);
      return f;
    }
    createFile(blob) {
      const file = new MockFile(nextId('FIL'), blob);
      driveFiles.set(file.id, file);
      this.files.push(file);
      return file;
    }
  }

  const globals = {
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    parseInt,
    parseFloat,
    isNaN,
    encodeURIComponent,
    decodeURIComponent,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (scriptProps.has(k) ? scriptProps.get(k) : null),
        setProperty: (k, v) => scriptProps.set(k, String(v)),
        setProperties: (obj) => Object.entries(obj).forEach(([k, v]) => scriptProps.set(k, String(v)))
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (cacheMap.has(k) ? cacheMap.get(k) : null),
        put: (k, v) => cacheMap.set(k, String(v)),
        remove: (k) => cacheMap.delete(k)
      })
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    },
    SpreadsheetApp: {
      create: (name) => {
        const ss = new MockSpreadsheet(nextId('SS'), name);
        spreadsheets.set(ss.id, ss);
        return ss;
      },
      openById: (id) => {
        if (!spreadsheets.has(id)) throw new Error('Spreadsheet not found: ' + id);
        return spreadsheets.get(id);
      }
    },
    DriveApp: {
      Access: { PRIVATE: 'PRIVATE' },
      Permission: { NONE: 'NONE' },
      createFolder: (name) => {
        const f = new MockFolder(nextId('FLD'), name);
        driveFolders.set(f.id, f);
        return f;
      },
      getFolderById: (id) => {
        if (!driveFolders.has(id)) throw new Error('Folder not found: ' + id);
        return driveFolders.get(id);
      },
      getFileById: (id) => {
        if (!driveFiles.has(id)) throw new Error('File not found: ' + id);
        return driveFiles.get(id);
      }
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      base64Decode: (b64) => Array.from(Buffer.from(b64, 'base64')),
      base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
      newBlob: (bytes, mimeType, name) => ({
        getBytes: () => bytes,
        getContentType: () => mimeType,
        getName: () => name
      })
    },
    MailApp: {
      sendEmail: (opts) => {
        if (failNextEmailError) {
          const msg = failNextEmailError;
          failNextEmailError = null;
          throw new Error(msg);
        }
        sentEmails.push(opts);
      }
    },
    HtmlService: {
      createHtmlOutput: (html) => ({
        getContent: () => html,
        getAs: (mimeType) => ({
          _name: 'report.pdf',
          setName(n) { this._name = n; return this; },
          getName() { return this._name; },
          getContentType() { return mimeType || 'application/pdf'; },
          getBytes() { return Array.from(Buffer.from(html, 'utf8')); }
        })
      })
    },
    ScriptApp: {
      getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/MOCK/exec' })
    }
  };

  const context = vm.createContext(globals);
  const serverDir = path.resolve(__dirname, '../../src/server');
  const loadOrder = [
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
    'Photos.gs',
    'Sessions.gs',
    'Findings.gs',
    'Dashboard.gs',
    'Drafts.gs',
    'Sync.gs',
    'Reporting.gs',
    'Export.gs',
    'Notifications.gs',
    'Backup.gs',
    'Main.gs'
  ];

  for (const file of loadOrder) {
    const code = fs.readFileSync(path.join(serverDir, file), 'utf8');
    vm.runInContext(code, context, { filename: file });
  }

  return {
    ctx: context,
    scriptProps,
    cacheMap,
    spreadsheets,
    driveFolders,
    driveFiles,
    sentEmails,
    setFailNextEmail: (errMsg) => { failNextEmailError = errMsg; }
  };
}

module.exports = { createGasEnv };
