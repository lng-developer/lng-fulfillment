/* eslint-disable @typescript-eslint/no-require-imports -- isolate auth and carrier boundaries */
require("tsx/cjs");
const assert = require("node:assert/strict");
const Module = require("node:module");
const original = Module._load;
let context = null,
  calls = 0;
let originAllowed = true;
Module._load = function (name, parent, ...rest) {
  if (
    parent?.filename.endsWith("batch/route.ts") ||
    parent?.filename.endsWith("batch\\route.ts")
  ) {
    if (name === "@/shared/auth/context")
      return { getCurrentUserWithTenants: async () => context };
    if (name === "@/shared/security")
      return {
        assertSameOriginRequest: () => {
          if (!originAllowed)
            throw new (require("../../src/shared/errors").AppError)(
              "FORBIDDEN",
              "Origin blocked",
              403,
            );
        },
        rateLimitOrThrow: () => {},
        buildRateLimitKey: () => "",
        getClientIp: () => "",
        RATE_LIMIT_POLICIES: { expensiveRead: {} },
      };
    if (name === "@/modules/shipment/batch-labels")
      return {
        validateLabelBatch: require("../../src/modules/shipment/batch-labels")
          .validateLabelBatch,
        getVpBatchPdf: async (tenant, input) => {
          calls++;
          assert.equal(tenant, "tenant-a");
          assert.deepEqual(input.shipmentIds, ["s"]);
          return new Uint8Array([1]);
        },
      };
  }
  return original.call(this, name, parent, ...rest);
};
const { POST } = require("../../src/app/api/shipments/labels/batch/route");
const request = (body) =>
  new Request("https://example.test/api/shipments/labels/batch", {
    method: "POST",
    body: JSON.stringify(body),
  });
(async () => {
  assert.equal(
    (await POST(request({ shipmentIds: ["s"], mode: "single" }))).status,
    401,
  );
  context = {
    user: { id: "u" },
    tenants: [
      { tenantId: "tenant-a", membershipStatus: "ACTIVE", role: "VIEWER" },
    ],
  };
  assert.equal(
    (await POST(request({ shipmentIds: ["s"], mode: "single" }))).status,
    403,
  );
  assert.equal(calls, 0);
  context.tenants[0].role = "OPERATOR";
  originAllowed = false;
  assert.equal(
    (await POST(request({ shipmentIds: ["s"], mode: "single" }))).status,
    403,
  );
  originAllowed = true;
  assert.equal(
    (await POST(request({ shipmentIds: [], mode: "single" }))).status,
    400,
  );
  assert.equal(calls, 0);
  const response = await POST(
    request({ tenantId: "other-tenant", shipmentIds: ["s"], mode: "double" }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(calls, 1);
  console.log(
    "PASS batch PDF route: auth, role, same-origin, validation, server tenant and private PDF",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
