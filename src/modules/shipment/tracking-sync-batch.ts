export const TRACKING_SYNC_BATCH_LIMIT = 20;
export const TRACKING_SYNC_LOOKBACK_DAYS = 14;

export function amazonTrackingSyncOrderFilter() {
  return { sourceChannel: "AMAZON" as const };
}

export function getTrackingSyncPurchaseAfter(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(
    Date.UTC(value("year"), value("month") - 1, value("day") - (TRACKING_SYNC_LOOKBACK_DAYS - 1)) -
      7 * 60 * 60 * 1000,
  );
}

export function classifyTrackingSyncBatchResult(input: {
  actualShipAt: Date | null;
}) {
  return input.actualShipAt ? "synced" : "no_actual_ship_event";
}
