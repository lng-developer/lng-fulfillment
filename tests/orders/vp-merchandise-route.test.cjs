/* eslint-disable @typescript-eslint/no-require-imports -- isolate auth and DB */
require("tsx/cjs");
const assert = require("node:assert/strict");
const Module = require("node:module");
const { AppError } = require("../../src/shared/errors");
const original = Module._load;
let role = "OPERATOR",
  sameOrigin = true,
  calls = [];
Module._load = function (name, parent, ...rest) {
  if (
    parent?.filename.replaceAll("\\", "/").endsWith("/vp-merchandise/route.ts")
  ) {
    if (name === "@/shared/auth/context")
      return {
        requireTenantActor: async (roles) => {
          if (!roles.includes(role))
            throw new AppError("FORBIDDEN", "forbidden", 403);
          return { tenantId: "session-tenant", actorUserId: "user" };
        },
      };
    if (name === "@/shared/security")
      return {
        assertSameOriginRequest: () => {
          if (!sameOrigin) throw new AppError("FORBIDDEN", "origin", 403);
        },
        rateLimitOrThrow: () => {},
        buildRateLimitKey: () => "test",
        RATE_LIMIT_POLICIES: { dashboardMutation: {} },
      };
    if (name === "@/modules/vp-merchandise")
      return {
        listMappings: async (...args) => { calls.push(args); return {}; },
        addMapping: async (...args) => { calls.push(args); return {}; },
        removeMapping: async (...args) => { calls.push(args); },
        lookupMappings: async (...args) => {
          calls.push(args);
          return [];
        },
        upsertMapping: async (...args) => {
          calls.push(args);
          return {};
        },
      };
  }
  return original.call(this, name, parent, ...rest);
};
const {
  GET,
  PUT, POST, DELETE,
} = require("../../src/app/api/tenants/current/vp-merchandise/route");
Module._load = original;
(async () => {
  role = "VIEWER";
  assert.equal(
    (await GET(new Request("https://app.test/api?country=US&sku=SKU"))).status,
    403,
  );
  assert.equal(calls.length, 0);
  role = "OPERATOR";
  sameOrigin = false;
  assert.equal(
    (
      await PUT(
        new Request("https://app.test/api", { method: "PUT", body: "{}" }),
      )
    ).status,
    403,
  );
  assert.equal(calls.length, 0);
  sameOrigin = true;
  assert.equal(
    (
      await GET(
        new Request("https://app.test/api?country=US&sku=SKU&tenantId=evil"),
      )
    ).status,
    200,
  );
  assert.deepEqual(calls[0], ["session-tenant", "US", ["SKU"]]);
  assert.equal(
    (
      await PUT(
        new Request("https://app.test/api", {
          method: "PUT",
          body: JSON.stringify({ tenantId: "evil" }),
        }),
      )
    ).status,
    200,
  );
  assert.equal(calls[1][0], "session-tenant");
  assert.equal(calls[1][1], "user");
  calls = [];
  await GET(new Request("https://app.test/api?manage=1&search=SKU&country=US&page=2&tenantId=evil"));
  assert.deepEqual(calls.pop(), ["session-tenant", "SKU", "US", 2]);
  for (const [method, handler] of [["POST", POST], ["DELETE", DELETE]]) {
    sameOrigin = false;
    assert.equal((await handler(new Request("https://app.test/api", {method,body:"{}"}))).status,403);
    assert.equal(calls.length,0);
    sameOrigin = true;
    await handler(new Request("https://app.test/api", {method,body:'{"tenantId":"evil"}'}));
    assert.equal(calls.pop()[0],"session-tenant");
    role = "VIEWER";
    assert.equal((await handler(new Request("https://app.test/api", {method,body:"{}"}))).status,403);
    role = "OPERATOR";
  }
  console.log(
    "PASS VP mapping routes: role, same-origin and server-derived tenant",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
