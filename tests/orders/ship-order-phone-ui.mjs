import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
(async () => {
  const bundle = await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {ShipOrderModal} from './src/components/orders/ShipOrderModal';
      const order={id:'test',externalOrderId:'test',totalQuantity:1,recipientName:'Test',destinationCountry:'US'};
      window.mount=(phone='')=>createRoot(document.getElementById('root')).render(<ShipOrderModal order={order} detail={{recipientPhone:phone,items:[]}} onClose={()=>{}} onSubmit={v=>window.submitted=v}/>); window.mount();`, resolveDir: process.cwd(), loader:'tsx' },
    bundle: true, write: false, jsx:'automatic', plugins: [{name:'mock-api',setup(b){
      b.onResolve({filter:/^@\/lib\/api\/(carrier-accounts|shipment-automation)$/}, args=>({path:args.path,namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`export const getCarrierAccounts=async()=>[{id:'acc2',name:'ACC 2',carrierCode:'VIETTEL_POST',status:'ACTIVE',isDefault:true}]; export const getTenantYunIossSetting=async()=>({status:'INACTIVE'});`}));
    }}]
  });
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent('<div id="root"></div>');await page.addScriptTag({content:bundle.outputFiles[0].text});
    const phone=page.locator('input[type="tel"]');const submit=page.getByRole('button',{name:'Tạo vận đơn Viettel Post',exact:true});
    await phone.waitFor();await page.waitForTimeout(150);
    for(const invalid of ['', '1', 'abc1234567','1234567890123456']) {await phone.fill(invalid);assert.equal(await submit.isDisabled(),true);}
    await phone.fill(' +1 (479) 225-5186 ');assert.equal(await submit.isEnabled(),true);
    await submit.click();const sent=await page.evaluate(()=>window.submitted);assert.equal(sent.options.receiverPhone,'+1 (479) 225-5186');assert.equal(sent.carrierAccountId,'acc2');
    assert.deepEqual(errors,[]);console.log('PASS: missing/invalid phones blocked; edited phone sent with selected account.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
