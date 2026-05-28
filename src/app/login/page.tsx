import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPostLoginRedirect } from "@/lib/auth-redirect";
import { getCurrentUserWithTenants } from "@/shared/auth/context";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In | Fulfillment Platform",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string }>;
}) {
  const context = await getCurrentUserWithTenants();
  const params = await searchParams;

  if (context) {
    redirect(getPostLoginRedirect(context));
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-page)] px-4 py-8">
      <section aria-labelledby="login-title" className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded bg-gradient-to-br from-[var(--brand)] to-[#818cf8] text-sm font-bold text-white">
            FP
          </div>
          <h1
            className="text-2xl font-semibold tracking-normal text-[var(--text-primary)]"
            id="login-title"
          >
            Fulfillment Platform
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Sign in to your account
          </p>
        </div>
        <LoginForm sessionExpired={params?.reason === "session_expired"} />
      </section>
    </main>
  );
}
