import assert from "node:assert/strict";

import {
  TRACKING_SYNC_BATCH_LIMIT,
  getTrackingSyncPurchaseAfter,
  trackingSyncOrderFilter,
  classifyTrackingSyncBatchResult,
  getTrackingSyncStep,
} from "@/modules/shipment/tracking-sync-batch";

assert.equal(TRACKING_SYNC_BATCH_LIMIT, 20);
assert.equal(
  classifyTrackingSyncBatchResult({ actualShipAt: new Date("2026-09-18T20:20:23.000Z") }),
  "synced",
);
assert.equal(classifyTrackingSyncBatchResult({ actualShipAt: null }), "no_actual_ship_event");
assert.equal(
  getTrackingSyncStep({ actualShipAt: null, portalTrackingSyncState: null }),
  "yun",
);
assert.equal(
  getTrackingSyncStep({
    actualShipAt: new Date("2026-09-25T01:00:00.000Z"),
    portalTrackingSyncState: "FAILED",
  }),
  "portal",
);
assert.equal(
  getTrackingSyncStep({
    actualShipAt: new Date("2026-09-25T01:00:00.000Z"),
    portalTrackingSyncState: "SYNCED",
  }),
  "complete",
);
assert.deepEqual(trackingSyncOrderFilter(), {
  sourceChannel: "AMAZON",
});
assert.equal(
  getTrackingSyncPurchaseAfter(new Date("2026-09-24T01:00:00.000Z")).toISOString(),
  "2026-09-10T17:00:00.000Z",
);

console.log("tracking sync batch policy: ok");
