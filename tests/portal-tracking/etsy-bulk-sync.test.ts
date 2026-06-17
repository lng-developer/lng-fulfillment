import assert from "node:assert/strict";
import {
  buildEtsyTrackingSyncCandidates,
  parseEtsyTrackingSyncArgs,
} from "../../src/modules/portal-tracking/etsy-bulk-sync";

const candidates = buildEtsyTrackingSyncCandidates([
  {
    id: "order-1",
    tenantId: "tenant-1",
    externalOrderId: "EXT-1",
    orderNumber: "ETSY-1",
    sourceChannel: "ETSY",
    shipments: [
      {
        id: "shipment-1",
        trackingNumber: "YT123",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        createdAt: new Date("2026-06-17T09:00:00.000Z"),
      },
    ],
  },
  {
    id: "order-2",
    tenantId: "tenant-1",
    externalOrderId: "EXT-2",
    orderNumber: null,
    sourceChannel: "ETSY",
    shipments: [
      {
        id: "shipment-2",
        trackingNumber: "   ",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        createdAt: new Date("2026-06-17T09:00:00.000Z"),
      },
    ],
  },
  {
    id: "order-3",
    tenantId: "tenant-1",
    externalOrderId: "EXT-3",
    orderNumber: "AMZ-1",
    sourceChannel: "AMAZON",
    shipments: [
      {
        id: "shipment-3",
        trackingNumber: "YT999",
        updatedAt: new Date("2026-06-17T10:00:00.000Z"),
        createdAt: new Date("2026-06-17T09:00:00.000Z"),
      },
    ],
  },
  {
    id: "order-4",
    tenantId: "tenant-1",
    externalOrderId: "EXT-4",
    orderNumber: null,
    sourceChannel: "ETSY",
    shipments: [
      {
        id: "shipment-old",
        trackingNumber: "YTOLD",
        updatedAt: new Date("2026-06-17T09:00:00.000Z"),
        createdAt: new Date("2026-06-17T09:00:00.000Z"),
      },
      {
        id: "shipment-new",
        trackingNumber: "YTNEW",
        updatedAt: new Date("2026-06-17T11:00:00.000Z"),
        createdAt: new Date("2026-06-17T11:00:00.000Z"),
      },
    ],
  },
]);

assert.deepEqual(candidates, [
  {
    orderId: "ETSY-1",
    tracking: "YT123",
    fulfillmentOrderId: "order-1",
    tenantId: "tenant-1",
    shipmentId: "shipment-1",
  },
  {
    orderId: "EXT-4",
    tracking: "YTNEW",
    fulfillmentOrderId: "order-4",
    tenantId: "tenant-1",
    shipmentId: "shipment-new",
  },
]);

assert.deepEqual(
  parseEtsyTrackingSyncArgs([
    "--execute",
    "--tenantId=tenant-1",
    "--orderId",
    "ETSY-1",
    "--limit=25",
  ]),
  {
    execute: true,
    dryRun: false,
    all: false,
    tenantId: "tenant-1",
    orderId: "ETSY-1",
    limit: 25,
    help: false,
  },
);

assert.deepEqual(parseEtsyTrackingSyncArgs(["--all"]), {
  execute: false,
  dryRun: true,
  all: true,
  tenantId: undefined,
  orderId: undefined,
  limit: undefined,
  help: false,
});
