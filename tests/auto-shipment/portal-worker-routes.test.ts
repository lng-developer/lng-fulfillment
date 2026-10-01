import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workerRoute = resolve(process.cwd(), "src/app/api/cron/auto-shipment/route.ts");
const statusRoute = resolve(process.cwd(), "src/app/api/portal/orders/[externalOrderId]/route.ts");

assert.ok(existsSync(workerRoute));
assert.ok(existsSync(statusRoute));
assert.match(readFileSync(workerRoute, "utf8"), /assertCronRequestAuthorized/);
assert.match(readFileSync(statusRoute, "utf8"), /verifyTenantApiKeyForRequest/);

console.log("auto-shipment worker and portal status routes are protected");
