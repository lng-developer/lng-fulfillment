import assert from "node:assert/strict";
import test from "node:test";
import { getCarrierPresentation } from "@/components/shipments/carrier-presentation";

test("uses Viettel Post live confirmation copy", () => {
  assert.deepEqual(getCarrierPresentation("VIETTEL_POST"), {
    name: "Viettel Post",
    liveWarning: "You are about to create a REAL shipment in Viettel Post.",
    confirmationText: "CREATE VIETTEL POST SHIPMENT",
  });
});

test("preserves YunExpress live confirmation copy", () => {
  assert.deepEqual(getCarrierPresentation("YUNEXPRESS_OMS"), {
    name: "YunExpress OMS",
    liveWarning: "You are about to create a REAL shipment in YunExpress OMS.",
    confirmationText: "CREATE YUNEXPRESS SHIPMENT",
  });
});
