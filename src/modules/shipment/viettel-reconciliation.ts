import { listCarrierAccounts, resolveCarrierRuntimeCredentials } from '@/modules/carrier';
import { lookupViettelPostOrderShipments } from '@/integrations/viettel-post/adapter';
import { safeLabelUrl } from '@/shared/label-url';
import { matchesViettelShipment } from './viettel-shipment-match';
import { selectVpReplacement } from './viettel-reconciliation-policy';
import { listVpReconciliationOrders, saveVpReplacement } from './viettel-reconciliation.repository';
import type { ShipmentActor } from './types';
export async function reconcileVpReplacements(tenantId: string, actor: ShipmentActor) {
    const result = { reconciled: 0, reviewRequired: 0, failedAccounts: 0 };
    const accounts = (await listCarrierAccounts(tenantId)).filter(a => a.carrierCode === 'VIETTEL_POST' && a.status === 'ACTIVE');
    for (const account of accounts) {
        try {
            const credentials = await resolveCarrierRuntimeCredentials(tenantId, 'VIETTEL_POST', account.id);
            const remote = await lookupViettelPostOrderShipments({ tenantId, credentials }, undefined);
            const orders = await listVpReconciliationOrders(tenantId, [...new Set(remote.map(r => r.orderId))]);
            for (const order of orders) {
                if (order.shipments[0]?.carrierAccountId !== account.id)
                    continue;
                if (!remote.some(r => r.orderId === order.externalOrderId && ![4, 5, 6, 7].includes(r.status) && !order.shipments.some(s => matchesViettelShipment(s, r)))) continue;
                try {
                    // Refetch the complete order list immediately before committing; do not trust an earlier account snapshot.
                    const fresh = await lookupViettelPostOrderShipments({ tenantId, credentials }, order.externalOrderId);
                    const verified = selectVpReplacement(order.externalOrderId, account.id, order.shipments, fresh);
                    if (!fresh.some(r => ![4, 5, 6, 7].includes(r.status) && !order.shipments.some(s => matchesViettelShipment(s, r)))) continue;
                    if (!verified) {
                        result.reviewRequired++;
                        continue;
                    }
                    verified.candidate.labelUrl = safeLabelUrl(verified.candidate.labelUrl);
                    await saveVpReplacement({ tenantId, accountId: account.id, order, selection: verified, actor });
                    result.reconciled++;
                }
                catch {
                    result.reviewRequired++;
                }
            }
        }
        catch {
            result.failedAccounts++;
        }
    }
    return result;
}
