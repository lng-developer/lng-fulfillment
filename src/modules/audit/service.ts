import type { Prisma } from "@prisma/client";
import { AppError } from "@/shared/errors";
import {
  countAuditLogRecords,
  createAuditLog,
  listAuditLogRecords,
  type ListAuditLogRecordsQuery,
} from "./repository";

export type RecordUserAuditLogInput = {
  tenantId?: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
};

export type RecordApiKeyAuditLogInput = {
  tenantId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  actorId?: string;
  metadata?: Prisma.InputJsonValue;
};

export type AuditLogListQuery = {
  page: number;
  pageSize: number;
  action?: string;
  actorType?: "USER" | "API_KEY" | "SYSTEM";
  resourceType?: string;
  from?: Date;
  to?: Date;
  sortOrder: "asc" | "desc";
};

export type SanitizedAuditMetadataValue =
  | string
  | number
  | boolean
  | null
  | {
      type: "array" | "object";
      length?: number;
      keys?: string[];
    };

export type SanitizedAuditMetadata = Record<
  string,
  SanitizedAuditMetadataValue
>;

export type AuditLogRecord = {
  id: string;
  actorType: "USER" | "API_KEY" | "SYSTEM";
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: SanitizedAuditMetadata | null;
  createdAt: Date;
};

export type AuditLogListResult = {
  auditLogs: AuditLogRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

const AUDIT_ACTOR_TYPES = ["USER", "API_KEY", "SYSTEM"] as const;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const MAX_FILTER_LENGTH = 100;
const MAX_METADATA_KEYS = 12;
const MAX_METADATA_STRING_LENGTH = 160;
const MAX_OBJECT_SUMMARY_KEYS = 8;
const OPAQUE_TOKEN_MIN_LENGTH = 48;
const SUSPICIOUS_METADATA_KEY_PATTERNS: Array<{
  category: string;
  patterns: string[];
}> = [
  {
    category: "sensitive",
    patterns: ["token", "accesstoken", "refreshtoken", "bearer"],
  },
  { category: "session", patterns: ["session"] },
  { category: "sensitive", patterns: ["secret", "apisecret", "privatekey"] },
  { category: "sensitive", patterns: ["password"] },
  { category: "api-key", patterns: ["apikey"] },
  { category: "hash", patterns: ["keyhash", "passwordhash", "tokenhash"] },
  { category: "auth", patterns: ["authorization", "authheader"] },
  { category: "cookie", patterns: ["cookie"] },
  { category: "raw-data", patterns: ["rawresponse", "rawpayload"] },
  {
    category: "credential",
    patterns: ["credential", "credentials", "customerno"],
  },
];

export async function recordUserAuditLog(input: RecordUserAuditLogInput) {
  return createAuditLog({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    actorType: "USER",
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    metadata: input.metadata,
  });
}

export function validateAuditLogListQuery(
  searchParams: URLSearchParams,
): AuditLogListQuery {
  const page = parsePositiveInteger(searchParams.get("page"), "page", 1);
  const pageSize = parsePositiveInteger(
    searchParams.get("pageSize"),
    "pageSize",
    DEFAULT_PAGE_SIZE,
  );

  if (pageSize > MAX_PAGE_SIZE) {
    throw new AppError(
      "VALIDATION_ERROR",
      `pageSize must be less than or equal to ${MAX_PAGE_SIZE}.`,
      400,
    );
  }

  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new AppError("VALIDATION_ERROR", "sortOrder must be asc or desc.", 400);
  }

  return {
    page,
    pageSize,
    action: parseOptionalFilter(searchParams.get("action"), "action"),
    actorType: parseActorType(searchParams.get("actorType")),
    resourceType: parseOptionalFilter(
      searchParams.get("resourceType"),
      "resourceType",
    ),
    from: parseOptionalDate(searchParams.get("from"), "from"),
    to: parseOptionalDate(searchParams.get("to"), "to"),
    sortOrder,
  };
}

