import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-page)] px-4 py-8">
      <section className="w-full max-w-[460px] rounded border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center shadow-soft">
        <p className="font-mono text-sm font-semibold text-[var(--brand)]">404</p>
        <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have
          access.
        </p>
        <Link
          className="mt-6 inline-flex h-9 items-center justify-center rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)]"
          href="/orders"
        >
          Go to Dashboard
        </Link>
      </section>
    </main>
  );
}
