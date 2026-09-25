import { syncTrackingBatch } from "@/modules/shipment";
import { canPullTrackingFromPortal } from "@/modules/shipment/tracking-pull-access";
import { verifyTenantApiKeyForRequest } from "@/modules/tenant";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";

export async function POST(request: Request) {
  try {
    const context = await verifyTenantApiKeyForRequest(readApiKey(request));
    if (!context) throw new AppError("UNAUTHORIZED", "Invalid API key.", 401);
    if (!canPullTrackingFromPortal(context.scopes)) {
      throw new AppError("FORBIDDEN", "Tracking scope is required.", 403);
    }

    return ok(
      await syncTrackingBatch(context.tenantId, {
        actorType: "SYSTEM",
        actorId: context.apiKeyId,
      }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.status, error.details);
    }
    return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
  }
}

function readApiKey(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    if (token) return token;
  }

  throw new AppError("UNAUTHORIZED", "API key is required.", 401);
}
