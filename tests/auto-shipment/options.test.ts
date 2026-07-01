import assert from "node:assert/strict";
import { buildAutoShipmentShipOrderOptions } from "@/modules/auto-shipment";

const options = buildAutoShipmentShipOrderOptions(
  {
    id: "order-1",
    externalOrderId: "EXT-1",
    orderNumber: "ORDER-1",
    recipientName: "Rachel Cloud",
    recipientPhone: null,
    recipientEmail: "rachel@example.com",
    recipientAddress: {
      line1: "1701 Example Street",
      city: "OCEANO",
      state: "CA",
      postalCode: "93445",
      country: "US",
    },
    destinationCountry: "US",
    destinationState: "CA",
    destinationCity: "OCEANO",
    destinationPostalCode: "93445",
    items: [
      {
        id: "item-1",
        sku: "J2618-NK-120626-002",
        name: "Personalized product",
        title: "Personalized product",
        quantity: 2,
        weight: null,
        declaredValue: null,
        unitPrice: "12.5",
        currency: "USD",
      },
    ],
  },
  {
    shippingMethodCode: "VN-YTYCPREC",
    productDeclarations: [
      {
        skuCode: "NK",
        eName: "Embroidered shirt",
        cName: "刺绣衬衫",
      },
    ],
  },
);

assert.equal(options.shippingMethodCode, "VN-YTYCPREC");
assert.equal(options.sourceCode, "API");
assert.equal(options.receiverFirstName, "Rachel");
assert.equal(options.receiverLastName, "Cloud");
assert.equal(options.receiverCountryCode, "US");
assert.equal(options.receiverStreet, "1701 Example Street");
assert.equal(options.receiverCity, "OCEANO");
assert.equal(options.receiverState, "CA");
assert.equal(options.receiverZip, "93445");
assert.equal(options.receiverPhone, "0123456789");
assert.equal(options.receiverEmail, "rachel@example.com");
assert.equal(options.weight, 0.2);
assert.equal(options.length, 20);
assert.equal(options.width, 15);
assert.equal(options.height, 5);
assert.equal(options.sizeUnits, "cm");
assert.equal(options.packageCount, 1);
assert.equal(options.applicationType, 4);
assert.equal(options.returnOption, 0);
assert.equal(options.tariffPrepay, 0);
assert.equal(options.insuranceOption, 0);
assert.equal(options.parcels?.[0]?.orderItemId, "item-1");
assert.equal(options.parcels?.[0]?.sku, "J2618-NK-120626-002");
assert.equal(options.parcels?.[0]?.eName, "Embroidered shirt");
assert.equal(options.parcels?.[0]?.cName, "刺绣衬衫");
assert.equal(options.parcels?.[0]?.unitPrice, 12.5);
assert.equal(options.parcels?.[0]?.unitWeight, 0.1);
assert.equal(options.parcels?.[0]?.currencyCode, "USD");
assert.equal(options.parcels?.[0]?.invoicePart, "cotton");
assert.equal(options.parcels?.[0]?.invoiceUsage, "wear");
assert.equal(options.parcels?.[0]?.remark, "");

console.log("auto-shipment options tests passed");
