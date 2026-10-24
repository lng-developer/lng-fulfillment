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
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed",
        variant === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-amber-200 bg-amber-50 text-amber-800",
      )}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-current" aria-hidden />
      <p className="m-0 font-medium">{message}</p>
    </div>
  );
}
