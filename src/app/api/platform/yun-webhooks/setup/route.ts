import { getYunWebhookSetupStatus } from "@/modules/yun-webhook";
import { ok } from "@/shared/api-response";
import { handlePlatformError, requirePlatformActor } from "../../_shared";

export async function GET(request: Request) {
  try {
    await requirePlatformActor(request, "platform.yun-webhooks");
    const setup = getYunWebhookSetupStatus(new URL(request.url).origin);

    return ok({ setup });
  } catch (error) {
    return handlePlatformError(error);
  }
}
