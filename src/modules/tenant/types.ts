import type {
  ApiKeyStatus,
  MembershipStatus,
  TenantRole,
  UserStatus,
} from "@prisma/client";

export const TENANT_API_KEY_SCOPES = [
  "orders:write",
  "orders:read",
  "tracking:write",
  "tracking:read",
] as const;

export const TENANT_API_KEY_MANAGE_ROLES: TenantRole[] = ["OWNER", "ADMIN"];
export const TENANT_MEMBER_MANAGE_ROLES: TenantRole[] = ["OWNER", "ADMIN"];

export type TenantApiKeyScope = (typeof TENANT_API_KEY_SCOPES)[number];

export type TenantApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: TenantApiKeyScope[];
  status: ApiKeyStatus;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TenantApiKeyCreateInput = {
  name: string;
  scopes: TenantApiKeyScope[];
  expiresAt: Date | null;
};

export type TenantApiKeyCreateResult = {
  apiKey: string;
  apiKeyRecord: TenantApiKeyRecord;
};

export type TenantApiKeyVerificationResult = {
  tenantId: string;
  apiKeyId: string;
  scopes: TenantApiKeyScope[];
};

export type TenantMemberRecord = {
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

export type TenantMemberUpdateInput = {
  role?: TenantRole;
  membershipStatus?: Extract<MembershipStatus, "ACTIVE" | "DISABLED">;
};
