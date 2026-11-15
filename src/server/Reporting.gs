/**
 * Reporting.gs — Pembuatan PDF Laporan (PDF per Sesi A4, Summary Report, Full Report),
 * Penomoran Versi PDF (PDFHistory), & Pengiriman Email Satu Penerima (EmailLogs).
 */

var TM_Reporting = (function () {
  var EMAIL_REGEX = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

  function escHtml(val) {
    return String(val === null || val === undefined ? '' : val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function validateSingleEmail(emailStr) {
    var raw = TM_Utils.sanitizeText(emailStr);
    if (!raw) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alamat email penerima wajib diisi.');
    }
    if (raw.indexOf(',') !== -1 || raw.indexOf(';') !== -1 || /\s/.test(raw)) {
      throw TM_Utils.AppError(
        'ERR_VALIDATION',
        'PDF sesi hanya dapat dikirim ke satu alamat email penerima (tidak mendukung CC atau banyak penerima).'
      );
    }
    if (!EMAIL_REGEX.test(raw)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Format alamat email penerima tidak valid.');
    }
    return raw.toLowerCase();
  }

  function nextPdfVersionNumber(sessionId, reportType) {
    var existing = TM_Db.filterRecords('PDFHistory', function (p) {
      return String(p.SessionID) === String(sessionId) && String(p.ReportType) === String(reportType);
    });
    var maxVer = 0;
    for (var i = 0; i < existing.length; i++) {
      var v = parseInt(existing[i].VersionNumber || '0', 10);
      if (v > maxVer) maxVer = v;
    }
    return maxVer + 1;
  }

  function normalizeImageMime(mime, fallbackMime, fileName) {
    var m = String(mime || '').toLowerCase().trim();
    if (m === 'image/png') return 'image/png';
    if (m === 'image/jpeg' || m === 'image/jpg') return 'image/jpeg';
    var fb = String(fallbackMime || '').toLowerCase().trim();
    if (fb === 'image/png') return 'image/png';
    if (fb === 'image/jpeg' || fb === 'image/jpg') return 'image/jpeg';
    if (/\.png$/i.test(String(fileName || ''))) return 'image/png';
    return 'image/jpeg';
  }

  function loadPhotoDataUrlSafe(driveFileId, fallbackMime, fileName) {
    if (!driveFileId) return '';
    try {
      var file = DriveApp.getFileById(driveFileId);
      var blob = file.getBlob();
      var bytes = blob.getBytes();
      if (!bytes || bytes.length === 0) return '';
      var mime = normalizeImageMime(blob.getContentType(), fallbackMime, fileName);
      var b64 = String(Utilities.base64Encode(bytes)).replace(/\s+/g, '');
      return 'data:' + mime + ';base64,' + b64;
    } catch (_) {
      return '';
    }
  }

  /**
   * Merender blok foto dengan aturan PRD 11.3:
   * - Maksimal 2 foto per baris; jika > 2 lanjut ke baris berikutnya
   * - Komentar berada tepat di bawah masing-masing foto dalam sel tabel yang sama
   * - Tidak boleh terpotong atau terlepas saat berpindah halaman (page-break-inside: avoid)
   * - Menggunakan atribut width eksplisit & tabel murni agar kompatibel 100% dengan konverter PDF Google Apps Script
   */
  function buildPhotoRowsHtml(photos) {
    if (!photos || photos.length === 0) {
      return '<div class="no-photo-note">Tidak ada foto bukti terlampir.</div>';
    }
    var rowsHtml = '';
    for (var i = 0; i < photos.length; i += 2) {
      var pair = photos.slice(i, i + 2);
      var cellsHtml = pair.map(function (ph, idxInPair) {
        var photoNum = i + idxInPair + 1;
        var dataUrl = ph.dataUrl || loadPhotoDataUrlSafe(ph.DriveFileID, ph.MimeType, ph.FileName);
        var imgTag = dataUrl
          ? '<div class="pdf-photo-img-box"><img class="pdf-photo-img" width="210" src="' + dataUrl + '" alt="' + escHtml(ph.FileName || ('Foto ' + photoNum)) + '"></div>'
          : '<div class="pdf-photo-placeholder">Foto #' + photoNum + ': ' + escHtml(ph.FileName || ph.PhotoID || 'Tidak tersedia') + '</div>';
        return (
          '<td class="pdf-photo-cell" width="50%" valign="top" align="center">' +
            '<table class="pdf-photo-card" width="100%" cellspacing="0" cellpadding="0" role="presentation">' +
              '<tr><td align="center" class="pdf-photo-card-inner">' +
                imgTag +
                '<div class="pdf-photo-comment"><strong>Foto #' + photoNum + ':</strong> ' + escHtml(ph.PhotoComment || 'Tanpa keterangan tambahan') + '</div>' +
              '</td></tr>' +
            '</table>' +
          '</td>'
        );
      }).join('');
      if (pair.length === 1) {
        cellsHtml += '<td class="pdf-photo-cell pdf-photo-cell-empty" width="50%" valign="top"></td>';
      }
      rowsHtml += '<tr class="pdf-photo-row">' + cellsHtml + '</tr>';
    }
    return '<table class="pdf-photo-table" width="100%" cellspacing="0" cellpadding="0" role="presentation">' + rowsHtml + '</table>';
  }

  /**
   * Membangun HTML A4 Print-Friendly untuk PDF per Sesi (PRD 11.2 & 11.3).
   * PENTING: Tidak menampilkan AM, MUM, Nomor Laporan, dan Waktu Generate PDF pada isi PDF per sesi!
   */
  function buildSessionPdfHtml(branding, session, trainerName, activeFindings) {
    var logoHtml = branding.logoDataUrl
      ? '<img class="brand-logo" width="90" src="' + branding.logoDataUrl + '" alt="Logo">'
      : '<div class="brand-badge">TM</div>';

    var findingsHtml = '';
    if (!activeFindings || activeFindings.length === 0) {
      findingsHtml =
        '<div class="empty-findings-box">' +
          'Pemeriksaan diselesaikan tanpa temuan masalah operasional.' +
        '</div>';
    } else {
      findingsHtml = activeFindings.map(function (f, idx) {
        return (
          '<table class="finding-block" width="100%" cellspacing="0" cellpadding="0" role="presentation">' +
            '<tr class="finding-header-row">' +
              '<td class="finding-header-left" align="left">Temuan #' + (idx + 1) + '</td>' +
              '<td class="finding-header-right" align="right">' + escHtml(f.CategoryNameSnapshot) + ' &bull; ' + escHtml(f.SectionNameSnapshot) + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td colspan="2" class="finding-details-section">' +
                '<table class="finding-fields-table" width="100%" cellspacing="0" cellpadding="0" role="presentation">' +
                  '<tr><td class="field-label-col" width="22%">Masalah</td><td class="field-val-col" width="78%">' + escHtml(f.Masalah) + '</td></tr>' +
                  '<tr><td class="field-label-col" width="22%">Mengapa</td><td class="field-val-col" width="78%">' + escHtml(f.Mengapa) + '</td></tr>' +
                  '<tr><td class="field-label-col" width="22%">Solusi / Tindakan</td><td class="field-val-col" width="78%">' + escHtml(f.Solusi || '-') + '</td></tr>' +
                '</table>' +
              '</td>' +
            '</tr>' +
            '<tr>' +
              '<td colspan="2" class="finding-photos-section">' +
                '<div class="photos-section-label">Dokumentasi Foto Bukti (' + ((f.Photos && f.Photos.length) || 0) + ' Foto)</div>' +
                buildPhotoRowsHtml(f.Photos || []) +
              '</td>' +
            '</tr>' +
          '</table>'
        );
      }).join('');
    }

    return (
      '<!DOCTYPE html>' +
      '<html lang="id">' +
      '<head>' +
        '<meta charset="UTF-8">' +
        '<title>Laporan Pemeriksaan Outlet</title>' +
        '<style>' +
          '@page { size: A4 portrait; margin: 12mm; }' +
          '* { box-sizing: border-box; }' +
          'body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 10pt; line-height: 1.45; margin: 0; padding: 0; }' +
          '.report-header-table { width: 100%; border-collapse: collapse; border-bottom: 2.5px solid #991b1b; padding-bottom: 10px; margin-bottom: 14px; }' +
          '.report-header-table td { vertical-align: middle; padding-bottom: 8px; }' +
          '.brand-logo { max-height: 46px; max-width: 110px; height: auto; width: auto; display: block; }' +
          '.brand-badge { width: 38px; height: 38px; line-height: 38px; text-align: center; background: #991b1b; color: #ffffff; font-weight: bold; border-radius: 6px; font-size: 12pt; }' +
          '.company-name { font-size: 12.5pt; font-weight: bold; color: #111827; }' +
          '.report-title { font-size: 14.5pt; font-weight: bold; color: #991b1b; margin: 2px 0 0; }' +
          '.meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; background: #f9fafb; border: 1px solid #d1d5db; }' +
          '.meta-table td { padding: 8px 12px; border: 1px solid #d1d5db; font-size: 9.5pt; width: 50%; vertical-align: top; }' +
          '.meta-label { font-weight: bold; color: #4b5563; display: block; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.03em; }' +
          '.meta-value { font-weight: bold; color: #111827; font-size: 10.5pt; margin-top: 2px; }' +
          '.finding-block { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid; background: #ffffff; }' +
          '.finding-header-row td { background: #fef2f2; border-bottom: 1px solid #fecaca; padding: 8px 12px; }' +
          '.finding-header-left { font-weight: bold; color: #991b1b; font-size: 10.5pt; width: 35%; }' +
          '.finding-header-right { font-weight: bold; color: #1f2937; font-size: 9.5pt; width: 65%; }' +
          '.finding-details-section { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }' +
          '.finding-fields-table { width: 100%; border-collapse: collapse; }' +
          '.finding-fields-table td { padding: 4px 6px; vertical-align: top; border-bottom: 1px dashed #e5e7eb; font-size: 9.5pt; }' +
          '.finding-fields-table tr:last-child td { border-bottom: none; }' +
          '.field-label-col { font-weight: bold; color: #4b5563; width: 22%; }' +
          '.field-val-col { color: #111827; white-space: pre-wrap; width: 78%; }' +
          '.finding-photos-section { padding: 10px 12px; background: #f8fafc; page-break-inside: avoid; break-inside: avoid; }' +
          '.photos-section-label { font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 6px; letter-spacing: 0.03em; }' +
          '.pdf-photo-table { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: avoid; break-inside: avoid; }' +
          '.pdf-photo-row { page-break-inside: avoid; break-inside: avoid; }' +
          '.pdf-photo-cell { width: 50%; vertical-align: top; padding: 5px; page-break-inside: avoid; break-inside: avoid; }' +
          '.pdf-photo-card { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; background: #ffffff; page-break-inside: avoid; break-inside: avoid; }' +
          '.pdf-photo-card-inner { padding: 8px; text-align: center; vertical-align: top; }' +
          '.pdf-photo-img-box { text-align: center; margin-bottom: 6px; }' +
          '.pdf-photo-img { max-width: 215px; max-height: 155px; width: auto; height: auto; display: inline-block; border: 1px solid #e2e8f0; }' +
          '.pdf-photo-placeholder { padding: 24px 8px; text-align: center; background: #f1f5f9; color: #64748b; font-size: 8.5pt; margin-bottom: 6px; border: 1px dashed #cbd5e1; }' +
          '.pdf-photo-comment { font-size: 8.5pt; color: #334155; text-align: center; word-wrap: break-word; line-height: 1.35; padding-top: 4px; border-top: 1px solid #f1f5f9; }' +
          '.no-photo-note { font-size: 9pt; color: #64748b; font-style: italic; padding: 4px 0; }' +
          '.empty-findings-box { padding: 18px; border: 1px solid #cbd5e1; text-align: center; color: #374151; background: #f9fafb; font-weight: bold; }' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<table class="report-header-table" role="presentation">' +
          '<tr>' +
            '<td width="52">' + logoHtml + '</td>' +
            '<td>' +
              '<div class="company-name">' + escHtml(branding.companyName) + '</div>' +
              '<div class="report-title">Laporan Pemeriksaan Operasional Outlet</div>' +
            '</td>' +
            '<td align="right" style="font-size:9pt;color:#4b5563;">' +
              '<strong>Total Temuan:</strong> ' + ((activeFindings && activeFindings.length) || 0) + ' Temuan' +
            '</td>' +
          '</tr>' +
        '</table>' +
        '<table class="meta-table" role="presentation">' +
          '<tr>' +
            '<td><span class="meta-label">Tanggal Pemeriksaan</span><div class="meta-value">' + escHtml(session.InspectionDate) + '</div></td>' +
            '<td><span class="meta-label">Nama Outlet</span><div class="meta-value">' + escHtml(session.OutletNameSnapshot) + '</div></td>' +
          '</tr>' +
          '<tr>' +
            '<td><span class="meta-label">Trainer Pemeriksa</span><div class="meta-value">' + escHtml(trainerName) + '</div></td>' +
            '<td><span class="meta-label">PIC Outlet</span><div class="meta-value">' + escHtml(session.PIC_Name) + '</div></td>' +
          '</tr>' +
        '</table>' +
        findingsHtml +
      '</body>' +
      '</html>'
    );
  }

  function convertHtmlToPdfBase64(html, fileName) {
    if (typeof HtmlService !== 'undefined' && HtmlService.createHtmlOutput) {
      var out = HtmlService.createHtmlOutput(html);
      if (out && typeof out.getAs === 'function') {
        var pdfBlob = out.getAs('application/pdf');
        if (pdfBlob && typeof pdfBlob.setName === 'function') {
          pdfBlob.setName(fileName);
        }
        return {
          blob: pdfBlob,
          base64Data: Utilities.base64Encode(pdfBlob.getBytes())
        };
      }
    }
    var bytes = Utilities.base64Decode(Utilities.base64Encode(Buffer.from(html, 'utf8')));
    var fallbackBlob = Utilities.newBlob(bytes, 'application/pdf', fileName);
    return {
      blob: fallbackBlob,
      base64Data: Utilities.base64Encode(bytes)
    };
  }

  function collectActiveSessionReportPayload(sessionId) {
    var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
    if (!session || session.DeletedAt) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi pemeriksaan tidak ditemukan atau telah dihapus.');
    }
    if (session.Status !== TM_CONFIG.SESSION_STATUS.SELESAI) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'PDF hanya dapat dibuat untuk sesi pemeriksaan yang telah Selesai.');
    }
    var trainer = TM_Db.findById('Users', 'UserID', session.TrainerID);
    var trainerName = trainer ? trainer.Name : session.TrainerID;
    var trainerEmail = trainer ? trainer.Email : '';

    var findings = TM_Db.filterRecords('Findings', function (f) {
      return f.SessionID === sessionId && !f.DeletedAt;
    });
    var photos = TM_Db.filterRecords('Photos', function (p) {
      return p.SessionID === sessionId && !p.DeletedAt && !p.PurgedAt;
    });

    var enrichedFindings = findings.map(function (f) {
      var fPhotos = photos.filter(function (ph) { return ph.FindingID === f.FindingID; });
      return Object.assign({}, f, { Photos: fPhotos });
    });

    return {
      session: session,
      trainerName: trainerName,
      trainerEmail: trainerEmail,
      findings: enrichedFindings
    };
  }

  /**
   * Generate PDF per Sesi (A4) secara on-demand & mencatat versi baru ke PDFHistory (PRD 11.2, 11.6).
   */
  function generateSessionPdf(token, sessionId) {
    var ctx = TM_Auth.requireAuth(token, [
      TM_CONFIG.ROLES.SUPER_ADMIN,
      TM_CONFIG.ROLES.TRAINER,
      TM_CONFIG.ROLES.MANAJEMEN
    ]);

    return TM_Db.withLock(function () {
      var data = collectActiveSessionReportPayload(sessionId);
      var branding = TM_Settings.getPublicBranding();
      var html = buildSessionPdfHtml(branding, data.session, data.trainerName, data.findings);
      var versionNum = nextPdfVersionNumber(sessionId, 'SESSION_A4');
      var fileName = (data.session.ReportNumber || sessionId) + '-v' + versionNum + '.pdf';
      var pdfObj = convertHtmlToPdfBase64(html, fileName);

      var pdfVersion = TM_Db.insertRecord('PDFHistory', {
        PDFVersionID: TM_Utils.generateId('PDF'),
        SessionID: sessionId,
        ReportType: 'SESSION_A4',
        VersionNumber: String(versionNum),
        GeneratedAt: TM_Utils.formatWibIso(),
        GeneratedBy: ctx.user.UserID,
        RecipientEmail: '',
        SendStatus: 'GENERATED_ONLY'
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'GENERATE_SESSION_PDF',
        entityType: 'PDFHistory',
        entityId: pdfVersion.PDFVersionID,
        afterData: {
          sessionId: sessionId,
          versionNumber: versionNum,
          reportType: 'SESSION_A4'
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Generate PDF per sesi versi #' + versionNum + ' untuk ' + sessionId
      });

      return {
        pdfVersion: pdfVersion,
        fileName: fileName,
        mimeType: 'application/pdf',
        base64Data: pdfObj.base64Data,
        htmlPreview: html,
        defaultRecipientEmail: data.trainerEmail
      };
    });
  }

  /**
   * Kirim / Kirim Ulang Email PDF Sesi ke 1 alamat penerima (PRD 11.7).
   * - Trainer hanya dapat mengirim sesi miliknya sendiri.
   * - Super Admin dapat mengirim semua sesi.
   * - Manajemen tidak dapat mengirim / mengirim ulang.
   * - Kegagalan pengiriman email tidak membatalkan status Selesai sesi.
   */
  function sendSessionPdfEmail(token, sessionId, recipientEmail, isResend) {
    var ctx = TM_Auth.requireAuth(token, [
      TM_CONFIG.ROLES.SUPER_ADMIN,
      TM_CONFIG.ROLES.TRAINER
    ]);

    return TM_Db.withLock(function () {
      var data = collectActiveSessionReportPayload(sessionId);
      if (ctx.user.Role === TM_CONFIG.ROLES.TRAINER && data.session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Trainer hanya dapat mengirim atau mengirim ulang PDF sesi miliknya sendiri.');
      }

      var targetEmail = recipientEmail
        ? validateSingleEmail(recipientEmail)
        : validateSingleEmail(data.trainerEmail);

      var branding = TM_Settings.getPublicBranding();
      var html = buildSessionPdfHtml(branding, data.session, data.trainerName, data.findings);
      var versionNum = nextPdfVersionNumber(sessionId, 'SESSION_A4');
      var fileName = (data.session.ReportNumber || sessionId) + '-v' + versionNum + '.pdf';
      var pdfObj = convertHtmlToPdfBase64(html, fileName);

      var pdfVersionId = TM_Utils.generateId('PDF');
      var nowIso = TM_Utils.formatWibIso();
      var sendStatus = 'Menunggu';
      var failureReason = '';

      try {
        MailApp.sendEmail({
          to: targetEmail,
          subject: '[' + branding.companyName + '] Laporan Pemeriksaan Outlet — ' + data.session.OutletNameSnapshot + ' (' + data.session.InspectionDate + ')',
          body:
            'Halo,\n\n' +
            'Terlampir PDF Laporan Pemeriksaan Operasional Outlet:\n' +
            '- Outlet: ' + data.session.OutletNameSnapshot + '\n' +
            '- Tanggal Pemeriksaan: ' + data.session.InspectionDate + '\n' +
            '- Trainer: ' + data.trainerName + '\n' +
            '- PIC Outlet: ' + data.session.PIC_Name + '\n\n' +
            'Salam,\n' + branding.companyName,
          attachments: [pdfObj.blob]
        });
        sendStatus = 'Berhasil';
      } catch (mailErr) {
        sendStatus = 'Gagal';
        failureReason = mailErr && mailErr.message ? mailErr.message : String(mailErr);
      }

      var pdfHistoryRow = TM_Db.insertRecord('PDFHistory', {
        PDFVersionID: pdfVersionId,
        SessionID: sessionId,
        ReportType: 'SESSION_A4',
        VersionNumber: String(versionNum),
        GeneratedAt: nowIso,
        GeneratedBy: ctx.user.UserID,
        RecipientEmail: targetEmail,
        SendStatus: sendStatus
      });

      var emailLogRow = TM_Db.insertRecord('EmailLogs', {
        EmailLogID: TM_Utils.generateId('EML'),
        SessionID: sessionId,
        Recipient: targetEmail,
        PDFVersionID: pdfVersionId,
        AttemptAt: nowIso,
        Status: sendStatus,
        FailureReason: failureReason
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: isResend ? 'RESEND_SESSION_PDF_EMAIL' : 'SEND_SESSION_PDF_EMAIL',
        entityType: 'EmailLogs',
        entityId: emailLogRow.EmailLogID,
        afterData: {
          sessionId: sessionId,
          pdfVersionId: pdfVersionId,
          versionNumber: versionNum,
          recipient: targetEmail,
          status: sendStatus,
          failureReason: failureReason
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: (isResend ? 'Kirim ulang' : 'Kirim') + ' email PDF sesi ' + sessionId + ' ke ' + targetEmail + ' (' + sendStatus + ')'
      });

      return {
        pdfVersion: pdfHistoryRow,
        emailLog: emailLogRow,
        status: sendStatus,
        failureReason: failureReason
      };
    });
  }

  function getSessionPdfHistory(token, sessionId) {
    TM_Auth.requireAuth(token, [
      TM_CONFIG.ROLES.SUPER_ADMIN,
      TM_CONFIG.ROLES.TRAINER,
      TM_CONFIG.ROLES.MANAJEMEN
    ]);
    var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
    if (!session) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi tidak ditemukan.');
    }
    var trainer = TM_Db.findById('Users', 'UserID', session.TrainerID);
    var pdfVersions = TM_Db.filterRecords('PDFHistory', function (p) {
      return p.SessionID === sessionId;
    }).sort(function (a, b) {
      return parseInt(b.VersionNumber || '0', 10) - parseInt(a.VersionNumber || '0', 10);
    });
    var emailLogs = TM_Db.filterRecords('EmailLogs', function (e) {
      return e.SessionID === sessionId;
    }).sort(function (a, b) {
      return String(b.AttemptAt).localeCompare(String(a.AttemptAt));
    });

    return {
      sessionId: sessionId,
      defaultRecipientEmail: trainer ? trainer.Email : '',
      pdfVersions: pdfVersions,
      emailLogs: emailLogs
    };
  }

  function listEmailLogsForAdmin(token, statusFilter) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var logs = TM_Db.getAllRecords('EmailLogs');
    if (statusFilter) {
      logs = logs.filter(function (l) { return l.Status === statusFilter; });
    }
    logs.sort(function (a, b) {
      return String(b.AttemptAt).localeCompare(String(a.AttemptAt));
    });
    return logs;
  }

  /**
   * Generate Dashboard Report PDF: SUMMARY Report atau FULL Report (PRD 11.1 & 12.4).
   */
  function generateDashboardReportPdf(token, reportType, filters) {
    var ctx = TM_Auth.requireAuth(token, [
      TM_CONFIG.ROLES.SUPER_ADMIN,
      TM_CONFIG.ROLES.TRAINER,
      TM_CONFIG.ROLES.MANAJEMEN
    ]);

    var normType = String(reportType || 'SUMMARY').toUpperCase() === 'FULL' ? 'FULL' : 'SUMMARY';

    return TM_Db.withLock(function () {
      var ds = TM_Dashboard.computeDashboardDataset(filters || {});
      var branding = TM_Settings.getPublicBranding();
      var logoHtml = branding.logoDataUrl
        ? '<img class="brand-logo" width="90" src="' + branding.logoDataUrl + '" alt="Logo">'
        : '<div class="brand-badge">TM</div>';

      var fObj = filters || {};
      var periodLabel = (fObj.dateFrom || fObj.dateTo)
        ? ((fObj.dateFrom || 'Awal') + ' s/d ' + (fObj.dateTo || 'Sekarang'))
        : 'Semua Tanggal Pemeriksaan';

      var outletSummaryRows = (ds.topIssuesByOutlet || []).map(function (o, i) {
        return (
          '<tr>' +
            '<td align="center">' + (i + 1) + '</td>' +
            '<td><strong>' + escHtml(o.outletCode || '-') + '</strong></td>' +
            '<td><strong>' + escHtml(o.outletName) + '</strong></td>' +
            '<td align="center">' + o.sessionCount + '</td>' +
            '<td align="center"><strong>' + o.findingCount + '</strong></td>' +
            '<td>' + escHtml(o.topCategory) + '</td>' +
            '<td>' + escHtml(o.topSection) + '</td>' +
          '</tr>'
        );
      }).join('') || '<tr><td colspan="7" align="center">Tidak ada data pemeriksaan outlet pada filter ini.</td></tr>';

      var amSummaryRows = (ds.analysisByAM || []).map(function (a, i) {
        return '<tr><td align="center">' + (i + 1) + '</td><td><strong>' + escHtml(a.amName) + '</strong></td><td align="center">' + a.outletCount + '</td><td align="center">' + a.sessionCount + '</td><td align="center"><strong>' + a.findingCount + '</strong></td></tr>';
      }).join('') || '<tr><td colspan="5" align="center">Tidak ada data AM</td></tr>';

      var mumSummaryRows = (ds.analysisByMUM || []).map(function (m, i) {
        return '<tr><td align="center">' + (i + 1) + '</td><td><strong>' + escHtml(m.mumName) + '</strong></td><td align="center">' + m.outletCount + '</td><td align="center">' + m.sessionCount + '</td><td align="center"><strong>' + m.findingCount + '</strong></td></tr>';
      }).join('') || '<tr><td colspan="5" align="center">Tidak ada data MUM</td></tr>';

      var topCatRows = ds.topCategories.map(function (c, i) {
        return '<tr><td align="center">' + (i + 1) + '</td><td>' + escHtml(c.categoryName) + '</td><td align="center">' + (c.sessionCount || '-') + '</td><td align="center"><strong>' + c.findingCount + '</strong></td></tr>';
      }).join('') || '<tr><td colspan="4" align="center">Tidak ada data</td></tr>';

      var topSecRows = ds.topSections.map(function (s, i) {
        return '<tr><td align="center">' + (i + 1) + '</td><td>' + escHtml(s.sectionName) + '</td><td align="center">' + (s.sessionCount || '-') + '</td><td align="center"><strong>' + s.findingCount + '</strong></td></tr>';
      }).join('') || '<tr><td colspan="4" align="center">Tidak ada data</td></tr>';

      var recRows = ds.recurringIssues.map(function (r) {
        return (
          '<tr>' +
            '<td><strong>' + escHtml(r.outletName) + '</strong> (' + escHtml(r.outletCode) + ')</td>' +
            '<td>' + escHtml(r.categoryName) + '</td>' +
            '<td align="center">' + r.sessionCount + ' sesi</td>' +
            '<td align="center"><strong>' + r.findingCount + ' temuan</strong></td>' +
            '<td align="center">' + escHtml(r.lastInspectionDate || '-') + '</td>' +
            '<td><span class="rec-badge">Perlu perhatian khusus</span></td>' +
          '</tr>'
        );
      }).join('') || '<tr><td colspan="6" align="center">Tidak ada masalah berulang (Recurring Issue) pada filter aktif.</td></tr>';

      var fullDetailsHtml = '';
      if (normType === 'FULL') {
        fullDetailsHtml = '<h2 class="sec-title">6. Rincian Pemeriksaan per Outlet &amp; Dokumentasi Bukti Temuan</h2>' +
          (ds.detailedSessions.map(function (s, sIdx) {
            var fList = (s.Findings || []).map(function (f, idx) {
              return (
                '<table class="finding-block" width="100%" cellspacing="0" cellpadding="0" role="presentation">' +
                  '<tr class="finding-header-row">' +
                    '<td class="finding-header-left" align="left">Temuan #' + (idx + 1) + '</td>' +
                    '<td class="finding-header-right" align="right">' + escHtml(f.CategoryNameSnapshot) + ' &bull; ' + escHtml(f.SectionNameSnapshot) + '</td>' +
                  '</tr>' +
                  '<tr>' +
                    '<td colspan="2" class="finding-details-section">' +
                      '<table class="finding-fields-table" width="100%" cellspacing="0" cellpadding="0" role="presentation">' +
                        '<tr><td class="field-label-col" width="22%">Masalah</td><td class="field-val-col" width="78%">' + escHtml(f.Masalah) + '</td></tr>' +
                        '<tr><td class="field-label-col" width="22%">Mengapa</td><td class="field-val-col" width="78%">' + escHtml(f.Mengapa) + '</td></tr>' +
                        '<tr><td class="field-label-col" width="22%">Solusi / Tindakan</td><td class="field-val-col" width="78%">' + escHtml(f.Solusi || '-') + '</td></tr>' +
                      '</table>' +
                    '</td>' +
                  '</tr>' +
                  '<tr>' +
                    '<td colspan="2" class="finding-photos-section">' +
                      '<div class="photos-section-label">Dokumentasi Foto Bukti (' + ((f.Photos && f.Photos.length) || 0) + ' Foto)</div>' +
                      buildPhotoRowsHtml(f.Photos || []) +
                    '</td>' +
                  '</tr>' +
                '</table>'
              );
            }).join('') || '<div class="empty-findings-box">Pemeriksaan selesai tanpa temuan masalah operasional.</div>';

            return (
              '<div class="session-section">' +
                '<table class="session-bar-table" width="100%" cellspacing="0" cellpadding="0" role="presentation">' +
                  '<tr>' +
                    '<td class="session-bar-main">' +
                      '<div class="session-outlet-title">' + (sIdx + 1) + '. ' + escHtml(s.CanonicalOutletName) + (s.CanonicalOutletCode ? ' (' + escHtml(s.CanonicalOutletCode) + ')' : '') + '</div>' +
                      '<div class="session-meta-line">' +
                        '<strong>No. Laporan:</strong> ' + escHtml(s.ReportNumber || s.SessionID) +
                        ' &nbsp;|&nbsp; <strong>Tanggal:</strong> ' + escHtml(s.InspectionDate) +
                        ' &nbsp;|&nbsp; <strong>Trainer:</strong> ' + escHtml(s.TrainerName) +
                        ' &nbsp;|&nbsp; <strong>PIC Outlet:</strong> ' + escHtml(s.PIC_Name) +
                      '</div>' +
                      '<div class="session-meta-line">' +
                        '<strong>Area Manager (AM):</strong> ' + escHtml(s.AM_Name_Snapshot || '-') +
                        ' &nbsp;|&nbsp; <strong>MUM:</strong> ' + escHtml(s.MUM_Name_Snapshot || '-') +
                      '</div>' +
                    '</td>' +
                    '<td class="session-bar-badge" align="right" valign="top">' +
                      '<span class="session-count-pill">' + ((s.Findings && s.Findings.length) || 0) + ' Temuan</span>' +
                    '</td>' +
                  '</tr>' +
                '</table>' +
                fList +
              '</div>'
            );
          }).join('') || '<p>Tidak ada sesi pemeriksaan pada filter ini.</p>');
      }

      var nowPrintWib = TM_Utils.formatWibIso().slice(0, 16).replace('T', ' ') + ' WIB';

      var html =
        '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">' +
        '<style>' +
          '@page { size: A4 portrait; margin: 12mm; }' +
          '* { box-sizing: border-box; }' +
          'body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #1f2937; line-height: 1.4; margin: 0; padding: 0; }' +
          '.hdr-table { width: 100%; border-collapse: collapse; border-bottom: 2.5px solid #991b1b; margin-bottom: 12px; }' +
          '.hdr-table td { vertical-align: middle; padding-bottom: 8px; }' +
          '.brand-logo { max-height: 44px; max-width: 110px; width: auto; height: auto; display: block; }' +
          '.brand-badge { width: 36px; height: 36px; line-height: 36px; text-align: center; background: #991b1b; color: #ffffff; font-weight: bold; border-radius: 6px; font-size: 11pt; }' +
          '.sec-title { font-size: 11pt; color: #991b1b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 0.02em; }' +
          '.kpi-grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; }' +
          '.kpi-grid td { width: 25%; border: 1px solid #cbd5e1; padding: 8px; background: #f8fafc; text-align: center; vertical-align: middle; }' +
          '.kpi-lbl { font-size: 8.5pt; font-weight: bold; color: #475569; text-transform: uppercase; }' +
          '.kpi-num { font-size: 14pt; font-weight: bold; color: #991b1b; margin-top: 2px; }' +
          '.tbl { width: 100%; border-collapse: collapse; margin-bottom: 12px; page-break-inside: auto; }' +
          '.tbl tr { page-break-inside: avoid; break-inside: avoid; }' +
          '.tbl th, .tbl td { border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 9pt; vertical-align: top; }' +
          '.tbl th { background: #f1f5f9; color: #1e293b; font-weight: bold; text-transform: uppercase; font-size: 8pt; }' +
          '.rec-badge { color: #991b1b; font-weight: bold; }' +
          '.session-section { margin-bottom: 18px; }' +
          '.session-bar-table { width: 100%; border-collapse: collapse; background: #f1f5f9; border: 1px solid #cbd5e1; border-left: 4px solid #991b1b; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; }' +
          '.session-bar-main { padding: 8px 10px; }' +
          '.session-bar-badge { padding: 8px 10px; width: 95px; }' +
          '.session-outlet-title { font-size: 11pt; font-weight: bold; color: #0f172a; margin-bottom: 3px; }' +
          '.session-meta-line { font-size: 8.5pt; color: #334155; margin-top: 2px; }' +
          '.session-count-pill { display: inline-block; background: #991b1b; color: #ffffff; font-weight: bold; font-size: 8.5pt; padding: 3px 8px; border-radius: 4px; }' +
          '.finding-block { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; background: #ffffff; }' +
          '.finding-header-row td { background: #fef2f2; padding: 6px 10px; border-bottom: 1px solid #fecaca; }' +
          '.finding-header-left { font-weight: bold; color: #991b1b; font-size: 9.5pt; width: 35%; }' +
          '.finding-header-right { font-weight: bold; color: #1f2937; font-size: 9pt; width: 65%; }' +
          '.finding-details-section { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }' +
          '.finding-fields-table { width: 100%; border-collapse: collapse; }' +
          '.finding-fields-table td { padding: 4px 6px; vertical-align: top; border-bottom: 1px dashed #e5e7eb; font-size: 9pt; }' +
          '.finding-fields-table tr:last-child td { border-bottom: none; }' +
          '.field-label-col { font-weight: bold; color: #4b5563; width: 22%; }' +
          '.field-val-col { color: #111827; white-space: pre-wrap; width: 78%; }' +
          '.finding-photos-section { padding: 8px 10px; background: #f8fafc; page-break-inside: avoid; break-inside: avoid; }' +
          '.photos-section-label { font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 5px; }' +
          '.pdf-photo-table { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: avoid; break-inside: avoid; }' +
          '.pdf-photo-row, .pdf-photo-cell, .pdf-photo-card { page-break-inside: avoid; break-inside: avoid; }' +
          '.pdf-photo-cell { width: 50%; padding: 4px; vertical-align: top; }' +
          '.pdf-photo-card { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; background: #ffffff; }' +
          '.pdf-photo-card-inner { padding: 6px; text-align: center; vertical-align: top; }' +
          '.pdf-photo-img-box { text-align: center; margin-bottom: 5px; }' +
          '.pdf-photo-img { max-width: 210px; max-height: 150px; width: auto; height: auto; display: inline-block; border: 1px solid #e2e8f0; }' +
          '.pdf-photo-placeholder { padding: 20px 8px; text-align: center; background: #f1f5f9; color: #64748b; font-size: 8.5pt; margin-bottom: 4px; border: 1px dashed #cbd5e1; }' +
          '.pdf-photo-comment { font-size: 8pt; color: #334155; text-align: center; word-wrap: break-word; line-height: 1.35; padding-top: 3px; border-top: 1px solid #f1f5f9; }' +
          '.no-photo-note { font-size: 8.5pt; color: #64748b; font-style: italic; }' +
          '.empty-findings-box { padding: 12px; border: 1px solid #cbd5e1; text-align: center; color: #475569; background: #f8fafc; font-style: italic; margin-bottom: 10px; }' +
        '</style></head><body>' +
          '<table class="hdr-table" role="presentation">' +
            '<tr>' +
              '<td width="48">' + logoHtml + '</td>' +
              '<td>' +
                '<div style="font-weight:bold;font-size:11.5pt;color:#0f172a;">' + escHtml(branding.companyName) + '</div>' +
                '<div style="font-size:14pt;font-weight:bold;color:#991b1b;">' + (normType === 'FULL' ? 'Laporan Lengkap Pemeriksaan Outlet' : 'Laporan Ringkasan Pemeriksaan Outlet') + '</div>' +
              '</td>' +
              '<td align="right" style="font-size:8.5pt;color:#475569;">' +
                '<div><strong>Periode:</strong> ' + escHtml(periodLabel) + '</div>' +
                '<div><strong>Dicetak:</strong> ' + escHtml(nowPrintWib) + '</div>' +
              '</td>' +
            '</tr>' +
          '</table>' +
          '<table class="kpi-grid" role="presentation"><tr>' +
            '<td><div class="kpi-lbl">Total Pemeriksaan</div><div class="kpi-num">' + ds.kpi.totalInspections + '</div></td>' +
            '<td><div class="kpi-lbl">Total Temuan Aktif</div><div class="kpi-num">' + ds.kpi.totalActiveFindings + '</div></td>' +
            '<td><div class="kpi-lbl">Outlet Diperiksa</div><div class="kpi-num">' + ds.kpi.inspectedOutlets + '</div></td>' +
            '<td><div class="kpi-lbl">Masalah Berulang</div><div class="kpi-num">' + ds.kpi.recurringIssuesCount + ' (' + ds.kpi.recurringAffectedOutletsCount + ' outlet)</div></td>' +
          '</tr></table>' +
          '<h2 class="sec-title">1. Ringkasan Pemeriksaan per Outlet</h2>' +
          '<table class="tbl"><thead><tr><th width="6%">No</th><th width="12%">Kode</th><th width="26%">Nama Outlet</th><th width="10%">Sesi</th><th width="10%">Temuan</th><th width="18%">Kategori Terbanyak</th><th width="18%">Bagian Terbanyak</th></tr></thead><tbody>' + outletSummaryRows + '</tbody></table>' +
          '<h2 class="sec-title">2. Rekapitulasi Area Manager (AM) &amp; MUM</h2>' +
          '<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="margin-bottom:6px;"><tr>' +
            '<td width="49%" valign="top">' +
              '<table class="tbl"><thead><tr><th>#</th><th>Nama AM</th><th>Outlet</th><th>Sesi</th><th>Temuan</th></tr></thead><tbody>' + amSummaryRows + '</tbody></table>' +
            '</td>' +
            '<td width="2%"></td>' +
            '<td width="49%" valign="top">' +
              '<table class="tbl"><thead><tr><th>#</th><th>Nama MUM</th><th>Outlet</th><th>Sesi</th><th>Temuan</th></tr></thead><tbody>' + mumSummaryRows + '</tbody></table>' +
            '</td>' +
          '</tr></table>' +
          '<h2 class="sec-title">3. 10 Kategori Temuan Terbanyak</h2>' +
          '<table class="tbl"><thead><tr><th width="8%">#</th><th>Kategori Temuan</th><th width="18%">Jumlah Sesi</th><th width="18%">Jumlah Temuan</th></tr></thead><tbody>' + topCatRows + '</tbody></table>' +
          '<h2 class="sec-title">4. Bagian (Section) Temuan Terbanyak</h2>' +
          '<table class="tbl"><thead><tr><th width="8%">#</th><th>Bagian / Section</th><th width="18%">Jumlah Sesi</th><th width="18%">Jumlah Temuan</th></tr></thead><tbody>' + topSecRows + '</tbody></table>' +
          '<h2 class="sec-title">5. Masalah Berulang (Recurring Issue — Perlu Perhatian Khusus)</h2>' +
          '<table class="tbl"><thead><tr><th>Outlet</th><th>Kategori</th><th>Sesi Unik</th><th>Total Temuan</th><th>Pemeriksaan Terakhir</th><th>Status</th></tr></thead><tbody>' + recRows + '</tbody></table>' +
          fullDetailsHtml +
        '</body></html>';

      var versionNum = nextPdfVersionNumber('DASHBOARD', normType);
      var fileName = 'TM-' + normType + '-REPORT-v' + versionNum + '.pdf';
      var pdfObj = convertHtmlToPdfBase64(html, fileName);

      var pdfVer = TM_Db.insertRecord('PDFHistory', {
        PDFVersionID: TM_Utils.generateId('PDF'),
        SessionID: 'DASHBOARD',
        ReportType: normType,
        VersionNumber: String(versionNum),
        GeneratedAt: TM_Utils.formatWibIso(),
        GeneratedBy: ctx.user.UserID,
        RecipientEmail: '',
        SendStatus: 'GENERATED_ONLY'
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'EXPORT_DATA',
        entityType: 'PDFHistory',
        entityId: pdfVer.PDFVersionID,
        afterData: {
          format: 'PDF',
          reportType: normType,
          filters: filters || {},
          versionNumber: versionNum
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Ekspor PDF ' + normType + ' Report sesuai filter Dashboard'
      });

      return {
        pdfVersion: pdfVer,
        fileName: fileName,
        mimeType: 'application/pdf',
        base64Data: pdfObj.base64Data,
        htmlPreview: html
      };
    });
  }

  return {
    generateSessionPdf: generateSessionPdf,
    sendSessionPdfEmail: sendSessionPdfEmail,
    getSessionPdfHistory: getSessionPdfHistory,
    listEmailLogsForAdmin: listEmailLogsForAdmin,
    generateDashboardReportPdf: generateDashboardReportPdf
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Reporting: TM_Reporting };
}
