import assert from "node:assert/strict";
import test from "node:test";
import { hasCarrierAdapter } from "@/modules/carrier";
import { preflightCarrierShipmentCreation } from "@/modules/carrier/preflight";
import { validateCarrierCredentialSaveInput } from "@/modules/carrier/service";
import { CARRIER_CODES, type CreateCarrierShipmentInput } from "@/modules/carrier/types";
import {
  createViettelPostAdapter,
  normalizeStateCode,
  normalizeCountryCode,
  resolveViettelPostAuthUrl,
  resolveViettelPostOrderUrl,
  mapShipment,
} from "./adapter";

const viettelPostShipmentInput = {
  tenantId: "tenant-1",
  shipmentId: "shipment-1",
  orderId: "order-1",
  externalOrderId: "order-reference-1",
  carrierCode: "VIETTEL_POST",
  recipient: { name: "Recipient Name", phone: "0123456789", line1: "123 Main Street", country: "US" },
  items: [{ shipmentItemId: "shipment-item-1", orderItemId: "order-item-1", quantity: 1, weight: 0.25, declaredValue: 20 }],
  metadata: { weight: 0.25, length: 20, width: 15, height: 5, hsCode: "6109100004" },
} satisfies CreateCarrierShipmentInput;

test("preflights a complete Viettel Post shipment without calling the carrier", async () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
        calls += 1;
        return Response.error();
  };

  try {
    const result = await preflightCarrierShipmentCreation(
      viettelPostShipmentInput,
      { tenantId: "tenant-1" },
      { getCredentialRuntimeStatus: async () => ({ credentialSource: "tenantCredential" as const, credentialConfigured: true, liveEnabled: true, carrierAccountId: "carrier-account-1", credentialId: "credential-1", warnings: [] }) },
    );

    assert.deepEqual(result.warnings, []);
    assert.equal(result.liveEnabled, true);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("preflight reports each missing Viettel Post shipment data group", async () => {
  const result = await preflightCarrierShipmentCreation(
    {
      ...viettelPostShipmentInput,
      recipient: { name: "Recipient Name", country: "US" },
      items: [{ ...viettelPostShipmentInput.items[0], weight: 0, declaredValue: 0 }],
      metadata: { weight: 0, length: 0, width: 0, height: 0 },
    },
    { tenantId: "tenant-1" },
    { getCredentialRuntimeStatus: async () => ({ credentialSource: "missing" as const, credentialConfigured: false, liveEnabled: false, carrierAccountId: null, credentialId: null, warnings: ["Viettel Post credential is not configured."] }) },
  );

  assert.deepEqual(result.warnings, [
    "Viettel Post credential is not configured.",
    "Live Viettel Post shipment creation is disabled.",
    "Viettel Post shipment data is incomplete: weight, length, width, height, hsCode, recipient, itemWeightOrDeclaredValue.",
  ]);
});

test("registers Viettel Post as a tenant carrier", () => {
  assert.ok(CARRIER_CODES.includes("VIETTEL_POST"));
  assert.equal(hasCarrierAdapter("VIETTEL_POST"), true);
});

test("accepts encrypted Viettel Post tenant credentials", () => {
  const credential = validateCarrierCredentialSaveInput({
    credentialType: "VIETTEL_POST",
    mode: "encryptedPayload",
    credentials: {
      clientId: "client-id",
      clientSecret: "client-secret",
      authUrl: "https://auth-staging.logistek.com.vn/connect/token",
      orderUrl: "https://order-staging.logistek.com.vn",
      lineShipId: "line-ship-1",
      shipFromFirstName: "Fulfillment",
      shipFromLastName: "Team",
      shipFromPhoneNumber: "0987654321",
      shipFromAddress1: "Warehouse 1",
      shipFromCountry: "VN",
      shipFromState: "Ha Noi",
      shipFromCity: "Ha Noi",
      shipFromZipCode: "100000",
      liveEnabled: true,
    },
  });

  assert.equal(credential.credentialType, "VIETTEL_POST");
  assert.equal(credential.mode, "encryptedPayload");
});

test("rejects Viettel Post credentials with an unapproved endpoint", () => {
  assert.throws(() =>
    validateCarrierCredentialSaveInput({
      credentialType: "VIETTEL_POST", mode: "encryptedPayload",
      credentials: {
        clientId: "client-id", clientSecret: "client-secret", authUrl: "https://untrusted.example/connect/token", orderUrl: "https://order-staging.logistek.com.vn", lineShipId: "line-ship-1",
        shipFromFirstName: "Fulfillment", shipFromLastName: "Team", shipFromPhoneNumber: "0987654321", shipFromAddress1: "Warehouse 1",
        shipFromCountry: "VN", shipFromState: "Ha Noi", shipFromCity: "Ha Noi", shipFromZipCode: "100000", liveEnabled: false,
      },
    }),
  );
});

test("creates a Viettel Post shipment with a tenant OAuth credential", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const adapter = createViettelPostAdapter({
    fetchImpl: async (input, init) => {
      requests.push({ url: String(input), init });
      if (String(input) === "https://auth-staging.logistek.com.vn/connect/token") {
        return Response.json({ access_token: "test-access-token" });
      }

      return Response.json({
        data: {
          shipmentId: "vp-shipment-1",
          trackingNumber: "VP123",
          labelUrl: "https://label.example/VP123.pdf",
        },
      });
    },
  });

  const result = await adapter.createShipment(
    {
      tenantId: "tenant-1",
      shipmentId: "shipment-1",
      orderId: "order-1",
      externalOrderId: "order-reference-1",
      carrierCode: "VIETTEL_POST",
      recipient: {
        name: "Recipient Name",
        phone: "0123456789",
        line1: "123 Main Street",
        city: "Columbus",
        state: "OH",
        postalCode: "43004",
        country: "US",
      },
      items: [
        {
          shipmentItemId: "shipment-item-1",
          orderItemId: "order-item-1",
          sku: "SKU-1",
          name: "T-shirt",
          quantity: 1,
          weight: 0.25,
          declaredValue: 20,
        },
      ],
      metadata: { weight: 0.25, length: 20, width: 15, height: 5, hsCode: "6109100004" },
    },
    {
      tenantId: "tenant-1",
      credentials: {
        source: "tenantCredential",
        carrierAccountId: "carrier-account-1",
        credentialId: "credential-1",
        payload: {
          clientId: "client-id",
          clientSecret: "client-secret",
          authUrl: "https://auth-staging.logistek.com.vn/connect/token",
          orderUrl: "https://order-staging.logistek.com.vn",
          lineShipId: "line-ship-1",
          shipFromFirstName: "Fulfillment",
          shipFromLastName: "Team",
          shipFromPhoneNumber: "0987654321",
          shipFromAddress1: "Warehouse 1",
          shipFromCountry: "VN",
          shipFromState: "Ha Noi",
          shipFromCity: "Ha Noi",
          shipFromZipCode: "100000",
          liveEnabled: true,
        },
      },
    },
  );

  assert.deepEqual(result, {
    carrierCode: "VIETTEL_POST",
    carrierShipmentId: "vp-shipment-1",
    trackingNumber: "VP123",
    labelUrl: "https://label.example/VP123.pdf",
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[1]?.url, "https://order-staging.logistek.com.vn/api/partner/order/shipment");
  assert.equal(requests[1]?.init?.headers instanceof Headers ? requests[1].init.headers.get("authorization") : undefined, "Bearer test-access-token");

  await adapter.createShipment(
    {
      tenantId: "tenant-1",
      shipmentId: "shipment-2",
      orderId: "order-2",
      externalOrderId: "order-reference-2",
      carrierCode: "VIETTEL_POST",
      recipient: { name: "Recipient Name", phone: "0123456789", line1: "123 Main Street", country: "US" },
      items: [{ shipmentItemId: "shipment-item-2", orderItemId: "order-item-2", quantity: 1, weight: 0.25, declaredValue: 20 }],
      metadata: { weight: 0.25, length: 20, width: 15, height: 5, hsCode: "6109100004" },
    },
    {
      tenantId: "tenant-1",
      credentials: {
        source: "tenantCredential",
        payload: {
          clientId: "client-id", clientSecret: "client-secret", authUrl: "https://auth-staging.logistek.com.vn/connect/token", orderUrl: "https://order-staging.logistek.com.vn", lineShipId: "line-ship-1",
          shipFromFirstName: "Fulfillment", shipFromLastName: "Team", shipFromPhoneNumber: "0987654321", shipFromAddress1: "Warehouse 1",
          shipFromCountry: "VN", shipFromState: "Ha Noi", shipFromCity: "Ha Noi", shipFromZipCode: "100000", liveEnabled: true,
        },
      },
    },
  );
  assert.equal(requests.filter((request) => request.url === "https://auth-staging.logistek.com.vn/connect/token").length, 1);
});

test("reads Viettel Post shipment detail as normalized tracking", async () => {
  const adapter = createViettelPostAdapter({
    fetchImpl: async (input) => {
      if (String(input).includes("connect/token")) return Response.json({ access_token: "token" });
      return Response.json({ data: { id: "vp-shipment-1", trackingNumber: "VP123", status: 2 } });
    },
  });
  const result = await adapter.getTracking(
    { tenantId: "tenant-1", shipmentId: "shipment-1", carrierCode: "VIETTEL_POST", carrierShipmentId: "vp-shipment-1" },
    { tenantId: "tenant-1", credentials: { source: "tenantCredential", payload: {
      clientId: "client-id", clientSecret: "client-secret", authUrl: "https://auth-staging.logistek.com.vn/connect/token", orderUrl: "https://order-staging.logistek.com.vn", lineShipId: "line-ship-1",
      shipFromFirstName: "Fulfillment", shipFromLastName: "Team", shipFromPhoneNumber: "0987654321", shipFromAddress1: "Warehouse 1",
      shipFromCountry: "VN", shipFromState: "Ha Noi", shipFromCity: "Ha Noi", shipFromZipCode: "100000", liveEnabled: true,
    } } },
  );
  assert.equal(result.carrierShipmentId, "vp-shipment-1");
  assert.equal(result.trackingNumber, "VP123");
  assert.equal(result.status, "IN_TRANSIT");
});

test("normalizes US state and country codes to strict 2 characters", () => {
  assert.equal(normalizeStateCode("California", "US"), "CA");
  assert.equal(normalizeStateCode("california", "US"), "CA");
  assert.equal(normalizeStateCode("CA", "US"), "CA");
  assert.equal(normalizeStateCode("ca", "US"), "CA");
  assert.equal(normalizeStateCode("New York", "US"), "NY");
  assert.equal(normalizeStateCode("Texas", "US"), "TX");
  assert.equal(normalizeStateCode("Washington", "US"), "WA");
  assert.equal(normalizeStateCode("Hanoi", "VN"), "HA");
  assert.equal(normalizeStateCode(undefined, "US"), undefined);

  assert.equal(normalizeCountryCode("United States"), "US");
  assert.equal(normalizeCountryCode("USA"), "US");
  assert.equal(normalizeCountryCode("US"), "US");
  assert.equal(normalizeCountryCode("Vietnam"), "VN");
  assert.equal(normalizeCountryCode(undefined), "US");
});

test("resolves OAuth token URL and order gateway endpoints accurately", () => {
  assert.equal(
    resolveViettelPostAuthUrl("https://auth-global.viettelpost.vn"),
    "https://auth-global.viettelpost.vn/connect/token",
  );
  assert.equal(
    resolveViettelPostAuthUrl("https://auth-global.viettelpost.vn/connect/token"),
    "https://auth-global.viettelpost.vn/connect/token",
  );

  assert.equal(
    resolveViettelPostOrderUrl("https://api-global.viettelpost.vn", "/api/partner/order/shipment"),
    "https://api-global.viettelpost.vn/gateway/api/partner/order/shipment",
  );
  assert.equal(
    resolveViettelPostOrderUrl("https://api-global.viettelpost.vn/gateway", "/api/partner/order/shipment"),
    "https://api-global.viettelpost.vn/gateway/api/partner/order/shipment",
  );
  assert.equal(
    resolveViettelPostOrderUrl("https://order-staging.logistek.com.vn", "/api/partner/order/shipment"),
    "https://order-staging.logistek.com.vn/api/partner/order/shipment",
  );
});

test("maps payload adhering to Viettel Post API specifications", () => {
  const payload = mapShipment(
    {
      tenantId: "tenant-1",
      shipmentId: "shipment-99",
      orderId: "order-99",
      externalOrderId: "ORDER-EXT-LONG-NAME-1234567890-ABCDEF",
      carrierCode: "VIETTEL_POST",
      recipient: {
        name: "Alice Johnson",
        phone: "+1-555-0199",
        line1: "456 Market St",
        city: "San Francisco",
        state: "California",
        postalCode: "94105",
        country: "United States",
      },
      items: [
        {
          shipmentItemId: "item-1",
          orderItemId: "order-item-1",
          sku: "SHIRT-01",
          name: "Cotton Graphic T-Shirt",
          quantity: 2,
          weight: 0.3,
          declaredValue: 25.5,
        },
      ],
      metadata: {
        weight: 0.6,
        length: 25,
        width: 18,
        height: 6,
      },
    },
    {
      clientId: "test-client",
      clientSecret: "test-secret",
      authUrl: "https://auth-global.viettelpost.vn",
      orderUrl: "https://api-global.viettelpost.vn",
      lineShipId: "LS485343",
      shipFromFirstName: "Kho",
      shipFromLastName: "HN",
      shipFromPhoneNumber: "0912345678",
      shipFromAddress1: "Duy Tan",
      shipFromCountry: "Vietnam",
      shipFromState: "Hanoi",
      shipFromCity: "Hanoi",
      shipFromZipCode: "100000",
      liveEnabled: true,
    },
  );

  assert.equal(payload.lineShipId, "LS485343");
  assert.equal(payload.orderId, "ORDER-EXT-LONG-NAME-1234567890"); // sliced to 30 chars
  assert.equal(payload.orderReferenceId, "ORDER-EXT-LONG-NAME-1234567890-ABCDEF");
  assert.equal(payload.hsCode, "6109100004"); // default fallback applied
  assert.equal(payload.parcel.weight, 600); // 0.6kg -> 600g
  assert.equal(payload.parcel.weightUnit, 2); // Gram
  assert.equal(payload.parcel.lengthUnit, 1); // cm
  assert.equal(payload.shipTo.country, "US");
  assert.equal(payload.shipTo.state, "CA"); // California normalized to CA
  assert.equal(payload.shipTo.firstName, "Alice");
  assert.equal(payload.shipTo.lastName, "Johnson");
  assert.equal(payload.shipFrom.country, "VN");
  assert.equal(payload.lineItems[0]?.countryOfOrigin, "VN");
  assert.equal(payload.lineItems[0]?.price, 25.5);
});
