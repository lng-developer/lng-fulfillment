import {
  Prisma,
  type YunWebhookEventCategory,
  type YunWebhookEventStatus,
} from "@prisma/client";
import { prisma } from "@/shared/db";
import type { YunWebhookMeta } from "./extractor";
import type { YunWebhookRecordInput } from "./types";

export async function createReceivedYunWebhookEvent(input: YunWebhookRecordInput) {
  try {
    const row = await prisma.yunWebhookEvent.create({
      data: {
        eventId: input.meta.eventId,
        eventType: input.meta.eventType,
        eventCategory: input.category,
        dataCode: input.meta.dataCode,
        waybillNumber: input.meta.waybillNumber,
        trackingNumber: input.meta.trackingNumber,
        customerOrderNumber: input.meta.customerOrderNumber,
        timestampHeader: input.timestampHeader,
        signatureHeader: input.signatureHeader,
        rawEncryptedBody: toJson(input.rawEncryptedBody),
        decryptedPayload: toJson(input.decryptedPayload),
        status: "RECEIVED",
      },
      select: {
        id: true,
        eventId: true,
      },
    });

    return { duplicate: false as const, id: row.id, eventId: row.eventId };
  } catch (error) {
    if (isUniqueConstraintError(error) && input.meta.eventId) {
      return { duplicate: true as const, id: null, eventId: input.meta.eventId };
    }

    throw error;
  }
}

export async function markYunWebhookEventStatus(input: {
  id: string;
  status: YunWebhookEventStatus;
  tenantId?: string | null;
  shipmentId?: string | null;
  shipmentCostId?: string | null;
  safeMetadata?: Record<string, unknown> | null;
  errorMessage?: string | null;
}) {
  return prisma.yunWebhookEvent.update({
    where: {
      id: input.id,
    },
    data: {
      status: input.status,
      tenantId: input.tenantId,
      shipmentId: input.shipmentId,
      shipmentCostId: input.shipmentCostId,
      safeMetadata:
        input.safeMetadata === undefined ? undefined : toJson(input.safeMetadata),
      errorMessage: input.errorMessage ?? null,
      processedAt: new Date(),
    },
  });
}

export type ListYunWebhookEventRecordsQuery = {
  page: number;
  pageSize: number;
  attention?: boolean;
  status?: YunWebhookEventStatus;
  eventCategory?: YunWebhookEventCategory;
  eventType?: string;
  tenantId?: string;
  shipmentId?: string;
  waybillNumber?: string;
  trackingNumber?: string;
  customerOrderNumber?: string;
  search?: string;
  from?: Date;
  to?: Date;
  sortOrder: "asc" | "desc";
};

const webhookManagementSelect = {
  id: true,
  eventId: true,
  eventType: true,
  eventCategory: true,
  dataCode: true,
  waybillNumber: true,
  trackingNumber: true,
  customerOrderNumber: true,
  tenantId: true,
  shipmentId: true,
  shipmentCostId: true,
  status: true,
  safeMetadata: true,
  errorMessage: true,
  receivedAt: true,
  processedAt: true,
  tenant: {
    select: {
      name: true,
      slug: true,
    },
  },
  shipment: {
    select: {
      id: true,
      status: true,
      carrierShipmentId: true,
      trackingNumber: true,
      order: {
        select: {
          orderNumber: true,
          externalOrderId: true,
        },
      },
    },
  },
  shipmentCost: {
    select: {
      id: true,
      actualFeeStatus: true,
      actualTotalFee: true,
    },
  },
} satisfies Prisma.YunWebhookEventSelect;

export async function listYunWebhookEventRecords(
  query: ListYunWebhookEventRecordsQuery,
) {
  return prisma.yunWebhookEvent.findMany({
    where: buildYunWebhookEventWhere(query),
    orderBy: { receivedAt: query.sortOrder },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    select: webhookManagementSelect,
  });
}

export async function countYunWebhookEventRecords(
  query: ListYunWebhookEventRecordsQuery,
) {
  return prisma.yunWebhookEvent.count({
    where: buildYunWebhookEventWhere(query),
  });
}

export async function summarizeYunWebhookEventRecords(
  query: ListYunWebhookEventRecordsQuery,
) {
  const where = buildYunWebhookEventWhere({
    ...query,
    attention: undefined,
    status: undefined,
    eventCategory: undefined,
  });

  const [
    total,
    failed,
    unmatched,
    processed,
    tracking,
    fee,
    abnormal,
  ] = await Promise.all([
    prisma.yunWebhookEvent.count({ where }),
    prisma.yunWebhookEvent.count({ where: { ...where, status: "FAILED" } }),
    prisma.yunWebhookEvent.count({ where: { ...where, status: "UNMATCHED" } }),
    prisma.yunWebhookEvent.count({ where: { ...where, status: "PROCESSED" } }),
    prisma.yunWebhookEvent.count({
      where: { ...where, eventCategory: "TRACKING" },
    }),
    prisma.yunWebhookEvent.count({ where: { ...where, eventCategory: "FEE" } }),
    prisma.yunWebhookEvent.count({
      where: { ...where, eventCategory: "ABNORMAL" },
    }),
  ]);

  return {
    total,
    failed,
    unmatched,
    needsAttention: failed + unmatched,
    processed,
    tracking,
    fee,
    abnormal,
  };
}

