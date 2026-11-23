import type { Prisma } from "@prisma/client";

export function matchesViettelShipment(
  shipment: { carrierShipmentId: string | null; trackingNumber: string | null; metadata: Prisma.JsonValue },
  remote: { id?: string; shipmentCode?: string | null; vtpOrderNumber?: string | null; trackingCode?: string | null; trackingNumber?: string | null },
) {
  const metadata = shipment.metadata as { safe?: Record<string, unknown>; carrier?: Record<string, unknown> } | null;
  const identifiers = [shipment.carrierShipmentId, metadata?.safe?.shipmentCode, metadata?.safe?.vtpOrderNumber,
    metadata?.carrier?.shipmentCode, metadata?.carrier?.vtpOrderNumber].filter(Boolean);
  return [remote.id, remote.shipmentCode, remote.vtpOrderNumber].some(id => Boolean(id) && identifiers.includes(id)) ||
    Boolean(shipment.trackingNumber && [remote.trackingCode, remote.trackingNumber].includes(shipment.trackingNumber));
}
