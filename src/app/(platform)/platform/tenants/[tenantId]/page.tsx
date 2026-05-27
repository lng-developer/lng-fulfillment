import type { Metadata } from "next";
import Link from "next/link";
import { PlatformTenantDetailContent } from "@/components/platform/PlatformTenantDetailContent";
import { requirePlatformPageActor } from "../../_auth";

export const metadata: Metadata = {
  title: "Tenant Detail | Fulfillment Platform",
};

export default async function PlatformTenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const [{ tenantId }, { actor }] = await Promise.all([
    params,
    requirePlatformPageActor(),
  ]);
  const canManage = actor.role === "PLATFORM_ADMIN";

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
      <PlatformTenantDetailContent canManage={canManage} tenantId={tenantId} />
    </div>
  );
}
