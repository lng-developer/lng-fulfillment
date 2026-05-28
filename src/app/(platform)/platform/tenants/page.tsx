import type { Metadata } from "next";
import { PlatformTenantsContent } from "@/components/platform/PlatformTenantsContent";

export const metadata: Metadata = {
  title: "Platform Tenants | Fulfillment Platform",
};

export default function PlatformTenantsPage() {
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
      <PlatformTenantsContent />
    </div>
  );
}
