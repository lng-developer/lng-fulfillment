import type { Prisma } from "@prisma/client";
import { AppError } from "@/shared/errors";
import { countProcessingJobsForOrder, stopJobsForOrderReset } from "./repository";

// Public transaction operation used by the shipment reset workflow.
export async function stopAutoShipmentForReset(tx: Prisma.TransactionClient, tenantId: string, orderId: string) {
  const running = await countProcessingJobsForOrder(tx, tenantId, orderId);
  if (running) throw new AppError("CONFLICT", "Auto-shipment đang xử lý đơn. Vui lòng chờ hoàn tất trước khi reset.", 409);
  await stopJobsForOrderReset(tx, tenantId, orderId);
}
