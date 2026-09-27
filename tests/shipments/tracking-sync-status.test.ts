import assert from "node:assert/strict";

import { getTrackingSyncStatus } from "@/components/shipments/tracking-sync-status";

assert.deepEqual(getTrackingSyncStatus({ isSyncing: true, result: null }), {
  state: "syncing",
  title: "Đang đồng bộ tracking theo nguồn đã chọn",
});

assert.deepEqual(
  getTrackingSyncStatus({
    isSyncing: false,
    result: {
      source: "ETSY",
      attempted: 20,
      yunSynced: 14,
      noActualShipEvent: 5,
      yunFailed: 1,
      portalSynced: 12,
      portalFailed: 2,
      completedAt: "2026-09-24T08:00:00.000Z",
    },
  }),
  {
    state: "completed",
    title: "Kết quả batch tracking gần nhất",
  },
);

console.log("tracking sync status: ok");
