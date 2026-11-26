import assert from 'node:assert/strict';
import { prisma } from '@/shared/db';
import { validateOrderListQuery, parsePendingVpFilter } from '@/modules/order/validation';
import { listOrders, countOrders, listOrdersForExport } from '@/modules/order/repository';
async function main() {
  assert.equal(parsePendingVpFilter(null),undefined);
  assert.equal(parsePendingVpFilter('false'),false);
  assert.throws(()=>parsePendingVpFilter('yes'),/true or false/);
  const query=validateOrderListQuery(new URLSearchParams('pendingVp=true&sourceChannel=ETSY&search=111-6873005-0481047'));
  assert.equal(query.pendingVp,true);
  const find=prisma.order.findMany,count=prisma.order.count;
  const predicates: unknown[]=[];
  prisma.order.findMany=(async ({where}: {where:unknown})=>{predicates.push(where);return [];}) as unknown as typeof find;
  prisma.order.count=(async ({where}: {where:unknown})=>{predicates.push(where);return 0;}) as unknown as typeof count;
  try {
    await listOrders('tenant',query);await countOrders('tenant',query);await listOrdersForExport('tenant',query);
    assert.deepEqual(predicates[0],predicates[1]);assert.deepEqual(predicates[0],predicates[2]);
    const expected={tenantId:'tenant',AND:[{status:{in:['READY_TO_SHIP','FULFILLED']}}],shipments:{none:{tenantId:'tenant',status:{not:'CANCELLED'},OR:[{status:{notIn:['DRAFT','FAILED_CREATE']}},{carrierShipmentId:{notIn:['']}},{trackingNumber:{notIn:['']}},{labelUrl:{notIn:['']}}]}},sourceChannel:'ETSY'};
    const actual=predicates[0] as typeof expected & {OR:unknown};
    assert.deepEqual({...actual,OR:undefined},{...expected,OR:undefined});assert.ok(actual.OR,'search composes with pending filter');
    await listOrders('other',{...query,pendingVp:false});
    const disabled=predicates.at(-1) as {tenantId:string;shipments?:unknown;AND?:unknown};
    assert.equal(disabled.tenantId,'other');assert.equal(disabled.shipments,undefined);assert.equal(disabled.AND,undefined);
    console.log('PASS: pending VP validation, eligible states, carrier evidence exclusion, tenant scope, list/count/export and disabled filter.');
  }finally{prisma.order.findMany=find;prisma.order.count=count;}
}
void main();
