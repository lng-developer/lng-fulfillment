import assert from "node:assert/strict";
import { prisma } from "@/shared/db";
import { getOrderResetPreparation, resetCancelledOrderRecords } from "@/modules/shipment/repository";
import { claimPendingAutoShipmentJobs } from "@/modules/auto-shipment/repository";
import { matchesViettelShipment } from "@/modules/shipment/viettel-shipment-match";

async function main() {
  type Preparation = NonNullable<Awaited<ReturnType<typeof getOrderResetPreparation>>>;
  const date = new Date();
  const order = { id: "order", tenantId: "tenant", status: "READY_TO_SHIP", updatedAt: date,
    shipments: [{ id: "old", updatedAt: date, carrierShipmentId: "EPK1", trackingNumber: "TRACK1",
      labelUrl: "https://example.com/label", carrierAccountId: null, metadata: {}, actualShipAt: date }],
  } as unknown as Preparation;
  const writes: Array<{ kind: string; args: Record<string, unknown> }> = [];
  let running = 0;
  let concurrent = false;
  const write = (kind: string) => async (args: Record<string, unknown>) => {
    writes.push({ kind, args }); return { count: 1 };
  };
  const tx = {
    order: { updateMany: write("order") },
    shipment: {
      findMany: async () => [{ id: "old", updatedAt: concurrent ? new Date(0) : date }],
      update: write("shipment"), findFirst: async () => ({ ...order.shipments[0], status: "CANCELLED" }),
    },
    autoShipmentJob: { count: async () => running, updateMany: write("job") },
    orderStatusHistory: { create: write("history") }, auditLog: { create: write("audit") },
  };
  const original = prisma.$transaction;
  prisma.$transaction = (async (callback: (tx: unknown) => Promise<unknown>, options: unknown) => {
    assert.deepEqual(options, { isolationLevel: "Serializable" });
    return callback(tx);
  }) as unknown as typeof prisma.$transaction;
  const input = { tenantId: "tenant", order, actorType: "USER" as const, actorId: "user",
    verified: [{ shipmentId: "old", carrierAccountId: "acc1", verifiedAt: date.toISOString() }] };
  try {
    await resetCancelledOrderRecords(input);
    const shipmentWrite = writes.find(w => w.kind === "shipment")!.args;
    assert.deepEqual(shipmentWrite.where, { id: "old", tenantId: "tenant" });
    const data = shipmentWrite.data as Record<string, unknown>;
    for (const key of ["carrierShipmentId", "trackingNumber", "labelUrl", "actualShipAt"]) {
      assert.equal(key in data, false, `${key} must not be overwritten`);
    }
    assert.equal(data.status, "CANCELLED");
    assert.equal(data.carrierAccountId, "acc1");
    assert.equal((writes.find(w => w.kind === "job")!.args.data as Record<string, unknown>).status, "SKIPPED_DISABLED");
    assert.equal(writes.filter(w => w.kind === "audit").length, 1);
    writes.length = 0;
    running = 1;
    await assert.rejects(resetCancelledOrderRecords(input), /Auto-shipment đang xử lý/);
    assert.equal(writes.some(w => w.kind === "shipment"), false);
    running = 0; concurrent = true;
    await assert.rejects(resetCancelledOrderRecords(input), /đã thay đổi/);
    prisma.$transaction = (async (callback: (tx: unknown) => Promise<unknown>) => callback({
      autoShipmentJob: { findMany: async () => [{ id: "job", orderId: "order" }],
        updateMany: async () => ({ count: 0 }) },
    })) as unknown as typeof prisma.$transaction;
    assert.deepEqual(await claimPendingAutoShipmentJobs({ tenantId: "tenant", limit: 1 }), []);
    assert.equal(matchesViettelShipment({ carrierShipmentId: "EPK1", trackingNumber: "TRACK1", metadata: {} },
      { id: "uuid", shipmentCode: "EPK1" }), true);
    assert.equal(matchesViettelShipment({ carrierShipmentId: "EPK2", trackingNumber: "TRACK2", metadata: {} },
      { id: "uuid", shipmentCode: "EPK1", trackingNumber: "TRACK1" }), false);
    console.log("reset records, stopped-job race and shipment identity: passed");
  } finally { prisma.$transaction = original; }
}
void main();
