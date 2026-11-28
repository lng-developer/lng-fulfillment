/* eslint-disable @typescript-eslint/no-require-imports -- isolate DB */
require("tsx/cjs");
const assert=require("node:assert/strict"),Module=require("node:module");
const original=Module._load;let called;
Module._load=function(name,parent,...rest){
 if(name==="@/shared/db"&&parent?.filename.replaceAll("\\","/").endsWith("/vp-merchandise/repository.ts"))return {prisma:{skuViettelMerchandiseMapping:{
 findMany:async args=>{called=args;return[];},
 deleteMany:async args=>{called=args;return{count:1};},
 upsert:async args=>{called=args;return{};},
 }}};
 return original.call(this,name,parent,...rest);
};
const repository=require("../../src/modules/vp-merchandise/repository");Module._load=original;
(async()=>{
 await repository.findMappings("tenant-a","US",["J-ACO-1"],["ACO"]);
 assert.deepEqual(called.where,{tenantId:"tenant-a",destinationCountryCode:"US",OR:[{mappingType:"SKU",skuCode:{in:["J-ACO-1"]}},{mappingType:"GROUP",skuCode:{in:["ACO"]}}]});
 await repository.deleteMapping("tenant-a","ACO","US","GROUP");
 assert.deepEqual(called.where,{tenantId:"tenant-a",mappingType:"GROUP",skuCode:"ACO",destinationCountryCode:"US"});
 await repository.saveMapping("tenant-a","actor",{mappingType:"GROUP",skuCode:"ACO",destinationCountryCode:"US",declarationName:"Fixture",merchandiseCode:"1234"});
 assert.deepEqual(called.where.tenantId_mappingType_skuCode_destinationCountryCode,{tenantId:"tenant-a",mappingType:"GROUP",skuCode:"ACO",destinationCountryCode:"US"});
 console.log("PASS repository: tenant/country scoped group lookup, deletion and distinct group key");
})().catch(e=>{console.error(e);process.exitCode=1;});
