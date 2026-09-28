import assert from "node:assert/strict";
import { sendPortalTrackingUpdate } from "../../src/modules/portal-tracking/service";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

async function withMockFetch<T>(
  fn: (calls: FetchCall[]) => Promise<T>,
  responseBody: unknown = { ok: true },
) {
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(responseBody), { status: 200 });
  }) as typeof fetch;

  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  }
}

async function main() {
  await withMockFetch(async () => {
    process.env.PORTAL_ETSY_TRACKING_BASE_URL = "https://portal.example";

    const result = await sendPortalTrackingUpdate({
      orderId: "ETSY-ORDER-UNCONFIRMED",
      tracking: "YT2605600704990185",
      sourceChannel: "ETSY",
    });

    assert.deepEqual(
      result,
      { attempted: true, delivered: false, status: 200 },
      "a 2xx response without the Portal tracking acknowledgement must not mark the shipment synced",
    );
  });

  await withMockFetch(async (calls) => {
    process.env.PORTAL_TRACKING_UPDATE_URL = "https://portal.example/api/order/update-tracking";

    const result = await sendPortalTrackingUpdate({
      orderId: "112-4001151-4732212",
      tracking: "YT2605600704990185",
      carrier: "USPS",
      fulfillment: "LNG Group",
      sourceChannel: "AMAZON",
      actualShipAt: new Date("2026-09-19T01:20:23.000Z"),
      shipEvidence: {
        source: "carrier_event",
        message: "Picked up by Shipping Partner",
      },
    });

    assert.deepEqual(result, { attempted: true, delivered: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "https://portal.example/api/order/update-tracking");
    assert.equal(calls[0]?.init?.method, "POST");
    assert.equal(
      calls[0]?.init?.body,
      JSON.stringify({
        orderId: "112-4001151-4732212",
        tracking: "YT2605600704990185",
        carrier: "USPS",
        fulfillment: "LNG Group",
        actualShipAt: "2026-09-19T01:20:23.000Z",
        shipEvidence: {
          source: "carrier_event",
          message: "Picked up by Shipping Partner",
        },
      }),
    );
  }, {
    orderId: "112-4001151-4732212",
    tracking: "YT2605600704990185",
  });

  await withMockFetch(async (calls) => {
    process.env.PORTAL_ETSY_TRACKING_BASE_URL = "https://portal.example";
    delete process.env.PORTAL_ETSY_TRACKING_AUTH_TOKEN;

    const result = await sendPortalTrackingUpdate({
      orderId: "ETSY-ORDER-1",
      tracking: "YT2605600704990185",
      sourceChannel: "ETSY",
      actualShipAt: new Date("2026-09-19T01:20:23.000Z"),
    });

    assert.deepEqual(result, { attempted: true, delivered: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "https://portal.example/api/etsy/ETSY-ORDER-1/tracking");
    assert.equal(calls[0]?.init?.method, "PATCH");
    assert.deepEqual(calls[0]?.init?.headers, {
      "Content-Type": "application/json",
    });
    assert.equal(
      calls[0]?.init?.body,
      JSON.stringify({
        tracking: "YT2605600704990185",
        actualShipAt: "2026-09-19T01:20:23.000Z",
      }),
    );
  }, {
    orderId: "ETSY-ORDER-1",
    applied: { tracking: "YT2605600704990185" },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
