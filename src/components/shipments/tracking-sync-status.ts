export type TrackingSyncBatchUiResult = {
  source: "AMAZON" | "ETSY" | "ALL";
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
      title: "Đang đồng bộ tracking theo nguồn đã chọn",
    };
  }

  if (input.result) {
    return {
      state: "completed" as const,
      title: "Kết quả batch tracking gần nhất",
    };
  }

  return null;
}
