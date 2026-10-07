import assert from "node:assert/strict";
import test from "node:test";
import { toPortalOrderAcceptance } from "./service";

test("reports an accepted portal order with its fulfillment order id", () => {
  assert.deepEqual(
    toPortalOrderAcceptance({
      action: "inserted",
      order: {
        id: "fulfillment-order-1",
        tenantId: "tenant-1",
        externalOrderId: "lng-order-1",
        status: "FULFILLED",
        receivedAt: new Date("2026-10-07T00:00:00.000Z"),
      },
    }),
    {
      externalOrderId: "lng-order-1",
      outcome: "accepted",
      fulfillmentOrderId: "fulfillment-order-1",
      status: "FULFILLED",
      receivedAt: new Date("2026-10-07T00:00:00.000Z"),
    },
  );
});

test("reports an existing portal order as a duplicate", () => {
  const acceptance = toPortalOrderAcceptance({
    action: "skipped",
    order: {
      id: "fulfillment-order-1",
      tenantId: "tenant-1",
      externalOrderId: "lng-order-1",
      status: "FULFILLED",
      receivedAt: new Date("2026-10-07T00:00:00.000Z"),
    },
  });

  assert.equal(acceptance.outcome, "duplicate");
  assert.equal(acceptance.fulfillmentOrderId, "fulfillment-order-1");
});