export async function listAuditLogs(
  tenantId: string,
  query: AuditLogListQuery,
  actorUserId: string,
): Promise<AuditLogListResult> {
  void actorUserId;

  const repositoryQuery: ListAuditLogRecordsQuery = query;
  const [records, totalItems] = await Promise.all([
    listAuditLogRecords(tenantId, repositoryQuery),
    countAuditLogRecords(tenantId, repositoryQuery),
  ]);

  return {
    auditLogs: records.map((record) => ({
      id: record.id,
      actorType: record.actorType,
      actorUserId: record.actorUserId,
      actorName: record.actorUser?.name ?? null,
      actorEmail: record.actorUser?.email ?? null,
      action: record.action,
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      metadata: sanitizeAuditMetadata(record.metadata),
      createdAt: record.createdAt,
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    },
  };
}

export function sanitizeAuditMetadata(
  metadata: Prisma.JsonValue | null,
): SanitizedAuditMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const result: SanitizedAuditMetadata = {};
  const redactedCategories = new Set<string>();
  let redactedFieldCount = 0;
  let returnedKeyCount = 0;
  let omittedMetadataKeyCount = 0;

  for (const [key, value] of Object.entries(metadata)) {
    const suspiciousKeyCategory = getSuspiciousMetadataKeyCategory(key);
    if (suspiciousKeyCategory) {
      redactedFieldCount += 1;
      redactedCategories.add(suspiciousKeyCategory);
      continue;
    }

    if (value === undefined) {
      continue;
    }

    const valueRedactionCategory = getSuspiciousMetadataValueCategory(value);
    if (valueRedactionCategory) {
      redactedFieldCount += 1;
      redactedCategories.add(valueRedactionCategory);
      continue;
    }

    if (returnedKeyCount >= MAX_METADATA_KEYS) {
      omittedMetadataKeyCount += 1;
      continue;
    }

    const safeValue = sanitizeAuditMetadataValue(value);
    if (safeValue !== undefined) {
      result[key] = safeValue;
      returnedKeyCount += 1;
    }
  }

  if (redactedFieldCount > 0) {
    result.redactedFieldsCount = redactedFieldCount;
    result.redactedFieldCategories = Array.from(redactedCategories)
      .sort()
      .join(", ");
  }

  if (omittedMetadataKeyCount > 0) {
    result.omittedMetadataKeysCount = omittedMetadataKeyCount;
  }

  return Object.keys(result).length ? result : null;
}

function sanitizeAuditMetadataValue(
  value: Prisma.JsonValue,
): SanitizedAuditMetadataValue | undefined {
  if (
    value === null
  ) {
    return value;
  }

  if (typeof value === "string") {
    return truncateMetadataString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
    };
  }

  if (typeof value === "object") {
    return {
      type: "object",
      keys: Object.keys(value)
        .filter((key) => !getSuspiciousMetadataKeyCategory(key))
        .slice(0, MAX_OBJECT_SUMMARY_KEYS),
    };
  }

  return undefined;
}

function parsePositiveInteger(
  value: string | null,
  label: string,
  defaultValue: number,
) {
  if (value === null || value === "") {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label} must be a positive integer.`,
      400,
    );
  }

  return parsed;
}

function parseOptionalFilter(value: string | null, label: string) {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length > MAX_FILTER_LENGTH) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label} must be ${MAX_FILTER_LENGTH} characters or less.`,
      400,
    );
  }

  return trimmedValue;
}

function parseActorType(value: string | null) {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  if (!AUDIT_ACTOR_TYPES.includes(value as (typeof AUDIT_ACTOR_TYPES)[number])) {
    throw new AppError("VALIDATION_ERROR", "actorType is invalid.", 400);
  }

  return value as (typeof AUDIT_ACTOR_TYPES)[number];
}

function parseOptionalDate(value: string | null, label: string) {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label} must be a valid ISO date.`,
      400,
    );
  }

  return date;
}

function getSuspiciousMetadataKeyCategory(key: string) {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  const match = SUSPICIOUS_METADATA_KEY_PATTERNS.find(({ patterns }) =>
    patterns.some((pattern) => normalizedKey.includes(pattern)),
  );

  return match?.category ?? null;
}

function getSuspiciousMetadataValueCategory(value: Prisma.JsonValue) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (/^Bearer\s+/i.test(trimmedValue) || /^Basic\s+/i.test(trimmedValue)) {
    return "auth";
  }

  if (looksLikeJwt(trimmedValue) || looksLikeOpaqueToken(trimmedValue)) {
    return "sensitive";
  }

  if (trimmedValue.toLowerCase().startsWith("lngfp_")) {
    return "api-key";
  }

  if (looksLikeConnectionString(trimmedValue)) {
    return "connection-string";
  }

  return null;
}

function looksLikeJwt(value: string) {
  return /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(
    value,
  );
}

function looksLikeOpaqueToken(value: string) {
  return (
    value.length >= OPAQUE_TOKEN_MIN_LENGTH &&
    /^[A-Za-z0-9+/_=-]+$/.test(value)
  );
}

function looksLikeConnectionString(value: string) {
  return (
    /^(postgresql|postgres|mysql|mongodb|redis):\/\//i.test(value) ||
    /^[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/i.test(value)
  );
}

function truncateMetadataString(value: string) {
  if (value.length <= MAX_METADATA_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_METADATA_STRING_LENGTH)}...`;
}

export async function recordApiKeyAuditLog(input: RecordApiKeyAuditLogInput) {
  return createAuditLog({
    tenantId: input.tenantId,
    actorType: "API_KEY",
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    metadata: input.metadata,
  });
}
