import type { TenantRole } from "@prisma/client";
import { confirmOrderShipped } from "@/modules/shipment";
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

const ORDER_CONFIRM_ROLES: TenantRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const context = await requireCurrentTenantContext(ORDER_CONFIRM_ROLES);
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:orders:confirm-shipped",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const { orderId } = await params;
    const body = await parseConfirmShippedBody(request);
    const result = await confirmOrderShipped(
      context.tenantId,
      orderId,
      {
        actorType: "USER",
        actorId: context.actorUserId,
      },
      body,
    );

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

async function parseConfirmShippedBody(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Actual package is required.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("VALIDATION_ERROR", "Actual package is required.", 400);
  }

  const actualPackage = (body as Record<string, unknown>).actualPackage;
  if (
    !actualPackage ||
    typeof actualPackage !== "object" ||
    Array.isArray(actualPackage)
  ) {
    throw new AppError("VALIDATION_ERROR", "Actual package is required.", 400);
  }

  return {
    actualPackage: {
      weightKg: readPositiveNumber(actualPackage, "weightKg"),
      lengthCm: readPositiveNumber(actualPackage, "lengthCm"),
      widthCm: readPositiveNumber(actualPackage, "widthCm"),
      heightCm: readPositiveNumber(actualPackage, "heightCm"),
    },
  };
}

function readPositiveNumber(value: object, key: string) {
  const raw = (value as Record<string, unknown>)[key];
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${key} must be a positive number.`,
      400,
    );
  }

  return parsed;
}

function handleOrderShipmentActionError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
