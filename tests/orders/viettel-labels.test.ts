import assert from "node:assert/strict";
import test from "node:test";
import { createViettelPostAdapter } from "@/integrations/viettel-post/adapter";

test("label lookup reads the exact shipment and keeps single and merged PDFs distinct", async () => {
  let merged: string | null = "https://labels.example/double.pdf";
  let wrongShipment = false;
  const adapter = createViettelPostAdapter({ fetchImpl: async (url, init) => {
    if (String(url).includes("connect/token")) return Response.json({ access_token: "mock" });
    assert.ok(!init?.method || init.method === "GET", "label lookup must not create or modify a shipment");
    if (String(url).includes("?")) return Response.json({ items: [{ id: "uuid", shipmentCode: "EPK1", status: 1 }] });
    assert.ok(String(url).endsWith("/uuid"));
    return Response.json({ data: { id: wrongShipment ? "other" : "uuid", shipmentCode: wrongShipment ? "EPK2" : "EPK1", labelUrl: "https://labels.example/single.pdf", mergeLabelUrl: merged } });
  } });
  const context = { tenantId: "tenant", credentials: { source: "tenantCredential" as const, payload: {
    clientId: "id", clientSecret: "secret", authUrl: "https://auth-staging.logistek.com.vn", orderUrl: "https://order-staging.logistek.com.vn",
    lineShipId: "LS946787", shipFromFirstName: "A", shipFromLastName: "B", shipFromPhoneNumber: "123",
    shipFromAddress1: "street", shipFromCountry: "VN", shipFromState: "HN", shipFromCity: "HN", shipFromZipCode: "10000", liveEnabled: true,
  } } };
  const input = { tenantId: "tenant", shipmentId: "local", carrierCode: "VIETTEL_POST", carrierShipmentId: "EPK1" };
  const labels = await adapter.getLabel(input, context);
  assert.equal(labels.labelUrl, "https://labels.example/single.pdf");
  assert.equal(labels.metadata?.safe?.mergeLabelUrl, merged);
  merged = null;
  assert.equal((await adapter.getLabel(input, context)).metadata?.safe?.mergeLabelUrl, undefined);
  wrongShipment = true;
  await assert.rejects(adapter.getLabel(input, context));
});
