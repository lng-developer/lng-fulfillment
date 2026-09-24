import assert from "node:assert/strict";

import {
  TRACKING_SYNC_BATCH_LIMIT,
  classifyTrackingSyncBatchResult,
} from "@/modules/shipment/tracking-sync-batch";

assert.equal(TRACKING_SYNC_BATCH_LIMIT, 20);
assert.equal(
  classifyTrackingSyncBatchResult({ actualShipAt: new Date("2026-09-18T20:20:23.000Z") }),
  "synced",
);
assert.equal(classifyTrackingSyncBatchResult({ actualShipAt: null }), "no_actual_ship_event");

console.log("tracking sync batch policy: ok");
