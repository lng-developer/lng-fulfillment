import type {
  ApiSuccess,
  AuditLog,
  PaginationMeta,
} from "@/types/settings";
import { apiFetch } from "./base";

export type AuditLogListParams = {
  page?: number;
  pageSize?: number;
  action?: string;
  actorType?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  sortOrder?: "asc" | "desc";
};

export interface AuditLogResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalItems: number;
    totalPages: number;
  };
}

export async function getAuditLogs(
  params: AuditLogListParams,
  signal?: AbortSignal,
): Promise<AuditLogResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
    sortOrder: params.sortOrder ?? "desc",
  });

  if (params.action) query.set("action", params.action);
  if (params.actorType) query.set("actorType", params.actorType);
  if (params.resourceType) query.set("resourceType", params.resourceType);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  const response = await apiFetch<ApiSuccess<{ auditLogs: AuditLog[] }, PaginationMeta>>(
    `/api/tenants/current/audit-logs?${query.toString()}`,
    { signal },
  );
  const pagination = response.meta?.pagination;

  return {
    data: response.data.auditLogs,
    pagination: {
      page: pagination?.page ?? params.page ?? 1,
      pageSize:
        pagination?.pageSize ?? params.pageSize ?? response.data.auditLogs.length,
      total: pagination?.totalItems ?? response.data.auditLogs.length,
      totalItems: pagination?.totalItems ?? response.data.auditLogs.length,
      totalPages:
        pagination?.totalPages ?? (response.data.auditLogs.length ? 1 : 0),
    },
  };
}

export async function listAuditLogs(
  params: AuditLogListParams,
  signal?: AbortSignal,
) {
  const result = await getAuditLogs(params, signal);
  return {
    success: true as const,
    data: { auditLogs: result.data },
    meta: {
      pagination: {
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
      },
    },
  };
}
