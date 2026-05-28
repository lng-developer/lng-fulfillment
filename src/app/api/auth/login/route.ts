import { NextRequest } from "next/server";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/shared/auth";
import {
  loginWithEmailPassword,
  validateLoginInput,
} from "@/modules/identity";
import {
  RATE_LIMIT_POLICIES,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    rateLimitOrThrow({
      key: buildRateLimitKey("auth:login:ip", clientIp),
      ...RATE_LIMIT_POLICIES.loginIp,
    });

    const body = await readJson(request);
    const credentials = validateLoginInput(body);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "auth:login:email",
        clientIp,
        credentials.email,
      ),
      ...RATE_LIMIT_POLICIES.loginEmail,
    });

    const result = await loginWithEmailPassword(
      credentials.email,
      credentials.password,
    );

    const response = ok({
      user: result.user,
      tenants: result.tenants,
      platformAdmin: result.platformAdmin,
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      result.sessionToken,
      getSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    return handleAuthError(error);
  }
}

async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }
}

function handleAuthError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
