import assert from "node:assert/strict";
import { validateSkuShippingMethodMappingCreateInput } from "@/modules/auto-shipment";

const input = validateSkuShippingMethodMappingCreateInput({
  skuCode: "NK",
  destinationCountryCode: "DE",
  shippingMethodCode: "EU-METHOD",
  eName: "Embroidered shirt",
  cName: "Embroidered shirt CN",
  description: "EU embroidered shirt",
});

assert.equal(input.skuCode, "NK");
assert.equal(input.destinationCountryCode, "DE");
assert.equal(input.shippingMethodCode, "EU-METHOD");
assert.equal(input.eName, "Embroidered shirt");
assert.equal(input.cName, "Embroidered shirt CN");

console.log("SKU mapping validation tests passed");
