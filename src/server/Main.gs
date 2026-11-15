/**
 * Main.gs — Entry point Web App (doGet), HTML partial loader, & RPC handlers google.script.run.
 */

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var template;
  try {
    template = HtmlService.createTemplateFromFile('client/index');
  } catch (_) {
    template = HtmlService.createTemplateFromFile('index');
  }
  template.initialMode = params.mode ? String(params.mode) : '';
  template.initialResetToken = params.token ? String(params.token) : '';

  return template
    .evaluate()
    .setTitle(TM_CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=5')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (_) {
    var baseName = String(filename || '').split('/').pop();
    return HtmlService.createHtmlOutputFromFile(baseName).getContent();
  }
}

function executeRpc(fn) {
  try {
    return TM_Utils.okResponse(fn());
  } catch (err) {
    return TM_Utils.errorResponse(err);
  }
}

/* ==================== BOOTSTRAP & PUBLIC ==================== */

function api_getBootstrapStatus() {
  return executeRpc(function () {
    return TM_Bootstrap.getBootstrapStatus();
  });
}

function api_runInitialBootstrap(payload) {
  return executeRpc(function () {
    return TM_Bootstrap.runInitialBootstrap(payload);
  });
}

/* ==================== AUTHENTICATION ==================== */

function api_login(username, password, deviceInfo) {
  return executeRpc(function () {
    return TM_Auth.login(username, password, deviceInfo);
  });
}

function api_validateSession(token) {
  return executeRpc(function () {
    var ctx = TM_Auth.requireAuth(token, null, { allowMustChangePassword: true });
    return {
      user: ctx.user,
      expiresAt: ctx.session.ExpiresAt,
      mustChangePassword: ctx.user.MustChangePassword
    };
  });
}

function api_logout(token) {
  return executeRpc(function () {
    return TM_Auth.logout(token);
  });
}

function api_requestPasswordReset(email, appUrl) {
  return executeRpc(function () {
    return TM_Auth.requestPasswordReset(email, appUrl);
  });
}

function api_confirmPasswordReset(resetToken, newPassword) {
  return executeRpc(function () {
    return TM_Auth.confirmPasswordReset(resetToken, newPassword);
  });
}

function api_changePasswordRequired(token, currentPassword, newPassword) {
  return executeRpc(function () {
    return TM_Auth.changePasswordRequired(token, currentPassword, newPassword);
  });
}

/* ==================== USER MANAGEMENT (SUPER ADMIN) ==================== */

function api_listUsers(token) {
  return executeRpc(function () {
    return TM_Users.listUsers(token);
  });
}

function api_createUser(token, dto) {
  return executeRpc(function () {
    return TM_Users.createUser(token, dto);
  });
}

function api_updateUser(token, userId, dto) {
  return executeRpc(function () {
    return TM_Users.updateUser(token, userId, dto);
  });
}

function api_setUserStatus(token, userId, status) {
  return executeRpc(function () {
    return TM_Users.setUserStatus(token, userId, status);
  });
}

function api_unlockUser(token, userId) {
  return executeRpc(function () {
    return TM_Users.unlockUser(token, userId);
  });
}

function api_adminResetPassword(token, userId, tempPassword) {
  return executeRpc(function () {
    return TM_Users.adminResetPassword(token, userId, tempPassword);
  });
}

/* ==================== APP SETTINGS ==================== */

function api_getAppSettings(token) {
  return executeRpc(function () {
    return TM_Settings.getAppSettings(token);
  });
}

function api_updateAppSettings(token, dto, logoPayload) {
  return executeRpc(function () {
    return TM_Settings.updateAppSettings(token, dto, logoPayload);
  });
}

/* ==================== AUDIT LOG (SUPER ADMIN) ==================== */

function api_queryAuditLogs(token, filters) {
  return executeRpc(function () {
    return TM_Audit.queryAuditLogs(token, filters);
  });
}

/* ==================== MASTER DATA & OUTLETS ==================== */

function api_getMasterBundle(token) {
  return executeRpc(function () {
    return TM_MasterData.getMasterBundle(token);
  });
}

function api_saveMasterItem(token, entityType, dto) {
  return executeRpc(function () {
    return TM_MasterData.saveMasterItem(token, entityType, dto);
  });
}

