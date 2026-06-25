import type {
  Prisma,
  YunWebhookEventCategory,
  YunWebhookEventStatus,
} from "@prisma/client";
import { AppError } from "@/shared/errors";
import {
  classifyYunWebhookEvent,
  extractYunWebhookMeta,
} from "./extractor";
import {
  countYunWebhookEventRecords,
  findYunWebhookEventForReprocess,
  findYunWebhookEventRecord,
  getSafeErrorMessage,
  listYunWebhookEventRecords,
  markYunWebhookEventStatus,
  summarizeYunWebhookEventRecords,
  type ListYunWebhookEventRecordsQuery,
} from "./repository";
import { dispatchYunWebhookEvent } from "./service";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const MAX_FILTER_LENGTH = 140;
const STATUSES = [
  "RECEIVED",
  "PROCESSED",
  "DUPLICATE",
  "FAILED",
  "UNMATCHED",
] as const;
const CATEGORIES = ["TRACKING", "FEE", "ABNORMAL", "UNKNOWN"] as const;
const SENSITIVE_KEY_PARTS = [
  "authorization",
  "auth",
  "bearer",
  "cookie",
  "session",
  "token",
  "secret",
  "password",
  "apikey",
  "api_key",
  "keyhash",
  "rawpayload",
  "rawresponse",
  "encryptedpayload",
  "customerno",
  "apisecret",
  "credential",
  "signature",
];
const MAX_PAYLOAD_STRING_LENGTH = 220;
const MAX_PAYLOAD_OBJECT_KEYS = 80;
const MAX_PAYLOAD_ARRAY_ITEMS = 40;

export type YunWebhookEventListQuery = ListYunWebhookEventRecordsQuery;

export type YunWebhookEventSummary = {
  id: string;
  eventId: string | null;
  eventType: string | null;
  eventCategory: YunWebhookEventCategory;
  dataCode: string | null;
  waybillNumber: string | null;
  trackingNumber: string | null;
  customerOrderNumber: string | null;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  shipmentId: string | null;
  shipmentStatus: string | null;
  shipmentOrderNumber: string | null;
  shipmentExternalOrderId: string | null;
  shipmentCostId: string | null;
  shipmentActualFeeStatus: string | null;
  shipmentActualTotalFee: string | null;
  status: YunWebhookEventStatus;
  errorMessage: string | null;
  safeMetadata: Record<string, unknown> | null;
  receivedAt: Date;
  processedAt: Date | null;
  canReprocess: boolean;
};

export type YunWebhookEventStats = {
  total: number;
  failed: number;
  unmatched: number;
  needsAttention: number;
  processed: number;
  tracking: number;
  fee: number;
  abnormal: number;
};

export type YunWebhookSetupStatus = {
  webhookUrl: string;
  receiverPath: string;
  enabled: boolean;
  encryptionKeyConfigured: boolean;
  registrationMode: "manual";
  requiredHeaders: string[];
  requestBodyShape: { encrypt: string };
  checklist: string[];
  warnings: string[];
};

export type YunWebhookEventDetail = YunWebhookEventSummary & {
  timestampHeader: string | null;
  signatureHeaderMasked: string | null;
  decryptedPayload: Record<string, unknown> | null;
};

export async function listYunWebhookEvents(query: YunWebhookEventListQuery) {
  const [records, totalItems] = await Promise.all([
    listYunWebhookEventRecords(query),
    countYunWebhookEventRecords(query),
  ]);

  return {
    data: records.map(toYunWebhookSummary),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    },
  };
}

export async function getYunWebhookEventStats(
  query: YunWebhookEventListQuery,
): Promise<YunWebhookEventStats> {
  return summarizeYunWebhookEventRecords(query);
}

export function getYunWebhookSetupStatus(origin: string): YunWebhookSetupStatus {
  const receiverPath = "/api/webhooks/yunexpress/events";
  const baseUrl = resolveWebhookBaseUrl(origin);
  const enabled = process.env.YUN_WEBHOOK_ENABLED !== "false";
  const encryptionKeyConfigured = Boolean(
    process.env.YUN_WEBHOOK_ENCRYPT_KEY?.trim(),
  );
  const warnings: string[] = [];

  if (!enabled) {
    warnings.push("YunExpress webhook receiver is disabled by YUN_WEBHOOK_ENABLED=false.");
  }

  if (!encryptionKeyConfigured) {
    warnings.push("YUN_WEBHOOK_ENCRYPT_KEY is not configured.");
  }

  return {
    webhookUrl: `${baseUrl}${receiverPath}`,
    receiverPath,
    enabled,
    encryptionKeyConfigured,
    registrationMode: "manual",
    requiredHeaders: [
      "X-Openapi-Request-Timestamp",
      "X-Openapi-Signature",
    ],
    requestBodyShape: { encrypt: "BASE64_ENCRYPTED_PAYLOAD" },
    checklist: [
      "Configure this webhook URL in Yuntu/YunExpress Console.",
      "Set the same encryption policy key as YUN_WEBHOOK_ENCRYPT_KEY.",
      "Enable tracking, fee, and abnormal event pushes if available.",
      "Send one test event and verify it appears in Platform Yun Webhooks.",
      "Review FAILED or UNMATCHED events and reprocess only after checking the safe payload.",
    ],
    warnings,
  };
}

