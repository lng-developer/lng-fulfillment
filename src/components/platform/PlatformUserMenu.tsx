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
        className="text-right"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <p className="text-xs font-semibold text-[var(--text-primary)]">
          {user.name ?? "Platform Admin"}
        </p>
        <p className="text-[10px] text-[var(--text-muted)]">
          {role} - {user.email}
        </p>
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] text-left shadow-md">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
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
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={logout}
            type="button"
          >
            <LogOut className="h-4 w-4" aria-hidden />
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