function api_setMasterStatus(token, entityType, id, status) {
  return executeRpc(function () {
    return TM_MasterData.setMasterStatus(token, entityType, id, status);
  });
}

function api_deleteMasterItem(token, entityType, id) {
  return executeRpc(function () {
    return TM_MasterData.deleteMasterItem(token, entityType, id);
  });
}

function api_listOutlets(token) {
  return executeRpc(function () {
    return TM_Outlets.listOutlets(token);
  });
}

function api_suggestOutlets(token, rawQuery) {
  return executeRpc(function () {
    return TM_Outlets.suggestOutlets(token, rawQuery);
  });
}

function api_resolveOrCreateOutlet(token, rawName) {
  return executeRpc(function () {
    return TM_Outlets.resolveOrCreateOutlet(token, rawName);
  });
}

function api_updateOutlet(token, outletId, dto) {
  return executeRpc(function () {
    return TM_Outlets.updateOutlet(token, outletId, dto);
  });
}

function api_setOutletStatus(token, outletId, status) {
  return executeRpc(function () {
    return TM_Outlets.setOutletStatus(token, outletId, status);
  });
}

function api_deleteOutlet(token, outletId) {
  return executeRpc(function () {
    return TM_Outlets.deleteOutlet(token, outletId);
  });
}

function api_mergeOutlets(token, primaryOutletId, duplicateOutletIds, reason) {
  return executeRpc(function () {
    return TM_Outlets.mergeOutlets(token, primaryOutletId, duplicateOutletIds, reason);
  });
}

function api_unmergeOutlet(token, duplicateOutletId, reason) {
  return executeRpc(function () {
    return TM_Outlets.unmergeOutlet(token, duplicateOutletId, reason);
  });
}

/* ==================== SESSIONS, FINDINGS & PHOTOS ==================== */

function api_saveDraft(token, draftDto) {
  return executeRpc(function () {
    return TM_Sessions.saveDraft(token, draftDto);
  });
}

function api_listMyDrafts(token) {
  return executeRpc(function () {
    return TM_Sessions.listMyDrafts(token);
  });
}

function api_deleteMyDraft(token, sessionId) {
  return executeRpc(function () {
    return TM_Sessions.deleteMyDraft(token, sessionId);
  });
}

function api_finalizeSession(token, sessionId, confirmNoFindings) {
  return executeRpc(function () {
    return TM_Sessions.finalizeSession(token, sessionId, confirmNoFindings);
  });
}

function api_getSessionDetail(token, sessionId) {
  return executeRpc(function () {
    return TM_Sessions.getSessionDetail(token, sessionId);
  });
}

function api_listCompletedSessions(token, limit) {
  return executeRpc(function () {
    return TM_Sessions.listCompletedSessions(token, limit);
  });
}

function api_listDeletedCompletedSessions(token) {
  return executeRpc(function () {
    return TM_Sessions.listDeletedCompletedSessions(token);
  });
}

function api_deleteSession(token, sessionId, reason) {
  return executeRpc(function () {
    return TM_Sessions.deleteSession(token, sessionId, reason);
  });
}

function api_restoreSession(token, sessionId) {
  return executeRpc(function () {
    return TM_Sessions.restoreSession(token, sessionId);
  });
}

function api_saveFindingDraft(token, sessionId, dto) {
  return executeRpc(function () {
    return TM_Findings.saveFindingDraft(token, sessionId, dto);
  });
}

function api_deleteFindingInDraft(token, findingId) {
  return executeRpc(function () {
    return TM_Findings.deleteFindingInDraft(token, findingId);
  });
}

function api_updateFinding(token, findingId, dto) {
  return executeRpc(function () {
    return TM_Findings.updateFinding(token, findingId, dto);
  });
}

function api_deleteFinding(token, findingId, reason) {
  return executeRpc(function () {
    return TM_Findings.deleteFinding(token, findingId, reason);
  });
}

function api_restoreFinding(token, findingId) {
  return executeRpc(function () {
    return TM_Findings.restoreFinding(token, findingId);
  });
}

function api_uploadPhoto(token, payload) {
  return executeRpc(function () {
    return TM_Photos.uploadPhoto(token, payload);
  });
}

