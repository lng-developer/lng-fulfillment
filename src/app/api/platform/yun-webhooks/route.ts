import {
  getYunWebhookEventStats,
  listYunWebhookEvents,
  validateYunWebhookEventListQuery,
} from "@/modules/yun-webhook";
import { ok } from "@/shared/api-response";
import { handlePlatformError, requirePlatformActor } from "../_shared";

export async function GET(request: Request) {
  try {
    await requirePlatformActor(request, "platform.yun-webhooks");
    const query = validateYunWebhookEventListQuery(
      new URL(request.url).searchParams,
    );
    const [result, stats] = await Promise.all([
      listYunWebhookEvents(query),
      getYunWebhookEventStats(query),
    ]);

    return ok(
      { events: result.data },
      { pagination: result.pagination, stats },
    );
  } catch (error) {
    return handlePlatformError(error);
  }
}