export async function findYunWebhookEventRecord(eventRecordId: string) {
  return prisma.yunWebhookEvent.findUnique({
    where: { id: eventRecordId },
    select: {
      ...webhookManagementSelect,
      timestampHeader: true,
      signatureHeader: true,
      decryptedPayload: true,
    },
  });
}

export async function findYunWebhookEventForReprocess(eventRecordId: string) {
  return prisma.yunWebhookEvent.findUnique({
    where: { id: eventRecordId },
    select: {
      id: true,
      status: true,
      decryptedPayload: true,
    },
  });
}

export async function upsertYunAbnormalCase(input: {
  tenantId: string | null;
  shipmentId: string | null;
  meta: YunWebhookMeta;
  payload: unknown;
}) {
  const payload = toRecord(input.payload);
  const waybillNumber = input.meta.waybillNumber;
  const type = input.meta.type;

  if (!waybillNumber || type === null) {
    return null;
  }

  return prisma.yunAbnormalCase.upsert({
    where: {
      waybillNumber_type: {
        waybillNumber,
        type,
      },
    },
    create: {
      tenantId: input.tenantId,
      shipmentId: input.shipmentId,
      waybillNumber,
      type,
      customerOrderNumber: input.meta.customerOrderNumber,
      trackingNumber: input.meta.trackingNumber,
      processStatus: toNumber(readAny(payload, "process_status", "processStatus")),
      problemTitles: toJson(readAny(payload, "problem_title", "problemTitles")),
      funcBtnList: toJson(readAny(payload, "func_btn_list", "funcBtnList")),
      woInfo: toJson(readAny(payload, "wo_info", "woInfo")),
      operationInfo: toJson(readAny(payload, "operation_info", "operationInfo")),
      latestOpCommand: readString(readAny(payload, "latest_op_command", "latestOpCommand")),
      processDeadline: parseDate(readString(readAny(payload, "process_deadline", "processDeadline"))),
      rawPayload: toJson(input.payload),
    },
    update: {
      tenantId: input.tenantId,
      shipmentId: input.shipmentId,
      customerOrderNumber: input.meta.customerOrderNumber,
      trackingNumber: input.meta.trackingNumber,
      processStatus: toNumber(readAny(payload, "process_status", "processStatus")),
      problemTitles: toJson(readAny(payload, "problem_title", "problemTitles")),
      funcBtnList: toJson(readAny(payload, "func_btn_list", "funcBtnList")),
      woInfo: toJson(readAny(payload, "wo_info", "woInfo")),
      operationInfo: toJson(readAny(payload, "operation_info", "operationInfo")),
      latestOpCommand: readString(readAny(payload, "latest_op_command", "latestOpCommand")),
      processDeadline: parseDate(readString(readAny(payload, "process_deadline", "processDeadline"))),
      rawPayload: toJson(input.payload),
    },
    select: {
      id: true,
    },
  });
}

export function toJson(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

function buildYunWebhookEventWhere(
  query: ListYunWebhookEventRecordsQuery,
): Prisma.YunWebhookEventWhereInput {
  return {
    ...(query.attention ? { status: { in: ["FAILED", "UNMATCHED"] } } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.eventCategory ? { eventCategory: query.eventCategory } : {}),
    ...(query.eventType ? { eventType: query.eventType } : {}),
    ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    ...(query.shipmentId ? { shipmentId: query.shipmentId } : {}),
    ...(query.waybillNumber ? { waybillNumber: query.waybillNumber } : {}),
    ...(query.trackingNumber ? { trackingNumber: query.trackingNumber } : {}),
    ...(query.customerOrderNumber
      ? { customerOrderNumber: query.customerOrderNumber }
      : {}),
    ...(query.search
      ? {
          OR: [
            { eventId: { contains: query.search, mode: "insensitive" } },
            { eventType: { contains: query.search, mode: "insensitive" } },
            { waybillNumber: { contains: query.search, mode: "insensitive" } },
            { trackingNumber: { contains: query.search, mode: "insensitive" } },
            {
              customerOrderNumber: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(query.from || query.to
      ? {
          receivedAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };
}

export function getSafeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : "Unknown error";
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readAny(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }

  return null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
