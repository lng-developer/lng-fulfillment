import type { TenantRole } from "@prisma/client";
import {
  shipOrderWithYun,
  validateShipOrderInput,
} from "@/modules/shipment";
import { ok, error as errorResponse } from "@/shared/api-response";
import { requireTenantActor } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";
import {
  RATE_LIMIT_POLICIES,
  assertSameOriginRequest,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";
import { createSafeTimingLogger } from "@/shared/timing";

const ORDER_SHIP_ROLES: TenantRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const timing = createSafeTimingLogger("orderShipRoute");
  try {
    const context = await requireTenantActor(ORDER_SHIP_ROLES);
    timing("contextLoaded");
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:orders:ship",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });
    timing("guardsPassed");

    const { orderId } = await params;
    timing("paramsResolved");
    const input = validateShipOrderInput(orderId, await readJson(request));
    timing("bodyParsed");
    const result = await shipOrderWithYun(context.tenantId, input, {
      actorType: "USER",
      actorId: context.actorUserId,
    });
    timing("serviceCompleted", {
      shipmentStatus: result.shipment.status,
      trackingPresent: Boolean(result.shipment.trackingNumber),
      labelPresent: Boolean(result.shipment.labelUrl),
    });

    return ok(result);
  } catch (error) {
    timing("failed", {
      code: error instanceof AppError ? error.code : "INTERNAL_ERROR",
      status: error instanceof AppError ? error.status : 500,
    });
    return handleOrderShipmentActionError(error);
  }
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }
}

function handleOrderShipmentActionError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
