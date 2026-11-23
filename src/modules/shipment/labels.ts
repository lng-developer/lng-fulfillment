import { getCarrierAdapter, resolveCarrierRuntimeCredentials, mapCarrierErrorToAppError } from "@/modules/carrier";
import { AppError } from "@/shared/errors";
import { safeLabelUrl } from "@/shared/label-url";
import { getShipmentLabelRecord } from "./repository";

export async function getShipmentLabels(tenantId: string, shipmentId: string, accountId?: string) {
  const shipment = await getShipmentLabelRecord(tenantId, shipmentId);
  if (!shipment) throw new AppError("NOT_FOUND", "Shipment not found.", 404);
  const metadata = shipment.metadata as { carrier?: Record<string, unknown>; safe?: Record<string, unknown> } | null;
  const stored = { labelUrl: safeLabelUrl(shipment.labelUrl),
    mergeLabelUrl: safeLabelUrl(metadata?.carrier?.mergeLabelUrl ?? metadata?.safe?.mergeLabelUrl) };
  if (shipment.status === "CANCELLED") throw new AppError("CONFLICT", "Vận đơn đã hủy, không in lại để gửi hàng.", 409);
  if (shipment.carrierCode !== "VIETTEL_POST" || !shipment.carrierShipmentId) return { ...stored, requiresAccount: false };
  if (accountId && shipment.carrierAccountId && accountId !== shipment.carrierAccountId) {
    throw new AppError("VALIDATION_ERROR", "Chọn đúng tài khoản đã tạo vận đơn.", 400);
  }
  const carrierAccountId = shipment.carrierAccountId || accountId;
  if (!carrierAccountId) return { ...stored, requiresAccount: true };
  try {
    const credentials = await resolveCarrierRuntimeCredentials(tenantId, "VIETTEL_POST", carrierAccountId);
    const labels = await getCarrierAdapter("VIETTEL_POST").getLabel({ tenantId, shipmentId, carrierCode: "VIETTEL_POST",
      carrierShipmentId: shipment.carrierShipmentId, trackingNumber: shipment.trackingNumber, format: "PDF",
    }, { tenantId, credentials });
    return { labelUrl: safeLabelUrl(labels.labelUrl) ?? stored.labelUrl,
      mergeLabelUrl: safeLabelUrl(labels.metadata?.safe?.mergeLabelUrl), requiresAccount: false };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapCarrierErrorToAppError(error);
  }
}
