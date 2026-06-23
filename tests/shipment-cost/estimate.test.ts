import assert from "node:assert/strict";
import {
  calculateShipmentCostEstimate,
  lookupYunRate,
} from "@/modules/shipment-cost/estimate";

const estimate = calculateShipmentCostEstimate({
  actualWeightKg: 0.3,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
  countryCode: "US",
  shippingMethodCode: "VN-YTYCPREC",
});

assert.equal(estimate.volumetricWeightKg, 0.143);
assert.equal(estimate.chargeableWeightKg, 0.3);
assert.equal(estimate.estimatedFee, 212582);
assert.equal(estimate.estimatedCurrency, "VND");
assert.equal(estimate.estimatedWeightKg, 0.3);

const bulkyEstimate = calculateShipmentCostEstimate({
  actualWeightKg: 0.2,
  lengthCm: 50,
  widthCm: 40,
  heightCm: 35,
  countryCode: "US",
  shippingMethodCode: "VN-YTYCPREC",
});

assert.equal(bulkyEstimate.volumetricWeightKg, 10);
assert.equal(bulkyEstimate.chargeableWeightKg, 10);
assert.equal(bulkyEstimate.estimatedFee, 3568539);

const roundedUpRate = lookupYunRate({
  countryCode: "US",
  shippingMethodCode: "VN-YTYCPREC",
  chargeableWeightKg: 0.31,
});

assert.equal(roundedUpRate?.weightKg, 0.35);
assert.equal(roundedUpRate?.fee, 234136);

const roundedUpEstimate = calculateShipmentCostEstimate({
  actualWeightKg: 0.12,
  lengthCm: 5,
  widthCm: 5,
  heightCm: 5,
  countryCode: "US",
  shippingMethodCode: "VN-YTYCPREC",
});

assert.equal(roundedUpEstimate.chargeableWeightKg, 0.12);
assert.equal(roundedUpEstimate.estimatedWeightKg, 0.15);
assert.equal(roundedUpEstimate.estimatedFee, 162799);

const normalizedCountryAndMethodEstimate = calculateShipmentCostEstimate({
  actualWeightKg: 0.126,
  lengthCm: 5,
  widthCm: 5,
  heightCm: 5,
  countryCode: "United States",
  shippingMethodCode: "VNFZZXR",
});

assert.equal(normalizedCountryAndMethodEstimate.chargeableWeightKg, 0.126);
assert.equal(normalizedCountryAndMethodEstimate.estimatedWeightKg, 0.15);
assert.equal(normalizedCountryAndMethodEstimate.estimatedFee, 162799);

const volumetricBracketWarningEstimate = calculateShipmentCostEstimate({
  actualWeightKg: 0.149,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10.57,
  countryCode: "US",
  shippingMethodCode: "VN-YTYCPREC",
});

assert.equal(volumetricBracketWarningEstimate.volumetricWeightKg, 0.151);
assert.equal(volumetricBracketWarningEstimate.chargeableWeightKg, 0.151);
assert.equal(volumetricBracketWarningEstimate.estimatedWeightKg, 0.2);
assert.deepEqual(volumetricBracketWarningEstimate.volumetricBracketWarning, {
  actualWeightKg: 0.149,
  volumetricWeightKg: 0.151,
  actualWeightBracketKg: 0.15,
  chargeableWeightBracketKg: 0.2,
  bracketIncreaseKg: 0.05,
  estimatedPotentialSaving: 13249,
  estimatedCurrency: "VND",
});

const outOfRangeRate = lookupYunRate({
  countryCode: "US",
  shippingMethodCode: "VN-YTYCPREC",
  chargeableWeightKg: 10.01,
});

assert.equal(outOfRangeRate, null);

console.log("shipment-cost estimate tests passed");
