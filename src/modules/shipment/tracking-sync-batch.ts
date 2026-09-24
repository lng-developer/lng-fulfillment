export const TRACKING_SYNC_BATCH_LIMIT = 20;

export function amazonTrackingSyncOrderFilter() {
  return { sourceChannel: "AMAZON" as const };
}

export function classifyTrackingSyncBatchResult(input: {
  actualShipAt: Date | null;
}) {
  return input.actualShipAt ? "synced" : "no_actual_ship_event";
}
