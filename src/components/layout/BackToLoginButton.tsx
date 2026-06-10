"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout as logoutRequest } from "@/lib/api/auth";

export function BackToLoginButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (isPending) {
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      await logoutRequest();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Could not clear your session. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div className="mt-5 grid gap-2 justify-items-center">
      <button
        className="inline-flex h-9 items-center justify-center rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-4 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleClick}
        type="button"
      >
        {isPending ? "Signing out..." : "Back to login"}
      </button>
      {error ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
