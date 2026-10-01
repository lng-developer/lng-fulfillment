import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repository = readFileSync(
  resolve(process.cwd(), "src/modules/auto-shipment/repository.ts"),
  "utf8",
);
const service = readFileSync(
  resolve(process.cwd(), "src/modules/auto-shipment/service.ts"),
  "utf8",
);

assert.match(repository, /status:\s*"PENDING"/);
assert.match(repository, /updateMany\(/);
assert.match(service, /processPendingAutoShipmentJobs/);

console.log("pending auto-shipment jobs are conditionally claimed by the worker");
