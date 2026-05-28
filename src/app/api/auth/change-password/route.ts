import { ok, error as errorResponse } from "@/shared/api-response";
import { requireUser } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";
import {
  changePassword,
  validateChangePasswordInput,
} from "@/modules/identity";
import {
  RATE_LIMIT_POLICIES,
  assertSameOriginRequest,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "auth:change-password",
        getClientIp(request),
        user.id,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const input = validateChangePasswordInput(await readJson(request));
    await changePassword(user.id, input);

    return ok({ changed: true });
  } catch (error) {
    return handleAuthError(error);
  }
}

async function readJson(request: Request) {
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
