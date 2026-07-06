import assert from "node:assert/strict";
import {
  buildAutoShipmentShipOrderOptions,
  resolveOrderShippingMethodFromSkuMappings,
} from "@/modules/auto-shipment";
import {
  isEuCountryCode,
  normalizeSupportedEuCountryCode,
} from "@/shared/eu-countries";

assert.equal(isEuCountryCode("DE"), true);
assert.equal(isEuCountryCode("Germany"), true);
assert.equal(isEuCountryCode("US"), false);
assert.equal(normalizeSupportedEuCountryCode("France"), "FR");
assert.equal(normalizeSupportedEuCountryCode("United States"), null);

const resolution = resolveOrderShippingMethodFromSkuMappings({
  destinationCountryCode: "DE",
  items: [{ sku: "J2618-NK-120626-002" }],
  mappings: [
    {
      destinationCountryCode: "DE",
      skuCode: "NK",
      shippingMethodCode: "EU-METHOD",
      eName: "Embroidered shirt",
      cName: "Embroidered shirt CN",
    },
  ],
});

assert.equal(resolution.status, "RESOLVED");
assert.equal(resolution.productDeclarations?.[0]?.eName, "Embroidered shirt");
assert.equal(resolution.productDeclarations?.[0]?.cName, "Embroidered shirt CN");

const options = buildAutoShipmentShipOrderOptions(
  {
    id: "order-1",
    externalOrderId: "EXT-1",
    orderNumber: "ORDER-1",
    recipientName: "Anna Muller",
    recipientPhone: "",
    recipientEmail: "anna@example.com",
    recipientAddress: {
      line1: "Hauptstrasse 1",
      city: "Berlin",
      state: "BE",
      postalCode: "10115",
      country: "DE",
    },
    destinationCountry: "DE",
    destinationState: "BE",
    destinationCity: "Berlin",
    destinationPostalCode: "10115",
    items: [
      {
        id: "item-1",
        sku: "J2618-NK-120626-002",
        name: "Embroidery shirt",
        title: "Embroidery shirt",
        quantity: 1,
        weight: null,
        declaredValue: null,
        unitPrice: "18.5",
        currency: null,
      },
    ],
  },
  {
    shippingMethodCode: "EU-METHOD",
    productDeclarations: resolution.productDeclarations ?? [],
  },
);

assert.equal(options.receiverCountryCode, "DE");
assert.equal(options.tariffPrepay, 0);
assert.equal(options.parcels?.[0]?.currencyCode, "USD");
assert.equal(options.parcels?.[0]?.invoicePart, "cotton");
assert.equal(options.parcels?.[0]?.invoiceUsage, "wear");

const missingProductName = resolveOrderShippingMethodFromSkuMappings({
  destinationCountryCode: "DE",
  items: [{ sku: "J2618-NK-120626-002" }],
  mappings: [
    {
      destinationCountryCode: "DE",
      skuCode: "NK",
      shippingMethodCode: "EU-METHOD",
      eName: "Embroidered shirt",
      cName: "",
    },
  ],
});

assert.equal(missingProductName.status, "MISSING_SKU_MAPPING");
assert.deepEqual(missingProductName.missingSkuCodes, ["NK"]);

console.log("EU auto-shipment default declaration tests passed");
