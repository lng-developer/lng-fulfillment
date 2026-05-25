import {
  getManagedCarrierAccount,
  updateCarrierAccount,
  validateCarrierAccountUpdateInput,
} from "@/modules/carrier";
import { ok, error as errorResponse } from "@/shared/api-response";
import { getCurrentUserWithTenants } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";
import {
  RATE_LIMIT_POLICIES,
  assertSameOriginRequest,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ carrierAccountId: string }> },
) {
  try {
    const { carrierAccountId } = await params;
    const context = await requireCurrentTenantContext();
    const carrierAccount = await getManagedCarrierAccount(
      context.tenantId,
      carrierAccountId,
      context.actorUserId,
    );

    return ok({ carrierAccount });
  } catch (error) {
    return handleCarrierCredentialError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ carrierAccountId: string }> },
) {
  try {
    const { carrierAccountId } = await params;
    const context = await requireCurrentTenantContext();
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:carrier-accounts:update",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const input = validateCarrierAccountUpdateInput(await readJson(request));
    const carrierAccount = await updateCarrierAccount(
      context.tenantId,
      carrierAccountId,
      input,
      context.actorUserId,
    );

    return ok({ carrierAccount });
  } catch (error) {
    return handleCarrierCredentialError(error);
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

function handleCarrierCredentialError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
