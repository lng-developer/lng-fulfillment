/* eslint-disable @typescript-eslint/no-require-imports -- isolate repository; no live data */
require("tsx/cjs");
const assert = require("node:assert/strict");
const Module = require("node:module");
const original = Module._load;
const order = {
  id: "order", items: [], status: "IN_PROCESSING",
  shipments: [{id: "shipment", carrierCode: "VIETTEL_POST", carrierAccountId: "acc2", status: "LABEL_READY", labelUrl: "https://example.test/label.pdf", issue: "curated issue"}],
};
Module._load = function (name, parent, ...rest) {
  if (parent?.filename.replaceAll("\\", "/").endsWith("/modules/order/service.ts")) {
    if (name === "./repository") return {
      listOrderDetailPage: async tenant => {assert.equal(tenant,"tenant-a");return [order];},
      countOrders: async () => 1,
    };
    if (name === "@/modules/audit" || name === "./validation") return {};
  }
  return original.call(this, name, parent, ...rest);
};
const { listTenantOrders } = require("../../src/modules/order/service");
Module._load = original;
(async () => {
  const result = await listTenantOrders("tenant-a", {includeExpanded:true,page:1,pageSize:20});
  const row = result.orders[0];
  assert.equal(row.latestShipmentId,"shipment");
  assert.equal(row.latestCarrierCode,"VIETTEL_POST");
  assert.equal(row.latestCarrierAccountId,"acc2");
  assert.equal(row.latestShipmentIssue,"curated issue");
  assert.equal(row.latestLabelUrl,order.shipments[0].labelUrl);
  order.shipments = [];
  const empty = await listTenantOrders("tenant-a", {includeExpanded:true,page:1,pageSize:20});
  assert.equal(empty.orders[0].latestShipmentId,null);
  assert.equal(empty.orders[0].latestCarrierCode,null);
  console.log("PASS expanded orders preserve shipment identity, account, labels, issue and empty state");
})().catch(error => {console.error(error);process.exitCode=1;});
