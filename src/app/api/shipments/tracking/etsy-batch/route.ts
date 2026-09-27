import type { TenantRole } from "@prisma/client";
import { syncEtsyTrackingBatch } from "@/modules/shipment";
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

const ALLOWED_ROLES: TenantRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export async function POST(request: Request) {
  try {
    const context = await requireCurrentTenantContext();
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:shipments:etsy-tracking-batch",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    return ok(await syncEtsyTrackingBatch(context.tenantId, {
      actorType: "USER",
      actorId: context.actorUserId,
    }));
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.status, error.details);
    }
    return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
  }
}

async function requireCurrentTenantContext() {
  const context = await getCurrentUserWithTenants();
  if (!context) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  const tenant = context.tenants.find((item) => item.membershipStatus === "ACTIVE");
  if (!tenant || !ALLOWED_ROLES.includes(tenant.role)) {
    throw new AppError("FORBIDDEN", "Insufficient tenant role.", 403);
  }
  return { actorUserId: context.user.id, tenantId: tenant.tenantId };
}
