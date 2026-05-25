"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { can, type Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { ApiKeysTab } from "./ApiKeysTab";
import { AuditLogsTab } from "./AuditLogsTab";
import { CarrierAccountsTab } from "./CarrierAccountsTab";
import { MembersTab } from "./MembersTab";
import { TenantProfileTab } from "./TenantProfileTab";

type SettingsTab = {
  id: string;
  label: string;
  render: () => React.ReactNode;
  visible: boolean;
};

export function SettingsShell({
  currentUserId,
  role: roleProp,
  tenantId,
}: {
  currentUserId?: string;
  role?: Role;
  tenantId?: string;
}) {
  const { membership, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") ?? "tenant-profile";
  const role = roleProp ?? membership?.role ?? "VIEWER";
  const resolvedCurrentUserId = currentUserId ?? user?.id ?? "";
  const resolvedTenantId = tenantId ?? membership?.tenantId ?? "";

  const tabs = useMemo<SettingsTab[]>(
    () => [
      {
        id: "tenant-profile",
        label: "Tenant Profile",
        visible: true,
        render: () => <TenantProfileTab tenantId={resolvedTenantId} />,
      },
      {
        id: "api-keys",
        label: "API Keys",
        visible: true,
        render: () => <ApiKeysTab role={role} />,
      },
      {
        id: "members",
        label: "Members",
        visible: true,
        render: () => (
          <MembersTab currentUserId={resolvedCurrentUserId} role={role} />
        ),
      },
      {
        id: "carrier-accounts",
        label: "Carrier Accounts",
        visible: true,
        render: () => <CarrierAccountsTab role={role} />,
      },
      {
        id: "audit-logs",
        label: "Audit Logs",
        visible: can.viewAuditLogs(role),
        render: () => <AuditLogsTab />,
      },
    ],
    [resolvedCurrentUserId, resolvedTenantId, role],
  );

  const visibleTabs = tabs.filter((tab) => tab.visible);
  const activeTab =
    visibleTabs.find((tab) => tab.id === requestedTab) ?? visibleTabs[0];

  useEffect(() => {
    if (requestedTab === "audit-logs" && !can.viewAuditLogs(role)) {
      router.replace(`${pathname}?tab=tenant-profile`);
      return;
    }

    if (!visibleTabs.some((tab) => tab.id === requestedTab)) {
      router.replace(`${pathname}?tab=tenant-profile`);
    }
  }, [pathname, requestedTab, role, router, visibleTabs]);

  function selectTab(tabId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <section className="grid gap-5">
      <div className="overflow-x-auto border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <nav
          aria-label="Settings tabs"
          className="flex min-w-max flex-nowrap gap-6"
        >
          {visibleTabs.map((tab) => (
            <button
              className={cn(
                "mb-[-1px] border-b-2 px-3 py-2.5 text-xs font-medium",
                activeTab.id === tab.id
                  ? "border-[var(--brand)] font-semibold text-[var(--brand)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>{activeTab.render()}</div>
    </section>
  );
}
