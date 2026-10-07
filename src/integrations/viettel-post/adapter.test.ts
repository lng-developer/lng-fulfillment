import assert from "node:assert/strict";
import test from "node:test";
import { hasCarrierAdapter } from "@/modules/carrier";
import { validateCarrierCredentialSaveInput } from "@/modules/carrier/service";
import { CARRIER_CODES } from "@/modules/carrier/types";
import { createViettelPostAdapter } from "./adapter";

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
