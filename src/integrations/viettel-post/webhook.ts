import { AppError } from "@/shared/errors";
export type ViettelWebhookNotification = { orderId?: string; id?: string; shipmentCode?: string; trackingNumber?: string };
function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function identifier(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string" && !(typeof value === "number" && Number.isSafeInteger(value))) continue;
    const text = String(value).trim();
    if (text && text.length <= 160) return text;
  }
}
export function parseViettelWebhook(body: unknown): ViettelWebhookNotification[] {
  let value = body;
  for (let depth = 0; depth < 3 && record(value); depth++) {
    const nested = value.items ?? value.Items ?? value.data ?? value.Data;
    if (nested === undefined) break;
    value = nested;
  }
  const items = Array.isArray(value) ? value : [value];
  if (items.length > 100) throw new AppError("VALIDATION_ERROR", "Too many webhook notifications.", 400);
  return items.map(item => {
    if (!record(item)) return {};
    return {
      orderId: identifier(item.orderId, item.OrderId, item.orderReferenceId, item.OrderReferenceId, item.customerOrderNumber, item.CustomerOrderNumber),
      id: identifier(item.id, item.Id, item.shipmentId, item.ShipmentId),
      shipmentCode: identifier(item.shipmentCode, item.ShipmentCode, item.vtpOrderNumber, item.VtpOrderNumber),
      trackingNumber: identifier(item.trackingNumber, item.TrackingNumber, item.trackingCode, item.TrackingCode),
    };
  });
}
// Types only: never log payload values, headers, tokens or recipient data.
export function describeViettelWebhook(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) return { type: "array", count: value.length,
    ...(depth < 2 && value.length ? { item: describeViettelWebhook(value[0], depth + 1) } : {}) };
  if (!record(value) || depth >= 3) return value === null ? "null" : typeof value;
  return Object.fromEntries(Object.entries(value).slice(0, 30)
    .filter(([key]) => /^[a-z][a-z0-9_]{0,63}$/i.test(key) && !/secret|token|password|authorization|cookie/i.test(key))
    .map(([key, item]) => [key, describeViettelWebhook(item, depth + 1)]));
}
