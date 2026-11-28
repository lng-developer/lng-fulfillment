import { requireTenantActor } from "@/shared/auth/context";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import {
  assertSameOriginRequest,
  rateLimitOrThrow,
  buildRateLimitKey,
  RATE_LIMIT_POLICIES,
} from "@/shared/security";
import {
  lookupMappings,
  upsertMapping,
  listMappings,
  addMapping,
  removeMapping,
} from "@/modules/vp-merchandise";
const roles = ["OWNER", "ADMIN", "OPERATOR"] as const;
export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor([...roles]);
    const query = new URL(request.url).searchParams;
    if (query.get("manage") === "1")
      return ok(
        await listMappings(
          actor.tenantId,
          query.get("search") ?? "",
          query.get("country") ?? "",
          Number(query.get("page") ?? 1),
        ),
      );
    return ok({
      mappings: await lookupMappings(
        actor.tenantId,
        query.get("country") ?? "",
        query.getAll("sku"),
      ),
    });
  } catch (error) {
    return handleError(error);
  }
}
export async function PUT(request: Request) {
  return mutate(request, "update");
}
export async function POST(request: Request) {
  return mutate(request, "create");
}
export async function DELETE(request: Request) {
  return mutate(request, "delete");
}
async function mutate(
  request: Request,
  operation: "update" | "create" | "delete",
) {
  try {
    const actor = await requireTenantActor([...roles]);
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "vp-merchandise",
        actor.tenantId,
        actor.actorUserId,
      ),
      ...RATE_LIMIT_POLICIES.dashboardMutation,
    });
    const body = await request.json().catch(() => null);
    if (operation === "delete") {
      await removeMapping(actor.tenantId, body);
      return ok({ deleted: true });
    }
    return ok({
      mapping: await (operation === "create" ? addMapping : upsertMapping)(
        actor.tenantId,
        actor.actorUserId,
        body,
      ),
    });
  } catch (error) {
    return handleError(error);
  }
}
function handleError(error: unknown) {
  return error instanceof AppError
    ? errorResponse(error.code, error.message, error.status, error.details)
    : errorResponse(
        "INTERNAL_ERROR",
        "Không truy cập được mapping khai báo VP. Kiểm tra migration hoặc thử lại.",
        500,
      );
}
