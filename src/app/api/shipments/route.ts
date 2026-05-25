import type { TenantRole } from "@prisma/client";
import {
  createDraftShipment,
  listTenantShipments,
  validateCreateDraftShipmentInput,
  validateShipmentListQuery,
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

const SHIPMENT_CREATE_ROLES: TenantRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export async function GET(request: Request) {
  try {
    const context = await requireCurrentTenantContext();
    const url = new URL(request.url);
    const query = validateShipmentListQuery(url.searchParams);
    const result = await listTenantShipments(context.tenantId, query);

    return ok({ shipments: result.shipments }, result.meta);
  } catch (error) {
    return handleShipmentError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireCurrentTenantContext(SHIPMENT_CREATE_ROLES);
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:shipments:create",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const input = validateCreateDraftShipmentInput(await readJson(request));
    const shipment = await createDraftShipment(context.tenantId, input, {
      actorType: "USER",
      actorId: context.actorUserId,
    });

    return ok({ shipment });
  } catch (error) {
    return handleShipmentError(error);
  }
}

async function requireCurrentTenantContext(allowedRoles?: TenantRole[]) {
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

  if (allowedRoles?.length && !allowedRoles.includes(tenant.role)) {
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

function handleShipmentError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
