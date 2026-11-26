import assert from 'node:assert/strict';
import { prisma } from '@/shared/db';
import { findViettelWebhookShipments } from '@/modules/shipment/viettel-webhook-repository';
async function main() {
  const original = prisma.shipment.findMany;
  const queries: Array<Record<string, unknown>> = [];
  prisma.shipment.findMany = (async (args: {where: Record<string, unknown>}) => {
    queries.push(args.where); return [];
  }) as unknown as typeof original;
  try {
    await findViettelWebhookShipments('tenant', {orderId:'order',shipmentCode:'EPK123'});
    await findViettelWebhookShipments('tenant', {id:'remote-id'});
    for (const q of queries) {
      assert.equal(q.tenantId, 'tenant');
      assert.equal(q.carrierCode, 'VIETTEL_POST');
      assert.deepEqual(q.carrierAccountId, {not:null});
      assert.deepEqual(q.status, {notIn:['DRAFT','FAILED_CREATE','CANCELLED']});
      assert.ok(Array.isArray(q.OR) && q.OR.length > 0);
    }
    assert.deepEqual(queries[0].order, {tenantId:'tenant',OR:[{externalOrderId:'order'},{orderNumber:'order'}]});
    assert.equal(queries[1].order, undefined);
    console.log('PASS: webhook repository tenant, account, cancellation and identity guards');
  } finally { prisma.shipment.findMany=original; }
}
void main();
