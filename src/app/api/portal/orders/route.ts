import { receivePortalOrders } from "@/modules/order";
import { verifyTenantApiKeyForRequest } from "@/modules/tenant";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import {
  RATE_LIMIT_POLICIES,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    rateLimitOrThrow({
      key: buildRateLimitKey("portal:orders:ip", clientIp),
      ...RATE_LIMIT_POLICIES.portalIp,
    });

    const rawApiKey = readPortalApiKey(request);
    const tenantContext = await verifyTenantApiKeyForRequest(rawApiKey);

    if (!tenantContext) {
      throw new AppError("UNAUTHORIZED", "Invalid API key.", 401);
    }

    rateLimitOrThrow({
      key: buildRateLimitKey(
        "portal:orders:tenant-api-key",
        clientIp,
        tenantContext.tenantId,
        tenantContext.apiKeyId,
      ),
      ...RATE_LIMIT_POLICIES.portalTenantApiKey,
    });

    const result = await receivePortalOrders(await readJson(request), tenantContext);

    return ok(result);
  } catch (error) {
    return handlePortalOrderError(error);
  }
}

function readPortalApiKey(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearerPrefix = "Bearer ";
  if (authorization?.startsWith(bearerPrefix)) {
    const token = authorization.slice(bearerPrefix.length).trim();
    if (token) {
      return token;
    }
  }

  const apiKey = request.headers.get("x-tenant-api-key")?.trim();
  if (apiKey) {
    return apiKey;
  }

  throw new AppError("UNAUTHORIZED", "API key is required.", 401);
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }
}

function handlePortalOrderError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
