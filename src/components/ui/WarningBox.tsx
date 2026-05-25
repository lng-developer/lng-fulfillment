import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function WarningBox({
  message,
  variant = "warning",
}: {
  message: string;
  variant?: "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-sm border px-[11px] py-[9px] text-[11px]",
        variant === "danger"
          ? "border-[#fca5a5] bg-[var(--danger-bg)] text-[var(--danger-text)]"
          : "border-[#fcd34d] bg-[var(--warning-bg)] text-[var(--warning-text)]",
      )}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="m-0">{message}</p>
    </div>
  );
}
