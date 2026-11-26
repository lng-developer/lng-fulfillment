import type { Prisma } from "@prisma/client";

export const FULFILLMENT_SEARCH_PLACEHOLDER = "Tìm mã đơn, mã vận đơn, tracking, người nhận...";

export function normalizeFulfillmentSearch(value?: string) {
  return value?.trim().replace(/^#\s*/, "").trim() || undefined;
}

export function orderSearchClauses(search: string): Prisma.OrderWhereInput[] {
  const text = { contains: search, mode: "insensitive" as const };
  return [{ externalOrderId: text }, { orderNumber: text }, { recipientName: text }];
}

export function shipmentSearchClauses(search: string): Prisma.ShipmentWhereInput[] {
  const text = { contains: search, mode: "insensitive" as const };
  return [
    { trackingNumber: text },
    { carrierShipmentId: text },
    // Creation may store the UUID as carrierShipmentId and the printable VP code in metadata.
    ...["safe", "carrier"].flatMap((section) =>
      ["shipmentCode", "vtpOrderNumber"].map((field) => ({
        metadata: { path: [section, field], string_contains: search, mode: "insensitive" as const },
      })),
    ),
  ];
}
