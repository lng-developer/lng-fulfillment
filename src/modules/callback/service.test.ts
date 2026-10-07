import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { buildSignedLifecycleDelivery, deliverLifecycleEvent } from "./service";
import { buildLifecycleOutboxRecord } from "./repository";

test("signs an immutable lifecycle event body with its event id and timestamp", () => {
  const event = {
    eventId: "a5de6d10-483f-4c56-82d5-f2d1e8dc5e0b",
    eventType: "shipment.label_ready" as const,
    occurredAt: "2026-10-07T00:00:00.000Z",
    tenantReference: "tenant-1",
    externalOrderId: "lng-order-1",
    fulfillmentOrderId: "fulfillment-order-1",
    shipment: {
      shipmentId: "shipment-1",
      carrierCode: "VIETTEL_POST" as const,
      carrierShipmentId: "vp-shipment-1",
      trackingNumber: "VP123",
      labelUrl: "https://label.example/VP123.pdf",
      status: "LABEL_READY",
      actualShipAt: null,
    },
  };

  const delivery = buildSignedLifecycleDelivery(event, "callback-secret", 1_759_792_000);

  assert.equal(delivery.headers["x-lng-event-id"], event.eventId);
  assert.equal(delivery.headers["x-lng-event-timestamp"], "1759792000");
  assert.equal(
    delivery.headers["x-lng-signature"],
    `sha256=${createHmac("sha256", "callback-secret").update(delivery.body, "utf8").digest("hex")}`,
  );
  assert.doesNotMatch(delivery.body, /clientSecret|walletBalance|refreshToken/i);
});

test("delivers the signed lifecycle body without exposing callback secret", async () => {
  const event = {
    eventId: "31a7a5d4-a4ea-4373-92e4-62f26ca3fe04",
    eventType: "fulfillment.accepted" as const,
    occurredAt: "2026-10-07T00:00:00.000Z",
    tenantReference: "tenant-1",
    externalOrderId: "lng-order-1",
    fulfillmentOrderId: "fulfillment-order-1",
  };
  let request: Request | undefined;

  const result = await deliverLifecycleEvent(event, {
    callbackUrl: "https://lng.example/vendor-webhooks/fulfillment-platform-v2",
    secret: "callback-secret",
    timestampSeconds: 1_759_792_000,
    fetchImpl: async (input, init) => {
      request = new Request(input, init);
      return new Response(null, { status: 200 });
    },
  });

  assert.deepEqual(result, { delivered: true, statusCode: 200 });
  assert.equal(request?.headers.get("x-lng-event-id"), event.eventId);
  assert.doesNotMatch(await request!.text(), /callback-secret/);
});

test("builds a replayable outbox record with a stable event id", () => {
  const record = buildLifecycleOutboxRecord({
    eventId: "9c931770-ece2-4bf0-88cd-3fe47f25a85f",
    eventType: "fulfillment.accepted",
    tenantId: "tenant-1",
    orderId: "fulfillment-order-1",
    externalOrderId: "lng-order-1",
  });

  assert.equal(record.eventId, "9c931770-ece2-4bf0-88cd-3fe47f25a85f");
  assert.match(record.body, /"eventType":"fulfillment\.accepted"/);
  assert.doesNotMatch(record.body, /rawPayload|clientSecret|walletBalance/i);
});
