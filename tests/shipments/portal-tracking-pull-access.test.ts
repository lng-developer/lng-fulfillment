import assert from "node:assert/strict";

import { canPullTrackingFromPortal } from "@/modules/shipment/tracking-pull-access";

assert.equal(canPullTrackingFromPortal(["tracking:write"]), true);
assert.equal(canPullTrackingFromPortal(["orders:write"]), false);

console.log("portal tracking pull access: ok");
