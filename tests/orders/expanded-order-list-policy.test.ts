import assert from "node:assert/strict";

import { EXPANDED_ORDER_LIST_SHIPMENT_LIMIT } from "@/modules/order/repository";

assert.equal(
  EXPANDED_ORDER_LIST_SHIPMENT_LIMIT,
  1,
  "the always-expanded list only needs the latest shipment rendered by OrderExpandPanel",
);

console.log("expanded order list policy: ok");
