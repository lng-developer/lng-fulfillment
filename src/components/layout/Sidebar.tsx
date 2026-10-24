"use client";

import {
  Boxes,
  Package,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { cn } from "@/lib/utils";

const NAV_OPERATIONS = [
  { href: "/orders", label: "Đơn hàng", icon: Package, badge: "Chính" },
  { href: "/shipments", label: "Vận đơn & Tracking", icon: Truck },
  { href: "/order-lookup", label: "Tra cứu đơn", icon: Search },
  { href: "/shipping-costs", label: "Chi phí vận chuyển", icon: ReceiptText },
] as const;

const NAV_SYSTEM = [
  { href: "/settings", label: "Cài đặt kho & tài khoản", icon: Settings },
  { href: "/platform", label: "Quản trị hệ thống", icon: ShieldCheck, adminOnly: true },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, membership } = useAuth();
  const userEmail = user?.email ?? "user@example.com";
  const userName = user?.name ?? "User";
  const role = membership?.role ?? "VIEWER";
  const initials = getInitials(userName ?? userEmail);
  const tenantName = membership?.tenantName ?? "Fulfillment Store";

  return (
    <aside className="hidden w-16 shrink-0 border-r border-slate-200 bg-white px-2 py-4 text-slate-600 md:flex md:flex-col lg:w-[240px] lg:px-3">
      {/* Brand & Store header */}
      <div className="mb-4 px-2">
        <Link className="flex items-center gap-2.5" href="/orders">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Boxes className="h-4 w-4" />
          </span>
          <div className="hidden min-w-0 lg:block">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-bold text-slate-900 tracking-tight">
                LNG Fulfillment
              </span>
              <span className="rounded bg-indigo-50 px-1 py-0.2 text-[10px] font-semibold text-indigo-700">
                v2
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-500 font-medium">
              {tenantName}
            </p>
          </div>
        </Link>
      </div>

      {/* Main navigation */}
      <nav aria-label="Menu chính" className="flex-1 space-y-4">
        <div>
          <div className="hidden px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:block">
            Vận hành & Đóng hàng
          </div>
          <div className="space-y-1">
            {NAV_OPERATIONS.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  className={cn(
                    "flex h-9 items-center justify-center gap-2.5 rounded-md px-2.5 text-xs font-medium transition-colors lg:justify-start",
                    active
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-indigo-600" : "text-slate-400")} aria-hidden />
                  <span className="truncate sr-only lg:not-sr-only flex-1">{item.label}</span>
                  {active && (
                    <span className="hidden h-1.5 w-1.5 rounded-full bg-indigo-600 lg:inline-block" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <div className="hidden px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:block">
            Cấu hình & Quản trị
          </div>
          <div className="space-y-1">
            {NAV_SYSTEM.map((item) => {
              if ("adminOnly" in item && item.adminOnly && role !== "OWNER" && role !== "ADMIN") {
                return null;
              }

              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  className={cn(
                    "flex h-9 items-center justify-center gap-2.5 rounded-md px-2.5 text-xs font-medium transition-colors lg:justify-start",
                    active
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-indigo-600" : "text-slate-400")} aria-hidden />
                  <span className="truncate sr-only lg:not-sr-only flex-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User profile footer */}
      <div className="mt-auto hidden border-t border-slate-200 pt-3 lg:block">
        <div className="flex items-center gap-2 px-1">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-xs font-semibold text-slate-800">
                {userName}
              </span>
              <RoleBadge role={role} />
            </div>
            <span className="block truncate text-[11px] text-slate-400">
              {userEmail}
            </span>
          </div>
        </div>
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
