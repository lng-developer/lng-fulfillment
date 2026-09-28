import { syncTrackingBatch } from "@/modules/shipment";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import { assertCronRequestAuthorized } from "@/shared/security/cron";

export async function GET(request: Request) {
  try {
    assertCronRequestAuthorized(request, process.env.CRON_SECRET);
    const tenantId = process.env.TRACKING_CRON_TENANT_ID?.trim();
    if (!tenantId) {
      throw new AppError("INTERNAL_ERROR", "Cron is not configured.", 500);
    }

    return ok(
      await syncTrackingBatch(tenantId, {
        actorType: "SYSTEM",
        actorId: "vercel-cron",
      }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.status, error.details);
    }
    return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
  }
}
