"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useId, useState } from "react";
import { login } from "@/lib/api/auth";

const GENERIC_LOGIN_ERROR =
  "We could not sign you in. Check your email and password, then try again.";

export function LoginForm({ sessionExpired = false }: { sessionExpired?: boolean }) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    setIsPending(true);

    try {
      await login(normalizedEmail, password);
      router.replace("/orders");
      router.refresh();
    } catch {
      setError(GENERIC_LOGIN_ERROR);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      aria-describedby={error ? errorId : undefined}
      autoComplete="on"
      className="grid gap-4 rounded border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-soft"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="grid gap-2">
        <label className="text-xs font-semibold text-[var(--text-primary)]" htmlFor={emailId}>
          Email address
        </label>
        <input
          autoComplete="email"
          className="h-10 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)] disabled:cursor-not-allowed disabled:bg-[var(--bg-surface2)]"
          disabled={isPending}
          id={emailId}
          inputMode="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="grid gap-2">
        <label className="text-xs font-semibold text-[var(--text-primary)]" htmlFor={passwordId}>
          Password
        </label>
        <input
          autoComplete="current-password"
          className="h-10 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)] disabled:cursor-not-allowed disabled:bg-[var(--bg-surface2)]"
          disabled={isPending}
          id={passwordId}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {sessionExpired && !error ? (
        <p className="rounded-sm border border-[#fcd34d] bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning-text)]" role="status">
          Your session has expired. Please sign in again.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-sm border border-[#fca5a5] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]" id={errorId} role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-4 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : null}
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
