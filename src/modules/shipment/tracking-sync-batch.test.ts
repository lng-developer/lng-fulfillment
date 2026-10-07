import assert from "node:assert/strict";
import test from "node:test";
import { isActiveViettelPostTrackingStatus, shouldEmitTrackingLifecycleEvent } from "./tracking-sync-batch";

test("emits a Viettel Post lifecycle callback only when tracking state changes", () => {
  assert.equal(
    shouldEmitTrackingLifecycleEvent({ statusChanged: false, trackingNumberChanged: false, carrierShipmentIdChanged: false, actualShipAtChanged: false }),
    false,
  );
  assert.equal(
    shouldEmitTrackingLifecycleEvent({ statusChanged: false, trackingNumberChanged: true, carrierShipmentIdChanged: false, actualShipAtChanged: false }),
    true,
  );
  assert.equal(
    shouldEmitTrackingLifecycleEvent({ statusChanged: false, trackingNumberChanged: false, carrierShipmentIdChanged: false, actualShipAtChanged: true }),
    true,
  );
});

test("keeps the Viettel Post batch limited to active shipment states", () => {
  assert.equal(isActiveViettelPostTrackingStatus("TRACKING_PENDING"), true);
  assert.equal(isActiveViettelPostTrackingStatus("IN_TRANSIT"), true);
  assert.equal(isActiveViettelPostTrackingStatus("DELIVERED"), false);
  assert.equal(isActiveViettelPostTrackingStatus("CANCELLED"), false);
});
