import type {
  MembershipStatus,
  PlatformAdminRole,
  PlatformAdminStatus,
  TenantRole,
  TenantStatus,
  TenantType,
  UserStatus,
} from "@prisma/client";

export type PlatformAdminContext = {
  userId: string;
  email: string;
  name: string | null;
  role: PlatformAdminRole;
};

export type PlatformTenantSummary = {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
  membersCount: number;
  ownersCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PlatformTenantDetail = PlatformTenantSummary & {
  apiKeysCount: number;
  ordersCount: number;
  shipmentsCount: number;
  carrierAccountsCount: number;
};

export type PlatformTenantListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: TenantStatus;
};

export type PlatformPaginatedResult<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type PlatformTenantCreateInput = {
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
  ownerEmail: string;
  ownerName?: string;
  ownerPassword?: string;
};

export type PlatformTenantUpdateInput = {
  name?: string;
  status?: TenantStatus;
  type?: TenantType;
};

export type PlatformMemberRecord = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  userStatus: UserStatus;
  role: TenantRole;
  membershipStatus: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type PlatformMemberCreateInput = {
  email: string;
  name?: string;
  password?: string;
  role: TenantRole;
  membershipStatus: MembershipStatus;
};

export type PlatformMemberUpdateInput = {
  role?: TenantRole;
  membershipStatus?: Extract<MembershipStatus, "ACTIVE" | "DISABLED">;
};

export type PlatformAuditLogListQuery = {
  page: number;
  pageSize: number;
  tenantId?: string;
  action?: string;
  actions?: string[];
  actorType?: "USER" | "API_KEY" | "SYSTEM";
  resourceType?: string;
  from?: Date;
  to?: Date;
  sortOrder: "asc" | "desc";
};

export type PlatformAuditLogRecord = {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  actorType: "USER" | "API_KEY" | "SYSTEM";
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export type PlatformAdminRecord = {
  role: PlatformAdminRole;
  status: PlatformAdminStatus;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};
