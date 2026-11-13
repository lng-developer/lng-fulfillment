import assert from "node:assert/strict";

import {
  getFinalMileCarrier,
  withCarrierSafeMetadata,
  withFinalMileCarrier,
} from "@/modules/shipment/carrier-display";

const metadata = withFinalMileCarrier({ carrier: { wayBillNumber: "YUN-1" } }, " USPS ");

assert.equal(getFinalMileCarrier(metadata), "USPS");
assert.equal(getFinalMileCarrier({ carrier: { finalMileCarrier: " " } }), null);

const withCarrierMeta = withCarrierSafeMetadata(metadata, {
  vtpOrderNumber: "EPK5915081072",
  shipmentCode: "SH-123",
});
assert.deepEqual(withCarrierMeta, {
  carrier: {
    wayBillNumber: "YUN-1",
    finalMileCarrier: "USPS",
    vtpOrderNumber: "EPK5915081072",
    shipmentCode: "SH-123",
  },
});

console.log("shipment carrier display: ok");
