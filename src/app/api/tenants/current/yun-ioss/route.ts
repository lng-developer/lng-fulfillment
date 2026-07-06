import {
  getTenantYunIossSetting,
  updateTenantYunIossSetting,
  validateTenantYunIossSettingInput,
} from "@/modules/yun-ioss";
import { ok, error as errorResponse } from "@/shared/api-response";
import { requireTenantActor } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";
import {
  RATE_LIMIT_POLICIES,
  assertSameOriginRequest,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

const MANAGE_ROLES = ["OWNER", "ADMIN"] as const;

export async function GET() {
  try {
    const context = await requireTenantActor([...MANAGE_ROLES]);
    const setting = await getTenantYunIossSetting(
      context.tenantId,
      context.actorUserId,
    );

    return ok({ setting });
  } catch (error) {
    return handleYunIossError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireTenantActor([...MANAGE_ROLES]);
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:yun-ioss:update",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const input = validateTenantYunIossSettingInput(await readJson(request));
    const setting = await updateTenantYunIossSetting(
      context.tenantId,
      input,
      context.actorUserId,
    );

    return ok({ setting });
  } catch (error) {
    return handleYunIossError(error);
  }
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }
}

function handleYunIossError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
