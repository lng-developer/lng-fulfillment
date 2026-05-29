export default function Loading() {
  return (
    <div className="space-y-4 p-5" aria-label="Loading...">
      <div className="animate-pulse rounded border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="mb-4 h-5 w-48 rounded bg-[var(--border)]" />
        <div className="h-10 rounded-sm bg-[var(--border)]" />
      </div>
    </div>
  );
}
