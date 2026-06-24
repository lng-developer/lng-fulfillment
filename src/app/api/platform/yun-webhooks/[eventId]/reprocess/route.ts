import { reprocessYunWebhookEvent } from "@/modules/yun-webhook";
import { ok } from "@/shared/api-response";
import {
  assertPlatformMutationAllowed,
  handlePlatformError,
  requirePlatformActor,
} from "../../../_shared";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const actor = await requirePlatformActor(request, "platform.yun-webhooks");
    await assertPlatformMutationAllowed(request, actor, "yun-webhooks");
    const { eventId } = await params;
    const event = await reprocessYunWebhookEvent(eventId);

    return ok({ event });
  } catch (error) {
    return handlePlatformError(error);
  }
}
