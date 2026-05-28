import { ok, error as errorResponse } from "@/shared/api-response";
import { getCurrentUserWithTenants } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";
import {
  createTenantMember,
  listTenantMembers,
  validateTenantMemberCreateInput,
} from "@/modules/tenant";
import {
  RATE_LIMIT_POLICIES,
  assertSameOriginRequest,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

export async function GET() {
  try {
    const context = await requireCurrentTenantContext();
    const members = await listTenantMembers(
      context.tenantId,
      context.actorUserId,
    );

    return ok({ members });
  } catch (error) {
    return handleMemberError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireCurrentTenantContext();
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:members:create",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const input = validateTenantMemberCreateInput(await readJson(request));
    const member = await createTenantMember(
      context.tenantId,
      input,
      context.actorUserId,
    );

    return ok({ member });
  } catch (error) {
    return handleMemberError(error);
  }
}

async function requireCurrentTenantContext() {
  const context = await getCurrentUserWithTenants();

  if (!context) {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const tenant = context.tenants.find(
    (membership) => membership.membershipStatus === "ACTIVE",
  );

  if (!tenant) {
    throw new AppError("FORBIDDEN", "Tenant access denied.", 403);
  }

  return {
    actorUserId: context.user.id,
    tenantId: tenant.tenantId,
  };
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }
}

function handleMemberError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
