import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import type { DashboardTenant, DashboardUser } from "@/types/auth";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardShell({
  children,
  user,
  tenant,
}: {
  children: ReactNode;
  user: DashboardUser;
  tenant: DashboardTenant;
}) {
  return (
    <AuthProvider
      initialMembership={{
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        tenantSlug: tenant.tenantSlug,
        role: tenant.role,
        status: "ACTIVE",
      }}
      initialUser={user}
    >
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
        <Topbar />
        <div className="flex min-h-[calc(100vh-52px)]">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