export async function getYunWebhookEventDetail(
  eventRecordId: string,
): Promise<YunWebhookEventDetail> {
  const record = await findYunWebhookEventRecord(eventRecordId);
  if (!record) {
    throw new AppError("NOT_FOUND", "YunExpress webhook event not found.", 404);
  }

  return {
    ...toYunWebhookSummary(record),
    timestampHeader: record.timestampHeader,
    signatureHeaderMasked: maskYunWebhookSignature(record.signatureHeader),
    decryptedPayload: sanitizeYunWebhookPayloadForDisplay(
      record.decryptedPayload,
    ),
  };
}

export async function reprocessYunWebhookEvent(eventRecordId: string) {
  const record = await findYunWebhookEventForReprocess(eventRecordId);
  if (!record) {
    throw new AppError("NOT_FOUND", "YunExpress webhook event not found.", 404);
  }

  if (!canReprocessYunWebhookStatus(record.status)) {
    throw new AppError(
      "CONFLICT",
      "Only FAILED or UNMATCHED webhook events can be reprocessed.",
      409,
    );
  }

  if (!record.decryptedPayload) {
    throw new AppError(
      "CONFLICT",
      "Webhook event has no decrypted payload to reprocess.",
      409,
    );
  }

  const meta = extractYunWebhookMeta(record.decryptedPayload);
  const category = classifyYunWebhookEvent(record.decryptedPayload, meta);

  try {
    const dispatchResult = await dispatchYunWebhookEvent(
      {
        eventId: record.id,
        meta,
        payload: record.decryptedPayload,
      },
      category,
    );

    await markYunWebhookEventStatus({
      id: record.id,
      status: dispatchResult.status,
      tenantId: dispatchResult.shipment?.tenantId ?? null,
      shipmentId: dispatchResult.shipment?.id ?? null,
      shipmentCostId: dispatchResult.shipmentCost?.id ?? null,
      safeMetadata: {
        ...(dispatchResult.safeMetadata ?? {}),
        reprocessed: true,
      },
      errorMessage: null,
    });
  } catch (error) {
    await markYunWebhookEventStatus({
      id: record.id,
      status: "FAILED",
      errorMessage: getSafeErrorMessage(error),
      safeMetadata: { reprocessed: true, result: "failed" },
    });
    throw error;
  }

  return getYunWebhookEventDetail(eventRecordId);
}

export function validateYunWebhookEventListQuery(
  searchParams: URLSearchParams,
): YunWebhookEventListQuery {
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new AppError("VALIDATION_ERROR", "sortOrder must be asc or desc.", 400);
  }

  return {
    page: parsePositiveInteger(searchParams.get("page"), "page", 1),
    pageSize: parsePageSize(searchParams.get("pageSize")),
    attention: parseBoolean(searchParams.get("attention"), "attention"),
    status: parseStatus(searchParams.get("status")),
    eventCategory: parseCategory(searchParams.get("eventCategory")),
    eventType: parseOptionalFilter(searchParams.get("eventType"), "eventType"),
    tenantId: parseOptionalFilter(searchParams.get("tenantId"), "tenantId"),
    shipmentId: parseOptionalFilter(searchParams.get("shipmentId"), "shipmentId"),
    waybillNumber: parseOptionalFilter(
      searchParams.get("waybillNumber"),
      "waybillNumber",
    ),
    trackingNumber: parseOptionalFilter(
      searchParams.get("trackingNumber"),
      "trackingNumber",
    ),
    customerOrderNumber: parseOptionalFilter(
      searchParams.get("customerOrderNumber"),
      "customerOrderNumber",
    ),
    search: parseOptionalFilter(searchParams.get("search"), "search"),
    from: parseOptionalDate(searchParams.get("from"), "from"),
    to: parseOptionalDate(searchParams.get("to"), "to"),
    sortOrder,
  };
}

function resolveWebhookBaseUrl(origin: string) {
  const configured = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  const baseUrl = configured || origin;
  return baseUrl.replace(/\/+$/, "");
}

export function canReprocessYunWebhookStatus(
  status: YunWebhookEventStatus,
): boolean {
  return status === "FAILED" || status === "UNMATCHED";
}

export function maskYunWebhookSignature(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 16) return value;
  return `${value.slice(0, 6)}...${value.slice(-8)}`;
}

export function sanitizeYunWebhookPayloadForDisplay(
  value: unknown,
): Record<string, unknown> | null {
  if (!isPlainObject(value)) return null;
  return sanitizePayloadObject(value);
}

