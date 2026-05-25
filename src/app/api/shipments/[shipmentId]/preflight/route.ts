import type { TenantRole } from "@prisma/client";
import {
  preflightShipmentExecution,
  validatePreflightShipmentExecutionInput,
} from "@/modules/shipment";
import { ok, error as errorResponse } from "@/shared/api-response";
import { getCurrentUserWithTenants } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";
import {
  RATE_LIMIT_POLICIES,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

const SHIPMENT_PREFLIGHT_ROLES: TenantRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const context = await requireCurrentTenantContext(SHIPMENT_PREFLIGHT_ROLES);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:shipments:preflight",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.expensiveRead,
    });

    const { shipmentId } = await params;
    const url = new URL(request.url);
    const input = validatePreflightShipmentExecutionInput(url.searchParams);
    const preflight = await preflightShipmentExecution(
      context.tenantId,
      shipmentId,
      input,
    );

    return ok(preflight);
  } catch (error) {
    return handleShipmentPreflightError(error);
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

function handleShipmentPreflightError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
