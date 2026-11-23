import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";
import { updateExistingPortalOrderWithItems } from "@/modules/order/repository";
import { buildRecipientRefresh } from "@/modules/order/portal-recipient";

async function main() {
  const writes: Prisma.OrderUpdateManyArgs[] = [];
  const existing = { id: "order-a", tenantId: "tenant-a", externalOrderId: "etsy-1",
    status: "READY_TO_SHIP", receivedAt: new Date(), updatedAt: new Date(), items: [],
    recipientPhone: "old-phone", recipientEmail: "old@example.com",
    recipientAddress: { line1: "Old street", line2: "Apartment 2", country: "US" } };
  const original = prisma.$transaction;
  const mockTx = { order: {
    findUnique: async ({ where }: Prisma.OrderFindUniqueArgs) => {
      assert.equal(where.tenantId_externalOrderId?.tenantId, "tenant-a");
      return existing;
    },
    updateMany: async (args: Prisma.OrderUpdateManyArgs) => { writes.push(args); return { count: 1 }; },
  } };
  prisma.$transaction = (async (callback: (tx: typeof mockTx) => Promise<unknown>) =>
    callback(mockTx)) as unknown as typeof prisma.$transaction;
  try {
    await updateExistingPortalOrderWithItems({ tenantId: "tenant-a", order: {
      externalOrderId: "etsy-1", items: [], rawPayload: {},
      recipientPhone: "new-phone", recipientEmail: " ",
      recipientAddress: { line1: "New street", line2: "" },
    } });
    assert.equal(writes.length, 1, "duplicate order must refresh recipient");
    assert.equal(writes[0].data.recipientPhone, "new-phone");
    assert.equal(writes[0].data.recipientEmail, undefined, "blank email must preserve stored email");
    assert.deepEqual(writes[0].data.recipientAddress,
      { line1: "New street", line2: "Apartment 2", country: "US" });
    assert.equal(writes[0].where?.tenantId, "tenant-a");
    assert.equal(writes[0].where?.updatedAt, existing.updatedAt);
    assert.deepEqual(writes[0].where?.status, { in: ["RECEIVED", "READY_TO_SHIP", "IN_PROCESSING", "ON_HOLD"] });
    assert.deepEqual(writes[0].where?.shipments?.every, {
      status: { in: ["DRAFT", "FAILED_CREATE", "CANCELLED"] },
      carrierShipmentId: null, trackingNumber: null, actualShipAt: null,
    });
    assert.deepEqual(buildRecipientRefresh({ recipientPhone: "", recipientAddress: {} }, null), {});
    assert.deepEqual(buildRecipientRefresh({ recipientEmail: " buyer@example.com " }, null),
      { recipientEmail: "buyer@example.com" });
    console.log("portal recipient sync: passed");
  } finally { prisma.$transaction = original; }
}
void main();
