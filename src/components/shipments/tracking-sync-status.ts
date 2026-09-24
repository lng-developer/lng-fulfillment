export type TrackingSyncBatchUiResult = {
  attempted: number;
  synced: number;
  noActualShipEvent: number;
  failed: number;
  completedAt: string;
};

export function getTrackingSyncStatus(input: {
  isSyncing: boolean;
  result: TrackingSyncBatchUiResult | null;
}) {
  if (input.isSyncing) {
    return {
      state: "syncing" as const,
      title: "Đang đồng bộ tối đa 20 đơn Amazon",
    };
  }

  if (input.result) {
    return {
      state: "completed" as const,
      title: "Kết quả batch Amazon gần nhất",
    };
  }

  return null;
}
