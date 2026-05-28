import type { Role } from "@/lib/rbac";

export type AuthRedirectContext = {
  platformAdmin?: {
    role: "PLATFORM_ADMIN" | "PLATFORM_SUPPORT";
    status: "ACTIVE" | "DISABLED";
  } | null;
  tenants?: Array<{
    role: Role;
    membershipStatus?: "ACTIVE" | "DISABLED" | string;
    status?: "ACTIVE" | "DISABLED" | string;
  }>;
};

export function getPostLoginRedirect(context: AuthRedirectContext) {
  if (context.platformAdmin?.status === "ACTIVE") {
    return "/platform/tenants";
  }

  const activeTenant = context.tenants?.find(
    (tenant) => (tenant.membershipStatus ?? tenant.status) === "ACTIVE",
  );

  if (activeTenant) {
    return "/orders";
  }

  return "/orders";
}
