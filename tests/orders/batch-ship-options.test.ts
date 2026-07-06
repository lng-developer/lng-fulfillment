import assert from "node:assert/strict";
import {
  buildBatchOptionsByOrderId,
  hasMissingBatchIossNumber,
} from "../../src/components/orders/BatchShipModal";
import {
  buildShipmentPreview,
  buildShipOptions,
} from "../../src/components/orders/ShipOrderModal";
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
  receiverValues: {
    firstName: "Rachel",
    lastName: "Cloud",
    company: "Studio",
    countryCode: "US",
    street: "1701 Example Street",
    city: "OCEANO",
    state: "CA",
    zip: "93445",
    phone: "1234567890",
    email: "test@example.com",
  },
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
  useIoss: true,
  iossNumber: "IOSS261841515582105977183",
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
assert.equal(result[order.id]?.receiverFirstName, "Rachel");
assert.equal(result[order.id]?.receiverLastName, "Cloud");
assert.equal(result[order.id]?.receiverCompany, "Studio");
assert.equal(result[order.id]?.receiverStreet, "1701 Example Street");
assert.equal(result[order.id]?.receiverCity, "OCEANO");
assert.equal(result[order.id]?.receiverState, "CA");
assert.equal(result[order.id]?.receiverZip, "93445");
assert.equal(result[order.id]?.receiverCountryCode, "US");
assert.equal(result[order.id]?.receiverPhone, "1234567890");
assert.equal(result[order.id]?.receiverEmail, "test@example.com");
assert.equal(result[order.id]?.iossNumber, "IOSS261841515582105977183");
assert.equal(result[order.id]?.parcels?.[0]?.eName, "Wooden decor");

const euAmazonOrder: OrderListItem = {
  ...order,
  id: "order-eu-amz",
  sourceChannel: "amazon",
  destinationCountry: "FR",
};
const euPreview = buildShipmentPreview(euAmazonOrder, null, "IOSS-DEFAULT");

assert.equal(euPreview.iossEuDetected, true);
assert.equal(euPreview.useIoss, true);
assert.equal(euPreview.iossNumber, "IOSS-DEFAULT");
assert.equal(
  hasMissingBatchIossNumber([euAmazonOrder], {}, {}, ""),
  true,
);
assert.equal(
  hasMissingBatchIossNumber([euAmazonOrder], {}, {}, "IOSS-DEFAULT"),
  false,
);

const usPreview = buildShipmentPreview(order, null, "IOSS-DEFAULT");
assert.equal(usPreview.iossEuDetected, false);
assert.equal(usPreview.useIoss, false);
assert.equal(usPreview.iossNumber, "IOSS-DEFAULT");
assert.equal(
  hasMissingBatchIossNumber(
    [order],
    {},
    { [order.id]: { ...edit, useIoss: true, iossNumber: "" } },
    "IOSS-DEFAULT",
  ),
  true,
);

const noIossOptions = buildShipOptions(
  usPreview,
  usPreview.shippingMethodCode,
  usPreview.receiver,
  usPreview.package,
  false,
  "IOSS-DEFAULT",
  usPreview.parcels,
);
assert.equal(noIossOptions.iossNumber, undefined);

const manualIossOptions = buildShipOptions(
  usPreview,
  usPreview.shippingMethodCode,
  usPreview.receiver,
  usPreview.package,
  true,
  "IOSS-MANUAL",
  usPreview.parcels,
);
assert.equal(manualIossOptions.iossNumber, "IOSS-MANUAL");
assert.equal(result[order.id]?.parcels?.[0]?.cName, "木制装饰品");
