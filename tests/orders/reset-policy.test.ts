import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyResetShipments } from "@/modules/shipment/reset-policy";

const shipment = { id: "s1", status: "IN_TRANSIT", carrierCode: "VIETTEL_POST",
  carrierAccountId: "acc1", carrierShipmentId: "EPK1", trackingNumber: "tracking1", metadata: null };

test("reset verifies the old account and exact shipment, even when local status is in transit", async () => {
  const result = await verifyResetShipments([shipment], undefined, async (s, account) => {
    assert.equal(s.carrierShipmentId, "EPK1");
    assert.equal(account, "acc1");
    return { carrierCode: "VIETTEL_POST", carrierShipmentId: "uuid", status: "CANCELLED", events: [],
      metadata: { safe: { shipmentCode: "EPK1" } } };
  });
  assert.equal(result[0].carrierAccountId, "acc1");
});

test("reset rejects active, unknown and cancellation-request-only carrier states", async () => {
  for (const status of ["IN_TRANSIT", "UNKNOWN", "EXCEPTION"] as const) {
    await assert.rejects(verifyResetShipments([shipment], undefined, async () => ({
      carrierCode: "VIETTEL_POST", carrierShipmentId: "EPK1", status, events: [],
    })), /chưa xác nhận hủy/);
  }
});

test("legacy shipment requires explicit old account, and lookup errors do not authorize reset", async () => {
  await assert.rejects(verifyResetShipments([{ ...shipment, carrierAccountId: null }], undefined,
    async () => { throw Error("must not call"); }), /tài khoản cũ/);
  await assert.rejects(verifyResetShipments([shipment], "acc2",
    async () => { throw Error("must not call"); }), /khác tài khoản/);
  await assert.rejects(verifyResetShipments([shipment], undefined,
    async () => { throw Error("lookup failed"); }), /lookup failed/);
});

test("unrelated cancelled shipment must not authorize reset", async () => {
  await assert.rejects(verifyResetShipments([shipment], undefined, async () => ({
    carrierCode: "VIETTEL_POST", carrierShipmentId: "other", status: "CANCELLED", events: [],
  })), /không khớp/);
});

test("in-flight creation blocks reset; unsent drafts need no carrier call", async () => {
  await assert.rejects(verifyResetShipments([{ ...shipment, status: "CREATING" }], undefined,
    async () => { throw Error("must not call"); }), /đang tạo/);
  assert.deepEqual(await verifyResetShipments([{ ...shipment, status: "DRAFT", carrierShipmentId: null,
    trackingNumber: null }], undefined, async () => { throw Error("must not call"); }), []);
});