function api_updatePhotoComment(token, photoId, comment) {
  return executeRpc(function () {
    return TM_Photos.updatePhotoComment(token, photoId, comment);
  });
}

function api_deletePhoto(token, photoId) {
  return executeRpc(function () {
    return TM_Photos.deletePhoto(token, photoId);
  });
}

function api_getPhotoData(token, photoId, isDownload) {
  return executeRpc(function () {
    return TM_Photos.getPhotoData(token, photoId, isDownload);
  });
}

/* ==================== DASHBOARD & ANALYTICS ==================== */

function api_getDashboardFilterOptions(token) {
  return executeRpc(function () {
    return TM_Dashboard.getFilterOptions(token);
  });
}

function api_getDashboardData(token, filters) {
  return executeRpc(function () {
    return TM_Dashboard.getDashboardData(token, filters);
  });
}

/* ==================== DRAFT MONITORING & RESTORE ==================== */

function api_getActiveDraftsCount(token) {
  return executeRpc(function () {
    return TM_Drafts.getActiveDraftsCount(token);
  });
}

function api_listMonitoringDrafts(token, filters) {
  return executeRpc(function () {
    return TM_Drafts.listMonitoringDrafts(token, filters);
  });
}

function api_getMonitoringDraftDetail(token, sessionId) {
  return executeRpc(function () {
    return TM_Drafts.getMonitoringDraftDetail(token, sessionId);
  });
}

function api_adminDeleteDraft(token, sessionId, reason) {
  return executeRpc(function () {
    return TM_Drafts.adminDeleteDraft(token, sessionId, reason);
  });
}

function api_listMyDeletedDrafts(token) {
  return executeRpc(function () {
    return TM_Drafts.listMyDeletedDrafts(token);
  });
}

function api_requestDraftRestore(token, sessionId, requestReason) {
  return executeRpc(function () {
    return TM_Drafts.requestDraftRestore(token, sessionId, requestReason);
  });
}

function api_listDraftRestoreRequests(token) {
  return executeRpc(function () {
    return TM_Drafts.listDraftRestoreRequests(token);
  });
}

function api_processDraftRestoreRequest(token, requestId, decision, decisionReason) {
  return executeRpc(function () {
    return TM_Drafts.processDraftRestoreRequest(token, requestId, decision, decisionReason);
  });
}

function api_listMyNotifications(token) {
  return executeRpc(function () {
    return TM_Drafts.listMyNotifications(token);
  });
}

function api_markNotificationRead(token, notificationId) {
  return executeRpc(function () {
    return TM_Drafts.markNotificationRead(token, notificationId);
  });
}

/* ==================== OFFLINE & SYNC ==================== */

function api_syncDraftOperation(token, payload) {
  return executeRpc(function () {
    return TM_Sync.syncDraftOperation(token, payload);
  });
}

function api_syncBatch(token, batchPayload) {
  return executeRpc(function () {
    return TM_Sync.syncBatch(token, batchPayload);
  });
}

function api_resolveSyncConflict(token, sessionId, resolutionDto) {
  return executeRpc(function () {
    return TM_Sync.resolveSyncConflict(token, sessionId, resolutionDto);
  });
}

function api_getDraftSyncAndRetentionStatus(token, sessionIds, deviceId) {
  return executeRpc(function () {
    return TM_Sync.getDraftSyncAndRetentionStatus(token, sessionIds, deviceId);
  });
}

/* ==================== REPORTING (PDF & EMAIL) & EXPORT ==================== */

function api_generateSessionPdf(token, sessionId) {
  return executeRpc(function () {
    return TM_Reporting.generateSessionPdf(token, sessionId);
  });
}

function api_sendSessionPdfEmail(token, sessionId, recipientEmail, isResend) {
  return executeRpc(function () {
    return TM_Reporting.sendSessionPdfEmail(token, sessionId, recipientEmail, Boolean(isResend));
  });
}

function api_getSessionPdfHistory(token, sessionId) {
  return executeRpc(function () {
    return TM_Reporting.getSessionPdfHistory(token, sessionId);
  });
}

