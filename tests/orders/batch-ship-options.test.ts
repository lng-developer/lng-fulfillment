import assert from "node:assert/strict";
import { buildBatchOptionsByOrderId } from "../../src/components/orders/BatchShipModal";
import type { OrderListItem } from "../../src/types/orders";
import type { BatchOrderShipEditState } from "../../src/components/orders/BatchShipModal";

const order: OrderListItem = {
  id: "order-1",
  externalOrderId: "EXT-1",
  orderNumber: "ORDER-1",
  source: "portal",
  sourceChannel: "amazon",
  shopName: null,
  marketplace: null,
  status: "READY_TO_SHIP",
  recipientName: "Test Buyer",
  destinationCountry: "US",
  destinationState: "CA",
  destinationCity: "OCEANO",
  destinationPostalCode: "93445",
  shippingService: null,
  shippingType: "Standard",
  purchaseAt: null,
  paidAt: null,
  receivedAt: "2026-06-17T00:00:00.000Z",
  createdAt: "2026-06-17T00:00:00.000Z",
  updatedAt: "2026-06-17T00:00:00.000Z",
  itemCount: 1,
  firstSku: "SKU-1",
  firstItemName: "Embroidered shirt",
  totalQuantity: 1,
  latestShipmentStatus: null,
  latestTrackingNumber: null,
  latestLabelUrl: null,
};

const edit: BatchOrderShipEditState = {
  shippingMethodCode: "VNFZZXR",
  packageValues: {
    weight: 0.25,
    length: 21,
    width: 16,
    height: 6,
    sizeUnits: "cm",
    packageCount: 1,
    applicationType: 4,
    returnOption: 0,
    tariffPrepay: 0,
    insuranceOption: 0,
  },
  parcels: [
    {
      sku: "SKU-1",
      eName: "Wooden decor",
      cName: "木制装饰品",
      quantity: 1,
      unitPrice: 12,
      unitWeight: 0.25,
      currencyCode: "USD",
      invoicePart: "wood",
      invoiceUsage: "decor",
      remark: "",
    },
  ],
};

const result = buildBatchOptionsByOrderId([order], {}, { [order.id]: edit });

assert.equal(result[order.id]?.shippingMethodCode, "VNFZZXR");
assert.equal(result[order.id]?.weight, 0.25);
assert.equal(result[order.id]?.length, 21);
assert.equal(result[order.id]?.parcels?.[0]?.eName, "Wooden decor");
assert.equal(result[order.id]?.parcels?.[0]?.cName, "木制装饰品");
