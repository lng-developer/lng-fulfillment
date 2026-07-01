import assert from "node:assert/strict";
import { buildShipmentFailureSummary } from "../../src/modules/order/shipment-failure";

const summary = buildShipmentFailureSummary({
  carrier: {
    carrierCode: "YUNEXPRESS_OMS",
    errorCode: "CARRIER_ERROR",
    message: "YunExpress OMS request was rejected.",
    safeMetadata: {
      code: "1001",
      message: "Submission failed!",
      itemRemarks: [
        "Reachable country validation failed. Please modify the destination.",
      ],
      rawPayload: { secret: "do-not-render" },
    },
  },
});

assert.deepEqual(summary, {
  carrierCode: "YUNEXPRESS_OMS",
  code: "1001",
  message: "Reachable country validation failed. Please modify the destination.",
  remarks: ["Reachable country validation failed. Please modify the destination."],
});

assert.equal(JSON.stringify(summary).includes("rawPayload"), false);
