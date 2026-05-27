import {
  getPlatformTenantDetail,
  updatePlatformTenant,
  validatePlatformTenantUpdateInput,
} from "@/modules/platform";
import { ok } from "@/shared/api-response";
import {
  assertPlatformMutationAllowed,
  handlePlatformError,
  readJson,
  requirePlatformActor,
} from "../../_shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    await requirePlatformActor(request, "platform.tenant-detail");
    const { tenantId } = await params;
    const tenant = await getPlatformTenantDetail(tenantId);

    return ok({ tenant });
  } catch (error) {
    return handlePlatformError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const actor = await requirePlatformActor(request, "platform.tenant-detail");
    await assertPlatformMutationAllowed(request, actor, "tenants:update");
    const { tenantId } = await params;
    const input = validatePlatformTenantUpdateInput(await readJson(request));
    const tenant = await updatePlatformTenant(tenantId, input, actor);

    return ok({ tenant });
  } catch (error) {
    return handlePlatformError(error);
  }
}
