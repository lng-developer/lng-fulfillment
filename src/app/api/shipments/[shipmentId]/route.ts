import { getTenantShipmentDetail } from "@/modules/shipment";
import { ok, error as errorResponse } from "@/shared/api-response";
import { getCurrentUserWithTenants } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const context = await requireCurrentTenantContext();
    const { shipmentId } = await params;
    const shipment = await getTenantShipmentDetail(context.tenantId, shipmentId);

    return ok({ shipment });
  } catch (error) {
    return handleShipmentError(error);
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

function handleShipmentError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
