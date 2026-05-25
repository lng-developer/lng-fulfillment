import type { ReactNode } from "react";
import { CopyButton } from "@/components/ui/CopyButton";
import { StatusBadge } from "@/components/ui/StatusBadge";

export type TrackingResultPanelData = {
  status: string | null;
  trackingNumber?: string | null;
  latestEvent?: string | null;
  eventsCount?: number;
};

export function TrackingResultPanel({
  result,
}: {
  result: TrackingResultPanelData | null;
}) {
  if (!result) {
    return null;
  }

  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-muted)]">
        Tracking Result
      </h4>
      <dl className="mt-3 grid gap-2 text-sm">
        <ResultRow label="Status">
          {result.status ? <StatusBadge status={result.status} /> : "-"}
        </ResultRow>
        <ResultRow label="Tracking #">
          {result.trackingNumber ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono">{result.trackingNumber}</span>
              <CopyButton
                label="Copy tracking number"
                value={result.trackingNumber}
              />
            </span>
          ) : (
            "-"
          )}
        </ResultRow>
        <ResultRow label="Latest event">{result.latestEvent ?? "-"}</ResultRow>
        <ResultRow label="Events">{String(result.eventsCount ?? 0)}</ResultRow>
      </dl>
    </div>
  );
}

function ResultRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
      <dt className="text-xs font-medium text-[var(--text-secondary)]">{label}</dt>
      <dd className="min-w-0 text-xs text-[var(--text-primary)]">{children}</dd>
    </div>
  );
}
