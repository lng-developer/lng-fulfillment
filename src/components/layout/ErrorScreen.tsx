import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function ErrorScreen({
  backHref = "/orders",
  backLabel = "Go to Dashboard",
  onRefresh,
}: {
  backHref?: string;
  backLabel?: string;
  onRefresh?: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-page)] px-4 py-8">
      <section className="w-full max-w-[460px] rounded border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center shadow-soft">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-sm bg-[var(--warning-bg)] text-[var(--warning)]">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          An unexpected error occurred. Please try refreshing the page.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {onRefresh ? (
            <button
              className="h-9 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)]"
              onClick={onRefresh}
              type="button"
            >
              Refresh Page
            </button>
          ) : (
            <a
              className="inline-flex h-9 items-center justify-center rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)]"
              href=""
            >
              Refresh Page
            </a>
          )}
          <Link
            className="inline-flex h-9 items-center justify-center rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
            href={backHref}
          >
            {backLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
