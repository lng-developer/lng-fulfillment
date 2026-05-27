import {
  createPlatformTenant,
  listPlatformTenants,
  validatePlatformTenantCreateInput,
  validatePlatformTenantListQuery,
} from "@/modules/platform";
import { ok } from "@/shared/api-response";
import {
  assertPlatformMutationAllowed,
  handlePlatformError,
  readJson,
  requirePlatformActor,
} from "../_shared";

export async function GET(request: Request) {
  try {
    await requirePlatformActor(request, "platform.tenants");
    const query = validatePlatformTenantListQuery(new URL(request.url).searchParams);
    const result = await listPlatformTenants(query);

    return ok(
      { tenants: result.data },
      { pagination: result.pagination },
    );
  } catch (error) {
    return handlePlatformError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePlatformActor(request, "platform.tenants");
    await assertPlatformMutationAllowed(request, actor, "tenants:create");
    const input = validatePlatformTenantCreateInput(await readJson(request));
    const tenant = await createPlatformTenant(input, actor);

    return ok({ tenant });
  } catch (error) {
    return handlePlatformError(error);
  }
}
