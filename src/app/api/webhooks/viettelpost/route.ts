import { receiveViettelWebhook } from "@/modules/shipment/viettel-webhook-service";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import { buildRateLimitKey, getClientIp, rateLimitOrThrow, RATE_LIMIT_POLICIES } from "@/shared/security";
export async function GET() {
  return Response.json({ success: true, message: "Viettel Post webhook endpoint is active" });
}
export async function POST(request: Request) {
  try {
    rateLimitOrThrow({ key: buildRateLimitKey("viettel-webhook", getClientIp(request)), ...RATE_LIMIT_POLICIES.portalIp });
    const raw = await request.text();
    if (raw.length > 256_000) throw new AppError("VALIDATION_ERROR", "Webhook payload too large.", 413);
    let body: unknown;
    try { body = JSON.parse(raw); }
    catch { throw new AppError("VALIDATION_ERROR", "Invalid webhook JSON.", 400); }
    // Preserve deployment scope; never trust tenantId from a public payload.
    const tenantId = process.env.TRACKING_CRON_TENANT_ID?.trim() || "cmqeydawp0003l804o09ye1jv";
    return ok(await receiveViettelWebhook(tenantId, body));
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error.code, error.message, error.status, error.details);
    console.error("[viettel-post-webhook] failed", { code: "INTERNAL_ERROR" });
    return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
  }
}
