"use client";

import { Building2, ClipboardList, Radio } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PlatformAdminRole } from "@/types/platform";
import { PlatformAuthProvider } from "./PlatformAuthContext";
import { PlatformUserMenu } from "./PlatformUserMenu";

const navItems = [
  { href: "/platform/tenants", label: "Tenants", icon: Building2 },
  { href: "/platform/audit-logs", label: "Audit Logs", icon: ClipboardList },
  { href: "/platform/yun-webhooks", label: "Yun Webhooks", icon: Radio },
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
  const pathname = usePathname();

  return (
    <PlatformAuthProvider role={role} user={user}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="flex h-[52px] items-center justify-between border-b border-slate-200 bg-white px-6">
          <Link className="flex items-center gap-2.5" href="/platform/tenants">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-xs">
              PA
            </span>
            <span className="text-sm font-bold tracking-tight text-slate-900">Platform Admin</span>
          </Link>
          <PlatformUserMenu role={role} user={user} />
        </header>
        <div className="flex min-h-[calc(100vh-52px)]">
          <aside className="hidden w-[220px] border-r border-slate-200 bg-white px-3 py-4 md:block">
            <nav className="space-y-1" aria-label="Platform navigation">
              <div className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                System
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-md px-3 text-xs font-medium transition-colors",
                      active
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6">
            {children}
          </main>
        </div>
      </div>
    </PlatformAuthProvider>
  );
}
