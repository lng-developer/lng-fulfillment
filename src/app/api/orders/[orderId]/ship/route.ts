import type { TenantRole } from "@prisma/client";
import {
  shipOrderWithYun,
  validateShipOrderInput,
} from "@/modules/shipment";
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

const ORDER_SHIP_ROLES: TenantRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const context = await requireCurrentTenantContext(ORDER_SHIP_ROLES);
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:orders:ship",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const { orderId } = await params;
    const input = validateShipOrderInput(orderId, await readJson(request));
    const result = await shipOrderWithYun(context.tenantId, input, {
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

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }
}

function handleOrderShipmentActionError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
