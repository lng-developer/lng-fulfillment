import assert from "node:assert/strict";
import { prisma } from "@/shared/db";
import { createDirectShipmentSuccessRecords } from "@/modules/shipment/repository";
async function main() {
 const original = prisma.$transaction;
 let captured: Record<string, unknown> | undefined;
 prisma.$transaction = (async (run: (tx: unknown) => Promise<unknown>) => run({
  shipment: {create: async ({data}: {data: Record<string, unknown>}) => {
   captured=data;
   return {...data,id:"new",createdAt:new Date(),updatedAt:new Date()};
  }},
  order: {update: async ({where}: {where: Record<string,unknown>}) => {
   assert.deepEqual(where,{id:"order",tenantId:"tenant"}); return {id:"order"};
  }},
 })) as typeof prisma.$transaction;
 try {
  const result=await createDirectShipmentSuccessRecords({tenantId:"tenant",orderId:"order",items:[],
   status:"EXCEPTION",carrierCode:"VIETTEL_POST",carrierAccountId:"acc2",carrierShipmentId:"vp-id",
   trackingNumber:null,labelUrl:null,metadata:{carrier:{creationVerified:false}},actorType:"SYSTEM"});
  assert.equal(result.status,"EXCEPTION");assert.equal(result.carrierShipmentId,"vp-id");
  assert.equal(captured?.tenantId,"tenant");assert.equal(captured?.actualShipAt,undefined);
  console.log("PASS: unverified VP identity retained with EXCEPTION and tenant-scoped order update");
 } finally {prisma.$transaction=original;}
}
void main();
