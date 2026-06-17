import assert from "node:assert/strict";
import { mapCreateShipmentToYunExpressPayload } from "../../src/integrations/yunexpress-oms";
import type { CreateCarrierShipmentInput } from "../../src/modules/carrier";
import type { YunExpressOmsConfig } from "../../src/integrations/yunexpress-oms";

const config: YunExpressOmsConfig = {
  baseUrl: "http://example.test",
  customerNo: "customer",
  apiSecret: "secret",
  lang: "en-US",
  liveEnabled: true,
  defaultShippingMethodCode: "VN-YTYCPREC",
  defaultSourceCode: "API",
  defaultSizeUnit: "cm",
  timeoutMs: 15000,
};

const input: CreateCarrierShipmentInput = {
  tenantId: "tenant-1",
  shipmentId: "shipment-1",
  orderId: "order-1",
  externalOrderId: "4086025010",
  orderNumber: "4086025010",
  carrierCode: "YUNEXPRESS_OMS",
  recipient: {
    name: "brianna born 🌺",
    phone: "+1 555-0100 ext. 77",
    email: "buyer@example.com",
    line1: "2209 old grove road",
    city: "linden",
    state: "NJ",
    postalCode: "07036",
    country: "United States",
  },
  destinationCountry: "United States",
  items: [
    {
      shipmentItemId: "shipment-item-1",
      orderItemId: "order-item-1",
      sku: "SKU-1",
      name: "Embroidered shirt",
      quantity: 1,
      weight: 0.1,
      declaredValue: 1,
      eName: "Embroidered shirt",
      cName: "shirt",
      currencyCode: "USD",
      invoicePart: "cotton",
      invoiceUsage: "wear",
      remark: "",
    },
  ],
};

const payload = mapCreateShipmentToYunExpressPayload(input, config);

assert.equal(payload.Receiver.FirstName, "brianna");
assert.equal(payload.Receiver.LastName, "born");
assert.equal(payload.Receiver.CountryCode, "US");
assert.equal(payload.Receiver.Phone, "15550100");
assert.ok(!JSON.stringify(payload.Receiver).includes("🌺"));
