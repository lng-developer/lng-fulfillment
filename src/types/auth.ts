import type { Role } from "@/lib/rbac";

export type DashboardUser = {
  id?: string;
  email: string;
  name: string | null;
};

export type DashboardTenant = {
  tenantId?: string;
  tenantName: string;
  tenantSlug: string;
  role: Role;
};
