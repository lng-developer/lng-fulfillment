import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

const contractPath = resolve(
  process.cwd(),
  "docs/contracts/lng-fulfillment-lifecycle.v1.openapi.yaml",
);

test("defines the portal order and lifecycle event boundary without carrier secrets", async () => {
  const contract = await readFile(contractPath, "utf8");

  assert.match(contract, /openapi: 3\.1\.0/);
  assert.match(contract, /\/api\/portal\/orders:/);
  assert.match(contract, /\/api\/portal\/orders\/\{externalOrderId\}:/);
  assert.match(contract, /LifecycleEventEnvelope:/);
  assert.match(contract, /shipment\.carrier_handoff_confirmed/);
  assert.match(contract, /X-LNG-Event-Id/);
  assert.match(contract, /X-LNG-Event-Timestamp/);
  assert.match(contract, /X-LNG-Signature/);
  assert.doesNotMatch(contract, /apiSecret|walletBalance|refreshToken/i);
});
