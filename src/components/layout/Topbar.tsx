"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ExternalLink } from "lucide-react";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { useAuth } from "@/lib/auth-context";
import { UserMenu } from "./UserMenu";

const PAGE_TITLES: Record<string, string> = {
  "/orders": "Quản lý đơn hàng & Đóng gói",
  "/shipments": "Vận đơn & Đồng bộ Tracking",
  "/shipping-costs": "Đối soát chi phí vận chuyển",
  "/order-lookup": "Tra cứu mã đơn & Hành trình",
  "/settings": "Cài đặt tài khoản & Hãng vận chuyển",
  "/platform": "Bảng điều khiển quản trị viên",
};

export function Topbar() {
  const pathname = usePathname();
  const { membership } = useAuth();
  const role = membership?.role ?? "VIEWER";

  // Match root path or parent path
  const currentTitle =
    PAGE_TITLES[pathname] ??
    Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(`${key}/`))?.[1] ??
    "Bảng điều khiển";

  return (
    <header className="flex h-[52px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link className="flex items-center gap-2 md:hidden" href="/orders">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-indigo-600 text-xs font-bold text-white">
            <Boxes className="h-4 w-4" />
          </span>
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Workspace</span>
          <span className="text-slate-300">/</span>
          <h1 className="truncate text-xs font-semibold text-slate-800">
            {currentTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Environment badge */}
        <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Live Ready
        </span>

        <RoleBadge role={role} />
        <UserMenu />
      </div>
    </header>
  );
}
