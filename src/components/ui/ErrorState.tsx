import { AlertCircle } from "lucide-react";

export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div
      className="grid min-h-52 place-items-center rounded border border-[#fca5a5] bg-[var(--danger-bg)] px-6 py-10 text-center"
      role="alert"
    >
      <div className="mx-auto grid max-w-sm justify-items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-sm bg-[var(--bg-surface)] text-[var(--danger)]">
          <AlertCircle className="h-6 w-6" aria-hidden />
        </div>
        <p className="text-sm font-medium text-[var(--danger-text)]">{message}</p>
        {retry ? (
          <button
            className="h-8 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
            onClick={retry}
            type="button"
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
