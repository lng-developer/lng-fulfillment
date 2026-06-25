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

  return {
    eventId: readString(header.event_id) ?? readString(record.event_id),
    eventType: readString(header.event_type) ?? readString(record.event_type),
    dataCode: readString(record.data_code) ?? readString(record.dataCode),
    waybillNumber:
      readString(record.WayBillNumber) ??
      readString(record.waybill_number) ??
      readString(record.waybillNumber),
    trackingNumber:
      readString(record.TrackingNumber) ??
      readString(record.tracking_number) ??
      readString(record.trackingNumber),
    customerOrderNumber:
      readString(record.CustomerOrderNumber) ??
      readString(record.customer_order_number) ??
      readString(record.customerOrderNumber),
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

function hasAnyKey(record: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(record, key));
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
