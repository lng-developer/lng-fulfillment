import { can, type Role } from "@/lib/rbac";

export function canSyncShipmentTracking(role: Role, hasTrackingLookup: boolean) {
  return can.syncTracking(role) && hasTrackingLookup;
}
