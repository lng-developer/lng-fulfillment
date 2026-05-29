import { receivePortalOrders } from "@/modules/order";
import { verifyTenantApiKeyForRequest } from "@/modules/tenant";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import { NextResponse } from "next/server";
import {
  RATE_LIMIT_POLICIES,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

export async function OPTIONS(request: Request) {
  return withPortalCors(new NextResponse(null, { status: 204 }), request);
}

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

    return withPortalCors(ok(result), request);
  } catch (error) {
    return withPortalCors(handlePortalOrderError(error), request);
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

function withPortalCors(response: Response, request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigin = resolveAllowedPortalOrigin(origin);

  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Tenant-API-Key",
  );
  response.headers.set("Access-Control-Max-Age", "600");

  return response;
}

function resolveAllowedPortalOrigin(origin: string | null) {
  if (!origin) {
    return null;
  }

  const configuredOrigins = (process.env.PORTAL_CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredOrigins.includes(origin)) {
    return origin;
  }

  if (
    isLocalLikeEnvironment() &&
    /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  ) {
    return origin;
  }

  return null;
}

function isLocalLikeEnvironment() {
  const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV;
  return ["local", "test", "development"].includes(appEnv ?? "");
}
