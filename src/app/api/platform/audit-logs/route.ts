import {
  listPlatformAuditLogs,
  validatePlatformAuditLogListQuery,
} from "@/modules/platform";
import { ok } from "@/shared/api-response";
import { handlePlatformError, requirePlatformActor } from "../_shared";

export async function GET(request: Request) {
  try {
    await requirePlatformActor(request, "platform.audit-logs");
    const query = validatePlatformAuditLogListQuery(
      new URL(request.url).searchParams,
    );
    const result = await listPlatformAuditLogs(query);

    return ok(
      { auditLogs: result.data },
      { pagination: result.pagination },
    );
  } catch (error) {
    return handlePlatformError(error);
  }
}
