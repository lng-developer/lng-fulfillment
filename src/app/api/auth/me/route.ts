import { ok, error as errorResponse } from "@/shared/api-response";
import { getCurrentUserWithTenants } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";

export async function GET() {
  try {
    const context = await getCurrentUserWithTenants();

    if (!context) {
      throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    }

    return ok(context);
  } catch (error) {
    return handleAuthError(error);
  }
}

function handleAuthError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
