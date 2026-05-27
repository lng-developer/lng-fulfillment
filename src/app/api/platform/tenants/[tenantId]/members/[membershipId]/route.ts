import {
  updatePlatformTenantMember,
  validatePlatformMemberUpdateInput,
} from "@/modules/platform";
import { ok } from "@/shared/api-response";
import {
  assertPlatformMutationAllowed,
  handlePlatformError,
  readJson,
  requirePlatformActor,
} from "../../../../_shared";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; membershipId: string }> },
) {
  try {
    const actor = await requirePlatformActor(request, "platform.tenant-member");
    await assertPlatformMutationAllowed(request, actor, "members:update");
    const { tenantId, membershipId } = await params;
    const input = validatePlatformMemberUpdateInput(await readJson(request));
    const member = await updatePlatformTenantMember(
      tenantId,
      membershipId,
      input,
      actor,
    );

    return ok({ member });
  } catch (error) {
    return handlePlatformError(error);
  }
}