function api_listEmailLogsForAdmin(token, statusFilter) {
  return executeRpc(function () {
    return TM_Reporting.listEmailLogsForAdmin(token, statusFilter);
  });
}

function api_generateDashboardReportPdf(token, reportType, filters) {
  return executeRpc(function () {
    return TM_Reporting.generateDashboardReportPdf(token, reportType, filters);
  });
}

function api_exportData(token, format, mode, filters) {
  return executeRpc(function () {
    return TM_Export.exportData(token, format, mode, filters);
  });
}

/* ==================== NOTIFICATION CENTER & PREFERENCES ==================== */

function api_listMyNotificationsCenter(token, filterDto) {
  return executeRpc(function () {
    return TM_Notifications.listMyNotificationsCenter(token, filterDto);
  });
}

function api_setNotificationReadStatus(token, notificationId, isRead) {
  return executeRpc(function () {
    return TM_Notifications.setNotificationReadStatus(token, notificationId, Boolean(isRead));
  });
}

function api_markAllMyNotificationsRead(token) {
  return executeRpc(function () {
    return TM_Notifications.markAllMyNotificationsRead(token);
  });
}

function api_getMyNotificationPreferences(token) {
  return executeRpc(function () {
    return TM_Notifications.getMyNotificationPreferences(token);
  });
}

function api_updateMyNotificationPreference(token, prefDto) {
  return executeRpc(function () {
    return TM_Notifications.updateMyNotificationPreference(token, prefDto);
  });
}

function api_updateMandatoryNotificationPolicy(token, mandatoryTypesArray) {
  return executeRpc(function () {
    return TM_Notifications.updateMandatoryNotificationPolicy(token, mandatoryTypesArray);
  });
}

function api_retryFailedEmailLog(token, emailLogId) {
  return executeRpc(function () {
    return TM_Notifications.retryFailedEmailLog(token, emailLogId);
  });
}

/* ==================== BACKUP, SAFE RESTORE & PHOTO ARCHIVE (SUPER ADMIN) ==================== */

function api_createManualBackup(token, optionsDto) {
  return executeRpc(function () {
    return TM_Backup.createManualBackup(token, optionsDto);
  });
}

function api_runDailyAutomatedBackup(token) {
  return executeRpc(function () {
    return TM_Backup.runDailyAutomatedBackup(token);
  });
}

function cron_runDailyAutomatedBackup() {
  return TM_Backup.runDailyAutomatedBackup(null);
}

function api_toggleBackupImportant(token, backupId, isImportant) {
  return executeRpc(function () {
    return TM_Backup.toggleBackupImportant(token, backupId, Boolean(isImportant));
  });
}

function api_cleanupExpiredBackups(token) {
  return executeRpc(function () {
    return TM_Backup.cleanupExpiredBackups(token);
  });
}

function api_listBackups(token) {
  return executeRpc(function () {
    return TM_Backup.listBackups(token);
  });
}

function api_getBackupSummaryForRestore(token, backupId) {
  return executeRpc(function () {
    return TM_Backup.getBackupSummaryForRestore(token, backupId);
  });
}

function api_executeSafeRestore(token, backupId, confirmationDto) {
  return executeRpc(function () {
    return TM_Backup.executeSafeRestore(token, backupId, confirmationDto);
  });
}

function api_listArchivedPhotos(token) {
  return executeRpc(function () {
    return TM_Backup.listArchivedPhotos(token);
  });
}

function api_purgeArchivedPhoto(token, photoId, purgeReason) {
  return executeRpc(function () {
    return TM_Backup.purgeArchivedPhoto(token, photoId, purgeReason);
  });
}

/* ==================== CLOUDFLARE MIGRATION & PDF/EMAIL BRIDGE ==================== */

var CF_BRIDGE_KEY = 'TM_CF_BRIDGE_2026_SECURE_KEY';

function jsonBridgeResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function exportFullStateForCloudflare() {
  var propsObj = {};
  try {
    propsObj = PropertiesService.getScriptProperties().getProperties() || {};
  } catch (_) {}

  var sheetsData = {};
  var sheetNames = Object.keys(TM_CONFIG.SHEETS);
  if (propsObj[TM_CONFIG.PROP_KEYS.SPREADSHEET_ID]) {
    for (var i = 0; i < sheetNames.length; i++) {
      var sName = sheetNames[i];
      try {
        sheetsData[sName] = TM_Db.getAllRecords(sName);
      } catch (_) {
        sheetsData[sName] = [];
      }
    }
  }

  var fileMap = {};
  function collectDriveFile(fileId, folderHint) {
    if (!fileId || fileMap[fileId]) return;
    try {
      var f = DriveApp.getFileById(fileId);
      var blob = f.getBlob();
      fileMap[fileId] = {
        FileID: String(fileId),
        FolderID: String(folderHint || ''),
        FileName: String(blob.getName() || fileId),
        MimeType: String(blob.getContentType() || 'application/octet-stream'),
        Base64Data: Utilities.base64Encode(blob.getBytes()),
        Trashed: f.isTrashed() ? 1 : 0,
        CreatedAt: TM_Utils.formatWibIso()
      };
    } catch (_) {}
  }

  var photos = sheetsData.Photos || [];
  for (var p = 0; p < photos.length; p++) {
    if (photos[p].DriveFileID && !photos[p].PurgedAt) {
      var fHint = photos[p].Status === 'Archived'
        ? propsObj[TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ARCHIVE_ID]
        : propsObj[TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ACTIVE_ID];
      collectDriveFile(photos[p].DriveFileID, fHint);
    }
  }

  var settings = sheetsData.AppSettings || [];
  for (var s = 0; s < settings.length; s++) {
    if (settings[s].SettingKey === 'COMPANY_LOGO_FILE_ID' && settings[s].SettingValue) {
      collectDriveFile(settings[s].SettingValue, propsObj[TM_CONFIG.PROP_KEYS.DRIVE_BRANDING_ID]);
    }
  }

  var backups = sheetsData.BackupHistory || [];
  for (var b = 0; b < backups.length; b++) {
    if (backups[b].StorageReference && backups[b].Status === 'Berhasil') {
      collectDriveFile(backups[b].StorageReference, propsObj[TM_CONFIG.PROP_KEYS.DRIVE_BACKUPS_ID]);
    }
  }

  return {
    exportedAt: TM_Utils.formatWibIso(),
    properties: propsObj,
    sheets: sheetsData,
    files: Object.keys(fileMap).map(function (k) { return fileMap[k]; })
  };
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(raw);
    if (!body || body.bridgeKey !== CF_BRIDGE_KEY) {
      return jsonBridgeResponse({ ok: false, error: 'Unauthorized bridge request' });
    }

    if (body.action === 'EXPORT_ALL') {
      return jsonBridgeResponse({ ok: true, data: exportFullStateForCloudflare() });
    }

    if (body.action === 'RENDER_PDF') {
      var out = HtmlService.createHtmlOutput(String(body.html || ''));
      var pdfBlob = out.getAs('application/pdf').setName(String(body.fileName || 'report.pdf'));
      return jsonBridgeResponse({
        ok: true,
        data: {
          base64Data: Utilities.base64Encode(pdfBlob.getBytes()),
          mimeType: 'application/pdf'
        }
      });
    }

    if (body.action === 'SEND_EMAIL') {
      var mailOpts = {
        to: String(body.to || ''),
        subject: String(body.subject || ''),
        body: String(body.body || '')
      };
      if (body.pdfHtml) {
        var hOut = HtmlService.createHtmlOutput(String(body.pdfHtml));
        var pBlob = hOut.getAs('application/pdf').setName(String(body.pdfFileName || 'report.pdf'));
        mailOpts.attachments = [pBlob];
      } else if (body.pdfBase64) {
        var bytes = Utilities.base64Decode(String(body.pdfBase64));
        var bBlob = Utilities.newBlob(bytes, 'application/pdf', String(body.pdfFileName || 'report.pdf'));
        mailOpts.attachments = [bBlob];
      }
      MailApp.sendEmail(mailOpts);
      return jsonBridgeResponse({ ok: true });
    }

    return jsonBridgeResponse({ ok: false, error: 'Unknown bridge action' });
  } catch (err) {
    return jsonBridgeResponse({
      ok: false,
      error: (err && err.message) ? err.message : String(err)
    });
  }
}





