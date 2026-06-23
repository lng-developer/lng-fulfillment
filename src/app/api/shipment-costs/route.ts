import type { ShipmentActualFeeStatus, TenantRole } from "@prisma/client";
import { listShipmentCostRecords } from "@/modules/shipment-cost/service";
import { ok, error as errorResponse } from "@/shared/api-response";
import { getCurrentUserWithTenants } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";

const SHIPMENT_COST_VIEW_ROLES: TenantRole[] = ["OWNER", "ADMIN", "OPERATOR", "VIEWER"];
const FEE_STATUSES = ["PENDING", "AVAILABLE", "FAILED"] as const;

export async function GET(request: Request) {
  try {
    const context = await requireCurrentTenantContext(SHIPMENT_COST_VIEW_ROLES);
    const url = new URL(request.url);
    const result = await listShipmentCostRecords(context.tenantId, {
      page: readPositiveInteger(url.searchParams.get("page")),
      pageSize: readPositiveInteger(url.searchParams.get("pageSize")),
      status: readFeeStatus(url.searchParams.get("status")),
      search: url.searchParams.get("search") ?? undefined,
    });

    return ok(
      { shipmentCosts: result.items },
      { pagination: result.pagination },
    );
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

function readPositiveInteger(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function readFeeStatus(value: string | null): ShipmentActualFeeStatus | undefined {
  return FEE_STATUSES.includes(value as never)
    ? (value as ShipmentActualFeeStatus)
    : undefined;
}

function handleError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
