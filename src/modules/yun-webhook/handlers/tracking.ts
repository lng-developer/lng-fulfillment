import {
  deriveActualShipEvent,
  type CarrierNormalizedTrackingStatus,
} from "@/modules/carrier";
import {
  applyYunWebhookTrackingUpdate,
  resolveYunWebhookShipment,
} from "@/modules/shipment";
import { mapYunExpressTrackingStatus } from "@/integrations/yunexpress-oms/normalize";
import type {
  YunWebhookDispatchContext,
  YunWebhookDispatchResult,
} from "../types";
import {
  readString,
  asRecord,
  extractYunWebhookTrackingEvent,
} from "../extractor";

export async function handleYunTrackingWebhook(
  context: YunWebhookDispatchContext,
): Promise<YunWebhookDispatchResult> {
  const shipment = await resolveYunWebhookShipment(context.meta);

  if (!shipment) {
    return {
      status: "UNMATCHED",
      shipment: null,
      safeMetadata: { reason: "shipment_not_found" },
    };
  }

  const carrierStatus = readCarrierStatus(context.payload);
  const webhookTrackingEvent = extractYunWebhookTrackingEvent(
    context.payload,
    carrierStatus ?? "UNKNOWN",
  );
  const actualShipEvent = webhookTrackingEvent
    ? deriveActualShipEvent([webhookTrackingEvent])
    : null;
  const result = await applyYunWebhookTrackingUpdate({
    shipment,
    carrierStatus,
    trackingNumber: context.meta.trackingNumber,
    carrierShipmentId: context.meta.waybillNumber,
    actualShipAt: actualShipEvent?.eventTime,
    actualShipEvidence: actualShipEvent
      ? { ...actualShipEvent, eventTime: actualShipEvent.eventTime.toISOString() }
      : undefined,
  });

  return {
    status: "PROCESSED",
    shipment: result.shipment,
    safeMetadata: {
      trackingNumberPresent: Boolean(result.shipment.trackingNumber),
      actualShipAtPresent: Boolean(result.shipment.actualShipAt),
      portalTrackingAttempted: result.portalTrackingSync?.attempted ?? false,
    },
  };
}

function readCarrierStatus(payload: unknown): CarrierNormalizedTrackingStatus | null {
  const record = asRecord(payload);
  const trackingStatus = toNumber(record.TrackingStatus ?? record.trackingStatus);
  const packageState = toNumber(record.PackageState ?? record.packageState);

  if (trackingStatus !== null || packageState !== null) {
    return mapYunExpressTrackingStatus({ packageState, trackingStatus });
  }

  const text = [
    readString(record.StatusName),
    readString(record.statusName),
    readString(record.Status),
    readString(record.status),
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  if (/DELIVER|SIGNED|RECEIVED/.test(text)) {
    return "DELIVERED";
  }
  if (/EXCEPTION|ABNORMAL|FAIL|HOLD/.test(text)) {
    return "EXCEPTION";
  }
  if (/CANCEL/.test(text)) {
    return "CANCELLED";
  }
  if (/RETURN/.test(text)) {
    return "RETURNED";
  }
  if (/TRANSIT|SHIP|PICK|DEPART|ARRIV/.test(text)) {
    return "IN_TRANSIT";
  }

  return null;
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
