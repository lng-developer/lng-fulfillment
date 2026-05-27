"use client";

import Link from "next/link";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { TenantBadge } from "@/components/ui/TenantBadge";
import { useAuth } from "@/lib/auth-context";
import { UserMenu } from "./UserMenu";

export function Topbar() {
  const { membership } = useAuth();
  const tenantName = membership?.tenantName ?? "Tenant";
  const tenantSlug = membership?.tenantSlug ?? "tenant";
  const role = membership?.role ?? "VIEWER";

  return (
    <header className="flex h-[52px] items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 text-[var(--text-primary)] md:px-6">
      <Link className="flex min-w-0 items-center gap-3" href="/orders">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-gradient-to-br from-[#6366f1] to-[#818cf8] text-xs font-bold text-white">
          FP
        </span>
        <span className="hidden text-sm font-semibold text-[var(--text-primary)] sm:inline">
          Fulfillment
        </span>
      </Link>

      {/* <TenantBadge
        className="hidden max-w-[44vw] justify-self-center sm:inline-flex"
        name={tenantName}
        slug={tenantSlug}
      /> */}

      <div className="flex items-center gap-2">
        <RoleBadge role={role} />
        <UserMenu />
      </div>
    </header>
  );
}
