import type { Prisma } from "@prisma/client";
import type { GetCarrierTrackingResult } from "@/modules/carrier";
import { mapCarrierErrorToAppError } from "@/modules/carrier";
import { AppError } from "@/shared/errors";

export const RESETTABLE_ORDER_STATUSES = ["CANCELLED", "IN_PROCESSING", "READY_TO_SHIP", "SHIPPED"] as const;
type ResetShipment = {
  id: string; status: string; carrierCode: string | null; carrierAccountId: string | null;
  carrierShipmentId: string | null; trackingNumber: string | null; metadata: Prisma.JsonValue;
};
export type ResetVerification = { shipmentId: string; carrierAccountId: string; verifiedAt: string };

export async function verifyResetShipments(
  shipments: ResetShipment[],
  oldCarrierAccountId: string | undefined,
  lookup: (shipment: ResetShipment, accountId: string) => Promise<GetCarrierTrackingResult>,
): Promise<ResetVerification[]> {
  const verified: ResetVerification[] = [];
  for (const shipment of shipments) {
    if (shipment.status === "CREATING") throw new AppError("CONFLICT", "Vận đơn đang tạo. Vui lòng chờ hoàn tất trước khi reset.", 409);
    const metadata = shipment.metadata as Record<string, unknown> | null;
    if (shipment.status === "CANCELLED" && metadata?.resetVerifiedAt) continue;
    if (!shipment.carrierShipmentId && !shipment.trackingNumber && ["DRAFT", "FAILED_CREATE", "CANCELLED"].includes(shipment.status)) continue;
    if (!shipment.carrierShipmentId || !shipment.carrierCode) {
      throw new AppError("CONFLICT", "Thiếu mã vận đơn để xác minh hủy. Không thể reset an toàn.", 409);
    }
    if (oldCarrierAccountId && shipment.carrierAccountId && shipment.carrierAccountId !== oldCarrierAccountId) {
      throw new AppError("CONFLICT", "Tài khoản xác minh khác tài khoản đã tạo vận đơn.", 409);
    }
    const accountId = shipment.carrierAccountId || oldCarrierAccountId;
    if (!accountId) throw new AppError("VALIDATION_ERROR", "Vui lòng chọn tài khoản cũ đã tạo vận đơn để xác minh hủy.", 400);
    let result: GetCarrierTrackingResult;
    try {
      result = await lookup(shipment, accountId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw mapCarrierErrorToAppError(error);
    }
    const safe = result.metadata?.safe;
    if (result.carrierCode !== shipment.carrierCode || ![
      result.carrierShipmentId, safe?.shipmentCode, safe?.vtpOrderNumber,
    ].includes(shipment.carrierShipmentId)) {
      throw new AppError("CONFLICT", "Kết quả xác minh không khớp vận đơn cũ.", 409);
    }
    if (result.status !== "CANCELLED") {
      throw new AppError("CONFLICT", "Hãng vận chuyển chưa xác nhận hủy vận đơn. Không thể reset để gửi lại.", 409);
    }
    verified.push({ shipmentId: shipment.id, carrierAccountId: accountId, verifiedAt: new Date().toISOString() });
  }
  return verified;
}
