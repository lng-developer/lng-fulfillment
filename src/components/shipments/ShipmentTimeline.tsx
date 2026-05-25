import { formatStatus } from "@/components/ui/StatusBadge";

type TimelineEvent = {
  status: string;
  timestamp: string;
  note?: string | null;
};

const DOT_COLORS: Record<string, string> = {
  DRAFT: "bg-[var(--text-muted)]",
  PENDING: "bg-[var(--warning)]",
  CREATED: "bg-[var(--success)]",
  FAILED_CREATE: "bg-[var(--danger)]",
  FAILED_LABEL: "bg-[var(--danger)]",
  TRACKING_PENDING: "bg-[var(--warning)]",
  IN_TRANSIT: "bg-[var(--info)]",
  DELIVERED: "bg-[var(--success)]",
  EXCEPTION: "bg-[var(--danger)]",
  CANCELLED: "bg-[var(--text-muted)]",
  RETURNED: "bg-[#ea580c]",
};

export function ShipmentTimeline({ events }: { events: TimelineEvent[] }) {
  const sortedEvents = [...events].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );

  if (!sortedEvents.length) {
    return <p className="text-xs text-[var(--text-muted)]">No timeline events.</p>;
  }

  return (
    <ol className="grid">
      {sortedEvents.map((event, index) => (
        <li className="relative grid grid-cols-[16px_minmax(0,1fr)] gap-3" key={`${event.status}-${event.timestamp}-${index}`}>
          <div className="relative flex justify-center">
            <span
              className={`mt-1.5 h-2.5 w-2.5 rounded-full ${DOT_COLORS[event.status] ?? "bg-[var(--text-muted)]"} ${index === 0 ? "shadow-[0_0_0_3px_var(--success-bg)]" : "shadow-[0_0_0_3px_#f1f5f9]"}`}
            />
            {index < sortedEvents.length - 1 ? (
              <span className="absolute top-5 h-[calc(100%-0.25rem)] border-l-[1.5px] border-[var(--border)]" />
            ) : null}
          </div>
          <div className="pb-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                {formatStatus(event.status)}
              </span>
              <time
                className="truncate text-[10px] text-[var(--text-muted)]"
                dateTime={event.timestamp}
                title={formatDate(event.timestamp)}
              >
                {formatDate(event.timestamp)}
              </time>
            </div>
            {event.note ? (
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">{event.note}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
