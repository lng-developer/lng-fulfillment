import assert from 'node:assert/strict';
import {prisma} from '@/shared/db';
import {listShipments,countShipments} from '@/modules/shipment/repository';
import {validateShipmentListQuery} from '@/modules/shipment/validation';
async function main(){
 const original={group:prisma.shipment.groupBy,find:prisma.shipment.findMany,count:prisma.order.count};
 const query=validateShipmentListQuery(new URLSearchParams('groupByOrder=true&carrierCode=VIETTEL_POST&search=old-tracking&page=2&pageSize=1'));
 const row=(id:string,status:string)=>({id,orderId:'order',status,trackingNumber:id==='new'?'tracking':null,carrierCode:'VIETTEL_POST',carrierShipmentId:id,carrierAccountId:'acc2',actualShipAt:null,metadata:null,labelUrl:null,createdAt:new Date(),updatedAt:new Date(),order:{externalOrderId:'external',orderNumber:null,sourceChannel:'AMAZON'},_count:{items:1}});
 let predicate:unknown;
 prisma.shipment.groupBy=(async(args:Record<string,unknown>)=>{assert.deepEqual(args.by,['orderId']);assert.equal(args.skip,1);assert.equal(args.take,1);predicate=args.where;return[{orderId:'order'}];}) as unknown as typeof original.group;
 prisma.shipment.findMany=(async(args:Record<string,unknown>)=>{assert.deepEqual(args.where,{tenantId:'tenant',orderId:{in:['order']},carrierCode:'VIETTEL_POST'});assert.equal(args.take,undefined);assert.equal(args.skip,undefined);return[row('new','TRACKING_PENDING'),row('old','EXCEPTION'),row('cancelled','CANCELLED')];}) as unknown as typeof original.find;
 prisma.order.count=(async(args:Record<string,unknown>)=>{assert.deepEqual(args.where,{tenantId:'tenant',shipments:{some:predicate}});return 1;}) as unknown as typeof original.count;
 try{const result=await listShipments('tenant',query);assert.equal(result.length,1);assert.equal(result[0].id,'new');assert.deepEqual(result[0].history?.map(s=>s.id),['old','cancelled']);assert.equal(await countShipments('tenant',query),1);assert.throws(()=>validateShipmentListQuery(new URLSearchParams('groupByOrder=bad')),/groupByOrder/);assert.throws(()=>validateShipmentListQuery(new URLSearchParams('carrierCode=bad')),/carrierCode/);console.log('PASS: grouping before pagination, complete history, tenant/carrier scope and group count.');}
 finally{prisma.shipment.groupBy=original.group;prisma.shipment.findMany=original.find;prisma.order.count=original.count;}
}
void main();
