import assert from 'node:assert/strict';
import { prisma } from '@/shared/db';
import { saveVpReplacement } from '@/modules/shipment/viettel-reconciliation.repository';
async function main() {
    const original = prisma.$transaction;
    const date = new Date('2026-11-23');
    const order = { id: 'order', tenantId: 'tenant', status: 'SHIPPED', updatedAt: date, shipments: [{ id: 'old', status: 'IN_TRANSIT', updatedAt: date, actualShipAt: date, actualShipEvidence: null }], items: [{ id: 'item', quantity: 1 }] };
    const candidate = { id: 'new-remote', orderId: 'external', shipmentCode: 'EPK-new', status: 1, trackingNumber: '9214490374008505253650', labelUrl: null, dateCreate: '2026-11-25' };
    const input = { tenantId: 'tenant', accountId: 'acc2', order, selection: { candidate, verified: [{ shipmentId: 'old', status: 'EXCEPTION' }] }, actor: { actorType: 'SYSTEM' } } as unknown as Parameters<typeof saveVpReplacement>[0];
    let changed = false, duplicate = false, writes: Array<{
        kind: string;
        data: Record<string, unknown>;
    }> = [];
    const tx = {
        order: { findFirst: async () => ({ status: 'SHIPPED', updatedAt: changed ? new Date() : date }), update: async ({ where, data }: {
                where: {
                    tenantId: string;
                };
                data: Record<string, unknown>;
            }) => { assert.equal(where.tenantId, 'tenant'); writes.push({ kind: 'order', data }); } },
        shipment: { findMany: async () => [{ id: 'old', updatedAt: date }], findFirst: async () => duplicate ? { id: 'existing' } : null,
            update: async ({ data }: {
                data: Record<string, unknown>;
            }) => { assert.equal(data.carrierShipmentId, undefined); assert.equal(data.trackingNumber, undefined); writes.push({ kind: 'old', data }); },
            create: async ({ data }: {
                data: Record<string, unknown>;
            }) => { writes.push({ kind: 'new', data }); return { id: 'new' }; } },
        orderItem: { findMany: async () => order.items },
        carrierAccount: { findFirst: async ({ where }: {
                where: {
                    tenantId: string;
                    id: string;
                };
            }) => { assert.deepEqual(where, { id: 'acc2', tenantId: 'tenant', carrierCode: 'VIETTEL_POST', status: 'ACTIVE' }); return { id: 'acc2' }; } },
        autoShipmentJob: { count: async () => 0, updateMany: async () => ({ count: 0 }) },
        auditLog: { create: async ({ data }: {
                data: Record<string, unknown>;
            }) => { writes.push({ kind: 'audit', data }); } },
    };
    prisma.$transaction = (async (fn: (value: unknown) => unknown, options: unknown) => { assert.deepEqual(options, { isolationLevel: 'Serializable' }); return fn(tx); }) as typeof prisma.$transaction;
    try {
        await saveVpReplacement(input);
        const shipment = writes.find(w => w.kind === 'new')!.data;
        assert.equal(shipment.carrierAccountId, 'acc2');
        assert.equal(shipment.status, 'TRACKING_PENDING');
        assert.equal(shipment.actualShipAt, undefined);
        assert.equal(writes.find(w => w.kind === 'old')!.data.status, 'EXCEPTION');
        assert.equal(writes.find(w => w.kind === 'old')!.data.actualShipAt, null);
        assert.equal(writes.find(w => w.kind === 'order')!.data.status, 'IN_PROCESSING');
        assert.ok(writes.some(w => w.kind === 'audit'));
        writes = [];
        changed = true;
        await assert.rejects(saveVpReplacement(input), /changed/);
        assert.equal(writes.length, 0);
        changed = false;
        duplicate = true;
        await assert.rejects(saveVpReplacement(input), /changed/);
        assert.equal(writes.length, 0);
        console.log('PASS: transactional account/history/audit, no fabricated handoff, concurrency and duplicate guards.');
    }
    finally {
        prisma.$transaction = original;
    }
}
void main();
