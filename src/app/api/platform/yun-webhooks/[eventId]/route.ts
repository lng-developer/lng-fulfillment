import { getYunWebhookEventDetail } from "@/modules/yun-webhook";
import { ok } from "@/shared/api-response";
import { handlePlatformError, requirePlatformActor } from "../../_shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    await requirePlatformActor(request, "platform.yun-webhooks");
    const { eventId } = await params;
    const event = await getYunWebhookEventDetail(eventId);

    return ok({ event });
  } catch (error) {
    return handlePlatformError(error);
  }
}
