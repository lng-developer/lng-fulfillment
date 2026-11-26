import { cancelFulfillmentOrder } from "@/modules/order/cancel-service";
import { requireTenantActor } from "@/shared/auth/context";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import { assertSameOriginRequest, buildRateLimitKey, getClientIp, RATE_LIMIT_POLICIES, rateLimitOrThrow } from "@/shared/security";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const actor = await requireTenantActor(["OWNER", "ADMIN", "OPERATOR"]);
    assertSameOriginRequest(request);
    rateLimitOrThrow({ key: buildRateLimitKey("dashboard:orders:cancel", getClientIp(request), actor.actorUserId, actor.tenantId),
      ...RATE_LIMIT_POLICIES.dashboardMutation });
    const body: unknown = await request.json().catch(() => null);
    const { orderId } = await params;
    return ok(await cancelFulfillmentOrder(actor.tenantId, orderId, actor.actorUserId, body));
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error.code, error.message, error.status, error.details);
    return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
  }
}
