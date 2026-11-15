/**
 * Export.gs — Ekspor Data Excel (.xlsx) dan CSV (.csv) dalam Mode Simple (1 Tabel Gabungan)
 * dan Mode Structured (5 Bagian), mengikuti Filter Dashboard & Audit Log Ekspor (PRD Bagian 12).
 */

var TM_Export = (function () {
  function escXml(val) {
    return String(val === null || val === undefined ? '' : val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function escapeCsvCell(val) {
    var str = String(val === null || val === undefined ? '' : val);
    // Cegah CSV formula injection sambil menjaga keterbacaan
    if (/^[=+\-@]/.test(str)) {
      str = "'" + str;
    }
    if (str.indexOf('"') !== -1 || str.indexOf(',') !== -1 || str.indexOf('\n') !== -1 || str.indexOf('\r') !== -1) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function rowsToCsvString(headers, rows) {
    var lines = [];
    lines.push(headers.map(escapeCsvCell).join(','));
    for (var i = 0; i < rows.length; i++) {
      lines.push(rows[i].map(escapeCsvCell).join(','));
    }
    return lines.join('\r\n');
  }

  function colIndexToLetter(colIdxZeroBased) {
    var n = colIdxZeroBased + 1;
    var s = '';
    while (n > 0) {
      var mod = (n - 1) % 26;
      s = String.fromCharCode(65 + mod) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function buildWorksheetXml(headers, rows) {
    var allRows = [headers].concat(rows);
    var sheetDataXml = '';
    for (var r = 0; r < allRows.length; r++) {
      var rowNum = r + 1;
      var cells = allRows[r];
      var cellsXml = '';
      for (var c = 0; c < cells.length; c++) {
        var cellRef = colIndexToLetter(c) + rowNum;
        var val = cells[c];
        if (typeof val === 'number' && !isNaN(val)) {
          cellsXml += '<c r="' + cellRef + '"><v>' + val + '</v></c>';
        } else {
          cellsXml += '<c r="' + cellRef + '" t="inlineStr"><is><t>' + escXml(val) + '</t></is></c>';
        }
      }
      sheetDataXml += '<row r="' + rowNum + '">' + cellsXml + '</row>';
    }
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<sheetData>' + sheetDataXml + '</sheetData>' +
      '</worksheet>'
    );
  }

  // Generator ZIP tanpa kompresi (STORE) murni JS untuk membangun file .xlsx OpenXML standar
  var CRC_TABLE = (function () {
    var table = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) {
        out.push(code);
      } else if (code < 0x800) {
        out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        i++;
        code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        out.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f)
        );
      }
    }
    return out;
  }

  function crc32Bytes(byteArr) {
    var crc = 0xffffffff;
    for (var i = 0; i < byteArr.length; i++) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byteArr[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function pushUint16LE(arr, val) {
    arr.push(val & 0xff, (val >>> 8) & 0xff);
  }

  function pushUint32LE(arr, val) {
    arr.push(val & 0xff, (val >>> 8) & 0xff, (val >>> 16) & 0xff, (val >>> 24) & 0xff);
  }

  function buildZipArchiveBytes(entries) {
    var localParts = [];
    var centralParts = [];
    var offset = 0;

    for (var i = 0; i < entries.length; i++) {
      var nameBytes = utf8Bytes(entries[i].path);
      var dataBytes = utf8Bytes(entries[i].content);
      var crc = crc32Bytes(dataBytes);
      var size = dataBytes.length;

      var localHeader = [];
      pushUint32LE(localHeader, 0x04034b50); // Local file header signature
      pushUint16LE(localHeader, 20);         // Version needed
      pushUint16LE(localHeader, 0);          // Flags
      pushUint16LE(localHeader, 0);          // Compression method: 0 (STORE)
      pushUint16LE(localHeader, 0);          // Mod time
      pushUint16LE(localHeader, 0);          // Mod date
      pushUint32LE(localHeader, crc);
      pushUint32LE(localHeader, size);
      pushUint32LE(localHeader, size);
      pushUint16LE(localHeader, nameBytes.length);
      pushUint16LE(localHeader, 0);          // Extra field len

      var centralHeader = [];
      pushUint32LE(centralHeader, 0x02014b50); // Central directory signature
      pushUint16LE(centralHeader, 20);         // Version made by
      pushUint16LE(centralHeader, 20);         // Version needed
      pushUint16LE(centralHeader, 0);          // Flags
      pushUint16LE(centralHeader, 0);          // Compression: STORE
      pushUint16LE(centralHeader, 0);          // Mod time
      pushUint16LE(centralHeader, 0);          // Mod date
      pushUint32LE(centralHeader, crc);
      pushUint32LE(centralHeader, size);
      pushUint32LE(centralHeader, size);
      pushUint16LE(centralHeader, nameBytes.length);
      pushUint16LE(centralHeader, 0);          // Extra len
      pushUint16LE(centralHeader, 0);          // Comment len
      pushUint16LE(centralHeader, 0);          // Disk number
      pushUint16LE(centralHeader, 0);          // Internal attrs
      pushUint32LE(centralHeader, 0);          // External attrs
      pushUint32LE(centralHeader, offset);     // Relative offset

      localParts.push(localHeader, nameBytes, dataBytes);
      centralParts.push(centralHeader, nameBytes);

      offset += localHeader.length + nameBytes.length + dataBytes.length;
    }

    var centralSize = 0;
    for (var j = 0; j < centralParts.length; j++) {
      centralSize += centralParts[j].length;
    }

    var eocd = [];
    pushUint32LE(eocd, 0x06054b50); // End of central directory signature
    pushUint16LE(eocd, 0);          // Disk number
    pushUint16LE(eocd, 0);          // Start disk
    pushUint16LE(eocd, entries.length);
    pushUint16LE(eocd, entries.length);
    pushUint32LE(eocd, centralSize);
    pushUint32LE(eocd, offset);
    pushUint16LE(eocd, 0);          // Comment length

    var finalBytes = [];
    for (var a = 0; a < localParts.length; a++) {
      for (var b = 0; b < localParts[a].length; b++) finalBytes.push(localParts[a][b]);
    }
    for (var c = 0; c < centralParts.length; c++) {
      for (var d = 0; d < centralParts[c].length; d++) finalBytes.push(centralParts[c][d]);
    }
    for (var e = 0; e < eocd.length; e++) finalBytes.push(eocd[e]);
    return finalBytes;
  }

  function buildXlsxBase64(sheetsSpec) {
    var entries = [];
    var overrideTags = '';
    var sheetsTags = '';
    var workbookRelsTags = '';

    for (var i = 0; i < sheetsSpec.length; i++) {
      var idx = i + 1;
      var sheetPath = 'xl/worksheets/sheet' + idx + '.xml';
      entries.push({
        path: sheetPath,
        content: buildWorksheetXml(sheetsSpec[i].headers, sheetsSpec[i].rows)
      });
      overrideTags +=
        '<Override PartName="/' + sheetPath + '" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      sheetsTags +=
        '<sheet name="' + escXml(sheetsSpec[i].name.slice(0, 31)) + '" sheetId="' + idx + '" r:id="rId' + idx + '"/>';
      workbookRelsTags +=
        '<Relationship Id="rId' + idx + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + idx + '.xml"/>';
    }

    entries.push({
      path: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          overrideTags +
        '</Types>'
    });

    entries.push({
      path: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'
    });

    entries.push({
      path: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          '<sheets>' + sheetsTags + '</sheets>' +
        '</workbook>'
    });

    entries.push({
      path: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          workbookRelsTags +
        '</Relationships>'
    });

    var zipBytes = buildZipArchiveBytes(entries);
    return Utilities.base64Encode(zipBytes);
  }

  /**
   * Membangun dataset ekspor berdasarkan hasil filter Dashboard (PRD 12.1, 12.2, 12.3):
   * - Mengikuti filter Dashboard dan hak akses
   * - Draft dan data soft-deleted tidak masuk ekspor aktif
   * - Foto tidak ditanam sebagai gambar; hanya metadata / referensi yang aman (tanpa public URL)
   */
  function buildExportTables(filters) {
    var ds = TM_Dashboard.computeDashboardDataset(filters || {});

    // Tabel Simple (Satu Tabel Gabungan)
    var simpleHeaders = [
      'ReportNumber', 'SessionID', 'InspectionDate', 'OutletCode', 'OutletName',
      'TrainerName', 'AM_Name', 'MUM_Name', 'PIC_Name',
      'FindingID', 'CategoryName', 'SectionName', 'Masalah', 'Mengapa', 'Solusi',
      'PhotoCount', 'PhotoIDs', 'PhotoFileNames', 'PhotoComments'
    ];
    var simpleRows = [];

    for (var i = 0; i < ds.detailedSessions.length; i++) {
      var s = ds.detailedSessions[i];
      var fList = s.Findings || [];
      if (fList.length === 0) {
        simpleRows.push([
          s.ReportNumber, s.SessionID, s.InspectionDate, s.CanonicalOutletCode, s.CanonicalOutletName,
          s.TrainerName, s.AM_Name_Snapshot, s.MUM_Name_Snapshot, s.PIC_Name,
          '', 'Tanpa Temuan', '', '', '', '',
          0, '', '', ''
        ]);
      } else {
        for (var j = 0; j < fList.length; j++) {
          var f = fList[j];
          var phs = f.Photos || [];
          simpleRows.push([
            s.ReportNumber, s.SessionID, s.InspectionDate, s.CanonicalOutletCode, s.CanonicalOutletName,
            s.TrainerName, s.AM_Name_Snapshot, s.MUM_Name_Snapshot, s.PIC_Name,
            f.FindingID, f.CategoryNameSnapshot, f.SectionNameSnapshot, f.Masalah, f.Mengapa, f.Solusi || '',
            phs.length,
            phs.map(function (p) { return p.PhotoID; }).join('; '),
            phs.map(function (p) { return p.FileName; }).join('; '),
            phs.map(function (p) { return p.PhotoComment || '-'; }).join(' | ')
          ]);
        }
      }
    }

    // 5 Bagian Terstruktur (PRD 12.1 & 12.2):
    // 1. Ringkasan KPI
    var part1Kpi = {
      name: '1_Ringkasan_KPI',
      headers: ['Metrik KPI', 'Nilai', 'Keterangan'],
      rows: [
        ['Total Pemeriksaan', ds.kpi.totalInspections, 'Sesi Selesai aktif (termasuk sesi selesai tanpa temuan)'],
        ['Total Temuan Aktif', ds.kpi.totalActiveFindings, 'Temuan aktif pada sesi Selesai'],
        ['Outlet Diperiksa', ds.kpi.inspectedOutlets, 'Jumlah Outlet unik yang telah diperiksa'],
        ['Masalah Berulang (Recurring Issue)', ds.kpi.recurringIssuesCount, 'Pasangan unik Outlet + Kategori pada >= 2 sesi berbeda'],
        ['Outlet Terdampak Masalah Berulang', ds.kpi.recurringAffectedOutletsCount, 'Jumlah Outlet yang mengalami masalah berulang']
      ]
    };

    // 2. Data Sesi Pemeriksaan
    var part2Sessions = {
      name: '2_Data_Sesi_Pemeriksaan',
      headers: [
        'SessionID', 'ReportNumber', 'InspectionDate', 'CanonicalOutletID', 'OutletCode', 'OutletName',
        'TrainerID', 'TrainerName', 'AM_ID', 'AM_Name', 'MUM_ID', 'MUM_Name', 'PIC_Name', 'FindingCount', 'SubmittedAt'
      ],
      rows: ds.detailedSessions.map(function (s) {
        return [
          s.SessionID, s.ReportNumber, s.InspectionDate, s.CanonicalOutletID, s.CanonicalOutletCode, s.CanonicalOutletName,
          s.TrainerID, s.TrainerName, s.AM_ID, s.AM_Name_Snapshot, s.MUM_ID, s.MUM_Name_Snapshot, s.PIC_Name,
          (s.Findings || []).length, s.SubmittedAt
        ];
      })
    };

    // 3. Detail Temuan
    var part3FindingsRows = [];
    // 4. Data Foto Bukti (Hanya metadata/referensi aman tanpa gambar & tanpa public Drive link)
    var part4PhotosRows = [];

    for (var si = 0; si < ds.detailedSessions.length; si++) {
      var ses = ds.detailedSessions[si];
      var findings = ses.Findings || [];
      for (var fi = 0; fi < findings.length; fi++) {
        var fnd = findings[fi];
        var photos = fnd.Photos || [];
        part3FindingsRows.push([
          fnd.FindingID, ses.SessionID, ses.ReportNumber, ses.InspectionDate,
          ses.CanonicalOutletCode, ses.CanonicalOutletName, ses.TrainerName,
          ses.AM_Name_Snapshot || '', ses.MUM_Name_Snapshot || '', ses.PIC_Name || '',
          fnd.CategoryID, fnd.CategoryNameSnapshot, fnd.SectionID, fnd.SectionNameSnapshot,
          fnd.Masalah, fnd.Mengapa, fnd.Solusi || '', photos.length,
          photos.map(function (p) { return p.PhotoComment || '-'; }).join(' | ')
        ]);
        for (var pi = 0; pi < photos.length; pi++) {
          var ph = photos[pi];
          part4PhotosRows.push([
            ph.PhotoID, fnd.FindingID, ses.SessionID, ses.ReportNumber,
            ses.InspectionDate, ses.CanonicalOutletCode, ses.CanonicalOutletName,
            fnd.CategoryNameSnapshot, fnd.SectionNameSnapshot,
            ph.FileName, ph.MimeType, Number(ph.FileSize || 0),
            ph.PhotoComment || '', ph.Status || 'Berhasil', ph.UploadedAt
          ]);
        }
      }
    }

    var part3Findings = {
      name: '3_Detail_Temuan',
      headers: [
        'FindingID', 'SessionID', 'ReportNumber', 'InspectionDate',
        'OutletCode', 'OutletName', 'TrainerName',
        'AM_Name', 'MUM_Name', 'PIC_Name',
        'CategoryID', 'CategoryName', 'SectionID', 'SectionName',
        'Masalah', 'Mengapa', 'Solusi', 'PhotoCount', 'PhotoComments'
      ],
      rows: part3FindingsRows
    };

    var part4Photos = {
      name: '4_Data_Foto_Bukti',
      headers: [
        'PhotoID', 'FindingID', 'SessionID', 'ReportNumber',
        'InspectionDate', 'OutletCode', 'OutletName',
        'CategoryName', 'SectionName',
        'FileName', 'MimeType', 'FileSizeBytes',
        'PhotoComment', 'UploadStatus', 'UploadedAt'
      ],
      rows: part4PhotosRows
    };

    // 5. Top Issue dan Recurring Issue
    var part5Rows = [];
    for (var ti = 0; ti < ds.overallTopIssues.length; ti++) {
      var top = ds.overallTopIssues[ti];
      part5Rows.push([
        'TOP_ISSUE', '', '', top.categoryName, top.sectionName,
        top.sessionCount, top.findingCount, 'Normal'
      ]);
    }
    for (var ri = 0; ri < ds.recurringIssues.length; ri++) {
      var rec = ds.recurringIssues[ri];
      part5Rows.push([
        'RECURRING_ISSUE', rec.outletCode, rec.outletName, rec.categoryName, '',
        rec.sessionCount, rec.findingCount, rec.label || 'Perlu perhatian khusus'
      ]);
    }

    var part5TopAndRecurring = {
      name: '5_Top_Dan_Recurring',
      headers: [
        'TipeAnalisis', 'OutletCode', 'OutletName', 'CategoryName', 'SectionName',
        'JumlahSesiUnik', 'TotalTemuan', 'PenandaStatus'
      ],
      rows: part5Rows
    };

    return {
      simple: {
        name: 'Data_Pemeriksaan_Gabungan',
        headers: simpleHeaders,
        rows: simpleRows
      },
      structured: [
        part1Kpi,
        part2Sessions,
        part3Findings,
        part4Photos,
        part5TopAndRecurring
      ]
    };
  }

  /**
   * Ekspor Data ke Excel (.xlsx) atau CSV (.csv) dengan Mode SIMPLE atau STRUCTURED (PRD Bagian 12).
   */
  function exportData(token, format, mode, filters) {
    var ctx = TM_Auth.requireAuth(token, [
      TM_CONFIG.ROLES.SUPER_ADMIN,
      TM_CONFIG.ROLES.TRAINER,
      TM_CONFIG.ROLES.MANAJEMEN
    ]);

    var normFormat = String(format || 'EXCEL').toUpperCase() === 'CSV' ? 'CSV' : 'EXCEL';
    var normMode = String(mode || 'SIMPLE').toUpperCase() === 'STRUCTURED' ? 'STRUCTURED' : 'SIMPLE';
    var tables = buildExportTables(filters || {});
    var dateStamp = TM_Utils.formatWibIso().slice(0, 10).replace(/-/g, '');

    var resultPayload = null;

    if (normFormat === 'EXCEL') {
      var sheetsToBuild = normMode === 'STRUCTURED' ? tables.structured : [tables.simple];
      var b64Xlsx = buildXlsxBase64(sheetsToBuild);
      var fileName = 'TM-Export-' + normMode + '-' + dateStamp + '.xlsx';
      resultPayload = {
        format: 'EXCEL',
        mode: normMode,
        fileName: fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        base64Data: b64Xlsx,
        sheetNames: sheetsToBuild.map(function (s) { return s.name; }),
        previewTables: sheetsToBuild
      };
    } else {
      // CSV: SIMPLE -> 1 file gabungan; STRUCTURED -> 5 file terpisah untuk setiap bagian (PRD 12.2)
      if (normMode === 'SIMPLE') {
        var csvText = rowsToCsvString(tables.simple.headers, tables.simple.rows);
        resultPayload = {
          format: 'CSV',
          mode: 'SIMPLE',
          files: [
            {
              partName: tables.simple.name,
              fileName: 'TM-Export-SIMPLE-' + dateStamp + '.csv',
              mimeType: 'text/csv;charset=utf-8;',
              csvContent: csvText
            }
          ]
        };
      } else {
        var csvFiles = tables.structured.map(function (part) {
          return {
            partName: part.name,
            fileName: 'TM-Export-' + part.name + '-' + dateStamp + '.csv',
            mimeType: 'text/csv;charset=utf-8;',
            csvContent: rowsToCsvString(part.headers, part.rows)
          };
        });
        resultPayload = {
          format: 'CSV',
          mode: 'STRUCTURED',
          files: csvFiles
        };
      }
    }

    // Catat Audit Ekspor (PRD 12.4: Pengguna, Waktu, Format, Filter, Jenis Laporan)
    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'EXPORT_DATA',
      entityType: 'Export',
      entityId: normFormat + '_' + normMode + '_' + dateStamp,
      afterData: {
        userId: ctx.user.UserID,
        timestamp: TM_Utils.formatWibIso(),
        format: normFormat,
        reportType: normMode,
        filters: filters || {}
      },
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Ekspor data ' + normFormat + ' (' + normMode + ') sesuai filter Dashboard'
    });

    return resultPayload;
  }

  return {
    buildExportTables: buildExportTables,
    exportData: exportData
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Export: TM_Export };
}
