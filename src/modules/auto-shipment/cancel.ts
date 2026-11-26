import type { Prisma } from "@prisma/client";
import { AppError } from "@/shared/errors";
import { countProcessingJobsForOrder, stopJobsForOrderCancellation } from "./repository";

export async function stopAutoShipmentForCancellation(tx: Prisma.TransactionClient, tenantId: string, orderId: string) {
  if (await countProcessingJobsForOrder(tx, tenantId, orderId)) {
    throw new AppError("CONFLICT", "Auto-shipment đang xử lý đơn. Vui lòng chờ hoàn tất trước khi hủy.", 409);
  }
  await stopJobsForOrderCancellation(tx, tenantId, orderId);
}
