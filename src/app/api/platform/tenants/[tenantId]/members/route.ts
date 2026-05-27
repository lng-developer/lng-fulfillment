import {
  createPlatformTenantMember,
  listPlatformTenantMembers,
  validatePlatformMemberCreateInput,
} from "@/modules/platform";
import { ok } from "@/shared/api-response";
import {
  assertPlatformMutationAllowed,
  handlePlatformError,
  readJson,
  requirePlatformActor,
} from "../../../_shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    await requirePlatformActor(request, "platform.tenant-members");
    const { tenantId } = await params;
    const members = await listPlatformTenantMembers(tenantId);

    return ok({ members });
  } catch (error) {
    return handlePlatformError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const actor = await requirePlatformActor(request, "platform.tenant-members");
    await assertPlatformMutationAllowed(request, actor, "members:create");
    const { tenantId } = await params;
    const input = validatePlatformMemberCreateInput(await readJson(request));
    const member = await createPlatformTenantMember(tenantId, input, actor);

    return ok({ member });
  } catch (error) {
    return handlePlatformError(error);
  }
}
