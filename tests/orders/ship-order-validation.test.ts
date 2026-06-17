import assert from "node:assert/strict";
import { validateShipOrderInput } from "../../src/modules/shipment";

const result = validateShipOrderInput("order-1", {
  environment: "live",
  options: {
    receiverFirstName: "Rachel",
    receiverLastName: "Cloud",
    receiverCompany: "Studio",
    receiverStreet: "1701 Example Street",
    receiverCity: "OCEANO",
    receiverState: "CA",
    receiverZip: "93445",
    receiverCountryCode: "US",
    receiverPhone: "1234567890",
    receiverEmail: "test@example.com",
  },
});

assert.equal(result.options?.receiverFirstName, "Rachel");
assert.equal(result.options?.receiverLastName, "Cloud");
assert.equal(result.options?.receiverCompany, "Studio");
assert.equal(result.options?.receiverStreet, "1701 Example Street");
assert.equal(result.options?.receiverCity, "OCEANO");
assert.equal(result.options?.receiverState, "CA");
assert.equal(result.options?.receiverZip, "93445");
assert.equal(result.options?.receiverCountryCode, "US");
assert.equal(result.options?.receiverPhone, "1234567890");
assert.equal(result.options?.receiverEmail, "test@example.com");
