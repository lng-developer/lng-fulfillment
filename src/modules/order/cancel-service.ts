import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { stopAutoShipmentForCancellation } from "@/modules/auto-shipment/cancel";
import { cancelOrderRecord, findOrderForCancellation, recordOrderCancellation } from "./cancel-repository";

export async function cancelFulfillmentOrder(tenantId: string, orderId: string, actorUserId: string, body: unknown) {
  const reason = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).reason : undefined;
  if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 500) {
    throw new AppError("VALIDATION_ERROR", "Nhập lý do hủy từ 1–500 ký tự.", 400);
  }
  try {
    return await prisma.$transaction(async tx => {
      const order = await findOrderForCancellation(tx, tenantId, orderId);
      if (!order) throw new AppError("NOT_FOUND", "Không tìm thấy đơn hàng.", 404);
      if (order.status === "CANCELLED") return { orderId, orderStatus: "CANCELLED" as const };
      if (order.shipments.some(s => {
        const carrier = s.metadata && typeof s.metadata === "object" && !Array.isArray(s.metadata) ? s.metadata.carrier : null;
        const retryableFailure = s.status === "FAILED_CREATE" && carrier && typeof carrier === "object" && !Array.isArray(carrier) && carrier.retryable === true;
        return s.status !== "CANCELLED" &&
          (!["DRAFT", "FAILED_CREATE"].includes(s.status) || s.carrierShipmentId || s.trackingNumber || s.labelUrl || s.actualShipAt || retryableFailure);
      })) {
        throw new AppError("CONFLICT", "Đơn còn vận đơn hiệu lực hoặc chưa xác minh. Hủy vận đơn bên hãng và đồng bộ trạng thái trước khi hủy đơn.", 409);
      }
      if (!["RECEIVED", "ON_HOLD", "READY_TO_SHIP", "FULFILLED"].includes(order.status)) {
        throw new AppError("CONFLICT", "Đơn đang xử lý hoặc đã xuất kho. Sau khi xác minh hủy vận đơn, dùng Reset để gửi lại rồi hủy đơn.", 409);
      }
      const changed = await cancelOrderRecord(tx, { tenantId, orderId, previousStatus: order.status, updatedAt: order.updatedAt });
      if (changed.count !== 1) throw new AppError("CONFLICT", "Đơn đã thay đổi. Vui lòng tải lại.", 409);
      await stopAutoShipmentForCancellation(tx, tenantId, orderId);
      await recordOrderCancellation(tx, { tenantId, orderId, previousStatus: order.status, actorUserId, reason: reason.trim() });
      return { orderId, orderStatus: "CANCELLED" as const };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      throw new AppError("CONFLICT", "Đơn đang được xử lý đồng thời. Vui lòng tải lại.", 409);
    }
    throw error;
  }
}
