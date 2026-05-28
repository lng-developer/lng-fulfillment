import { error as errorResponse } from "@/shared/api-response";
import {
  getCurrentUserWithTenants,
  requirePlatformContextFromSession,
} from "@/shared/auth/context";
import { AppError } from "@/shared/errors";
import {
  recordPlatformDeniedTelemetry,
  type PlatformAdminContext,
} from "@/modules/platform";
import {
  RATE_LIMIT_POLICIES,
  assertSameOriginRequest,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

const DENIED_TELEMETRY_POLICY = { limit: 20, windowMs: 60_000 };

export async function requirePlatformActor(
  request?: Request,
  routeGroup = "platform.unknown",
) {
  const context = await getCurrentUserWithTenants();
  if (!context) {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }

  try {
    return requirePlatformContextFromSession(context, true);
  } catch (error) {
    if (error instanceof AppError && error.code === "FORBIDDEN") {
      await recordDeniedTelemetryIfAllowed({
        actorUserId: context.user.id,
        actorPlatformRole: context.platformAdmin?.role,
        event: "PLATFORM_ACCESS_DENIED",
        method: request?.method ?? "UNKNOWN",
        routeGroup,
        reasonCode: "PLATFORM_ACCESS_REQUIRED",
        request,
      });
    }

    throw error;
  }
}

export async function assertPlatformMutationAllowed(
  request: Request,
  actor: PlatformAdminContext,
  scope: string,
) {
  if (actor.role !== "PLATFORM_ADMIN") {
    await recordDeniedTelemetryIfAllowed({
      actorUserId: actor.userId,
      actorPlatformRole: actor.role,
      event: "PLATFORM_MUTATION_DENIED",
      method: request.method,
      routeGroup: `platform.${scope}`,
      reasonCode: "PLATFORM_ADMIN_REQUIRED",
      request,
    });
    throw new AppError("FORBIDDEN", "Platform admin mutation access required.", 403);
  }

  assertSameOriginRequest(request);
  rateLimitOrThrow({
    key: buildRateLimitKey(
      `platform:${scope}`,
      getClientIp(request),
      actor.userId,
    ),
    ...RATE_LIMIT_POLICIES.dashboardMutation,
  });
}

async function recordDeniedTelemetryIfAllowed(input: {
  actorUserId: string;
  actorPlatformRole?: PlatformAdminContext["role"];
  event: "PLATFORM_ACCESS_DENIED" | "PLATFORM_MUTATION_DENIED";
  method: string;
  routeGroup: string;
  reasonCode: string;
  request?: Request;
}) {
  try {
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "platform:denied-telemetry",
        input.actorUserId,
        input.event,
        input.routeGroup,
        input.request ? getClientIp(input.request) : "unknown",
      ),
      ...DENIED_TELEMETRY_POLICY,
    });
  } catch {
    return;
  }

  await recordPlatformDeniedTelemetry({
    actorUserId: input.actorUserId,
    actorPlatformRole: input.actorPlatformRole,
    event: input.event,
    method: input.method,
    routeGroup: input.routeGroup,
    reasonCode: input.reasonCode,
  });
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }
}

export function handlePlatformError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
