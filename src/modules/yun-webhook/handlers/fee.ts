import { applyYunWebhookActualFeeUpdate } from "@/modules/shipment-cost/service";
import { resolveYunWebhookShipment } from "@/modules/shipment";
import { AppError } from "@/shared/errors";
import type {
  YunWebhookDispatchContext,
  YunWebhookDispatchResult,
} from "../types";

export async function handleYunFeeWebhook(
  context: YunWebhookDispatchContext,
): Promise<YunWebhookDispatchResult> {
  const shipment = await resolveYunWebhookShipment(context.meta);

  if (!shipment) {
    return {
      status: "UNMATCHED",
      shipment: null,
      safeMetadata: { reason: "shipment_not_found" },
    };
  }

  try {
    const shipmentCost = await applyYunWebhookActualFeeUpdate({
      tenantId: shipment.tenantId,
      shipmentId: shipment.id,
      payload: context.payload,
    });

    return {
      status: "PROCESSED",
      shipment,
      shipmentCost,
      safeMetadata: {
        actualFeeStatus: shipmentCost.actualFeeStatus,
        actualTotalFeePresent: Boolean(shipmentCost.actualTotalFee),
      },
    };
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return {
        status: "UNMATCHED",
        shipment,
        safeMetadata: { reason: "shipment_cost_not_found" },
      };
    }

    throw error;
  }
}
