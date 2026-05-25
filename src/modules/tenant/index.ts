export const TENANT_STATUSES = ["ACTIVE", "DISABLED"] as const;
export const TENANT_TYPES = ["INTERNAL", "CLIENT", "PARTNER"] as const;
export const MEMBERSHIP_STATUSES = ["ACTIVE", "INVITED", "DISABLED"] as const;
export const TENANT_ROLES = ["OWNER", "ADMIN", "OPERATOR", "VIEWER"] as const;
export const API_KEY_STATUSES = ["ACTIVE", "REVOKED"] as const;

export type TenantStatusValue = (typeof TENANT_STATUSES)[number];
export type TenantTypeValue = (typeof TENANT_TYPES)[number];
export type MembershipStatusValue = (typeof MEMBERSHIP_STATUSES)[number];
export type TenantRoleValue = (typeof TENANT_ROLES)[number];
export type ApiKeyStatusValue = (typeof API_KEY_STATUSES)[number];

export {
  TENANT_API_KEY_MANAGE_ROLES,
  TENANT_API_KEY_SCOPES,
  TENANT_MEMBER_MANAGE_ROLES,
  type TenantApiKeyCreateInput,
  type TenantApiKeyCreateResult,
  type TenantApiKeyRecord,
  type TenantApiKeyScope,
  type TenantApiKeyVerificationResult,
  type TenantMemberRecord,
  type TenantMemberUpdateInput,
} from "./types";

export {
  createTenantApiKey,
  listTenantMembers,
  listTenantApiKeys,
  revokeTenantApiKey,
  updateTenantMember,
  validateTenantMemberUpdateInput,
  validateTenantApiKeyCreateInput,
  verifyTenantApiKeyForRequest,
} from "./service";
