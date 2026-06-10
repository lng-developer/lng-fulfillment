import type { Metadata } from "next";
import { PlatformTenantsContent } from "@/components/platform/PlatformTenantsContent";
import { listPlatformTenants, type PlatformTenantSummary } from "@/modules/platform";
import type {
  PlatformTenantSummary as PublicPlatformTenantSummary,
} from "@/types/platform";

export const metadata: Metadata = {
  title: "Platform Tenants | Fulfillment Platform",
};

export default async function PlatformTenantsPage() {
  const initialTenants = await listPlatformTenants({
    page: 1,
    pageSize: 20,
  });

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
          Platform
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          Tenants
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Create and manage customer tenant workspaces.
        </p>
      </header>
      <PlatformTenantsContent
        initialData={{
          tenants: initialTenants.data.map(toPublicTenantSummary),
          pagination: initialTenants.pagination,
        }}
      />
    </div>
  );
}

function toPublicTenantSummary(
  tenant: PlatformTenantSummary,
): PublicPlatformTenantSummary {
  return {
    ...tenant,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  };
}
