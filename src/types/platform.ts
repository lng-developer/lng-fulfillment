export type PlatformAdminRole = "PLATFORM_ADMIN" | "PLATFORM_SUPPORT";
export type PlatformTenantStatus = "ACTIVE" | "DISABLED";
export type PlatformTenantType = "INTERNAL" | "CLIENT" | "PARTNER";
export type PlatformTenantRole = "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";
export type PlatformMembershipStatus = "ACTIVE" | "DISABLED" | "INVITED";

export type PlatformPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PlatformTenantSummary = {
  id: string;
  name: string;
  slug: string;
  type: PlatformTenantType;
  status: PlatformTenantStatus;
  membersCount: number;
  ownersCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PlatformTenantDetail = PlatformTenantSummary & {
  apiKeysCount: number;
  ordersCount: number;
  shipmentsCount: number;
  carrierAccountsCount: number;
};

export type PlatformMember = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  userStatus: "ACTIVE" | "DISABLED";
  role: PlatformTenantRole;
  membershipStatus: PlatformMembershipStatus;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAuditLog = {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  actorType: "USER" | "API_KEY" | "SYSTEM";
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};
