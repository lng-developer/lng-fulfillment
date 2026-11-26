import assert from "node:assert/strict";
import { prisma } from "@/shared/db";
import { cancelFulfillmentOrder } from "@/modules/order/cancel-service";
import { claimOrderForShipping, releaseFailedShippingClaim } from "@/modules/order/shipping-claim";
import { updateOrdersToReadyToShip } from "@/modules/order/repository";
import { updateShipmentExecutionStarted } from "@/modules/shipment/repository";

async function main() {
  const original = prisma.$transaction;
  const originalUpdate = prisma.order.updateMany;
  let status = "READY_TO_SHIP";
  let shipments: Array<Record<string, unknown>> = [];
  let processing = false;
  let found = true;
  let writes: string[] = [];
  const tenant = "tenant-a";
  const check = (where: Record<string, unknown>) => assert.equal(where.tenantId, tenant);
  prisma.$transaction = (async (run: (tx: unknown) => Promise<unknown>, options: unknown) => {
    assert.deepEqual(options, { isolationLevel: "Serializable" });
    const before = status;
    const saved = [...writes];
    try {
      return await run({
        order: {
          findFirst: async ({ where }: { where: Record<string, unknown> }) => {
            check(where); return found ? { id: "order", status, updatedAt: new Date(0), shipments } : null;
          },
          updateMany: async ({ where }: { where: Record<string, unknown> }) => {
            check(where); assert.equal(where.status, status); status = "CANCELLED"; writes.push("order"); return { count: 1 };
          },
        },
        autoShipmentJob: {
          count: async ({ where }: { where: Record<string, unknown> }) => { check(where); return processing ? 1 : 0; },
          updateMany: async ({ where }: { where: Record<string, unknown> }) => { check(where); writes.push("job"); return { count: 1 }; },
        },
        orderStatusHistory: { create: async ({ data }: { data: Record<string, unknown> }) => {
          check(data); assert.equal(data.note, "Customer requested cancellation"); writes.push("history");
        } },
        auditLog: { create: async ({ data }: { data: Record<string, unknown> }) => {
          check(data); assert.equal(data.action, "ORDER_CANCELLED"); writes.push("audit");
        } },
      });
    } catch (error) { status = before; writes = saved; throw error; }
  }) as typeof prisma.$transaction;
  const cancel = () => cancelFulfillmentOrder(tenant, "order", "user", { reason: " Customer requested cancellation " });
  try {
    await assert.rejects(cancelFulfillmentOrder(tenant, "order", "user", { reason: " " }), /1–500/);
    for (const shipment of [
      { status: "TRACKING_PENDING" }, { status: "CREATING" }, { status: "EXCEPTION" },
      { status: "DRAFT", carrierShipmentId: "EPK" }, { status: "FAILED_CREATE", trackingNumber: "tracking" },
      { status: "FAILED_CREATE", metadata: { carrier: { retryable: true } } },
    ]) {
      shipments = [{ status: "CANCELLED" }, shipment];
      await assert.rejects(cancel(), /vận đơn/);
      assert.deepEqual(writes, []);
    }
    shipments = [];
    processing = true;
    await assert.rejects(cancel(), /Auto-shipment/);
    assert.equal(status, "READY_TO_SHIP"); assert.deepEqual(writes, []);
    processing = false;
    found = false;
    await assert.rejects(cancel(), /Không tìm/);
    found = true;
    status = "IN_PROCESSING";
    await assert.rejects(cancel(), /đang xử lý/);
    status = "READY_TO_SHIP";
    shipments = [{ status: "CANCELLED", carrierShipmentId: "old" }, { status: "FAILED_CREATE" }];
    assert.deepEqual(await cancel(), { orderId: "order", orderStatus: "CANCELLED" });
    assert.deepEqual(writes, ["order", "job", "history", "audit"]);
    await cancel(); assert.equal(writes.length, 4, "repeat cancel is idempotent");
    prisma.order.updateMany = (async ({ where, data }: { where: Record<string, unknown>; data: { status: string } }) => {
      check(where); if (where.status !== status) return { count: 0 };
      status = data.status; return { count: 1 };
    }) as unknown as typeof prisma.order.updateMany;
    await assert.rejects(claimOrderForShipping(tenant, "order", "READY_TO_SHIP"), /đã thay đổi/);
    status = "READY_TO_SHIP";
    await claimOrderForShipping(tenant, "order", "READY_TO_SHIP");
    await assert.rejects(cancel(), /đang xử lý/);
    await releaseFailedShippingClaim(tenant, "order", "READY_TO_SHIP");
    assert.equal(status, "READY_TO_SHIP");
    prisma.$transaction = (async (run: (tx: unknown) => Promise<unknown>) => run({
      order: {
        findMany: async () => [{ id: "order", status: "RECEIVED" }],
        updateMany: async ({ where }: { where: Record<string, unknown> }) => {
          check(where); assert.deepEqual(where.status, { in: ["RECEIVED", "ON_HOLD"] }); return { count: 0 };
        },
      },
    })) as typeof prisma.$transaction;
    await assert.rejects(updateOrdersToReadyToShip({ tenantId: tenant, orderIds: ["order"], actorType: "USER" }), /bị hủy/);
    prisma.$transaction = (async (run: (tx: unknown) => Promise<unknown>) => run({
      shipment: { findFirst: async () => ({ orderId: "order" }) },
      order: { updateMany: async ({ where }: { where: Record<string, unknown> }) => {
        check(where); assert.deepEqual(where.status, { not: "CANCELLED" }); return { count: 0 };
      } },
    })) as typeof prisma.$transaction;
    await assert.rejects(updateShipmentExecutionStarted({ tenantId: tenant, shipmentId: "draft",
      carrierCode: "VIETTEL_POST", carrierAccountId: "acc", actorType: "USER" }), /Đơn đã hủy/);
    console.log("PASS: cancellation lifecycle, all shipments, tenant scope, automation rollback, audit, idempotence, ship/cancel claim");
  } finally { prisma.$transaction = original; prisma.order.updateMany = originalUpdate; }
}
void main();
