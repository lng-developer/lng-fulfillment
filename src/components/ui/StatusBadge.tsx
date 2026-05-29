import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  READY_TO_SHIP: "bg-[var(--success-bg)] text-[var(--success-text)]",
  FULFILLED: "bg-[var(--success-bg)] text-[var(--success-text)]",
  IN_PROCESSING: "bg-[var(--info-bg)] text-[var(--info-text)]",
  SHIPPED: "bg-[var(--success-bg)] text-[var(--success-text)]",
  RECEIVED: "bg-[var(--info-bg)] text-[var(--info-text)]",
  ON_HOLD: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
  DRAFT: "bg-[#f1f5f9] text-[#475569]",
  PENDING: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
  CREATED: "bg-[var(--info-bg)] text-[var(--info-text)]",
  FAILED_CREATE: "bg-[var(--danger-bg)] text-[var(--danger-text)]",
  FAILED_LABEL: "bg-[var(--danger-bg)] text-[var(--danger-text)]",
  IN_TRANSIT: "bg-[var(--info-bg)] text-[var(--info-text)]",
  DELIVERED: "bg-[var(--success-bg)] text-[var(--success-text)]",
  EXCEPTION: "bg-[var(--danger-bg)] text-[var(--danger-text)]",
  CANCELLED: "bg-[#f1f5f9] text-[#475569]",
  RETURNED: "bg-[#fff7ed] text-[#9a3412]",
  ACTIVE: "bg-[var(--success-bg)] text-[var(--success-text)]",
  DISABLED: "bg-[#f1f5f9] text-[#475569]",
  REVOKED: "bg-[var(--danger-bg)] text-[var(--danger-text)]",
  TRACKING_PENDING: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const safeStatus = status ?? "UNKNOWN";

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-[9px] py-0.5 text-[10px] font-semibold",
        STATUS_STYLES[safeStatus] ?? "bg-[#f1f5f9] text-[#475569]",
        className,
      )}
    >
      <span className="truncate">{formatStatus(safeStatus)}</span>
    </span>
  );
}

export function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
