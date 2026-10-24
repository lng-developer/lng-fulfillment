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
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <section className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-base font-semibold text-slate-900">
            Không tìm thấy tổ chức đang hoạt động
          </h1>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Tài khoản của bạn hiện chưa được phân quyền vào bất kỳ gian hàng hoặc tổ chức nào.
          </p>
          <div className="mt-4">
            <BackToLoginButton />
          </div>
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
