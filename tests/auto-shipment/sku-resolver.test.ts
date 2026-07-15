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
  destinationCountryCode: "US",
  items: [{ sku: "J2618-NK-120626-002" }, { sku: "J2618-NK-120626-003" }],
  mappings: [
    {
      destinationCountryCode: "US",
      skuCode: "NK",
      shippingMethodCode: "VN-YTYCPREC",
      eName: "Embroidered shirt",
      cName: "刺绣衬衫",
    },
    {
      destinationCountryCode: "CA",
      skuCode: "NK",
      shippingMethodCode: "VNTHZXR",
      eName: "Embroidered shirt",
      cName: "刺绣衬衫",
    },
  ],
});

assert.deepEqual(singleMethodResult, {
  status: "RESOLVED",
  shippingMethodCode: "VN-YTYCPREC",
  productDeclarations: [
    {
      skuCode: "NK",
      eName: "Embroidered shirt",
      cName: "刺绣衬衫",
    },
  ],
  skuCodes: ["NK"],
  missingSkuCodes: [],
  conflictingMethods: [],
});

const missingResult = resolveOrderShippingMethodFromSkuMappings({
  destinationCountryCode: "US",
  items: [{ sku: "J2618-NK-120626-002" }, { sku: "J2618-TS-120626-002" }],
  mappings: [
    {
      destinationCountryCode: "US",
      skuCode: "NK",
      shippingMethodCode: "VN-YTYCPREC",
      eName: "Embroidered shirt",
      cName: "刺绣衬衫",
    },
  ],
});

assert.equal(missingResult.status, "MISSING_SKU_MAPPING");
assert.deepEqual(missingResult.skuCodes, ["NK", "TS"]);
assert.deepEqual(missingResult.missingSkuCodes, ["TS"]);

const conflictResult = resolveOrderShippingMethodFromSkuMappings({
  destinationCountryCode: "US",
  items: [{ sku: "J2618-NK-120626-002" }, { sku: "J2618-TS-120626-002" }],
  mappings: [
    {
      destinationCountryCode: "US",
      skuCode: "NK",
      shippingMethodCode: "VN-YTYCPREC",
      eName: "Embroidered shirt",
      cName: "刺绣衬衫",
    },
    {
      destinationCountryCode: "US",
      skuCode: "TS",
      shippingMethodCode: "VNFZZXR",
      eName: "Paper napkins",
      cName: "餐巾纸",
    },
  ],
});

assert.equal(conflictResult.status, "METHOD_CONFLICT");
assert.deepEqual(conflictResult.conflictingMethods, ["VN-YTYCPREC", "VNFZZXR"]);

const canadaMethodResult = resolveOrderShippingMethodFromSkuMappings({
  destinationCountryCode: "CA",
  items: [{ sku: "J2618-NK-120626-002" }],
  mappings: [
    {
      destinationCountryCode: "US",
      skuCode: "NK",
      shippingMethodCode: "VN-YTYCPREC",
      eName: "Embroidered shirt",
      cName: "刺绣衬衫",
    },
    {
      destinationCountryCode: "CA",
      skuCode: "NK",
      shippingMethodCode: "VNTHZXR",
      eName: "Embroidered shirt",
      cName: "刺绣衬衫",
    },
  ],
});

assert.deepEqual(canadaMethodResult, {
  status: "RESOLVED",
  shippingMethodCode: "VNTHZXR",
  productDeclarations: [
    {
      skuCode: "NK",
      eName: "Embroidered shirt",
      cName: "刺绣衬衫",
    },
  ],
  skuCodes: ["NK"],
  missingSkuCodes: [],
  conflictingMethods: [],
});

const countryMissingResult = resolveOrderShippingMethodFromSkuMappings({
  destinationCountryCode: "CA",
  items: [{ sku: "J2618-NK-120626-002" }],
  mappings: [
    {
      destinationCountryCode: "US",
      skuCode: "NK",
      shippingMethodCode: "VN-YTYCPREC",
      eName: "Embroidered shirt",
      cName: "刺绣衬衫",
    },
  ],
});

assert.equal(countryMissingResult.status, "MISSING_SKU_MAPPING");
assert.deepEqual(countryMissingResult.missingSkuCodes, ["NK"]);

const unitedKingdomMethodResult = resolveOrderShippingMethodFromSkuMappings({
  destinationCountryCode: "United Kingdom",
  items: [{ sku: "J2618-NK-120626-002" }],
  mappings: [
    {
      destinationCountryCode: "GB",
      skuCode: "NK",
      shippingMethodCode: "VNTHZXR",
      eName: "Wooden decor",
      cName: "木制装饰品",
    },
  ],
});

assert.deepEqual(unitedKingdomMethodResult, {
  status: "RESOLVED",
  shippingMethodCode: "VNTHZXR",
  productDeclarations: [
    {
      skuCode: "NK",
      eName: "Wooden decor",
      cName: "木制装饰品",
    },
  ],
  skuCodes: ["NK"],
  missingSkuCodes: [],
  conflictingMethods: [],
});

const unitedArabEmiratesMethodResult =
  resolveOrderShippingMethodFromSkuMappings({
    destinationCountryCode: "United Arab Emirates",
    items: [{ sku: "J2618-NK-120626-002" }],
    mappings: [
      {
        destinationCountryCode: "AE",
        skuCode: "NK",
        shippingMethodCode: "VNTHZXR",
        eName: "Embroidered shirt",
        cName: "Embroidered shirt CN",
      },
    ],
  });

assert.equal(unitedArabEmiratesMethodResult.status, "RESOLVED");
assert.equal(unitedArabEmiratesMethodResult.shippingMethodCode, "VNTHZXR");

const brazilMethodResult = resolveOrderShippingMethodFromSkuMappings({
  destinationCountryCode: "Brazil",
  items: [{ sku: "J2618-NK-120626-002" }],
  mappings: [
    {
      destinationCountryCode: "BR",
      skuCode: "NK",
      shippingMethodCode: "VNTHZXR",
      eName: "Embroidered shirt",
      cName: "Embroidered shirt CN",
    },
  ],
});

assert.equal(brazilMethodResult.status, "RESOLVED");
assert.equal(brazilMethodResult.shippingMethodCode, "VNTHZXR");

console.log("auto-shipment SKU resolver tests passed");
