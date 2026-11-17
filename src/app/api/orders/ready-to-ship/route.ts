import type { TenantRole } from "@prisma/client";
import { markOrdersReadyToShip } from "@/modules/order";
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

const ORDER_QC_ROLES: TenantRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export async function POST(request: Request) {
  try {
    const context = await requireCurrentTenantContext(ORDER_QC_ROLES);
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:orders:ready-to-ship",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const body = await readJson(request);
    const orderIds = Array.isArray(body?.orderIds)
      ? body.orderIds.filter(
          (id: unknown): id is string => typeof id === "string" && Boolean(id.trim()),
        )
      : undefined;
    const barcode =
      typeof body?.barcode === "string" && body.barcode.trim()
        ? body.barcode.trim()
        : undefined;
    const note =
      typeof body?.note === "string" && body.note.trim()
        ? body.note.trim()
        : undefined;

    if (!orderIds?.length && !barcode) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Vui lòng cung cấp mã barcode hoặc danh sách mã đơn hàng.",
        400,
      );
    }

    const result = await markOrdersReadyToShip(
      context.tenantId,
      { orderIds, barcode, note },
      { actorType: "USER", actorId: context.actorUserId },
    );

    return ok(result);
  } catch (error) {
    return handleOrderActionError(error);
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

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }
}

function handleOrderActionError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
