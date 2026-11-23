import { getShipmentLabels } from "@/modules/shipment";
import { ok, error as errorResponse } from "@/shared/api-response";
import { getCurrentUserWithTenants } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const context = await requireCurrentTenantContext();
    const { shipmentId } = await params;
    const accountId = new URL(request.url).searchParams.get("carrierAccountId") || undefined;
    if (accountId && !/^[a-zA-Z0-9_-]{1,128}$/.test(accountId)) throw new AppError("VALIDATION_ERROR", "Invalid carrier account.", 400);
    const labels = await getShipmentLabels(context.tenantId, shipmentId, accountId);

    const response = ok(labels);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
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
