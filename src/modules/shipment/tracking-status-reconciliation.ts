import type { CarrierNormalizedTrackingStatus } from "@/modules/carrier";
import type { ShipmentStatus } from "@prisma/client";

export function shouldApplyTrackingStatusTransition(input: {
  currentStatus: ShipmentStatus;
  carrierStatus: CarrierNormalizedTrackingStatus | null;
  carrierEventAt: Date | null;
  currentStatusRecordedAt: Date | null;
}) {
  if (input.currentStatus !== "DELIVERED" || input.carrierStatus !== "IN_TRANSIT") {
    return true;
  }

  return Boolean(
    input.carrierEventAt &&
      input.currentStatusRecordedAt &&
      input.carrierEventAt > input.currentStatusRecordedAt,
  );
}
