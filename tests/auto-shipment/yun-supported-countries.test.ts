import assert from "node:assert/strict";
import {
  YUN_SUPPORTED_COUNTRY_OPTIONS,
  formatYunSupportedCountry,
} from "@/shared/yun-supported-countries";

const expectedCodes = [
  "US",
  "PL",
  "AT",
  "DK",
  "FI",
  "IE",
  "BG",
  "CZ",
  "EE",
  "GR",
  "HR",
  "HU",
  "LT",
  "LV",
  "PT",
  "RO",
  "SK",
  "MT",
  "SI",
  "NO",
  "IL",
  "CH",
  "CY",
  "LU",
  "AU",
  "NZ",
  "SG",
  "CA",
  "MX",
  "BR",
  "CL",
  "JP",
  "HK",
  "AE",
  "SA",
  "SE",
  "BE",
  "NL",
  "ES",
  "IT",
  "FR",
  "DE",
  "GB",
] as const;

const actualCodes = YUN_SUPPORTED_COUNTRY_OPTIONS.map(
  (country) => country.code,
);

assert.equal(YUN_SUPPORTED_COUNTRY_OPTIONS.length, expectedCodes.length);
assert.deepEqual(new Set(actualCodes), new Set(expectedCodes));
assert.equal(new Set(actualCodes).size, actualCodes.length);

for (const country of YUN_SUPPORTED_COUNTRY_OPTIONS) {
  assert.match(country.code, /^[A-Z]{2}$/);
  assert.ok(country.label.trim().length > 0);
}

assert.equal(formatYunSupportedCountry("AE"), "United Arab Emirates (AE)");
assert.equal(formatYunSupportedCountry("BR"), "Brazil (BR)");
assert.equal(formatYunSupportedCountry("GB"), "United Kingdom (GB)");
assert.equal(formatYunSupportedCountry("ZZ"), "ZZ");

console.log("Yun supported country tests passed");
