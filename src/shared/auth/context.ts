import "server-only";

import type { TenantRole } from "@prisma/client";
import { cookies } from "next/headers";
import {
  getCurrentSession,
  getTenantMembershipsForUser,
  type AuthResponseData,
  type SafeUser,
  type TenantMembershipSummary,
} from "@/modules/identity";
import {
  requirePlatformAccessContext,
  requirePlatformAdminContext,
  type PlatformAdminContext,
} from "@/modules/platform";
import { AppError } from "@/shared/errors";
import { SESSION_COOKIE_NAME } from "./session-cookie";

export type TenantAccessContext = {
  user: SafeUser;
  tenant: TenantMembershipSummary;
};

export async function getSessionTokenFromCookies(): Promise<
  string | undefined
> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const context = await getCurrentUserWithTenants();
  return context?.user ?? null;
}

export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }

  return user;
}

export async function getCurrentUserWithTenants(): Promise<
  AuthResponseData | null
> {
  const token = await getSessionTokenFromCookies();

  try {
    return await getCurrentSession(token);
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      return null;
    }

    throw error;
  }
}

export async function requireTenantAccess(
  tenantId: string,
  allowedRoles?: TenantRole[],
): Promise<TenantAccessContext> {
  const context = await getCurrentUserWithTenants();

  if (!context) {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const membership = context.tenants.find(
    (tenant) =>
      tenant.tenantId === tenantId && tenant.membershipStatus === "ACTIVE",
  );

  if (!membership) {
    throw new AppError("FORBIDDEN", "Tenant access denied.", 403);
  }

  if (allowedRoles?.length && !allowedRoles.includes(membership.role)) {
    throw new AppError("FORBIDDEN", "Insufficient tenant role.", 403);
  }

  return {
    user: context.user,
    tenant: membership,
  };
}

export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const user = await requireUser();
  return requirePlatformAdminContext(user);
}

export async function requirePlatformAccess(): Promise<PlatformAdminContext> {
  const user = await requireUser();
  return requirePlatformAccessContext(user);
}

export async function getDefaultTenantForUser(
  userId: string,
): Promise<TenantMembershipSummary | null> {
  const memberships = await getTenantMembershipsForUser(userId);

  return (
    memberships.find((membership) => membership.membershipStatus === "ACTIVE") ??
    null
  );
}
