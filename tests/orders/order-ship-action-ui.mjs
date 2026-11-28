import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
const base={externalOrderId:'111-6001512-2150606',recipientName:'Test',receivedAt:'2026-11-26T06:51:12Z',itemCount:1,totalQuantity:1,latestCarrierCode:'VIETTEL_POST'};
const rows=[
 {...base,id:'pending',latestShipmentId:'shipment-pending',status:'IN_PROCESSING',latestShipmentStatus:'TRACKING_PENDING'},
 {...base,id:'ready',externalOrderId:'ready-order',status:'READY_TO_SHIP',latestShipmentStatus:'FAILED_CREATE',latestShipmentIssue:'Tài khoản Viettel Post không đủ số dư. Nạp tiền vào tài khoản đã chọn rồi gửi lại đơn.'},
 {...base,id:'label',externalOrderId:'label-order',latestShipmentId:'shipment-label',status:'IN_PROCESSING',latestShipmentStatus:'LABEL_READY',latestLabelUrl:'https://example.test/label.pdf'},
 {...base,id:'cancelled',externalOrderId:'cancelled-order',status:'CANCELLED'},
];
const bundle=await build({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';import{OrdersTable}from'./src/components/orders/OrdersTable';const root=createRoot(document.getElementById('root'));window.render=(role,key)=>root.render(<OrdersTable key={key} role={role}/>);window.render('OWNER');",resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',plugins:[{name:'mock',setup(b){
 b.onResolve({filter:/^@\/lib\/api\/orders$/},()=>({path:'orders',namespace:'mock'}));
 b.onResolve({filter:/^@\/lib\/api\/shipments$/},()=>({path:'shipments',namespace:'mock'}));
 b.onResolve({filter:/^@\/components\/shipments\/ShipmentDetailPanel$/},()=>({path:'panel',namespace:'mock'}));
 b.onResolve({filter:/^@\/lib\/auth-context$/},()=>({path:'auth',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({resolveDir:process.cwd(),contents:args.path==='shipments'?'export const getShipment=async()=>({});export const syncTracking=async id=>{window.synced=id;};':args.path==='panel'?`import React from 'react';export function ShipmentDetailPanel({shipmentId,onClose}){return React.createElement('div',{role:'dialog'},shipmentId,React.createElement('button',{onClick:onClose},'Close detail'));}` :args.path==='auth'?'export const useAuth=()=>({membership:{role:"OWNER"}});':`export const getOrders=async()=>({data:window.testRows??${JSON.stringify(rows)},pagination:{page:1,pageSize:20,totalItems:4,totalPages:1}});export const getOrder=async()=>({});export const cancelYunShipment=async()=>{};export const confirmOrderShipped=async()=>{};export const markOrdersReadyToShip=async()=>{};export const resetOrder=async()=>{};export const shipOrder=async()=>{};export const shipOrdersBatch=async()=>{};`}));
}}]});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<div id="root"></div>');await page.addScriptTag({content:bundle.outputFiles[0].text});
 const pending=page.locator('tbody tr').filter({hasText:'111-6001512-2150606'});
 await pending.waitFor();
 assert.equal(await pending.getByRole('button',{name:'Ship',exact:true}).count(),0);
 assert.equal(await pending.getByRole('button',{name:'Xem vận đơn',exact:true}).count(),1);
 assert.equal(await pending.getByRole('button',{name:'In nhãn',exact:true}).count(),0);
 await pending.getByRole('button',{name:'Xem vận đơn',exact:true}).click();
 assert.equal(await page.getByRole('dialog').textContent(),'shipment-pendingClose detail');
 await page.getByRole('button',{name:'Close detail'}).click();
 await pending.getByRole('button',{name:'Tùy chọn khác',exact:true}).click();
 await page.getByRole('button',{name:'Đồng bộ lại VP',exact:true}).click();
 await page.waitForFunction(()=>window.synced==='shipment-pending');

 const ready=page.locator('tbody tr').filter({hasText:'ready-order'});
 assert.equal(await ready.getByRole('button',{name:'Ship',exact:true}).count(),1);
 assert.equal(await ready.getByText(/Tài khoản Viettel Post không đủ số dư/).count(),1);
 assert.equal(await page.locator('tbody tr').filter({hasText:'cancelled-order'}).getByRole('button',{name:'Ship',exact:true}).count(),0);
 assert.equal(await page.locator('tbody tr').filter({hasText:'label-order'}).getByRole('button',{name:'In nhãn',exact:true}).count(),1);
 const selectBatch = page.getByRole('checkbox',{name:'Chọn tối đa 10 đơn trên trang',exact:true});
 await page.evaluate((initialRows)=>{window.testRows=[...initialRows,...Array.from({length:16},(_,i)=>({...initialRows[1],id:`batch-${i}`,externalOrderId:`batch-${i}`}))];window.render('OWNER','batch');},rows);
 await page.getByRole('checkbox',{name:'Chọn đơn batch-15',exact:true}).waitFor();
 await selectBatch.check();
 const batchActions = page.getByRole('region',{name:'Thao tác đơn đã chọn'});
 for (const name of ['Gửi VP (7)','Gửi Yun (7)','Lấy / In nhãn','Xuất (10)','Bỏ chọn']) {
   assert.equal(await batchActions.getByRole('button',{name,exact:true}).count(),1);
   assert.equal(await page.getByRole('button',{name,exact:true}).count(),1);
 }
 assert.equal(await page.locator('tbody input[type=checkbox]:checked').count(),10);
 assert.equal(await selectBatch.isChecked(),true);
 const extra = page.getByRole('checkbox',{name:'Chọn đơn batch-15',exact:true});
 assert.equal(await extra.isDisabled(),true);
 await page.getByRole('checkbox',{name:'Chọn đơn ready-order',exact:true}).uncheck();
 assert.equal(await extra.isEnabled(),true);
 await extra.check();
 assert.equal(await page.locator('tbody input[type=checkbox]:checked').count(),10);
 await selectBatch.check();
 await selectBatch.uncheck();
 assert.equal(await page.locator('tbody input[type=checkbox]:checked').count(),0);
 await page.evaluate((initialRows)=>{window.testRows=Array.from({length:5},(_,i)=>({...initialRows[2],id:`printed-${i}`,externalOrderId:`printed-${i}`,latestShipmentId:`shipment-${i}`}));window.render('OWNER','in-transit');},rows);
 await page.getByRole('checkbox',{name:'Chọn đơn printed-4',exact:true}).waitFor();
 await selectBatch.check();
 assert.equal(await page.locator('tbody input[type=checkbox]:checked').count(),5);
 assert.equal(await batchActions.getByRole('button',{name:'Lấy / In nhãn',exact:true}).isEnabled(),true);
 assert.equal(await batchActions.getByRole('button',{name:'Gửi VP (0)',exact:true}).isDisabled(),true);
 await page.evaluate(()=>{delete window.testRows;window.render('OWNER','original');});
 await page.getByRole('checkbox',{name:'Chọn đơn batch-15',exact:true}).waitFor({state:'detached'});
 await page.evaluate(()=>window.render('VIEWER'));
 await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Đồng bộ VP'));
 assert.equal(await pending.getByRole('button',{name:'Xem vận đơn',exact:true}).count(),1);
 assert.deepEqual(errors,[]);console.log('PASS: pending VP and cancelled orders cannot create again; ready order keeps Ship and balance guidance.');
} finally {await browser.close();}
