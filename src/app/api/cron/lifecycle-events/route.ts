import { deliverPendingLifecycleEvents } from "@/modules/callback";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import { assertCronRequestAuthorized } from "@/shared/security/cron";

export async function GET(request: Request) {
  try {
    assertCronRequestAuthorized(request, process.env.CRON_SECRET);
    return ok(await deliverPendingLifecycleEvents());
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.status, error.details);
    }
    return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
  }
}
