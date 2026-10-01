import { getPortalOrderProcessingStatus } from "@/modules/order";
import { verifyTenantApiKeyForRequest } from "@/modules/tenant";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ externalOrderId: string }> },
) {
  try {
    const context = await verifyTenantApiKeyForRequest(readApiKey(request));
    if (!context || !context.scopes.includes("orders:write")) {
      throw new AppError("UNAUTHORIZED", "Invalid API key.", 401);
    }

    const { externalOrderId } = await params;
    return ok(
      await getPortalOrderProcessingStatus(context.tenantId, externalOrderId),
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
