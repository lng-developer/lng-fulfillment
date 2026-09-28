import assert from "node:assert/strict";
import { toTrackingCronAuditMetadata } from "@/modules/shipment/tracking-cron";

assert.deepEqual(
  toTrackingCronAuditMetadata({
    attempted: 2,
    synced: 1,
    noActualShipEvent: 1,
    failed: 0,
    portalSynced: 2,
    portalFailed: 0,
  }),
  {
    outcome: "COMPLETED",
    attempted: 2,
    synced: 1,
    noActualShipEvent: 1,
    failed: 0,
    portalSynced: 2,
    portalFailed: 0,
  },
);

console.log("tracking cron audit metadata: passed");
