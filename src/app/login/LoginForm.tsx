"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useId, useState } from "react";
import { login } from "@/lib/api/auth";
import { getPostLoginRedirect } from "@/lib/auth-redirect";

const GENERIC_LOGIN_ERROR =
  "Không thể đăng nhập. Vui lòng kiểm tra lại email và mật khẩu của bạn.";

export function LoginForm({ sessionExpired = false }: { sessionExpired?: boolean }) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setIsPending(true);

    try {
      const authContext = await login(normalizedEmail, password);
      router.replace(getPostLoginRedirect(authContext));
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
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-lg"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700" htmlFor={emailId}>
          Email
        </label>
        <input
          autoComplete="email"
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-50 transition-colors"
          disabled={isPending}
          id={emailId}
          inputMode="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@fulfillment.local"
          required
          type="email"
          value={email}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700" htmlFor={passwordId}>
          Mật khẩu
        </label>
        <div className="relative">
          <input
            autoComplete="current-password"
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-50 transition-colors"
            disabled={isPending}
            id={passwordId}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 focus:outline-none disabled:cursor-not-allowed transition-colors"
            disabled={isPending}
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {sessionExpired && !error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" role="status">
          Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700" id={errorId} role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 transition-colors pt-0.5"
        disabled={isPending}
        type="submit"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : null}
        {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