function toYunWebhookSummary(record: {
  id: string;
  eventId: string | null;
  eventType: string | null;
  eventCategory: YunWebhookEventCategory;
  dataCode: string | null;
  waybillNumber: string | null;
  trackingNumber: string | null;
  customerOrderNumber: string | null;
  tenantId: string | null;
  shipmentId: string | null;
  shipmentCostId: string | null;
  status: YunWebhookEventStatus;
  errorMessage: string | null;
  safeMetadata: Prisma.JsonValue | null;
  receivedAt: Date;
  processedAt: Date | null;
  tenant: { name: string; slug: string } | null;
  shipment: {
    status: string;
    order: { orderNumber: string | null; externalOrderId: string };
  } | null;
  shipmentCost: {
    actualFeeStatus: string;
    actualTotalFee: { toString(): string } | null;
  } | null;
}): YunWebhookEventSummary {
  return {
    id: record.id,
    eventId: record.eventId,
    eventType: record.eventType,
    eventCategory: record.eventCategory,
    dataCode: record.dataCode,
    waybillNumber: record.waybillNumber,
    trackingNumber: record.trackingNumber,
    customerOrderNumber: record.customerOrderNumber,
    tenantId: record.tenantId,
    tenantName: record.tenant?.name ?? null,
    tenantSlug: record.tenant?.slug ?? null,
    shipmentId: record.shipmentId,
    shipmentStatus: record.shipment?.status ?? null,
    shipmentOrderNumber: record.shipment?.order.orderNumber ?? null,
    shipmentExternalOrderId: record.shipment?.order.externalOrderId ?? null,
    shipmentCostId: record.shipmentCostId,
    shipmentActualFeeStatus: record.shipmentCost?.actualFeeStatus ?? null,
    shipmentActualTotalFee:
      record.shipmentCost?.actualTotalFee?.toString() ?? null,
    status: record.status,
    errorMessage: record.errorMessage,
    safeMetadata: sanitizeYunWebhookPayloadForDisplay(record.safeMetadata),
    receivedAt: record.receivedAt,
    processedAt: record.processedAt,
    canReprocess: canReprocessYunWebhookStatus(record.status),
  };
}

function parsePositiveInteger(
  value: string | null,
  label: string,
  fallback: number,
) {
  if (value === null || value === "") return fallback;
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

function parsePageSize(value: string | null) {
  const pageSize = parsePositiveInteger(value, "pageSize", DEFAULT_PAGE_SIZE);
  if (pageSize > MAX_PAGE_SIZE) {
    throw new AppError(
      "VALIDATION_ERROR",
      `pageSize must be less than or equal to ${MAX_PAGE_SIZE}.`,
      400,
    );
  }

  return pageSize;
}

function parseOptionalFilter(value: string | null, label: string) {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  if (trimmed.length > MAX_FILTER_LENGTH) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label} must be ${MAX_FILTER_LENGTH} characters or less.`,
      400,
    );
  }

  return trimmed;
}

function parseBoolean(value: string | null, label: string) {
  if (!value?.trim()) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new AppError("VALIDATION_ERROR", `${label} must be true or false.`, 400);
}

function parseStatus(value: string | null) {
  if (!value?.trim()) return undefined;
  if (STATUSES.includes(value as YunWebhookEventStatus)) {
    return value as YunWebhookEventStatus;
  }

  throw new AppError("VALIDATION_ERROR", "status is invalid.", 400);
}

function parseCategory(value: string | null) {
  if (!value?.trim()) return undefined;
  if (CATEGORIES.includes(value as YunWebhookEventCategory)) {
    return value as YunWebhookEventCategory;
  }

  throw new AppError("VALIDATION_ERROR", "eventCategory is invalid.", 400);
}

function parseOptionalDate(value: string | null, label: string) {
  if (!value?.trim()) return undefined;
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

function sanitizePayloadValue(value: unknown, key?: string): unknown {
  if (key && isSensitiveKey(key)) {
    return "[REDACTED]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_PAYLOAD_ARRAY_ITEMS).map((entry) =>
      sanitizePayloadValue(entry),
    );
  }

  if (isPlainObject(value)) {
    return sanitizePayloadObject(value);
  }

  if (typeof value === "string" && value.length > MAX_PAYLOAD_STRING_LENGTH) {
    return `${value.slice(0, MAX_PAYLOAD_STRING_LENGTH)}...`;
  }

  return value;
}

function sanitizePayloadObject(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, MAX_PAYLOAD_OBJECT_KEYS)
      .map(([key, entryValue]) => [key, sanitizePayloadValue(entryValue, key)]),
  );
}

function isSensitiveKey(key: string) {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SENSITIVE_KEY_PARTS.some((part) =>
    normalizedKey.includes(part.replace(/[^a-z0-9]/g, "")),
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
