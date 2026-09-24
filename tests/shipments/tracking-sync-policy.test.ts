import assert from "node:assert/strict";

import { canSyncShipmentTracking } from "@/lib/shipment/tracking-sync-policy";

assert.equal(
  canSyncShipmentTracking("OWNER", true),
  true,
  "an owner can sync a LABEL_READY shipment when it has a carrier lookup key",
);
assert.equal(canSyncShipmentTracking("VIEWER", true), false);
assert.equal(canSyncShipmentTracking("OWNER", false), false);

console.log("shipment tracking sync policy: ok");
