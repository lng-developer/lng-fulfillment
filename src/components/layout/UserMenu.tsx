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
      toastError("Something went wrong. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div className="relative">
      <button
        className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface2)]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[#a5b4fc] text-[10px] font-bold text-white">
          {initials}
        </span>
        <span className="hidden max-w-44 truncate text-xs text-[var(--text-secondary)] md:block">
          {userEmail}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md">
          <div className="border-b border-[var(--border)] bg-[var(--bg-surface2)] p-3">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {userName}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">{userEmail}</p>
          </div>
          <a
            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
            href="/settings"
          >
            <Settings className="h-4 w-4" aria-hidden />
            Settings
          </a>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
            onClick={() => {
              setOpen(false);
              setChangePasswordOpen(true);
            }}
            type="button"
          >
            <KeyRound className="h-4 w-4" aria-hidden />
            Change password
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={logout}
            type="button"
          >
            {isPending ? (
              <User className="h-4 w-4" aria-hidden />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden />
            )}
            {isPending ? "Signing out..." : "Logout"}
          </button>
        </div>
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
