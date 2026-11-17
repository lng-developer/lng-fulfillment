import { recordSystemAuditLog } from "@/modules/audit";
import { AppError } from "@/shared/errors";
import { syncTrackingBatch, syncViettelPostTrackingBatch } from "./service";

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

  try {
    const vtpResult = await syncViettelPostTrackingBatch(tenantId, {
      actorType: "SYSTEM",
      actorId: "vercel-cron",
    });
    result.attempted += vtpResult.attempted;
    result.synced += vtpResult.synced;
    result.portalSynced = (result.portalSynced ?? 0) + (vtpResult.portalSynced ?? 0);
    result.portalFailed = (result.portalFailed ?? 0) + (vtpResult.portalFailed ?? 0);
  } catch (vtpError) {
    await recordSystemAuditLog({
      tenantId,
      action: "VIETTEL_POST_CRON_RUN",
      resourceType: "TrackingCronRun",
      resourceId: "viettel-post-sync",
      metadata: {
        outcome: "FAILED",
        errorCode: vtpError instanceof AppError ? vtpError.code : "INTERNAL_ERROR",
      },
    });
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
