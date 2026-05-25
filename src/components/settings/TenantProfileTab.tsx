"use client";

import { Building2 } from "lucide-react";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/rbac";
import type { TenantProfile } from "@/types/settings";

export function TenantProfileTab({ tenantId }: { tenantId?: string }) {
  const { membership } = useAuth();
  const profile: TenantProfile | null = membership
    ? {
        tenantId: tenantId ?? membership.tenantId ?? "",
        tenantName: membership.tenantName,
        tenantSlug: membership.tenantSlug,
        role: membership.role,
        membershipStatus: membership.status,
      }
    : null;

  if (!profile) {
    return (
      <EmptyState
        description="No tenant membership is available for this session."
        heading="No tenant found"
        icon={<Building2 className="h-6 w-6" aria-hidden />}
      />
    );
  }

  return (
    <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-muted)]">
          Tenant Information
        </h2>
      </div>
      <dl className="grid gap-4 px-5 py-5 sm:grid-cols-[160px_minmax(0,1fr)]">
        <dt className="text-xs font-medium text-[var(--text-secondary)]">Name</dt>
        <dd className="text-xs font-semibold text-[var(--text-primary)]">
          {profile.tenantName}
        </dd>

        <dt className="text-xs font-medium text-[var(--text-secondary)]">Slug</dt>
        <dd className="font-mono text-xs text-[var(--text-primary)]">
          {profile.tenantSlug}
        </dd>

        <dt className="text-xs font-medium text-[var(--text-secondary)]">Your Role</dt>
        <dd>
          <RoleBadge role={profile.role as Role} />
        </dd>

        <dt className="text-xs font-medium text-[var(--text-secondary)]">Status</dt>
        <dd>
          <StatusBadge status={profile.membershipStatus} />
        </dd>
      </dl>
    </section>
  );
}
