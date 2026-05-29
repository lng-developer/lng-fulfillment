import type { TenantRole } from "@prisma/client";
import { cancelOrderYunShipment } from "@/modules/shipment";
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

const ORDER_CANCEL_ROLES: TenantRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const context = await requireCurrentTenantContext(ORDER_CANCEL_ROLES);
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:orders:cancel-yun",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const { orderId } = await params;
    const result = await cancelOrderYunShipment(context.tenantId, orderId, {
      actorType: "USER",
      actorId: context.actorUserId,
    });

    return ok(result);
  } catch (error) {
    return handleOrderShipmentActionError(error);
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

function handleOrderShipmentActionError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
