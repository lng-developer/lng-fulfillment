import type { Prisma } from "@prisma/client";
import type { PortalOrderInput } from "./types";

// Carrier-side recipient snapshots cannot be changed by a portal replay.
export const recipientRefreshWhere = {
  status: { in: ["RECEIVED", "READY_TO_SHIP", "IN_PROCESSING", "ON_HOLD"] },
  shipments: { every: {
    status: { in: ["DRAFT", "FAILED_CREATE", "CANCELLED"] },
    carrierShipmentId: null, trackingNumber: null, actualShipAt: null,
  } },
} satisfies Prisma.OrderWhereInput;

export function buildRecipientRefresh(
  input: Partial<PortalOrderInput>,
  existingAddress: Prisma.JsonValue | null,
): Prisma.OrderUpdateManyMutationInput {
  const data: Prisma.OrderUpdateManyMutationInput = {};
  for (const key of ["recipientName", "recipientPhone", "recipientEmail",
    "destinationCountry", "destinationState", "destinationCity", "destinationPostalCode"] as const) {
    const value = input[key]?.trim();
    if (value) data[key] = value;
  }
  const incoming = input.recipientAddress;
  if (incoming && typeof incoming === "object" && !Array.isArray(incoming)) {
    const nonEmpty = Object.fromEntries(Object.entries(incoming)
      .filter(([, value]) => typeof value === "string" && value.trim()));
    if (Object.keys(nonEmpty).length) {
      data.recipientAddress = {
        ...(existingAddress && typeof existingAddress === "object" && !Array.isArray(existingAddress)
          ? existingAddress : {}),
        ...nonEmpty,
      } as Prisma.InputJsonObject;
    }
  }
  return data;
}
