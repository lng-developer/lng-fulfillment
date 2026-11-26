import assert from 'node:assert/strict';
import { prisma } from '@/shared/db';
import { listOrders, countOrders } from '@/modules/order/repository';
import { listShipments, countShipments } from '@/modules/shipment/repository';
import { listShipmentCosts, countShipmentCosts } from '@/modules/shipment-cost/repository';

async function main() {
  const common = { page: 1, pageSize: 20, sortBy: 'createdAt' as const, sortOrder: 'desc' as const, includeExpanded: false };
  const cases = [
    { model: prisma.order, list: listOrders, count: countOrders, filters: { status: 'SHIPPED', sourceChannel: 'ETSY', from: new Date('2026-11-01'), to: new Date('2026-11-30') } },
    { model: prisma.shipment, list: listShipments, count: countShipments, filters: { status: 'EXCEPTION', sourceChannel: 'ETSY', orderId: 'order' } },
    { model: prisma.shipmentCost, list: listShipmentCosts, count: countShipmentCosts, filters: { status: 'PENDING' } },
  ];
  for (const entry of cases) {
    const originalFind = entry.model.findMany;
    const originalCount = entry.model.count;
    const captured: Record<string, unknown>[] = [];
    // Exercise the repository query, without a live database or carrier calls.
    Object.assign(entry.model, {
      findMany: async ({ where }: { where: Record<string, unknown> }) => { captured.push(where); return []; },
      count: async ({ where }: { where: Record<string, unknown> }) => { captured.push(where); return 0; },
    });
    try {
      for (const term of ['111-6873005-0481047', 'EPK9562041281', '9214490374008505253650', 'Customer Name']) {
        const query = { ...common, ...entry.filters, search: `  #${term}  ` };
        await entry.list('tenant-a', query as never);
        await entry.count('tenant-a', query as never);
        const [listed, counted] = captured.splice(0);
        assert.deepEqual(listed, counted, 'list and count must use identical filters');
        assert.equal(listed.tenantId, 'tenant-a');
        assert.equal(listed.status ?? listed.actualFeeStatus, entry.filters.status);
        const serialized = JSON.stringify(listed);
        for (const field of ['externalOrderId', 'orderNumber', 'recipientName', 'carrierShipmentId', 'trackingNumber']) {
          assert.ok(serialized.includes(`"${field}"`), `missing search field: ${field}`);
        }
        assert.ok(serialized.includes(term));
        assert.equal(serialized.includes(`#${term}`), false, 'leading # must be stripped');
        assert.ok(serialized.includes('insensitive'));
        assert.ok(serialized.includes('vtpOrderNumber'), 'VP codes can be stored in metadata before sync');
        if (entry.model === prisma.order) {
          assert.equal(listed.sourceChannel, 'ETSY');
          assert.deepEqual(listed.receivedAt, {gte: entry.filters.from, lte: entry.filters.to});
          assert.ok(serialized.includes('"some"'), 'search all historical shipments');
        }
        if (entry.model === prisma.shipment) {
          assert.deepEqual(listed.order, { sourceChannel: 'ETSY' });
          assert.equal(listed.orderId, 'order');
        }
      }
      await entry.list('tenant-b', {...common, search:'  #  '} as never);
      const blank = captured.pop()!;
      assert.equal(blank.tenantId,'tenant-b');
      assert.equal(blank.OR, undefined, 'empty search must not add contains-empty relation predicates');
    } finally { Object.assign(entry.model, {findMany: originalFind, count: originalCount}); }
  }
  console.log('PASS: consistent identifiers, recipient, history, metadata, normalized search, tenant/filter and list/count contracts.');
}
void main();
