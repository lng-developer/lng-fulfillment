import { syncViettelPostTrackingBatch } from "@/modules/shipment";
import { ok, error as errorResponse } from "@/shared/api-response";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { assertCronRequestAuthorized } from "@/shared/security/cron";

export async function GET(request: Request) {
  try {
    assertCronRequestAuthorized(request, process.env.CRON_SECRET);
    let tenantId = process.env.TRACKING_CRON_TENANT_ID?.trim();
    if (!tenantId) {
      const account = await prisma.carrierAccount.findFirst({
        where: { carrierCode: "VIETTEL_POST" },
        select: { tenantId: true },
      });
      tenantId = account?.tenantId;
    }

    if (!tenantId) {
      throw new AppError("INTERNAL_ERROR", "Cron tenant is not configured.", 500);
    }

    const result = await syncViettelPostTrackingBatch(tenantId, {
      actorType: "SYSTEM",
      actorId: "viettel-post-cron",
    });

    return ok(result);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.status, error.details);
    }
    return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
  }
}
