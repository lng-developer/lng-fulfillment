import assert from "node:assert/strict";
import {
  extractSkuCode,
  resolveOrderShippingMethodFromSkuMappings,
} from "@/modules/auto-shipment";

assert.equal(extractSkuCode("J2618-NK-120626-002"), "NK");
assert.equal(extractSkuCode(" j2618-nk-120626-002 "), "NK");
assert.equal(extractSkuCode("SKU-WITHOUT-CODE"), "WITHOUT");
assert.equal(extractSkuCode("BADSKU"), null);

const singleMethodResult = resolveOrderShippingMethodFromSkuMappings({
  items: [
    { sku: "J2618-NK-120626-002" },
    { sku: "J2618-NK-120626-003" },
  ],
  mappings: [{ skuCode: "NK", shippingMethodCode: "VN-YTYCPREC" }],
});

assert.deepEqual(singleMethodResult, {
  status: "RESOLVED",
  shippingMethodCode: "VN-YTYCPREC",
  skuCodes: ["NK"],
  missingSkuCodes: [],
  conflictingMethods: [],
});

const missingResult = resolveOrderShippingMethodFromSkuMappings({
  items: [{ sku: "J2618-NK-120626-002" }, { sku: "J2618-TS-120626-002" }],
  mappings: [{ skuCode: "NK", shippingMethodCode: "VN-YTYCPREC" }],
});

assert.equal(missingResult.status, "MISSING_SKU_MAPPING");
assert.deepEqual(missingResult.skuCodes, ["NK", "TS"]);
assert.deepEqual(missingResult.missingSkuCodes, ["TS"]);

const conflictResult = resolveOrderShippingMethodFromSkuMappings({
  items: [{ sku: "J2618-NK-120626-002" }, { sku: "J2618-TS-120626-002" }],
  mappings: [
    { skuCode: "NK", shippingMethodCode: "VN-YTYCPREC" },
    { skuCode: "TS", shippingMethodCode: "VNFZZXR" },
  ],
});

assert.equal(conflictResult.status, "METHOD_CONFLICT");
assert.deepEqual(conflictResult.conflictingMethods, ["VN-YTYCPREC", "VNFZZXR"]);

console.log("auto-shipment SKU resolver tests passed");
