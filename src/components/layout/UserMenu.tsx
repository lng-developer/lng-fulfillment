"use client";

import { KeyRound, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout as logoutRequest } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth-context";
import { toastError } from "@/lib/toast";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

export function UserMenu() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const userEmail = user?.email ?? "user@example.com";
  const userName = user?.name ?? "User";
  const initials = getInitials(userName ?? userEmail);

  async function logout() {
    if (isPending) {
      return;
    }

    setIsPending(true);
    try {
      await logoutRequest();
      setOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      toastError("Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.");
      setIsPending(false);
    }
  }

  return (
    <div className="relative">
      <button
        className="inline-flex h-8 items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-left text-xs text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
          {initials}
        </span>
        <span className="hidden max-w-36 truncate text-xs font-medium text-slate-700 md:block">
          {userName}
        </span>
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-slate-50/70 p-3.5">
              <p className="truncate text-xs font-semibold text-slate-900">
                {userName}
              </p>
              <p className="truncate text-[11px] text-slate-500">{userEmail}</p>
            </div>
            <div className="p-1">
              <a
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                href="/settings"
                onClick={() => setOpen(false)}
              >
                <Settings className="h-4 w-4 text-slate-400" aria-hidden />
                Cài đặt tài khoản
              </a>
              <button
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                onClick={() => {
                  setOpen(false);
                  setChangePasswordOpen(true);
                }}
                type="button"
              >
                <KeyRound className="h-4 w-4 text-slate-400" aria-hidden />
                Đổi mật khẩu
              </button>
            </div>
            <div className="border-t border-slate-100 p-1">
              <button
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={logout}
                type="button"
              >
                {isPending ? (
                  <User className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <LogOut className="h-4 w-4" aria-hidden />
                )}
                {isPending ? "Đang đăng xuất..." : "Đăng xuất"}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {changePasswordOpen ? (
        <ChangePasswordDialog onClose={() => setChangePasswordOpen(false)} />
      ) : null}
    </div>
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
