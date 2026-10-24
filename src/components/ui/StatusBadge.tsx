import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  READY_TO_SHIP: "bg-blue-50 text-blue-700 border-blue-200",
  FULFILLED: "bg-blue-50 text-blue-700 border-blue-200",
  RECEIVED: "bg-blue-50 text-blue-700 border-blue-200",
  CREATED: "bg-blue-50 text-blue-700 border-blue-200",

  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROCESSING: "bg-amber-50 text-amber-700 border-amber-200",
  TRACKING_PENDING: "bg-amber-50 text-amber-700 border-amber-200",

  SHIPPED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IN_TRANSIT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",

  FAILED_CREATE: "bg-rose-50 text-rose-700 border-rose-200",
  FAILED_LABEL: "bg-rose-50 text-rose-700 border-rose-200",
  EXCEPTION: "bg-rose-50 text-rose-700 border-rose-200",
  REVOKED: "bg-rose-50 text-rose-700 border-rose-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",

  ON_HOLD: "bg-slate-100 text-slate-700 border-slate-200",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  DISABLED: "bg-slate-100 text-slate-700 border-slate-200",
  RETURNED: "bg-orange-50 text-orange-700 border-orange-200",
};

export function StatusBadge({
  status,
  className,
  showDot = true,
}: {
  status: string | null | undefined;
  className?: string;
  showDot?: boolean;
}) {
  const safeStatus = status ?? "UNKNOWN";
  const style = STATUS_STYLES[safeStatus] ?? "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight",
        style,
        className,
      )}
    >
      {showDot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />}
      <span className="truncate">{formatStatus(safeStatus)}</span>
    </span>
  );
}

export function formatStatus(status: string) {
  const customMap: Record<string, string> = {
    READY_TO_SHIP: "Chờ gửi hàng",
    IN_PROCESSING: "Đang xử lý",
    SHIPPED: "Đã xuất kho",
    DELIVERED: "Đã giao",
    IN_TRANSIT: "Đang vận chuyển",
    CANCELLED: "Đã hủy",
    ON_HOLD: "Tạm giữ",
    RECEIVED: "Đã nhận đơn",
    FAILED_CREATE: "Lỗi tạo vận đơn",
    FAILED_LABEL: "Lỗi tạo nhãn",
    EXCEPTION: "Bất thường",
  };

  if (customMap[status]) {
    return customMap[status];
  }

  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
