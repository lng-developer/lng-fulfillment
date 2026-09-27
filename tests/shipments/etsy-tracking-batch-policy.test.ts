import assert from "node:assert/strict";

import {
  ETSY_TRACKING_SYNC_BATCH_LIMIT,
  etsyTrackingSyncOrderFilter,
  getEtsyTrackingSyncCreatedAfter,
  getEtsyTrackingSyncStep,
} from "@/modules/shipment/tracking-sync-batch";

assert.equal(ETSY_TRACKING_SYNC_BATCH_LIMIT, 20);
assert.deepEqual(etsyTrackingSyncOrderFilter(), {
  sourceChannel: "ETSY",
});
assert.equal(
  getEtsyTrackingSyncCreatedAfter(new Date("2026-09-27T01:00:00.000Z")).toISOString(),
  "2026-09-20T17:00:00.000Z",
);
assert.equal(
  getEtsyTrackingSyncStep({ actualShipAt: null, portalTrackingSyncState: null }),
  "yun",
);
assert.equal(
  getEtsyTrackingSyncStep({
    actualShipAt: new Date("2026-09-25T01:00:00.000Z"),
    portalTrackingSyncState: "FAILED",
  }),
  "portal",
);
assert.equal(
  getEtsyTrackingSyncStep({
    actualShipAt: new Date("2026-09-25T01:00:00.000Z"),
    portalTrackingSyncState: "SYNCED",
  }),
  "skip",
);

console.log("etsy tracking batch policy: ok");
