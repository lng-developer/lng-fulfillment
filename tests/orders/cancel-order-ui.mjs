import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
const result = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{CancelOrderModal}from'./src/components/orders/CancelOrderModal';createRoot(document.getElementById('root')).render(<CancelOrderModal order={{id:'order',externalOrderId:'111-6001512-2150606'}} onClose={()=>window.closed=true} onCancelled={()=>window.cancelled=true}/>);`,
  loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, jsx: 'automatic' });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  let requests = 0;
  await page.route('https://fulfill.test/**', async route => {
    if (route.request().method() === 'POST') {
      requests++;
      assert.equal(route.request().url(), 'https://fulfill.test/api/orders/order/cancel');
      assert.deepEqual(route.request().postDataJSON(), { reason: 'Buyer requested' });
      await route.fulfill({ status: requests === 1 ? 409 : 200, contentType: 'application/json',
        body: JSON.stringify(requests === 1 ? { success: false, error: { code: 'CONFLICT', message: 'Hủy vận đơn bên hãng trước.' } }
          : { success: true, data: { orderStatus: 'CANCELLED' } }) });
    } else await route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' });
  });
  await page.goto('https://fulfill.test/');
  await page.addScriptTag({ content: result.outputFiles[0].text });
  const dialog = page.getByRole('dialog', { name: 'Hủy đơn trong Fulfillment' });
  await dialog.waitFor();
  const confirm = dialog.getByRole('button', { name: 'Xác nhận hủy đơn' });
  assert.equal(await confirm.isDisabled(), true);
  await dialog.getByLabel('Lý do hủy').fill(' Buyer requested ');
  await confirm.click();
  await dialog.getByRole('alert').waitFor();
  assert.match(await dialog.getByRole('alert').innerText(), /Hủy vận đơn/);
  assert.equal(await dialog.getByLabel('Lý do hủy').inputValue(), ' Buyer requested ');
  await confirm.click();
  await page.waitForFunction(() => window.cancelled === true);
  assert.equal(requests, 2);
  console.log('PASS: cancellation modal required reason, correct order, server conflict, retry and success callback');
} finally { await browser.close(); }
