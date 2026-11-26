import { parseViettelWebhook, describeViettelWebhook } from "@/integrations/viettel-post/webhook";
import { AppError } from "@/shared/errors";
import { findViettelWebhookShipments } from "./viettel-webhook-repository";
import { matchesViettelShipment } from "./viettel-shipment-match";
import { syncShipmentTracking } from "./service";
export async function receiveViettelWebhook(tenantId: string, body: unknown) {
  const items = parseViettelWebhook(body);
  const summary = { received: items.length, processed: 0, skipped: 0, failed: 0, reasons: {} as Record<string, number> };
  const seen = new Set<string>();
  const skip = (reason: string) => {
    summary.skipped++;
    summary.reasons[reason] = (summary.reasons[reason] ?? 0) + 1;
  };
  for (const event of items) {
    if (!event.orderId && !event.id && !event.shipmentCode && !event.trackingNumber) { skip("MISSING_IDENTIFIER"); continue; }
    const candidates = await findViettelWebhookShipments(tenantId, event);
    const hasIdentity = Boolean(event.id || event.shipmentCode || event.trackingNumber);
    const matches = hasIdentity ? candidates.filter(s => matchesViettelShipment(s, event)) : candidates;
    if (matches.length !== 1) { skip(matches.length ? "AMBIGUOUS_SHIPMENT" : "SHIPMENT_NOT_FOUND"); continue; }
    const shipment = matches[0];
    if (seen.has(shipment.id)) { skip("DUPLICATE"); continue; }
    seen.add(shipment.id);
    try {
      // Public callbacks only trigger a read using the shipment's saved VP account.
      // Existing sync verifies carrier state and emits lifecycle events.
      await syncShipmentTracking(tenantId, shipment.id,
        { actorType: "SYSTEM", actorId: "viettel-post-webhook" }, { refreshCompleted: true });
      summary.processed++;
    } catch (error) {
      summary.failed++;
      console.error("[viettel-post-webhook] sync_failed", { shipmentId: shipment.id, code: error instanceof AppError ? error.code : "INTERNAL_ERROR" });
    }
  }
  console.info("[viettel-post-webhook] received", { ...summary, shape: describeViettelWebhook(body) });
  if (summary.failed) throw new AppError("INTERNAL_ERROR", "Viettel Post webhook sync failed; retry required.", 503);
  return summary;
}
