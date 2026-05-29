import { NextResponse } from "next/server";
import { lookupYunExpressOmsOrder } from "@/modules/yunexpress-oms-lookup/service";
import { error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import {
  RATE_LIMIT_POLICIES,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "yunexpress-oms:label-redirect",
        getClientIp(request),
      ),
      ...RATE_LIMIT_POLICIES.expensiveRead,
    });

    const url = new URL(request.url);
    const code = url.searchParams.get("code")?.trim() ?? "";
    if (!code) {
      throw new AppError("VALIDATION_ERROR", "Label code is required.", 400);
    }

    const result = await lookupYunExpressOmsOrder(code);
    const labelUrl = result.labelPrint.labelUrl;
    if (!labelUrl) {
      throw new AppError("NOT_FOUND", "YunExpress label is not available.", 404);
    }

    return NextResponse.redirect(labelUrl);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.status, error.details);
    }

    return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
  }
}
