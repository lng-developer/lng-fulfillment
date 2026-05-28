import type { Metadata } from "next";
import Link from "next/link";
import { PlatformTenantDetailContent } from "@/components/platform/PlatformTenantDetailContent";

export const metadata: Metadata = {
  title: "Tenant Detail | Fulfillment Platform",
};

export default async function PlatformTenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  return (
    <div className="grid gap-5">
      <header>
        <Link
          className="text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-dark)]"
          href="/platform/tenants"
        >
          Back to tenants
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
          Tenant Detail
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Manage tenant profile and members from the platform admin console.
        </p>
      </header>
      <PlatformTenantDetailContent tenantId={tenantId} />
    </div>
  );
}
