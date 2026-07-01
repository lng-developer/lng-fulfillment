import assert from "node:assert/strict";
import { getErrorMessage, ApiError } from "../../src/lib/api/base";

const error = new ApiError(
  502,
  "CARRIER_ERROR",
  "YunExpress OMS request was rejected.",
  {
    carrierCode: "YUNEXPRESS_OMS",
    reason: "REMOTE_REJECTED",
    retryable: false,
    safeMetadata: {
      code: "1001",
      message: "Submission failed!",
      itemRemarks: [
        "Reachable country validation failed. Please modify the destination.",
      ],
      itemCustomerOrderNumbers: ["ORDER-1"],
    },
  },
);

assert.equal(
  getErrorMessage(error),
  "Reachable country validation failed. Please modify the destination.",
);
