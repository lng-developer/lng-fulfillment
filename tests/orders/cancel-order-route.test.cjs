/* eslint-disable @typescript-eslint/no-require-imports -- CJS loader intercepts server-only auth before importing the route. */
const assert = require('node:assert/strict');
const Module = require('node:module');
require('tsx/cjs');
const { AppError } = require('../../src/shared/errors');
const load = Module._load;
let role = 'VIEWER';
let calls = 0;
Module._load = function(name, parent, ...args) {
  if (name === '@/shared/auth/context') return { requireTenantActor: async roles => {
    if (!roles.includes(role)) throw new AppError('FORBIDDEN', 'Denied', 403);
    return { tenantId: 'server-tenant', actorUserId: 'actor', role };
  } };
  if (name === '@/modules/order/cancel-service') return { cancelFulfillmentOrder: async (tenant, id, actor, body) => {
    assert.equal(tenant, 'server-tenant'); assert.equal(id, 'order'); assert.equal(actor, 'actor');
    if (!body?.reason) throw new AppError('VALIDATION_ERROR', 'Reason required', 400);
    calls++; return { orderId: id, orderStatus: 'CANCELLED' };
  } };
  return load.call(this, name, parent, ...args);
};
const { POST } = require('../../src/app/api/orders/[orderId]/cancel/route.ts');
const send = (origin = 'https://fulfill.test', body = '{"reason":"requested","tenantId":"attacker"}') => POST(
  new Request('https://fulfill.test/api/orders/order/cancel', { method: 'POST',
    headers: { host: 'fulfill.test', origin, 'content-type': 'application/json' }, body }),
  { params: Promise.resolve({ orderId: 'order' }) });
(async () => {
  assert.equal((await send()).status, 403); assert.equal(calls, 0);
  role = 'OPERATOR';
  assert.equal((await send('https://attacker.test')).status, 403); assert.equal(calls, 0);
  assert.equal((await send(undefined, '{')).status, 400);
  assert.equal((await send()).status, 200); assert.equal(calls, 1);
  console.log('PASS: cancel route role, origin, malformed JSON and server tenant');
})().catch(error => { console.error(error); process.exitCode = 1; });
