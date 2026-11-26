import type { OrderStatus } from "@prisma/client";
import { AppError } from "@/shared/errors";
import { transitionShippingClaim } from "./cancel-repository";

// Public order operation: claim before the carrier call so cancellation cannot race it.
export async function claimOrderForShipping(tenantId: string, orderId: string, previousStatus: OrderStatus) {
  if (!["READY_TO_SHIP", "FULFILLED"].includes(previousStatus)) {
    throw new AppError("CONFLICT", "Đơn không ở trạng thái sẵn sàng gửi.", 409);
  }
  const changed = await transitionShippingClaim(tenantId, orderId, previousStatus, "IN_PROCESSING");
  if (changed.count !== 1) throw new AppError("CONFLICT", "Đơn đã thay đổi hoặc đang gửi. Vui lòng tải lại.", 409);
}

export async function releaseFailedShippingClaim(tenantId: string, orderId: string, previousStatus: OrderStatus) {
  await transitionShippingClaim(tenantId, orderId, "IN_PROCESSING", previousStatus);
}
