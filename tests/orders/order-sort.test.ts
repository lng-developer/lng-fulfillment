import assert from 'node:assert/strict';
import { prisma } from '@/shared/db';
import { listOrders, listOrdersForExport } from '@/modules/order/repository';
import { validateOrderListQuery } from '@/modules/order/validation';
async function main() {
  const original=prisma.order.findMany;
  const sorts:unknown[]=[];
  prisma.order.findMany=(async ({orderBy}:{orderBy:unknown})=>{sorts.push(orderBy);return [];}) as unknown as typeof original;
  try {
    for(const direction of ['asc','desc']) {
      const query=validateOrderListQuery(new URLSearchParams({sortOrder:direction,pendingVp:'true'}));
      await listOrders('tenant',query);
      await listOrdersForExport('tenant',query);
      assert.deepEqual(sorts.splice(0),[{receivedAt:direction},{receivedAt:direction}]);
    }
    assert.throws(()=>validateOrderListQuery(new URLSearchParams('sortOrder=invalid')),/sortOrder/);
    console.log('PASS: ASC/DESC match between list and CSV with pending VP filter; invalid direction rejected.');
  }finally{prisma.order.findMany=original;}
}
void main();
