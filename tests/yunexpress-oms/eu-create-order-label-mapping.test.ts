import assert from "node:assert/strict";
import { mapCreateShipmentToYunExpressPayload } from "@/integrations/yunexpress-oms/mapping";

const payload = mapCreateShipmentToYunExpressPayload(
  {
    tenantId: "tenant-1",
    shipmentId: "shipment-1",
    orderId: "order-1",
    externalOrderId: "EXT-1",
    orderNumber: "ORDER-1",
    carrierCode: "YUNEXPRESS_OMS",
    carrierAccountId: null,
    destinationCountry: "DE",
    recipient: {
      name: "Anna Muller",
      phone: "0123456789",
      email: "anna@example.com",
      line1: "Hauptstrasse 1",
      city: "Berlin",
      state: "BE",
      postalCode: "10115",
      country: "DE",
    },
    items: [
      {
        shipmentItemId: "item-1",
        orderItemId: "order-item-1",
        externalItemId: "external-item-1",
        sku: "J2618-NK-120626-002",
        name: "Embroidery shirt",
        quantity: 1,
        weight: 0.1,
        declaredValue: 18.5,
        eName: "Embroidered shirt",
        cName: "Embroidered shirt CN",
        remark: "",
      },
    ],
    metadata: {
      shippingMethodCode: "EU-METHOD",
      sourceCode: "API",
      tariffPrepay: 0,
      length: 20,
      width: 15,
      height: 5,
      weight: 0.1,
      packageCount: 1,
      sizeUnits: "cm",
      applicationType: 4,
      returnOption: 0,
      insuranceOption: 0,
    },
  },
  {
    baseUrl: "http://omsapi.uat.yunexpress.com",
    customerNo: "customer",
    apiSecret: "secret",
    lang: "en-US",
    liveEnabled: true,
    defaultShippingMethodCode: "EU-METHOD",
    defaultSizeUnit: "cm",
    defaultSourceCode: "API",
    timeoutMs: 15000,
  },
);

assert.equal(payload.Receiver.CountryCode, "DE");
assert.equal(payload.TariffPrepay, 0);
assert.equal(payload.Parcels[0]?.HSCode, null);
assert.equal(payload.Parcels[0]?.CurrencyCode, "USD");
assert.equal(payload.Parcels[0]?.InvoicePart, "cotton");
assert.equal(payload.Parcels[0]?.InvoiceUsage, "wear");

console.log("YunExpress CreateOrderLabel default declaration tests passed");
