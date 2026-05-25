export const AUDIT_ACTOR_TYPES = ["USER", "API_KEY", "SYSTEM"] as const;

export type AuditActorTypeValue = (typeof AUDIT_ACTOR_TYPES)[number];

export {
  listAuditLogs,
  recordApiKeyAuditLog,
  recordUserAuditLog,
  sanitizeAuditMetadata,
  validateAuditLogListQuery,
} from "./service";
export type {
  AuditLogListQuery,
  AuditLogListResult,
  AuditLogRecord,
  RecordApiKeyAuditLogInput,
  RecordUserAuditLogInput,
  SanitizedAuditMetadata,
  SanitizedAuditMetadataValue,
} from "./service";
