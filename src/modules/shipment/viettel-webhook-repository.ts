import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";
import type { ViettelWebhookNotification } from "@/integrations/viettel-post/webhook";
export function findViettelWebhookShipments(tenantId: string, event: ViettelWebhookNotification) {
  const identities = [event.id, event.shipmentCode].filter((id): id is string => Boolean(id));
  const identityFilters: Prisma.ShipmentWhereInput[] = identities.flatMap(id => [
    { carrierShipmentId: id },
    ...["safe", "carrier"].flatMap(scope => ["shipmentCode", "vtpOrderNumber"].map(key => ({ metadata: { path: [scope, key], equals: id } }))),
  ]);
  if (event.trackingNumber) identityFilters.push({ trackingNumber: event.trackingNumber });
  return prisma.shipment.findMany({
    where: {
      tenantId, carrierCode: "VIETTEL_POST", carrierAccountId: { not: null },
      status: { notIn: ["DRAFT", "FAILED_CREATE", "CANCELLED"] },
      ...(event.orderId ? { order: { tenantId, OR: [{ externalOrderId: event.orderId }, { orderNumber: event.orderId }] } } : {}),
      ...(identityFilters.length ? { OR: identityFilters } : {}),
    },
    select: { id: true, carrierShipmentId: true, trackingNumber: true, metadata: true },
    take: 2,
  });
}
