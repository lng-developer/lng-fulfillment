import assert from "node:assert/strict";

import { deriveActualShipEvent } from "@/modules/carrier";

assert.equal(
  deriveActualShipEvent([
    {
      eventStatus: "TRACKING_PENDING",
      eventTime: new Date("2026-09-18T17:20:33-05:00"),
      message: "Shipment information received",
    },
  ]),
  null,
);

assert.equal(
  deriveActualShipEvent([
    {
      eventStatus: "IN_TRANSIT",
      eventTime: new Date("2026-09-18T20:20:23-05:00"),
      message: "Picked up by Shipping Partner",
    },
  ])?.eventTime.toISOString(),
  "2026-09-19T01:20:23.000Z",
);

console.log("actual ship date classifier: ok");
