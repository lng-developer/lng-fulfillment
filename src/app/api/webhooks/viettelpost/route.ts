import { normalizeViettelPostTrackingNumber } from "@/integrations/viettel-post/adapter";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import {
  linkViettelPostTrackingToShipment,
  createViettelPostShipmentForOrder,
  findOrdersForViettelPostSync,
} from "@/modules/shipment/repository";
import { sendPortalTrackingUpdate } from "@/modules/portal-tracking";

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
          normalizeViettelPostTrackingNumber(rawTracking) || rawTracking;
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

        if (order.shipments.length > 0) {
          for (const s of order.shipments) {
            await linkViettelPostTrackingToShipment({
              tenantId,
              shipmentId: s.id,
              carrierShipmentId: carrierShipmentId || s.carrierShipmentId || "VTP",
              trackingNumber: trackingNumber || s.trackingNumber || "",
              labelUrl,
              actualShipAt: new Date(),
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
            actualShipAt: new Date(),
            items: order.items.map((it) => ({
              orderItemId: it.id,
              quantity: it.quantity,
            })),
            actorType: "SYSTEM",
            actorId: "viettel-post-webhook",
          });
        }

        if (trackingNumber) {
          await sendPortalTrackingUpdate({
            orderId: order.externalOrderId,
            tracking: trackingNumber,
            carrier: "USPS",
            fulfillment: "VIETTEL_POST",
            sourceChannel: order.sourceChannel,
            actualShipAt: new Date(),
          }).catch(() => null);
        }
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
