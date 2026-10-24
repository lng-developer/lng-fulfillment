"use client";

import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShipEnvironment } from "@/types/orders";

export function EnvironmentSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: ShipEnvironment;
  onChange: (value: ShipEnvironment) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
        {(["test", "live"] as const).map((environment) => (
          <button
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50",
              value === environment
                ? "border border-slate-200 bg-white text-slate-900 shadow-sm font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
            disabled={disabled}
            key={environment}
            onClick={() => onChange(environment)}
            type="button"
          >
            {environment === "test" ? "Môi trường Thử nghiệm (UAT)" : "Môi trường Thật (Live Production)"}
          </button>
        ))}
      </div>

      {value === "test" ? (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-700">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Chế độ thử nghiệm (UAT Sandbox). Không phát sinh chi phí vận chuyển thực tế.</span>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
          <span>
            <strong>Chế độ Live.</strong> Thao tác này sẽ tạo vận đơn thật với hãng YunExpress và ghi nhận cước phí.
          </span>
        </div>
      )}
    </div>
  );
}
