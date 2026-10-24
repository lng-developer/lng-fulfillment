import { formatStatus } from "@/components/ui/StatusBadge";

type TimelineEvent = {
  status: string;
  timestamp: string;
  note?: string | null;
};

const DOT_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-400",
  PENDING: "bg-amber-500",
  CREATED: "bg-blue-500",
  FAILED_CREATE: "bg-rose-500",
  FAILED_LABEL: "bg-rose-500",
  TRACKING_PENDING: "bg-amber-500",
  IN_TRANSIT: "bg-indigo-500",
  DELIVERED: "bg-emerald-500",
  EXCEPTION: "bg-rose-500",
  CANCELLED: "bg-slate-400",
  RETURNED: "bg-orange-500",
};

export function ShipmentTimeline({ events }: { events: TimelineEvent[] }) {
  const sortedEvents = [...events].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );

  if (!sortedEvents.length) {
    return <p className="text-xs text-slate-400">Chưa có sự kiện hành trình.</p>;
  }

  return (
    <ol className="relative border-l border-slate-200 ml-3 space-y-4 py-2">
      {sortedEvents.map((event, index) => (
        <li className="ml-4" key={`${event.status}-${event.timestamp}-${index}`}>
          <div
            className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white ${
              DOT_COLORS[event.status] ?? "bg-slate-400"
            }`}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800">
              {formatStatus(event.status)}
            </span>
            <time className="text-[11px] text-slate-400">
              {formatDate(event.timestamp)}
            </time>
          </div>
          {event.note ? (
            <p className="mt-0.5 text-xs text-slate-600">{event.note}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
