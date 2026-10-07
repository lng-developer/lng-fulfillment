import assert from "node:assert/strict";
import test from "node:test";
import { validateExecuteShipmentInput } from "./validation";

test("keeps operational Viettel Post data with the execute request", () => {
  const result = validateExecuteShipmentInput({
      carrierCode: "VIETTEL_POST",
      carrierAccountId: null,
      options: {
        weight: 0.25,
        length: 20,
        width: 15,
        height: 5,
        parcels: [{ orderItemId: "item-1", unitWeight: 0.25, unitPrice: 20 }],
      },
    });

  assert.equal(result.options?.weight, 0.25);
  assert.equal(result.options?.length, 20);
  assert.equal(result.options?.height, 5);
  assert.deepEqual(result.options?.parcels?.[0], {
    orderItemId: "item-1",
    sku: undefined,
    eName: undefined,
    cName: undefined,
    unitWeight: 0.25,
    unitPrice: 20,
    currencyCode: undefined,
    invoicePart: undefined,
    invoiceUsage: undefined,
    remark: undefined,
  });
});
