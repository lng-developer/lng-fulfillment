import { OrderSourceChannel } from "@prisma/client";

export const TRACKING_SYNC_BATCH_LIMIT = 20;
export const TRACKING_SYNC_LOOKBACK_DAYS = 14;
export const ETSY_TRACKING_SYNC_BATCH_LIMIT = 20;
export const ETSY_TRACKING_SYNC_LOOKBACK_DAYS = 7;

export function trackingSyncOrderFilter() {
  return {
    sourceChannel: {
      in: [OrderSourceChannel.AMAZON, OrderSourceChannel.ETSY],
    },
  };
}

export function etsyTrackingSyncOrderFilter() {
  return { sourceChannel: OrderSourceChannel.ETSY };
}

export function getEtsyTrackingSyncCreatedAfter(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(
    Date.UTC(
      value("year"),
      value("month") - 1,
      value("day") - (ETSY_TRACKING_SYNC_LOOKBACK_DAYS - 1),
    ) - 7 * 60 * 60 * 1000,
  );
}

export function getEtsyTrackingSyncStep(input: {
  actualShipAt: Date | null;
  portalTrackingSyncState: "SYNCED" | "FAILED" | null;
}) {
  if (!input.actualShipAt) return "yun" as const;
  return input.portalTrackingSyncState === "SYNCED" ? "skip" as const : "portal" as const;
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
