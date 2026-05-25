import type {
  MembershipStatus,
  TenantRole,
  UserStatus,
} from "@prisma/client";

export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  status: UserStatus;
};

export type TenantMembershipSummary = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: TenantRole;
  membershipStatus: MembershipStatus;
};

export type AuthResponseData = {
  user: SafeUser;
  tenants: TenantMembershipSummary[];
};

export type LoginResult = AuthResponseData & {
  sessionToken: string;
  expiresAt: Date;
};

export type UserWithPasswordHash = SafeUser & {
  passwordHash: string;
};
