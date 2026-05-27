import type {
  PlatformAuditLog,
  PlatformMember,
  PlatformPagination,
  PlatformTenantDetail,
  PlatformTenantRole,
  PlatformTenantStatus,
  PlatformTenantSummary,
  PlatformTenantType,
} from "@/types/platform";
import { apiFetch, type ApiSuccessEnvelope } from "./base";

export type PlatformTenantListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: PlatformTenantStatus | "";
};

export type PlatformAuditLogParams = {
  page?: number;
  pageSize?: number;
  tenantId?: string;
  action?: string;
  actions?: string[];
  actorType?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  sortOrder?: "asc" | "desc";
};

export async function getPlatformTenants(params: PlatformTenantListParams) {
  const query = buildQuery(params);
  const response = await apiFetch<
    ApiSuccessEnvelope<
      { tenants: PlatformTenantSummary[] },
      { pagination: PlatformPagination }
    >
  >(`/api/platform/tenants?${query}`);

  return {
    data: response.data.tenants,
    pagination: response.meta?.pagination ?? {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? response.data.tenants.length,
      totalItems: response.data.tenants.length,
      totalPages: response.data.tenants.length ? 1 : 0,
    },
  };
}

export async function createPlatformTenant(payload: {
  name: string;
  slug: string;
  type: PlatformTenantType;
  status: PlatformTenantStatus;
  ownerEmail: string;
  ownerName?: string;
  ownerPassword?: string;
}) {
  const response = await apiFetch<
    ApiSuccessEnvelope<{ tenant: PlatformTenantDetail }>
  >("/api/platform/tenants", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.data.tenant;
}

export async function getPlatformTenant(tenantId: string) {
  const response = await apiFetch<
    ApiSuccessEnvelope<{ tenant: PlatformTenantDetail }>
  >(`/api/platform/tenants/${tenantId}`);

  return response.data.tenant;
}

export async function updatePlatformTenant(
  tenantId: string,
  payload: {
    name?: string;
    type?: PlatformTenantType;
    status?: PlatformTenantStatus;
  },
) {
  const response = await apiFetch<
    ApiSuccessEnvelope<{ tenant: PlatformTenantDetail }>
  >(`/api/platform/tenants/${tenantId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return response.data.tenant;
}

export async function getPlatformTenantMembers(tenantId: string) {
  const response = await apiFetch<ApiSuccessEnvelope<{ members: PlatformMember[] }>>(
    `/api/platform/tenants/${tenantId}/members`,
  );

  return response.data.members;
}

export async function createPlatformTenantMember(
  tenantId: string,
  payload: {
    email: string;
    name?: string;
    password?: string;
    role: PlatformTenantRole;
    membershipStatus: "ACTIVE" | "DISABLED";
  },
) {
  const response = await apiFetch<ApiSuccessEnvelope<{ member: PlatformMember }>>(
    `/api/platform/tenants/${tenantId}/members`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return response.data.member;
}

export async function updatePlatformTenantMember(
  tenantId: string,
  membershipId: string,
  payload: {
    role?: PlatformTenantRole;
    membershipStatus?: "ACTIVE" | "DISABLED";
  },
) {
  const response = await apiFetch<ApiSuccessEnvelope<{ member: PlatformMember }>>(
    `/api/platform/tenants/${tenantId}/members/${membershipId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return response.data.member;
}

export async function getPlatformAuditLogs(params: PlatformAuditLogParams) {
  const query = buildQuery(params);
  const response = await apiFetch<
    ApiSuccessEnvelope<
      { auditLogs: PlatformAuditLog[] },
      { pagination: PlatformPagination }
    >
  >(`/api/platform/audit-logs?${query}`);

  return {
    data: response.data.auditLogs,
    pagination: response.meta?.pagination ?? {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? response.data.auditLogs.length,
      totalItems: response.data.auditLogs.length,
      totalPages: response.data.auditLogs.length ? 1 : 0,
    },
  };
}

function buildQuery(params: Record<string, unknown>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        if (value.length) query.set(key, value.join(","));
      } else {
        query.set(key, String(value));
      }
    }
  });

  return query.toString();
}
