import {
  createCarrierAccount,
  listManagedCarrierAccounts,
  validateCarrierAccountCreateInput,
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

export async function GET() {
  try {
    const context = await requireCurrentTenantContext();
    const carrierAccounts = await listManagedCarrierAccounts(
      context.tenantId,
      context.actorUserId,
    );

    return ok({ carrierAccounts });
  } catch (error) {
    return handleCarrierCredentialError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireCurrentTenantContext();
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:carrier-accounts:create",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const input = validateCarrierAccountCreateInput(await readJson(request));
    const carrierAccount = await createCarrierAccount(
      context.tenantId,
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
