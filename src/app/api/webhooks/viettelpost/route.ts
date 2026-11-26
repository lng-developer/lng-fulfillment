import { normalizeTrackingStatus, normalizeViettelPostTrackingNumber } from "@/integrations/viettel-post/adapter";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import {
  linkViettelPostTrackingToShipment,
  createViettelPostShipmentForOrder,
  findOrdersForViettelPostSync,
} from "@/modules/shipment/repository";
import { matchesViettelShipment } from "@/modules/shipment/viettel-shipment-match";

export async function GET() {
  return Response.json({
    success: true,
    message: "Viettel Post webhook endpoint is active",
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const rawItems = Array.isArray(body)
      ? body
      : Array.isArray(body?.items)
        ? body.items
        : [body];
    const items = rawItems.filter(
      (it): it is Record<string, unknown> => Boolean(it && typeof it === "object"),
    );

    const tenantId =
      process.env.TRACKING_CRON_TENANT_ID?.trim() || "cmqeydawp0003l804o09ye1jv";
    const orderIds = items
      .map((it) =>
        String(
          it.orderId || it.orderReferenceId || it.customerOrderNumber || "",
        ).trim(),
      )
      .filter(Boolean);

    if (orderIds.length > 0) {
      const orders = await findOrdersForViettelPostSync(tenantId, orderIds);
      for (const order of orders) {
        const item = items.find(
          (it) =>
            it.orderId === order.externalOrderId ||
            it.orderReferenceId === order.externalOrderId,
        );
        if (!item) continue;

        const rawTracking = String(
          item.trackingCode || item.trackingNumber || "",
        ).trim();
        const trackingNumber =
          normalizeViettelPostTrackingNumber(rawTracking) || "";
        const carrierShipmentId = String(
          item.vtpOrderNumber || item.shipmentCode || "",
        ).trim();
        const labelUrl =
          typeof item.labelUrl === "string"
            ? item.labelUrl
            : typeof item.labelUrlVTP === "string"
              ? item.labelUrlVTP
              : null;

        if (!trackingNumber && !carrierShipmentId) continue;
        const carrierStatus = normalizeTrackingStatus(typeof item.status === "number" ? item.status : null);
        if (carrierStatus === "UNKNOWN") continue;
        const status = carrierStatus === "RETURNED" ? "EXCEPTION" : carrierStatus;

        if (order.shipments.length > 0) {
          for (const s of order.shipments) {
            if (s.status === "CANCELLED" || s.carrierCode !== "VIETTEL_POST" || !matchesViettelShipment(s, item)) continue;
            await linkViettelPostTrackingToShipment({
              tenantId,
              shipmentId: s.id,
              carrierShipmentId: carrierShipmentId || s.carrierShipmentId || "VTP",
              trackingNumber: trackingNumber || s.trackingNumber || "",
              labelUrl,
              status,
              actorType: "SYSTEM",
              actorId: "viettel-post-webhook",
            });
          }
        } else {
          await createViettelPostShipmentForOrder({
            tenantId,
            orderId: order.id,
            carrierShipmentId: carrierShipmentId || "VTP",
            trackingNumber: trackingNumber || "",
            labelUrl,
            status,
            items: order.items.map((it) => ({
              orderItemId: it.id,
              quantity: it.quantity,
            })),
            actorType: "SYSTEM",
            actorId: "viettel-post-webhook",
          });
        }

        // A tracking number alone is not proof of carrier handoff.
      }
    }

    return ok({ processed: items.length });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.status, error.details);
    }
    return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
  }
}
