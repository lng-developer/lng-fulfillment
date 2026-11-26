import assert from "node:assert/strict";
import { getShipmentIssue } from "@/shared/shipment-issue";
import { prisma } from "@/shared/db";
import { listOrders } from "@/modules/order/repository";
import { validateOrderListQuery } from "@/modules/order/validation";
async function main() {
 const failure={id:"shipment-failed",status:"FAILED_CREATE",carrierCode:"VIETTEL_POST",metadata:{carrier:{message:"Not enough balance, please top up to proceed"}}};
 const expected="Tài khoản Viettel Post không đủ số dư. Nạp tiền vào tài khoản đã chọn rồi gửi lại đơn.";
 assert.equal(getShipmentIssue(failure),expected);
 assert.equal(getShipmentIssue({...failure,status:"TRACKING_PENDING"}),null);
 assert.equal(getShipmentIssue({...failure,metadata:{carrier:{message:"Tài khoản chưa đủ số dư tiền cước"}}}),expected);
 assert.ok(!getShipmentIssue({...failure,metadata:{carrier:{message:"secret-token@example.com"}}})?.includes("secret"));
 assert.match(getShipmentIssue({...failure,status:"EXCEPTION",metadata:{carrier:{creationVerified:false}}})!,/đối soát/);
 const originalFind=prisma.order.findMany, originalGroup=prisma.orderItem.groupBy;
 prisma.order.findMany=(async (args: {select:{shipments:{select:{metadata:boolean}}};where:{tenantId:string}})=>{
  assert.equal(args.select.shipments.select.metadata,true);assert.equal(args.where.tenantId,"tenant");
  return [{id:"order",items:[],shipments:[failure],_count:{items:1},autoShipmentJob:null}];
 }) as unknown as typeof originalFind;
 prisma.orderItem.groupBy=(async()=>[]) as unknown as typeof originalGroup;
 try {
  const [order]=await listOrders("tenant",validateOrderListQuery(new URLSearchParams()));
  assert.equal(order.latestShipmentIssue,expected);
  assert.equal(order.latestShipmentId,"shipment-failed");
  assert.equal(Object.hasOwn(order,"metadata"),false);
 } finally {prisma.order.findMany=originalFind;prisma.orderItem.groupBy=originalGroup;}
 console.log("PASS: persisted balance issue mapped to safe guidance; stale errors hidden after success");
}
void main();
