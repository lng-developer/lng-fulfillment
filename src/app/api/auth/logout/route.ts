import { NextRequest } from "next/server";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/shared/auth";
import { logout } from "@/modules/identity";
import {
  RATE_LIMIT_POLICIES,
  assertSameOriginRequest,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey("auth:logout", getClientIp(request)),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    await logout(token);

    const response = ok({ loggedOut: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...getSessionCookieOptions(),
      maxAge: 0,
    });

    return response;
  } catch (error) {
    return handleAuthError(error);
  }
}

function handleAuthError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
