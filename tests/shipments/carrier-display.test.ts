import assert from "node:assert/strict";

import {
  getFinalMileCarrier,
  withFinalMileCarrier,
} from "@/modules/shipment/carrier-display";

const metadata = withFinalMileCarrier({ carrier: { wayBillNumber: "YUN-1" } }, " USPS ");

assert.equal(getFinalMileCarrier(metadata), "USPS");
assert.equal(getFinalMileCarrier({ carrier: { finalMileCarrier: " " } }), null);

console.log("shipment carrier display: ok");
