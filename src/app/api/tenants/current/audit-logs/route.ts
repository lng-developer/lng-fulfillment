import { listAuditLogs, validateAuditLogListQuery } from "@/modules/audit";
import { ok, error as errorResponse } from "@/shared/api-response";
import { getCurrentUserWithTenants } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";

const AUDIT_VIEW_ROLES = new Set<string>(["OWNER", "ADMIN"]);

export async function GET(request: Request) {
  try {
    const context = await requireCurrentTenantContext();
    const query = validateAuditLogListQuery(new URL(request.url).searchParams);
    const result = await listAuditLogs(
      context.tenantId,
      query,
      context.actorUserId,
    );

    return ok(
      { auditLogs: result.auditLogs },
      { pagination: result.pagination },
    );
  } catch (error) {
    return handleAuditLogError(error);
  }
}

async function requireCurrentTenantContext() {
  const context = await getCurrentUserWithTenants();

  if (!context) {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const tenant = context.tenants.find(
    (membership) => membership.membershipStatus === "ACTIVE",
  );

  if (!tenant) {
    throw new AppError("FORBIDDEN", "Tenant access denied.", 403);
  }

  if (!AUDIT_VIEW_ROLES.has(tenant.role)) {
    throw new AppError("FORBIDDEN", "Insufficient tenant role.", 403);
  }

  return {
    actorUserId: context.user.id,
    tenantId: tenant.tenantId,
  };
}

function handleAuditLogError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
