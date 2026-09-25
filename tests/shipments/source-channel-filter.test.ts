import assert from "node:assert/strict";

import { validateShipmentListQuery } from "@/modules/shipment/validation";

const query = validateShipmentListQuery(
  new URLSearchParams({ sourceChannel: "AMAZON" }),
) as { sourceChannel?: string };

assert.equal(
  query.sourceChannel,
  "AMAZON",
  "shipment source filtering must preserve the validated marketplace channel",
);

assert.throws(
  () => validateShipmentListQuery(new URLSearchParams({ sourceChannel: "EBAY" })),
  /sourceChannel is invalid/,
);

console.log("shipment source-channel filter: ok");
