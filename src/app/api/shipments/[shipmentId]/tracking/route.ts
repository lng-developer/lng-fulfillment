import type { TenantRole } from "@prisma/client";
import { syncShipmentTracking } from "@/modules/shipment";
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

const SHIPMENT_TRACKING_SYNC_ROLES: TenantRole[] = [
  "OWNER",
  "ADMIN",
  "OPERATOR",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const context = await requireCurrentTenantContext(
      SHIPMENT_TRACKING_SYNC_ROLES,
    );
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:shipments:tracking",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const { shipmentId } = await params;
    const result = await syncShipmentTracking(context.tenantId, shipmentId, {
      actorType: "USER",
      actorId: context.actorUserId,
    });

    return ok(result);
  } catch (error) {
    return handleShipmentTrackingSyncError(error);
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

function handleShipmentTrackingSyncError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
