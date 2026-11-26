import type { Prisma } from '@prisma/client';
import { matchesViettelShipment } from './viettel-shipment-match';
import { normalizeViettelPostTrackingNumber } from '@/integrations/viettel-post/tracking';
import type { VpRemoteShipment } from '@/integrations/viettel-post/adapter';
export type ReconcileShipment = {
    id: string;
    carrierCode: string | null;
    carrierAccountId: string | null;
    carrierShipmentId: string | null;
    trackingNumber: string | null;
    metadata: Prisma.JsonValue;
    status: string;
    createdAt: Date;
};
export function selectVpReplacement(externalOrderId: string, accountId: string, local: ReconcileShipment[], remote: VpRemoteShipment[]) {
    const latest = [...local].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (!latest || latest.carrierCode !== 'VIETTEL_POST' || latest.carrierAccountId !== accountId)
        return null;
    const exact = remote.filter(r => r.orderId === externalOrderId);
    if (new Set(exact.map(r => r.id)).size !== exact.length)
        return null;
    const previous = local.filter(s => s.status !== 'CANCELLED' || s.id === latest.id);
    if (previous.some(s => s.carrierCode !== 'VIETTEL_POST' || s.carrierAccountId !== accountId))
        return null;
    const verified = [];
    for (const shipment of previous) {
        const matches = exact.filter(r => matchesViettelShipment(shipment, r));
        if (matches.length !== 1 || ![4, 5, 6, 7].includes(matches[0].status))
            return null;
        verified.push({ shipmentId: shipment.id, status: matches[0].status === 4 ? 'EXCEPTION' as const : 'CANCELLED' as const });
    }
    const candidates = exact.filter(r => !local.some(s => matchesViettelShipment(s, r)) && ![4, 5, 6, 7].includes(r.status));
    if (candidates.length !== 1)
        return null;
    const candidate = candidates[0];
    const createdAt = new Date(candidate.dateCreate);
    const newestOldDate = Math.max(...previous.map(s => {
        const old = exact.find(r => matchesViettelShipment(s, r))!;
        return new Date(old.dateCreate).getTime();
    }));
    if (![1, 2, 3].includes(candidate.status) || !normalizeViettelPostTrackingNumber(candidate.trackingNumber) ||
        !Number.isFinite(createdAt.getTime()) || !Number.isFinite(newestOldDate) || createdAt.getTime() <= newestOldDate)
        return null;
    return { candidate, verified };
}
