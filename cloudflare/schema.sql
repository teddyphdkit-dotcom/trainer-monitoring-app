-- ============================================================================
-- Cloudflare D1 (SQLite) Schema untuk Trainer Monitoring App (20 Sheet + Storage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "_cf_properties" (
  "PropKey" TEXT PRIMARY KEY,
  "PropValue" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "_cf_folders" (
  "FolderID" TEXT PRIMARY KEY,
  "FolderName" TEXT NOT NULL DEFAULT '',
  "ParentID" TEXT NOT NULL DEFAULT '',
  "Access" TEXT NOT NULL DEFAULT 'PRIVATE',
  "Permission" TEXT NOT NULL DEFAULT 'NONE'
);

CREATE TABLE IF NOT EXISTS "_cf_files" (
  "FileID" TEXT PRIMARY KEY,
  "FolderID" TEXT NOT NULL DEFAULT '',
  "FileName" TEXT NOT NULL DEFAULT '',
  "MimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
  "Base64Data" TEXT NOT NULL DEFAULT '',
  "Trashed" INTEGER NOT NULL DEFAULT 0,
  "CreatedAt" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "Users" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "UserID" TEXT NOT NULL DEFAULT '',
  "Name" TEXT NOT NULL DEFAULT '',
  "Username" TEXT NOT NULL DEFAULT '',
  "Email" TEXT NOT NULL DEFAULT '',
  "PasswordHash" TEXT NOT NULL DEFAULT '',
  "Role" TEXT NOT NULL DEFAULT '',
  "Status" TEXT NOT NULL DEFAULT '',
  "FailedLoginCount" TEXT NOT NULL DEFAULT '',
  "LockedUntil" TEXT NOT NULL DEFAULT '',
  "MustChangePassword" TEXT NOT NULL DEFAULT '',
  "ResetTokenHash" TEXT NOT NULL DEFAULT '',
  "ResetTokenExpiresAt" TEXT NOT NULL DEFAULT '',
  "CreatedAt" TEXT NOT NULL DEFAULT '',
  "UpdatedAt" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_Users_UserID" ON "Users" ("UserID");

CREATE TABLE IF NOT EXISTS "AuthSessions" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "AuthSessionID" TEXT NOT NULL DEFAULT '',
  "UserID" TEXT NOT NULL DEFAULT '',
  "TokenHash" TEXT NOT NULL DEFAULT '',
  "RoleSnapshot" TEXT NOT NULL DEFAULT '',
  "DeviceInfo" TEXT NOT NULL DEFAULT '',
  "IssuedAt" TEXT NOT NULL DEFAULT '',
  "LastActivityAt" TEXT NOT NULL DEFAULT '',
  "ExpiresAt" TEXT NOT NULL DEFAULT '',
  "RevokedAt" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_AuthSessions_AuthSessionID" ON "AuthSessions" ("AuthSessionID");

CREATE TABLE IF NOT EXISTS "Categories" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "CategoryID" TEXT NOT NULL DEFAULT '',
  "CategoryName" TEXT NOT NULL DEFAULT '',
  "Status" TEXT NOT NULL DEFAULT '',
  "CreatedAt" TEXT NOT NULL DEFAULT '',
  "UpdatedAt" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_Categories_CategoryID" ON "Categories" ("CategoryID");

CREATE TABLE IF NOT EXISTS "Sections" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "SectionID" TEXT NOT NULL DEFAULT '',
  "SectionName" TEXT NOT NULL DEFAULT '',
  "Status" TEXT NOT NULL DEFAULT '',
  "CreatedAt" TEXT NOT NULL DEFAULT '',
  "UpdatedAt" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_Sections_SectionID" ON "Sections" ("SectionID");

CREATE TABLE IF NOT EXISTS "Master_AM" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "AM_ID" TEXT NOT NULL DEFAULT '',
  "AM_Name" TEXT NOT NULL DEFAULT '',
  "Status" TEXT NOT NULL DEFAULT '',
  "CreatedAt" TEXT NOT NULL DEFAULT '',
  "UpdatedAt" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_Master_AM_AM_ID" ON "Master_AM" ("AM_ID");

CREATE TABLE IF NOT EXISTS "Master_MUM" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "MUM_ID" TEXT NOT NULL DEFAULT '',
  "MUM_Name" TEXT NOT NULL DEFAULT '',
  "Status" TEXT NOT NULL DEFAULT '',
  "CreatedAt" TEXT NOT NULL DEFAULT '',
  "UpdatedAt" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_Master_MUM_MUM_ID" ON "Master_MUM" ("MUM_ID");

CREATE TABLE IF NOT EXISTS "Outlets" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "OutletID" TEXT NOT NULL DEFAULT '',
  "CanonicalName" TEXT NOT NULL DEFAULT '',
  "NormalizedName" TEXT NOT NULL DEFAULT '',
  "OutletCode" TEXT NOT NULL DEFAULT '',
  "Status" TEXT NOT NULL DEFAULT '',
  "MergedIntoOutletID" TEXT NOT NULL DEFAULT '',
  "CreatedAt" TEXT NOT NULL DEFAULT '',
  "UpdatedAt" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_Outlets_OutletID" ON "Outlets" ("OutletID");

CREATE TABLE IF NOT EXISTS "OutletAliases" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "AliasID" TEXT NOT NULL DEFAULT '',
  "OutletID" TEXT NOT NULL DEFAULT '',
  "AliasName" TEXT NOT NULL DEFAULT '',
  "NormalizedAlias" TEXT NOT NULL DEFAULT '',
  "CreatedAt" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_OutletAliases_AliasID" ON "OutletAliases" ("AliasID");

CREATE TABLE IF NOT EXISTS "Sessions" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "SessionID" TEXT NOT NULL DEFAULT '',
  "ReportNumber" TEXT NOT NULL DEFAULT '',
  "InspectionDate" TEXT NOT NULL DEFAULT '',
  "OutletID" TEXT NOT NULL DEFAULT '',
  "OutletNameSnapshot" TEXT NOT NULL DEFAULT '',
  "AM_ID" TEXT NOT NULL DEFAULT '',
  "AM_Name_Snapshot" TEXT NOT NULL DEFAULT '',
  "MUM_ID" TEXT NOT NULL DEFAULT '',
  "MUM_Name_Snapshot" TEXT NOT NULL DEFAULT '',
  "PIC_Name" TEXT NOT NULL DEFAULT '',
  "TrainerID" TEXT NOT NULL DEFAULT '',
  "Status" TEXT NOT NULL DEFAULT '',
  "Version" TEXT NOT NULL DEFAULT '',
  "IsRestoredFlagUntil" TEXT NOT NULL DEFAULT '',
  "CreatedAt" TEXT NOT NULL DEFAULT '',
  "SubmittedAt" TEXT NOT NULL DEFAULT '',
  "UpdatedAt" TEXT NOT NULL DEFAULT '',
  "DeletedAt" TEXT NOT NULL DEFAULT '',
  "DeletedBy" TEXT NOT NULL DEFAULT '',
  "DeleteReason" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_Sessions_SessionID" ON "Sessions" ("SessionID");

CREATE TABLE IF NOT EXISTS "Findings" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "FindingID" TEXT NOT NULL DEFAULT '',
  "SessionID" TEXT NOT NULL DEFAULT '',
  "CategoryID" TEXT NOT NULL DEFAULT '',
  "CategoryNameSnapshot" TEXT NOT NULL DEFAULT '',
  "SectionID" TEXT NOT NULL DEFAULT '',
  "SectionNameSnapshot" TEXT NOT NULL DEFAULT '',
  "Masalah" TEXT NOT NULL DEFAULT '',
  "Mengapa" TEXT NOT NULL DEFAULT '',
  "Solusi" TEXT NOT NULL DEFAULT '',
  "Version" TEXT NOT NULL DEFAULT '',
  "CreatedAt" TEXT NOT NULL DEFAULT '',
  "CreatedBy" TEXT NOT NULL DEFAULT '',
  "UpdatedAt" TEXT NOT NULL DEFAULT '',
  "UpdatedBy" TEXT NOT NULL DEFAULT '',
  "DeletedAt" TEXT NOT NULL DEFAULT '',
  "DeletedBy" TEXT NOT NULL DEFAULT '',
  "DeleteReason" TEXT NOT NULL DEFAULT '',
  "DeletionSource" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_Findings_FindingID" ON "Findings" ("FindingID");

CREATE TABLE IF NOT EXISTS "Photos" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "PhotoID" TEXT NOT NULL DEFAULT '',
  "FindingID" TEXT NOT NULL DEFAULT '',
  "SessionID" TEXT NOT NULL DEFAULT '',
  "DriveFileID" TEXT NOT NULL DEFAULT '',
  "FileName" TEXT NOT NULL DEFAULT '',
  "MimeType" TEXT NOT NULL DEFAULT '',
  "FileSize" TEXT NOT NULL DEFAULT '',
  "PhotoComment" TEXT NOT NULL DEFAULT '',
  "Status" TEXT NOT NULL DEFAULT '',
  "IdempotencyKey" TEXT NOT NULL DEFAULT '',
  "UploadedAt" TEXT NOT NULL DEFAULT '',
  "UploadedBy" TEXT NOT NULL DEFAULT '',
  "DeletedAt" TEXT NOT NULL DEFAULT '',
  "DeletedBy" TEXT NOT NULL DEFAULT '',
  "PurgeReason" TEXT NOT NULL DEFAULT '',
  "PurgedAt" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_Photos_PhotoID" ON "Photos" ("PhotoID");

CREATE TABLE IF NOT EXISTS "AuditLogs" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "LogID" TEXT NOT NULL DEFAULT '',
  "UserID" TEXT NOT NULL DEFAULT '',
  "Action" TEXT NOT NULL DEFAULT '',
  "EntityType" TEXT NOT NULL DEFAULT '',
  "EntityID" TEXT NOT NULL DEFAULT '',
  "BeforeData" TEXT NOT NULL DEFAULT '',
  "AfterData" TEXT NOT NULL DEFAULT '',
  "Timestamp" TEXT NOT NULL DEFAULT '',
  "DeviceInfo" TEXT NOT NULL DEFAULT '',
  "Description" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_AuditLogs_LogID" ON "AuditLogs" ("LogID");

CREATE TABLE IF NOT EXISTS "Notifications" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "NotificationID" TEXT NOT NULL DEFAULT '',
  "UserID" TEXT NOT NULL DEFAULT '',
  "Type" TEXT NOT NULL DEFAULT '',
  "Title" TEXT NOT NULL DEFAULT '',
  "Message" TEXT NOT NULL DEFAULT '',
  "RelatedEntityID" TEXT NOT NULL DEFAULT '',
  "MetadataJSON" TEXT NOT NULL DEFAULT '',
  "ReadAt" TEXT NOT NULL DEFAULT '',
  "CreatedAt" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_Notifications_NotificationID" ON "Notifications" ("NotificationID");

CREATE TABLE IF NOT EXISTS "NotificationPreferences" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "PreferenceID" TEXT NOT NULL DEFAULT '',
  "UserID" TEXT NOT NULL DEFAULT '',
  "NotificationType" TEXT NOT NULL DEFAULT '',
  "InAppEnabled" TEXT NOT NULL DEFAULT '',
  "EmailEnabled" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_NotificationPreferences_PreferenceID" ON "NotificationPreferences" ("PreferenceID");

CREATE TABLE IF NOT EXISTS "DraftRestoreRequests" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "RequestID" TEXT NOT NULL DEFAULT '',
  "SessionID" TEXT NOT NULL DEFAULT '',
  "TrainerID" TEXT NOT NULL DEFAULT '',
  "RequestReason" TEXT NOT NULL DEFAULT '',
  "Status" TEXT NOT NULL DEFAULT '',
  "RequestedAt" TEXT NOT NULL DEFAULT '',
  "ProcessedBy" TEXT NOT NULL DEFAULT '',
  "ProcessedAt" TEXT NOT NULL DEFAULT '',
  "DecisionReason" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_DraftRestoreRequests_RequestID" ON "DraftRestoreRequests" ("RequestID");

CREATE TABLE IF NOT EXISTS "SyncMetadata" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "SyncID" TEXT NOT NULL DEFAULT '',
  "SessionID" TEXT NOT NULL DEFAULT '',
  "DeviceID" TEXT NOT NULL DEFAULT '',
  "LocalVersion" TEXT NOT NULL DEFAULT '',
  "ServerVersion" TEXT NOT NULL DEFAULT '',
  "SyncStatus" TEXT NOT NULL DEFAULT '',
  "LastSyncAt" TEXT NOT NULL DEFAULT '',
  "ConflictData" TEXT NOT NULL DEFAULT '',
  "LastIdempotencyKey" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_SyncMetadata_SyncID" ON "SyncMetadata" ("SyncID");

CREATE TABLE IF NOT EXISTS "PDFHistory" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "PDFVersionID" TEXT NOT NULL DEFAULT '',
  "SessionID" TEXT NOT NULL DEFAULT '',
  "ReportType" TEXT NOT NULL DEFAULT '',
  "VersionNumber" TEXT NOT NULL DEFAULT '',
  "GeneratedAt" TEXT NOT NULL DEFAULT '',
  "GeneratedBy" TEXT NOT NULL DEFAULT '',
  "RecipientEmail" TEXT NOT NULL DEFAULT '',
  "SendStatus" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_PDFHistory_PDFVersionID" ON "PDFHistory" ("PDFVersionID");

CREATE TABLE IF NOT EXISTS "EmailLogs" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "EmailLogID" TEXT NOT NULL DEFAULT '',
  "SessionID" TEXT NOT NULL DEFAULT '',
  "Recipient" TEXT NOT NULL DEFAULT '',
  "PDFVersionID" TEXT NOT NULL DEFAULT '',
  "AttemptAt" TEXT NOT NULL DEFAULT '',
  "Status" TEXT NOT NULL DEFAULT '',
  "FailureReason" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_EmailLogs_EmailLogID" ON "EmailLogs" ("EmailLogID");

CREATE TABLE IF NOT EXISTS "BackupHistory" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "BackupID" TEXT NOT NULL DEFAULT '',
  "BackupType" TEXT NOT NULL DEFAULT '',
  "BackupDate" TEXT NOT NULL DEFAULT '',
  "Status" TEXT NOT NULL DEFAULT '',
  "Size" TEXT NOT NULL DEFAULT '',
  "Important" TEXT NOT NULL DEFAULT '',
  "Result" TEXT NOT NULL DEFAULT '',
  "StorageReference" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_BackupHistory_BackupID" ON "BackupHistory" ("BackupID");

CREATE TABLE IF NOT EXISTS "AppSettings" (
  "_row_order" INTEGER PRIMARY KEY AUTOINCREMENT,
  "SettingKey" TEXT NOT NULL DEFAULT '',
  "SettingValue" TEXT NOT NULL DEFAULT '',
  "UpdatedAt" TEXT NOT NULL DEFAULT '',
  "UpdatedBy" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "idx_AppSettings_SettingKey" ON "AppSettings" ("SettingKey");
