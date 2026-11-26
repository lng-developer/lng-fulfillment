import assert from "node:assert/strict";
import { verifyViettelPostCreation } from "../../src/integrations/viettel-post/create-verification";
async function main() {
 const result = { carrierCode: "VIETTEL_POST", carrierShipmentId: "id-1", metadata: { safe: { shipmentCode: "EPK1" } } };
 const enriched = await verifyViettelPostCreation(result, {}, async () => Response.json({id:"id-1",status:1,trackingNumber:"9214490374008505281660",labelUrl:"https://example.test/label.pdf"}));
 assert.equal(enriched.trackingNumber,"9214490374008505281660");
 assert.equal(enriched.labelUrl,"https://example.test/label.pdf");
 const mismatched = await verifyViettelPostCreation(result, {}, async () => Response.json({id:"other",status:1,trackingNumber:"wrong",labelUrl:"https://example.test/wrong.pdf"}));
 assert.equal(mismatched.trackingNumber,undefined);
 assert.equal(mismatched.labelUrl,undefined);
 for (const status of [0,1,2,3,8,9,10]) {
  const verified = await verifyViettelPostCreation(result, {id:"id-1"}, async () => Response.json({data:{id:"id-1",status}}));
  assert.equal(verified.metadata?.safe?.creationVerified,true);
 }
 for (const detail of [{id:"other",status:1},{id:"id-1",status:4},{id:"id-1",status:5},{id:"id-1",status:99},{id:"id-1",success:false,status:1},{}]) {
  const pending=await verifyViettelPostCreation(result,{},async()=>Response.json(detail));
  assert.equal(pending.metadata?.safe?.creationVerified,false);
  assert.equal(pending.carrierShipmentId,"id-1");
 }
 for (const body of [{status:false},{success:false},{data:{id:"id-1",status:4}}]) {
  let called=false;
  const pending=await verifyViettelPostCreation(result,body,async()=>{called=true;return Response.json({id:"id-1",status:1});});
  assert.equal(called,false);assert.equal(pending.metadata?.safe?.creationVerified,false);
 }
 for (const lookup of [async()=>Response.json({message:"not found"},{status:404}),async()=>{throw Error("timeout");}]) {
  const pending=await verifyViettelPostCreation(result,{},lookup);
  assert.equal(pending.metadata?.safe?.creationVerified,false);
  assert.equal(pending.metadata?.safe?.shipmentCode,"EPK1");
 }
 console.log("PASS: VP creation verification preserves ambiguous identities and rejects mismatches/errors");
}
void main();
