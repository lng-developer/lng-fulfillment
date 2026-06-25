import { buildYunWebhookDebugLog } from "@/modules/yun-webhook/debug";
import { receiveYunWebhookEvent } from "@/modules/yun-webhook";
import { AppError } from "@/shared/errors";

export async function GET() {
  return Response.json({
    success: true,
    message: "YunExpress webhook endpoint is alive",
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const debugLog = buildYunWebhookDebugLog(request.url, request.headers, rawBody);
    console.log("=== YUNEXPRESS WEBHOOK ===");
    console.log("URL:", debugLog.url);
    console.log("HEADERS:", debugLog.headers);
    console.log("BODY:", debugLog.body);

    await receiveYunWebhookEvent({
      rawBody,
      timestamp: request.headers.get("X-Openapi-Request-Timestamp"),
      signature: request.headers.get("X-Openapi-Signature"),
    });

    return new Response("success", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
      status: 200,
    });
  } catch (error) {
    return handleYunWebhookError(error);
  }
}

function handleYunWebhookError(error: unknown) {
  if (error instanceof AppError) {
    if (error.code === "UNAUTHORIZED") {
      return new Response("invalid signature", { status: error.status });
    }

    if (error.code === "VALIDATION_ERROR") {
      return new Response("invalid request", { status: error.status });
    }

    if (error.code === "FORBIDDEN") {
      return new Response("disabled", { status: error.status });
    }
  }

  return new Response("error", { status: 500 });
}
