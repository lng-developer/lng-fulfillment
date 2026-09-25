import assert from "node:assert/strict";
import { getPortalTrackingSyncState } from "@/modules/shipment/portal-tracking-sync-state";

assert.equal(getPortalTrackingSyncState(null), null);
assert.equal(getPortalTrackingSyncState({}), null);
assert.equal(
  getPortalTrackingSyncState({ portalTrackingSync: { state: "SYNCED" } }),
  "SYNCED",
);
assert.equal(
  getPortalTrackingSyncState({ portalTrackingSync: { state: "FAILED" } }),
  "FAILED",
);

console.log("portal tracking sync state: ok");
