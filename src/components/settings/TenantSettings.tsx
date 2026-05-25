"use client";

import type { Role } from "@/lib/rbac";
import { SettingsShell } from "./SettingsShell";

type TenantMembership = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: Role;
  membershipStatus: "ACTIVE" | "INVITED" | "DISABLED";
};

type TenantSettingsProps = {
  currentTenant: TenantMembership | null;
  memberships: TenantMembership[];
};

export function TenantSettings({
  currentTenant,
  memberships,
}: TenantSettingsProps) {
  const tenant = currentTenant ?? memberships[0] ?? null;

  if (!tenant) {
    return (
      <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)] shadow-soft">
        No active tenant membership found.
      </section>
    );
  }

  return (
    <SettingsShell
      currentUserId=""
      role={tenant.role}
      tenantId={tenant.tenantId}
    />
  );
}
