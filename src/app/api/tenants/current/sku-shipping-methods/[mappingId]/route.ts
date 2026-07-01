import {
  deleteSkuShippingMethodMapping,
  updateSkuShippingMethodMapping,
  validateSkuShippingMethodMappingUpdateInput,
} from "@/modules/auto-shipment";
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

const MANAGE_ROLES = ["OWNER", "ADMIN"] as const;

type RouteContext = {
  params: Promise<{ mappingId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireTenantActor([...MANAGE_ROLES]);
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:sku-shipping-methods:update",
        getClientIp(request),
        actor.actorUserId,
        actor.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const { mappingId } = await context.params;
    const input = validateSkuShippingMethodMappingUpdateInput(
      await readJson(request),
    );
    const mapping = await updateSkuShippingMethodMapping(
      actor.tenantId,
      mappingId,
      input,
      actor.actorUserId,
    );

    return ok({ mapping });
  } catch (error) {
    return handleShipmentAutomationError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await requireTenantActor([...MANAGE_ROLES]);
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "dashboard:sku-shipping-methods:delete",
        getClientIp(request),
        actor.actorUserId,
        actor.tenantId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });

    const { mappingId } = await context.params;
    const result = await deleteSkuShippingMethodMapping(
      actor.tenantId,
      mappingId,
      actor.actorUserId,
    );

    return ok(result);
  } catch (error) {
    return handleShipmentAutomationError(error);
  }
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }
}

function handleShipmentAutomationError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
