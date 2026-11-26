/* eslint-disable @typescript-eslint/no-require-imports -- CJS loader intercept isolates carrier and database calls. */
const assert = require('node:assert/strict');
const Module = require('node:module');
require('tsx/cjs');
const originalLoad = Module._load;
const calls = [];
let failSync = false;
let candidates = [{ id: 'shipment', carrierShipmentId: 'remote-id', trackingNumber: null,
  metadata: { carrier: { shipmentCode: 'EPK123' } } }];
Module._load = function (name, parent, ...rest) {
  if (parent?.filename.endsWith('viettel-webhook-service.ts')) {
    if (name === './service') return { syncShipmentTracking: async (...args) => {
      if (failSync) throw new Error('private carrier error must not be logged');
      calls.push(args); return {};
    } };
    if (name === './viettel-webhook-repository') return {
      findViettelWebhookShipments: async (tenant, event) => {
        assert.equal(tenant, 'tenant');
        assert.ok(event.orderId || event.id || event.shipmentCode);
        return candidates;
      },
    };
  }
  return originalLoad.call(this, name, parent, ...rest);
};
process.env.TRACKING_CRON_TENANT_ID = 'tenant';
const { POST } = require('../../src/app/api/webhooks/viettelpost/route.ts');
async function post(body) {
  const response = await POST(new Request('https://example.test/api/webhooks/viettelpost', {
    method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
  }));
  assert.equal(response.status, 200);
  return (await response.json()).data;
}
(async () => {
  // No status is necessary: the authoritative state must be read from VP.
  let result = await post({ data: { CustomerOrderNumber: 4241514988, ShipmentCode: 'EPK123' } });
  assert.equal(calls.length, 1, 'nested notification must trigger tracking sync');
  assert.equal(result.processed, 1);
  assert.deepEqual(calls[0], ['tenant', 'shipment', { actorType: 'SYSTEM', actorId: 'viettel-post-webhook' }, { refreshCompleted: true }]);
  result = await post({ items: [{ orderId: 'order', id: 'different-id' }] });
  assert.equal(result.processed, 0, 'wrong shipment must not sync');
  candidates = [...candidates, { ...candidates[0], id: 'second' }];
  result = await post({ orderId: 'order' });
  assert.equal(result.processed, 0, 'ambiguous order must not select an arbitrary shipment');
  candidates = [candidates[0]];
  result = await post([{ orderReferenceId: 'order', id: 'remote-id' }, { id: 'remote-id' }]);
  assert.equal(result.processed, 1, 'deduplicate shipment within callback');
  result = await post({ diagnosticId: 'probe', secret: 'do-not-log' });
  assert.equal(result.processed, 0);
  const invalid = await POST(new Request('https://example.test', { method: 'POST', body: '{' }));
  assert.equal(invalid.status, 400);
  failSync = true;
  const failed = await POST(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ id: 'remote-id' }) }));
  assert.equal(failed.status, 503, 'carrier lookup failure must request retry, not report success');
  const { describeViettelWebhook } = require('../../src/integrations/viettel-post/webhook.ts');
  const shape = JSON.stringify(describeViettelWebhook({ data: { phone: '123456789', clientSecret: 'secret-value' } }));
  assert.ok(!shape.includes('123456789') && !shape.includes('secret-value') && !shape.includes('clientSecret'));
  console.log('PASS: VP webhook route, envelope, aliases, exact identity, ambiguity, dedupe, malformed JSON');
})().catch(error => { console.error(error); process.exitCode = 1; });
