import { resolveYunWebhookShipment } from "@/modules/shipment";
import { upsertYunAbnormalCase } from "../repository";
import type {
  YunWebhookDispatchContext,
  YunWebhookDispatchResult,
} from "../types";

export async function handleYunAbnormalWebhook(
  context: YunWebhookDispatchContext,
): Promise<YunWebhookDispatchResult> {
  const shipment = await resolveYunWebhookShipment(context.meta);

  if (!context.meta.waybillNumber || context.meta.type === null) {
    return {
      status: "UNMATCHED",
      shipment: shipment ?? null,
      safeMetadata: { reason: "missing_waybill_or_type" },
    };
  }

  const abnormalCase = await upsertYunAbnormalCase({
    tenantId: shipment?.tenantId ?? null,
    shipmentId: shipment?.id ?? null,
    meta: context.meta,
    payload: context.payload,
  });

  return shipment
    ? {
        status: "PROCESSED",
        shipment,
        safeMetadata: {
          abnormalCaseId: abnormalCase?.id ?? null,
        },
      }
    : {
        status: "UNMATCHED",
        shipment: null,
        safeMetadata: {
          abnormalCaseId: abnormalCase?.id ?? null,
          reason: "shipment_not_found",
        },
      };
}
