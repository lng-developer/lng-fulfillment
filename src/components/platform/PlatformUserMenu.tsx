"use client";

import { KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChangePasswordDialog } from "@/components/layout/ChangePasswordDialog";
import { logout as logoutRequest } from "@/lib/api/auth";
import { toastError } from "@/lib/toast";
import type { PlatformAdminRole } from "@/types/platform";

export function PlatformUserMenu({
  role,
  user,
}: {
  role: PlatformAdminRole;
  user: { email: string; name: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function logout() {
    if (isPending) return;

    setIsPending(true);
    try {
      await logoutRequest();
      router.replace("/login");
      router.refresh();
    } catch {
      toastError("Something went wrong. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div className="relative text-right">
      <button
        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50 transition-colors text-right"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <div>
          <p className="text-xs font-semibold text-slate-800">
            {user.name ?? "Platform Admin"}
          </p>
          <p className="text-[10px] text-slate-400">
            {role} · {user.email}
          </p>
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-lg">
          <button
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => {
              setOpen(false);
              setChangePasswordOpen(true);
            }}
            type="button"
          >
            <KeyRound className="h-4 w-4 text-slate-400" aria-hidden />
            Đổi mật khẩu
          </button>
          <button
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={logout}
            type="button"
          >
            <LogOut className="h-4 w-4 text-rose-500" aria-hidden />
            {isPending ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      ) : null}

      {changePasswordOpen ? (
        <ChangePasswordDialog onClose={() => setChangePasswordOpen(false)} />
      ) : null}
    </div>
  );
}
