import type { CarrierTrackingEvent } from "./types";

export type ActualShipEvent = Pick<
  CarrierTrackingEvent,
  "eventTime" | "eventCode" | "message" | "location" | "timezone"
> & {
  source: "carrier_event";
};

const HANDOFF_EVENT = /\b(picked up|accepted|in possession)\b/i;

export function deriveActualShipEvent(
  events: CarrierTrackingEvent[],
): ActualShipEvent | null {
  const event = [...events]
    .sort((left, right) => left.eventTime.getTime() - right.eventTime.getTime())
    .find(
      (candidate) =>
        candidate.eventStatus === "IN_TRANSIT" ||
        HANDOFF_EVENT.test(candidate.message ?? ""),
    );

  return event ? { ...event, source: "carrier_event" } : null;
}
