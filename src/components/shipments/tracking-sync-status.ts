export type TrackingSyncBatchUiResult = {
  attempted: number;
  yunSynced: number;
  noActualShipEvent: number;
  yunFailed: number;
  portalSynced: number;
  portalFailed: number;
  completedAt: string;
};

export function getTrackingSyncStatus(input: {
  isSyncing: boolean;
  result: TrackingSyncBatchUiResult | null;
}) {
  if (input.isSyncing) {
    return {
      state: "syncing" as const,
      title: "Đang đồng bộ tối đa 20 đơn Etsy trong 7 ngày gần nhất",
    };
  }

  if (input.result) {
    return {
      state: "completed" as const,
      title: "Kết quả batch Etsy gần nhất",
    };
  }

  return null;
}
