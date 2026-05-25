"use client";

import { Package, Settings, Truck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/shipments", label: "Shipments", icon: Truck },
  { separator: true },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const userEmail = user?.email ?? "user@example.com";
  const userName = user?.name ?? "User";
  const initials = getInitials(userName ?? userEmail);

  return (
    <aside className="hidden w-16 shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)] px-2 py-3 text-[var(--text-secondary)] md:flex md:flex-col lg:w-[210px]">
      <nav aria-label="Primary navigation" className="grid gap-1">
        <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)] lg:px-2.5">
          Operations
        </div>
        {NAV_ITEMS.map((item, index) => {
          if ("separator" in item) {
            return (
              <div key={`separator-${index}`}>
                <div className="mx-2 my-3 border-t border-[var(--border)]" />
                <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)] lg:px-2.5">
                  Admin
                </div>
              </div>
            );
          }

          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              className={cn(
                "flex h-9 items-center justify-center gap-3 rounded-sm border border-transparent px-2.5 text-xs font-medium transition-colors lg:justify-start",
                active
                  ? "border-[var(--brand-mid)] bg-[var(--brand-light)] font-semibold text-[var(--brand-dark)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)]",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="sr-only lg:not-sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto hidden border-t border-[var(--border)] px-2.5 py-2 lg:flex lg:items-center lg:gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[#a5b4fc] text-[10px] font-bold text-white">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">
            {userName}
          </span>
          <span className="block truncate text-[10px] text-[var(--text-muted)]">
            {userEmail}
          </span>
        </span>
      </div>
    </aside>
  );
}

function getInitials(value: string) {
  const parts = value
    .replace("@", " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "U";
}
