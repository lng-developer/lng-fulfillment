import {
  listTenantOrders,
  validateOrderListQuery,
} from "@/modules/order";
import { ok, error as errorResponse } from "@/shared/api-response";
import { getCurrentUserWithTenants } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";

export async function GET(request: Request) {
  try {
    const context = await requireCurrentTenantContext();
    const url = new URL(request.url);
    const query = validateOrderListQuery(url.searchParams);
    const result = await listTenantOrders(context.tenantId, query);

    return ok(
      {
        orders: result.orders,
        ...(result.expandedOrders ? { expandedOrders: result.expandedOrders } : {}),
      },
      result.meta,
    );
  } catch (error) {
    return handleOrderError(error);
  }
}

async function requireCurrentTenantContext() {
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

  return {
    tenantId: tenant.tenantId,
  };
}

function handleOrderError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
