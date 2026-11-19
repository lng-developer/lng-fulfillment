import assert from "node:assert/strict";
import test from "node:test";
import { validateShipOrdersBatchInput } from "../../src/modules/shipment";
import { AppError } from "../../src/shared/errors";

test("validateShipOrdersBatchInput accepts valid batch and defaults carrierCode to VIETTEL_POST", () => {
  const result = validateShipOrdersBatchInput({
    orderIds: ["order-1", "order-2"],
    environment: "live",
    carrierAccountId: "acc-123",
  });

  assert.deepEqual(result.orderIds, ["order-1", "order-2"]);
  assert.equal(result.environment, "live");
  assert.equal(result.carrierCode, "VIETTEL_POST");
  assert.equal(result.carrierAccountId, "acc-123");
});

test("validateShipOrdersBatchInput rejects more than 10 orders per batch", () => {
  const orderIds = Array.from({ length: 11 }, (_, i) => `order-${i + 1}`);

  assert.throws(
    () => {
      validateShipOrdersBatchInput({
        orderIds,
        environment: "live",
      });
    },
    (err: unknown) => {
      assert(err instanceof AppError);
      assert.equal(err.code, "VALIDATION_ERROR");
      return true;
    },
  );
});

test("validateShipOrdersBatchInput rejects duplicate orderIds", () => {
  assert.throws(
    () => {
      validateShipOrdersBatchInput({
        orderIds: ["order-1", "order-1"],
        environment: "live",
      });
    },
    (err: unknown) => {
      assert(err instanceof AppError);
      assert.equal(err.code, "VALIDATION_ERROR");
      assert.match(err.message, /Duplicate orderId/i);
      return true;
    },
  );
});

test("validateShipOrdersBatchInput rejects empty orderIds", () => {
  assert.throws(
    () => {
      validateShipOrdersBatchInput({
        orderIds: [],
        environment: "live",
      });
    },
    (err: unknown) => {
      assert(err instanceof AppError);
      assert.equal(err.code, "VALIDATION_ERROR");
      return true;
    },
  );
});
