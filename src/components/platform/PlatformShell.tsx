import { Building2, ClipboardList } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PlatformAdminRole } from "@/types/platform";

const navItems = [
  { href: "/platform/tenants", label: "Tenants", icon: Building2 },
  { href: "/platform/audit-logs", label: "Audit Logs", icon: ClipboardList },
] as const;

export function PlatformShell({
  children,
  role,
  user,
}: {
  children: ReactNode;
  role: PlatformAdminRole;
  user: { email: string; name: string | null };
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      <header className="flex h-[52px] items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] px-6">
        <Link className="flex items-center gap-3" href="/platform/tenants">
          <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-gradient-to-br from-[#6366f1] to-[#818cf8] text-xs font-bold text-white">
            PA
          </span>
          <span className="text-sm font-semibold">Platform Admin</span>
        </Link>
        <div className="text-right">
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            {user.name ?? "Platform Admin"}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">
            {role} · {user.email}
          </p>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-52px)]">
        <aside className="hidden w-[210px] border-r border-[var(--border)] bg-[var(--bg-surface)] px-2 py-3 md:block">
          <nav className="grid gap-1" aria-label="Platform navigation">
            <div className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
              System
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-sm border border-transparent px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--brand-light)] hover:text-[var(--brand)]",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
            <div className="mx-2 my-3 border-t border-[var(--border)]" />
            <Link
              className="flex h-9 items-center gap-3 rounded-sm border border-transparent px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
              href="/orders"
            >
              Back to tenant app
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
