import assert from "node:assert/strict";
import { prisma } from "@/shared/db";
import { getShipmentLabels } from "@/modules/shipment/labels";
import { safeLabelUrl } from "@/shared/label-url";

async function main() {
  const original = prisma.shipment.findFirst;
  const shipment = { status: "IN_TRANSIT", carrierCode: "VIETTEL_POST", carrierAccountId: null,
    carrierShipmentId: "EPK1", trackingNumber: "tracking", labelUrl: "https://labels.example/single.pdf", metadata: null };
  prisma.shipment.findFirst = (async (input: { where: { tenantId: string; id: string } }) => {
    assert.equal(input.where.id, "shipment");
    return input.where.tenantId === "tenant" ? shipment : null;
  }) as unknown as typeof prisma.shipment.findFirst;
  try {
    await assert.rejects(getShipmentLabels("other-tenant", "shipment"), /Shipment not found/);
    assert.deepEqual(await getShipmentLabels("tenant", "shipment"), {
      labelUrl: shipment.labelUrl, mergeLabelUrl: null, requiresAccount: true,
    });
    shipment.status = "CANCELLED";
    await assert.rejects(getShipmentLabels("tenant", "shipment"), /đã hủy/);
    for (const url of ["javascript:alert(1)", "data:text/html,evil", "/relative", "https://user:password@example.com"]) {
      assert.equal(safeLabelUrl(url), null);
    }
    assert.equal(safeLabelUrl("https://labels.example/file.pdf?signature=abc"), "https://labels.example/file.pdf?signature=abc");
    console.log("label tenant scope, legacy account, cancelled shipment and URL safety: passed");
  } finally { prisma.shipment.findFirst = original; }
}
void main();
