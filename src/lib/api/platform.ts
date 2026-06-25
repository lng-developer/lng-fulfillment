import type {
  PlatformAuditLog,
  PlatformYunWebhookEvent,
  PlatformYunWebhookEventDetail,
  PlatformYunWebhookSetup,
  PlatformYunWebhookStats,
  YunWebhookEventCategory,
  YunWebhookEventStatus,
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

export type PlatformYunWebhookParams = {
  page?: number;
  pageSize?: number;
  attention?: boolean;
  status?: YunWebhookEventStatus | "";
  eventCategory?: YunWebhookEventCategory | "";
  eventType?: string;
  tenantId?: string;
  shipmentId?: string;
  waybillNumber?: string;
  trackingNumber?: string;
  customerOrderNumber?: string;
  search?: string;
  from?: string;
  to?: string;
  sortOrder?: "asc" | "desc";
};

export async function getPlatformTenants(
  params: PlatformTenantListParams,
  options?: RequestInit,
) {
  const query = buildQuery(params);
  const response = await apiFetch<
    ApiSuccessEnvelope<
      { tenants: PlatformTenantSummary[] },
      { pagination: PlatformPagination }
    >
  >(`/api/platform/tenants?${query}`, options);

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

export async function getPlatformTenant(
  tenantId: string,
  options?: RequestInit,
) {
  const response = await apiFetch<
    ApiSuccessEnvelope<{ tenant: PlatformTenantDetail }>
  >(`/api/platform/tenants/${tenantId}`, options);

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

export async function getPlatformTenantMembers(
  tenantId: string,
  options?: RequestInit,
) {
  const response = await apiFetch<ApiSuccessEnvelope<{ members: PlatformMember[] }>>(
    `/api/platform/tenants/${tenantId}/members`,
    options,
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

export async function getPlatformAuditLogs(
  params: PlatformAuditLogParams,
  options?: RequestInit,
) {
  const query = buildQuery(params);
  const response = await apiFetch<
    ApiSuccessEnvelope<
      { auditLogs: PlatformAuditLog[] },
      { pagination: PlatformPagination }
    >
  >(`/api/platform/audit-logs?${query}`, options);

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

export async function getPlatformYunWebhookEvents(
  params: PlatformYunWebhookParams,
  options?: RequestInit,
) {
  const query = buildQuery(params);
  const response = await apiFetch<
    ApiSuccessEnvelope<
      { events: PlatformYunWebhookEvent[] },
      { pagination: PlatformPagination; stats: PlatformYunWebhookStats }
    >
  >(`/api/platform/yun-webhooks?${query}`, options);

  return {
    data: response.data.events,
    pagination: response.meta?.pagination ?? {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? response.data.events.length,
      totalItems: response.data.events.length,
      totalPages: response.data.events.length ? 1 : 0,
    },
    stats: response.meta?.stats ?? {
      total: response.data.events.length,
      failed: response.data.events.filter((event) => event.status === "FAILED").length,
      unmatched: response.data.events.filter((event) => event.status === "UNMATCHED").length,
      needsAttention: response.data.events.filter((event) =>
        event.status === "FAILED" || event.status === "UNMATCHED",
      ).length,
      processed: response.data.events.filter((event) => event.status === "PROCESSED").length,
      tracking: response.data.events.filter((event) => event.eventCategory === "TRACKING").length,
      fee: response.data.events.filter((event) => event.eventCategory === "FEE").length,
      abnormal: response.data.events.filter((event) => event.eventCategory === "ABNORMAL").length,
    },
  };
}

export async function getPlatformYunWebhookSetup(options?: RequestInit) {
  const response = await apiFetch<
    ApiSuccessEnvelope<{ setup: PlatformYunWebhookSetup }>
  >("/api/platform/yun-webhooks/setup", options);

  return response.data.setup;
}

export async function getPlatformYunWebhookEvent(
  eventId: string,
  options?: RequestInit,
) {
  const response = await apiFetch<
    ApiSuccessEnvelope<{ event: PlatformYunWebhookEventDetail }>
  >(`/api/platform/yun-webhooks/${eventId}`, options);

  return response.data.event;
}

export async function reprocessPlatformYunWebhookEvent(eventId: string) {
  const response = await apiFetch<
    ApiSuccessEnvelope<{ event: PlatformYunWebhookEventDetail }>
  >(`/api/platform/yun-webhooks/${eventId}/reprocess`, {
    method: "POST",
  });

  return response.data.event;
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
