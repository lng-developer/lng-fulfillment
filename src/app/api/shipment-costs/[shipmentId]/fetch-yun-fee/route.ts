import type { TenantRole } from "@prisma/client";
import { fetchYunActualShippingFee } from "@/modules/shipment-cost/service";
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

const SHIPMENT_COST_MUTATION_ROLES: TenantRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const context = await requireCurrentTenantContext(SHIPMENT_COST_MUTATION_ROLES);
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:shipment-costs:fetch-yun-fee",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const { shipmentId } = await params;
    const shipmentCost = await fetchYunActualShippingFee({
      tenantId: context.tenantId,
      shipmentId,
    });

    return ok({ shipmentCost });
  } catch (error) {
    return handleError(error);
  }
}

async function requireCurrentTenantContext(allowedRoles: TenantRole[]) {
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

  if (!allowedRoles.includes(tenant.role)) {
    throw new AppError("FORBIDDEN", "Insufficient tenant role.", 403);
  }

  return {
    actorUserId: context.user.id,
    tenantId: tenant.tenantId,
  };
}

function handleError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
