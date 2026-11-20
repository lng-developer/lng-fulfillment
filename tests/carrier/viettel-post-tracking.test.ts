import assert from "node:assert/strict";
import { normalizeViettelPostTrackingNumber } from "../../src/integrations/viettel-post/tracking";

// Test 1: Full 34-character barcode with 9-digit ZIP (ZIP+4)
assert.equal(
  normalizeViettelPostTrackingNumber("4207261630339214490374008505076419"),
  "9214490374008505076419",
  "Should extract 22-digit USPS tracking from 34-char barcode string",
);

// Test 2: 30-character barcode with 5-digit ZIP
assert.equal(
  normalizeViettelPostTrackingNumber("420726169214490374008505076419"),
  "9214490374008505076419",
  "Should extract 22-digit USPS tracking from 30-char barcode string",
);

// Test 3: Already clean 22-digit tracking number
assert.equal(
  normalizeViettelPostTrackingNumber("9214490374008505076419"),
  "9214490374008505076419",
  "Should keep clean 22-digit tracking unchanged",
);

// Test 4: Trimming whitespace
assert.equal(
  normalizeViettelPostTrackingNumber("   4207261630339214490374008505076419   "),
  "9214490374008505076419",
  "Should trim whitespace and extract 22-digit USPS tracking",
);

// Test 5: Standard alphanumeric tracking (e.g. Express or international)
assert.equal(
  normalizeViettelPostTrackingNumber("EA123456789VN"),
  "EA123456789VN",
  "Should keep international tracking unchanged",
);

// Test 6: Empty, null, or undefined values
assert.equal(normalizeViettelPostTrackingNumber(""), null);
assert.equal(normalizeViettelPostTrackingNumber("   "), null);
assert.equal(normalizeViettelPostTrackingNumber(null), null);
assert.equal(normalizeViettelPostTrackingNumber(undefined), null);

// Test 7: Internal Viettel Post order code (e.g. EPK...) should not be treated as a tracking number
assert.equal(
  normalizeViettelPostTrackingNumber("EPK1125036242"),
  null,
  "Should reject EPK internal shipment code as tracking number",
);

console.log("viettel-post tracking normalization tests: ALL PASSED");
