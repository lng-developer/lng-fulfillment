import { getCurrentUserWithTenants } from "@/shared/auth/context";
import {
  assertSameOriginRequest,
  rateLimitOrThrow,
  buildRateLimitKey,
  getClientIp,
  RATE_LIMIT_POLICIES,
} from "@/shared/security";
import {
  getVpBatchPdf,
  validateLabelBatch,
} from "@/modules/shipment/batch-labels";
import { AppError } from "@/shared/errors";
import { error as errorResponse } from "@/shared/api-response";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const context = await getCurrentUserWithTenants();
    if (!context)
      throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const tenant = context.tenants.find((t) => t.membershipStatus === "ACTIVE");
    if (!tenant || !["OWNER", "ADMIN", "OPERATOR"].includes(tenant.role))
      throw new AppError("FORBIDDEN", "Insufficient permission.", 403);
    assertSameOriginRequest(request);
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "batch-labels",
        getClientIp(request),
        tenant.tenantId,
        context.user.id,
      ),
      ...RATE_LIMIT_POLICIES.expensiveRead,
    });
    const input = validateLabelBatch(await request.json().catch(() => null));
    const pdf = await getVpBatchPdf(tenant.tenantId, input);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="viettel-post-labels.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AppError)
      return errorResponse(
        error.code,
        error.message,
        error.status,
        error.details,
      );
    return errorResponse(
      "INTERNAL_ERROR",
      "Không gom được nhãn. Vui lòng thử lại hoặc mở từng nhãn.",
      500,
    );
  }
}
