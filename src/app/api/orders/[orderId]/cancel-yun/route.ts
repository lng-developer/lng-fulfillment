import type { TenantRole } from "@prisma/client";
import { cancelOrderYunShipment } from "@/modules/shipment";
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

const ORDER_CANCEL_ROLES: TenantRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const timing = createSafeTimingLogger("orderCancelYunRoute");
  try {
    const context = await requireTenantActor(ORDER_CANCEL_ROLES);
    timing("contextLoaded");
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:orders:cancel-yun",
        getClientIp(request),
        context.actorUserId,
        context.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });
    timing("guardsPassed");

    const { orderId } = await params;
    timing("paramsResolved");
    const result = await cancelOrderYunShipment(context.tenantId, orderId, {
      actorType: "USER",
      actorId: context.actorUserId,
    });
    timing("serviceCompleted", {
      shipmentStatus: result.shipment.status,
      orderStatus: result.orderStatus,
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

function handleOrderShipmentActionError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
