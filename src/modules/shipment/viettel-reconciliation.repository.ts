import type { AuditActorType, Prisma } from '@prisma/client';
import { prisma } from '@/shared/db';
import { AppError } from '@/shared/errors';
import { stopAutoShipmentForReset } from '@/modules/auto-shipment/reset';
import type { selectVpReplacement } from './viettel-reconciliation-policy';
export function listVpReconciliationOrders(tenantId: string, externalOrderIds: string[]) {
    return prisma.order.findMany({
        where: { tenantId, externalOrderId: { in: externalOrderIds }, status: { in: ['IN_PROCESSING', 'SHIPPED', 'ON_HOLD', 'FULFILLED'] } },
        include: { shipments: { where: { tenantId }, orderBy: { createdAt: 'desc' } }, items: { where: { tenantId }, select: { id: true, quantity: true } } },
    });
}
type Snapshot = Awaited<ReturnType<typeof listVpReconciliationOrders>>[number];
export async function saveVpReplacement(input: {
    tenantId: string;
    accountId: string;
    order: Snapshot;
    selection: NonNullable<ReturnType<typeof selectVpReplacement>>;
    actor: {
        actorType: AuditActorType;
        actorId?: string;
    };
}) {
    const { order, selection, tenantId, accountId, actor } = input;
    const candidate = selection.candidate;
    return prisma.$transaction(async (tx) => {
        const conflict = () => new AppError('CONFLICT', 'Order changed during VP reconciliation; retry sync.', 409);
        const current = await tx.order.findFirst({ where: { tenantId, id: order.id }, select: { updatedAt: true, status: true } });
        if (!current || current.updatedAt.getTime() !== order.updatedAt.getTime() || current.status !== order.status)
            throw conflict();
        const shipments = await tx.shipment.findMany({ where: { tenantId, orderId: order.id }, select: { id: true, updatedAt: true } });
        if (shipments.length !== order.shipments.length || shipments.some(s => !order.shipments.some(old => old.id === s.id && old.updatedAt.getTime() === s.updatedAt.getTime())))
            throw conflict();
        const items = await tx.orderItem.findMany({ where: { tenantId, orderId: order.id }, select: { id: true, quantity: true } });
        if (items.length !== order.items.length || items.some(item => !order.items.some(old => old.id === item.id && old.quantity === item.quantity)))
            throw conflict();
        const duplicate = await tx.shipment.findFirst({ where: { tenantId, carrierAccountId: accountId, OR: [{ carrierShipmentId: candidate.shipmentCode }, { carrierShipmentId: candidate.id }, { trackingNumber: candidate.trackingNumber }] }, select: { id: true } });
        if (duplicate)
            throw conflict();
        const account = await tx.carrierAccount.findFirst({ where: { id: accountId, tenantId, carrierCode: 'VIETTEL_POST', status: 'ACTIVE' }, select: { id: true } });
        if (!account)
            throw conflict();
        await stopAutoShipmentForReset(tx, tenantId, order.id);
        for (const verified of selection.verified) {
            const previous = order.shipments.find(s => s.id === verified.shipmentId)!;
            if (previous.status === 'CANCELLED')
                continue;
            await tx.shipment.update({ where: { id: previous.id, tenantId }, data: { status: verified.status,
                    ...(!previous.actualShipEvidence ? { actualShipAt: null } : {}),
                    statusHistory: { create: { tenantId, status: verified.status, note: 'VP replacement reconciliation: previous carrier status verified; identifiers retained.', actorType: actor.actorType, actorId: actor.actorId } },
                } });
        }
        const status = candidate.status === 3 ? 'DELIVERED' : candidate.status === 2 ? 'IN_TRANSIT' : 'TRACKING_PENDING';
        const shipment = await tx.shipment.create({ data: { tenantId, orderId: order.id, carrierCode: 'VIETTEL_POST', carrierAccountId: accountId,
                carrierShipmentId: candidate.shipmentCode, trackingNumber: candidate.trackingNumber, labelUrl: candidate.labelUrl, status,
                metadata: { carrier: { shipmentCode: candidate.shipmentCode, remoteShipmentId: candidate.id }, reconciliation: { previousShipmentIds: selection.verified.map(s => s.shipmentId) } },
                items: { create: order.items.map(item => ({ tenantId, orderItemId: item.id, quantity: item.quantity })) },
                statusHistory: { create: { tenantId, status, note: 'Linked the unique newer VP shipment on the same account; no carrier shipment created.', actorType: actor.actorType, actorId: actor.actorId } },
            }, select: { id: true } });
        const nextStatus = order.status === 'ON_HOLD' ? 'ON_HOLD' : 'IN_PROCESSING';
        await tx.order.update({ where: { id: order.id, tenantId }, data: { status: nextStatus, updatedAt: new Date(), statusHistory: { create: { tenantId, status: nextStatus, note: 'VP replacement linked; dispatch requires carrier handoff evidence.', actorType: actor.actorType, actorId: actor.actorId } } } });
        await tx.auditLog.create({ data: { tenantId, actorType: actor.actorType, ...(actor.actorType === 'USER' ? { actorUserId: actor.actorId } : {}), action: 'VP_REPLACEMENT_RECONCILED', resourceType: 'Order', resourceId: order.id,
                metadata: { accountId, previousOrderStatus: order.status, newShipmentId: shipment.id, carrierShipmentId: candidate.shipmentCode, previousShipments: order.shipments.map(s => ({ id: s.id, status: s.status, actualShipAt: s.actualShipAt?.toISOString() ?? null })), verified: selection.verified } as Prisma.InputJsonValue } });
        return shipment;
    }, { isolationLevel: 'Serializable' });
}
