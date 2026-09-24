export const TRACKING_SYNC_BATCH_LIMIT = 20;

export function classifyTrackingSyncBatchResult(input: {
  actualShipAt: Date | null;
}) {
  return input.actualShipAt ? "synced" : "no_actual_ship_event";
}
