import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const service = readFileSync(
  resolve(process.cwd(), "src/modules/order/service.ts"),
  "utf8",
);

assert.doesNotMatch(service, /processAutoShipmentForOrder/);
assert.match(service, /queued:\s*0/);
assert.match(service, /queued\s*\+=\s*1/);

console.log("portal receive queues auto shipments without inline carrier work");
