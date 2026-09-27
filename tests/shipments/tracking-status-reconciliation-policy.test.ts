import assert from "node:assert/strict";

import { shouldApplyTrackingStatusTransition } from "@/modules/shipment/tracking-status-reconciliation";

assert.equal(
  shouldApplyTrackingStatusTransition({
    currentStatus: "DELIVERED",
    carrierStatus: "IN_TRANSIT",
    carrierEventAt: new Date("2026-09-27T00:00:00.000Z"),
    currentStatusRecordedAt: new Date("2026-09-26T00:00:00.000Z"),
  }),
  true,
);

assert.equal(
  shouldApplyTrackingStatusTransition({
    currentStatus: "DELIVERED",
    carrierStatus: "IN_TRANSIT",
    carrierEventAt: new Date("2026-09-26T00:00:00.000Z"),
    currentStatusRecordedAt: new Date("2026-09-27T00:00:00.000Z"),
  }),
  false,
);

assert.equal(
  shouldApplyTrackingStatusTransition({
    currentStatus: "IN_TRANSIT",
    carrierStatus: "DELIVERED",
    carrierEventAt: new Date("2026-09-27T00:00:00.000Z"),
    currentStatusRecordedAt: new Date("2026-09-26T00:00:00.000Z"),
  }),
  true,
);

console.log("tracking status reconciliation policy: ok");
