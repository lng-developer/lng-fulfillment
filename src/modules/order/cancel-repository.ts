import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";

export function transitionShippingClaim(tenantId: string, orderId: string, from: OrderStatus, to: OrderStatus) {
  return prisma.order.updateMany({ where: { id: orderId, tenantId, status: from }, data: { status: to } });
}

export function findOrderForCancellation(tx: Prisma.TransactionClient, tenantId: string, orderId: string) {
  return tx.order.findFirst({
    where: { tenantId, id: orderId },
    select: { id: true, status: true, updatedAt: true, shipments: {
      where: { tenantId },
      select: { status: true, carrierShipmentId: true, trackingNumber: true, labelUrl: true, actualShipAt: true, metadata: true },
    } },
  });
}

export function cancelOrderRecord(tx: Prisma.TransactionClient, input: {
  tenantId: string; orderId: string; previousStatus: OrderStatus; updatedAt: Date;
}) {
  return tx.order.updateMany({ where: { id: input.orderId, tenantId: input.tenantId,
    status: input.previousStatus, updatedAt: input.updatedAt }, data: { status: "CANCELLED" } });
}

export async function recordOrderCancellation(tx: Prisma.TransactionClient, input: {
  tenantId: string; orderId: string; previousStatus: OrderStatus; actorUserId: string; reason: string;
}) {
  await tx.orderStatusHistory.create({ data: { tenantId: input.tenantId, orderId: input.orderId,
    status: "CANCELLED", note: input.reason, actorType: "USER", actorId: input.actorUserId } });
  await tx.auditLog.create({ data: { tenantId: input.tenantId, actorType: "USER", actorUserId: input.actorUserId,
    action: "ORDER_CANCELLED", resourceType: "Order", resourceId: input.orderId,
    metadata: { previousStatus: input.previousStatus, nextStatus: "CANCELLED", reason: input.reason } } });
}
