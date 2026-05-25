export function LoadingSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
      <div className="grid gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            className="grid h-12 grid-cols-[1.2fr_0.8fr_0.7fr_1fr_1fr] items-center gap-4 rounded-sm border border-[var(--border)] px-3"
            key={index}
          >
            <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--border)]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
