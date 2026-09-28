import { recordSystemAuditLog } from "@/modules/audit";
import { AppError } from "@/shared/errors";
import { syncTrackingBatch } from "./service";

type TrackingCronResult = Pick<
  Awaited<ReturnType<typeof syncTrackingBatch>>,
  | "attempted"
  | "synced"
  | "noActualShipEvent"
  | "failed"
  | "portalSynced"
  | "portalFailed"
>;

export function toTrackingCronAuditMetadata(result: TrackingCronResult) {
  return {
    outcome: "COMPLETED",
    attempted: result.attempted,
    synced: result.synced,
    noActualShipEvent: result.noActualShipEvent,
    failed: result.failed,
    portalSynced: result.portalSynced,
    portalFailed: result.portalFailed,
  };
}

export async function runTrackingCron(tenantId: string) {
  let result: Awaited<ReturnType<typeof syncTrackingBatch>>;

  try {
    result = await syncTrackingBatch(tenantId, {
      actorType: "SYSTEM",
      actorId: "vercel-cron",
    });
  } catch (error) {
    await recordSystemAuditLog({
      tenantId,
      action: "TRACKING_CRON_RUN",
      resourceType: "TrackingCronRun",
      resourceId: "daily-tracking-sync",
      metadata: {
        outcome: "FAILED",
        errorCode: error instanceof AppError ? error.code : "INTERNAL_ERROR",
      },
    });

    throw error;
  }

  await recordSystemAuditLog({
    tenantId,
    action: "TRACKING_CRON_RUN",
    resourceType: "TrackingCronRun",
    resourceId: "daily-tracking-sync",
    metadata: toTrackingCronAuditMetadata(result),
  });

  return result;
}
