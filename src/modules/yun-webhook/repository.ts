import {
  Prisma,
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
