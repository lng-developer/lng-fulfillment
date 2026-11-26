import type { OrderSourceChannel, OrderStatus, TenantRole } from "@prisma/client";
import { exportOrdersCsv, parsePendingVpFilter, validateOrderListQuery } from "@/modules/order";
import { error as errorResponse } from "@/shared/api-response";
import { getCurrentUserWithTenants } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";
import {
  RATE_LIMIT_POLICIES,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

const ORDER_EXPORT_ROLES: TenantRole[] = [
  "OWNER",
  "ADMIN",
  "OPERATOR",
  "VIEWER",
];

export async function GET(request: Request) {
  try {
    const context = await requireCurrentTenantContext(ORDER_EXPORT_ROLES);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:orders:export",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.expensiveRead,
    });

    const { searchParams } = new URL(request.url);
    const orderIdsParam = searchParams.get("orderIds");
    const orderIds = orderIdsParam
      ? orderIdsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    const status = (searchParams.get("status") || undefined) as
      | OrderStatus
      | undefined;
    const sourceChannel = (searchParams.get("sourceChannel") || undefined) as
      | OrderSourceChannel
      | undefined;
    const search = searchParams.get("search") || undefined;
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr
      ? /^\d{4}-\d{2}-\d{2}$/.test(toStr)
        ? new Date(`${toStr}T23:59:59.999Z`)
        : new Date(toStr)
      : undefined;

    const result = await exportOrdersCsv(context.tenantId, {
      orderIds,
      status,
      sourceChannel,
      search,
      pendingVp: parsePendingVpFilter(searchParams.get("pendingVp")),
      sortOrder: validateOrderListQuery(searchParams).sortOrder,
      from,
      to,
    });

    return new Response(result.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleOrderExportError(err);
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

function handleOrderExportError(err: unknown) {
  if (err instanceof AppError) {
    return errorResponse(err.code, err.message, err.status, err.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
