import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { BackToLoginButton } from "@/components/layout/BackToLoginButton";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { Role } from "@/lib/rbac";
import { getCurrentUserWithTenants } from "@/shared/auth/context";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await getCurrentUserWithTenants();

  if (!context) {
    redirect("/login");
  }

  const defaultTenant =
    context.tenants.find(
      (tenant) =>
        tenant.membershipStatus === "ACTIVE" &&
        tenant.tenantStatus === "ACTIVE",
    ) ??
    null;

  if (!defaultTenant) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--bg-page)] px-4">
        <section className="max-w-md rounded border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center shadow-soft">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            No active tenant
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Your account does not have an active tenant membership.
          </p>
          <BackToLoginButton />
        </section>
      </main>
    );
  }

  return (
    <DashboardShell
      tenant={{
        tenantId: defaultTenant.tenantId,
        tenantName: defaultTenant.tenantName,
        tenantSlug: defaultTenant.tenantSlug,
        role: defaultTenant.role as Role,
      }}
      user={{
        id: context.user.id,
        email: context.user.email,
        name: context.user.name,
      }}
    >
      {children}
    </DashboardShell>
  );
}
