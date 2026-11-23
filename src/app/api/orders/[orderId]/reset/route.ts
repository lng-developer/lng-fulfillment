import type { TenantRole } from "@prisma/client";
import { resetCancelledOrder } from "@/modules/shipment";
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

const ORDER_RESET_ROLES: TenantRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const context = await requireCurrentTenantContext(ORDER_RESET_ROLES);
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:orders:reset",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const { orderId } = await params;
    const text = await request.text();
    let body: unknown = {};
    try { body = text ? JSON.parse(text) : {}; } catch {
      throw new AppError("VALIDATION_ERROR", "Invalid reset request.", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new AppError("VALIDATION_ERROR", "Invalid reset request.", 400);
    }
    const account = (body as Record<string, unknown>).oldCarrierAccountId;
    if (account !== undefined && (typeof account !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(account))) {
      throw new AppError("VALIDATION_ERROR", "Invalid old carrier account.", 400);
    }
    const result = await resetCancelledOrder(context.tenantId, orderId, {
      actorType: "USER",
      actorId: context.actorUserId,
    }, account as string | undefined);

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
