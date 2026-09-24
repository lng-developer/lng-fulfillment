import type { CarrierTrackingEvent } from "@/modules/carrier";

export type YunWebhookEventCategory = "TRACKING" | "FEE" | "ABNORMAL" | "UNKNOWN";

export type YunWebhookMeta = {
  eventId: string | null;
  eventType: string | null;
  dataCode: string | null;
  waybillNumber: string | null;
  trackingNumber: string | null;
  customerOrderNumber: string | null;
  type: number | null;
};

export function extractYunWebhookMeta(event: unknown): YunWebhookMeta {
  const record = asRecord(event);
  const header = asRecord(record.header);
  const data = asRecord(record.data);

  return {
    eventId: readString(header.event_id) ?? readString(record.event_id),
    eventType: readString(header.event_type) ?? readString(record.event_type),
    dataCode: readString(record.data_code) ?? readString(record.dataCode),
    waybillNumber:
      readString(record.WayBillNumber) ??
      readString(record.waybill_number) ??
      readString(record.waybillNumber) ??
      readString(data.WayBillNumber) ??
      readString(data.waybill_number) ??
      readString(data.waybillNumber),
    trackingNumber:
      readString(record.TrackingNumber) ??
      readString(record.tracking_number) ??
      readString(record.trackingNumber) ??
      readString(data.TrackingNumber) ??
      readString(data.tracking_number) ??
      readString(data.trackingNumber),
    customerOrderNumber:
      readString(record.CustomerOrderNumber) ??
      readString(record.customer_order_number) ??
      readString(record.customerOrderNumber) ??
      readString(data.CustomerOrderNumber) ??
      readString(data.customer_order_number) ??
      readString(data.customerOrderNumber),
    type: readNumber(record.type),
  };
}

export function classifyYunWebhookEvent(
  event: unknown,
  meta: YunWebhookMeta,
): YunWebhookEventCategory {
  const record = asRecord(event);
  const marker = `${meta.eventType ?? ""} ${meta.dataCode ?? ""}`.toUpperCase();

  if (
    marker.includes("FEE") ||
    marker.includes("FREIGHT") ||
    hasAnyKey(record, [
      "TotalFee",
      "totalFee",
      "Freight",
      "freight",
      "ChargeWeight",
      "chargeWeight",
    ])
  ) {
    return "FEE";
  }

  if (
    meta.dataCode === "WOSPushData" ||
    hasAnyKey(record, ["func_btn_list", "wo_info", "operation_info"])
  ) {
    return "ABNORMAL";
  }

  if (
    marker.includes("TRACK") ||
    meta.trackingNumber ||
    hasAnyKey(record, ["OrderTrackingDetails", "TrackingStatus", "tracking_status"])
  ) {
    return "TRACKING";
  }

  return "UNKNOWN";
}

export function extractYunWebhookTrackingEvent(
  event: unknown,
  eventStatus: string,
): CarrierTrackingEvent | null {
  const record = asRecord(event);
  const data = asRecord(record.data);
  const source = hasTrackingEventFields(data) ? data : record;
  const eventTime = readDate(
    source.ProcessDate ?? source.process_date ?? source.processDate ?? source.event_time,
  );

  if (!eventTime) return null;

  return {
    eventCode: readString(source.TrackNodeCode ?? source.track_node_code ?? source.event_code),
    eventStatus,
    eventTime,
    timezone: readString(source.ProcessTimezone ?? source.process_timezone ?? source.timezone),
    message: readString(source.ProcessContent ?? source.process_content ?? source.message),
    location: readString(source.ProcessLocation ?? source.process_location ?? source.location),
  };
}

function hasAnyKey(record: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(record, key));
}

function hasTrackingEventFields(record: Record<string, unknown>) {
  return hasAnyKey(record, [
    "ProcessDate",
    "process_date",
    "processDate",
    "event_time",
  ]);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readDate(value: unknown) {
  const date = typeof value === "string" && value.trim() ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function readNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
