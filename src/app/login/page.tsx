import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPostLoginRedirect } from "@/lib/auth-redirect";
import { getCurrentUserWithTenants } from "@/shared/auth/context";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập | Fulfillment Platform v2",
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
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-12">
      <section aria-labelledby="login-title" className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-base font-bold text-white shadow-md shadow-indigo-600/20">
            FP
          </div>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900"
            id="login-title"
          >
            Fulfillment Platform v2
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            Hệ thống quản lý và xử lý đơn hàng đa kênh
          </p>
        </div>
        <LoginForm sessionExpired={params?.reason === "session_expired"} />
      </section>
    </main>
  );
}
