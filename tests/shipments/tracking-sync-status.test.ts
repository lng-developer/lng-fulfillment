import assert from "node:assert/strict";

import { getTrackingSyncStatus } from "@/components/shipments/tracking-sync-status";

assert.deepEqual(getTrackingSyncStatus({ isSyncing: true, result: null }), {
  state: "syncing",
  title: "Đang đồng bộ tối đa 20 đơn Etsy trong 7 ngày gần nhất",
});

assert.deepEqual(
  getTrackingSyncStatus({
    isSyncing: false,
    result: {
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
    title: "Kết quả batch Etsy gần nhất",
  },
);

console.log("tracking sync status: ok");
