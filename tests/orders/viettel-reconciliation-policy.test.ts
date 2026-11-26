import assert from 'node:assert/strict';
import { selectVpReplacement, type ReconcileShipment } from '@/modules/shipment/viettel-reconciliation-policy';
import type { VpRemoteShipment } from '@/integrations/viettel-post/adapter';
const local: ReconcileShipment = { id: 'old', carrierCode: 'VIETTEL_POST', carrierAccountId: 'acc2', carrierShipmentId: 'EPK-old', trackingNumber: null, metadata: null, status: 'IN_TRANSIT', createdAt: new Date('2026-11-23') };
const old: VpRemoteShipment = { id: 'remote-old', orderId: 'order', shipmentCode: 'EPK-old', status: 4, trackingNumber: null, labelUrl: null, dateCreate: '2026-11-23T10:00:00Z' };
const fresh: VpRemoteShipment = { ...old, id: 'remote-new', shipmentCode: 'EPK-new', status: 1, trackingNumber: '9214490374008505253650', dateCreate: '2026-11-25T10:00:00Z' };
assert.equal(selectVpReplacement('order', 'acc2', [local], [old, fresh])?.candidate.id, 'remote-new');
for (const remotes of [[fresh], [{ ...old, status: 2 }, fresh], [old, fresh, { ...fresh, id: 'other', shipmentCode: 'EPK-other' }], [old, { ...fresh, status: 0 }], [old, { ...fresh, trackingNumber: null }], [old, { ...fresh, orderId: 'wrong' }], [old, { ...fresh, dateCreate: old.dateCreate }], [old, fresh, fresh]])
    assert.equal(selectVpReplacement('order', 'acc2', [local], remotes), null);
assert.equal(selectVpReplacement('order', 'acc1', [local], [old, fresh]), null);
assert.equal(selectVpReplacement('order', 'acc2', [{ ...local, carrierAccountId: null }], [old, fresh]), null);
const linked = { ...local, id: 'new', carrierShipmentId: 'EPK-new', createdAt: new Date('2026-11-25') };
assert.equal(selectVpReplacement('order', 'acc2', [local, linked], [old, fresh]), null);
assert.equal(selectVpReplacement('order', 'acc2', [local, { ...local, id: 'archive', carrierAccountId: 'acc1', status: 'CANCELLED', createdAt: new Date('2026-11-20') }], [old, fresh])?.candidate.id, 'remote-new');
console.log('PASS: unique newer replacement, exact account/order, ambiguity/missing evidence and repeat-run guards.');
