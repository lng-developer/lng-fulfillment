import assert from "node:assert/strict";

import { shouldSendPortalTrackingUpdate } from "@/modules/shipment/portal-tracking-resync";

assert.equal(
  shouldSendPortalTrackingUpdate({
    trackingNumber: "9400",
    hadTrackingNumber: true,
    carrierName: null,
    actualShipAt: new Date("2026-09-25T01:00:00.000Z"),
  }),
  true,
);
assert.equal(
  shouldSendPortalTrackingUpdate({
    trackingNumber: "9400",
    hadTrackingNumber: true,
    carrierName: null,
    actualShipAt: null,
  }),
  false,
);

assert.equal(
  shouldSendPortalTrackingUpdate({
    trackingNumber: "9400",
    hadTrackingNumber: false,
    carrierName: "USPS",
    actualShipAt: null,
  }),
  true,
  "a newly created label must sync its tracking number to Portal before carrier pickup",
);

console.log("portal tracking resync policy: ok");
