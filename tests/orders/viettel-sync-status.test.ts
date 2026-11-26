import assert from 'node:assert/strict';
import { prisma } from '@/shared/db';
import { linkViettelPostTrackingToShipment, createViettelPostShipmentForOrder } from '@/modules/shipment/repository';
async function main() {
  const update = prisma.shipment.update;
  const create = prisma.shipment.create;
  const captured: Array<Record<string, unknown>> = [];
  prisma.shipment.update = (async (args: { data: Record<string, unknown>; where: Record<string, unknown> }) => {
    assert.equal(args.where.tenantId, 'tenant');
    assert.deepEqual(args.where.status, { not: 'CANCELLED' });
    captured.push(args.data); return args.data;
  }) as unknown as typeof update;
  prisma.shipment.create = (async (args: { data: Record<string, unknown> }) => {
    assert.equal(args.data.tenantId, 'tenant');captured.push(args.data);return args.data;
  }) as unknown as typeof create;
  try {
    await linkViettelPostTrackingToShipment({tenantId:'tenant',shipmentId:'shipment',carrierShipmentId:'EPK1',trackingNumber:'',status:'EXCEPTION',actorType:'SYSTEM'});
    await createViettelPostShipmentForOrder({tenantId:'tenant',orderId:'order',carrierShipmentId:'EPK1',trackingNumber:'',status:'TRACKING_PENDING',items:[],actorType:'SYSTEM'});
    assert.deepEqual(captured.map(d=>d.status), ['EXCEPTION','TRACKING_PENDING']);
    for(const data of captured) assert.equal(Object.hasOwn(data,'actualShipAt'),false);
    console.log('PASS: VP status preserved; no fabricated handoff date; tenant/cancellation guards retained.');
  } finally {prisma.shipment.update=update;prisma.shipment.create=create;}
}
void main();
