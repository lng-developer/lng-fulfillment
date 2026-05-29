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
      <div className="mb-3 flex gap-0.5 rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-0.5">
        {(["test", "live"] as const).map((environment) => (
          <button
            className={cn(
              "flex-1 rounded-xs border py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60",
              value === environment
                ? "border-[var(--border-strong)] bg-white text-[var(--text-primary)] shadow-soft"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
            disabled={disabled}
            key={environment}
            onClick={() => onChange(environment)}
            type="button"
          >
            {environment === "test" ? "Test UAT" : "Live Production"}
          </button>
        ))}
      </div>

      {value === "test" ? (
        <div className="flex items-start gap-2 rounded-sm border border-[var(--brand-mid)] bg-[var(--brand-light)] p-3 text-xs text-[var(--brand-dark)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Use this mode for safe test shipments. No carrier charges.
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <strong>Live mode.</strong> This creates a real YunExpress shipment
            and may incur carrier charges.
          </span>
        </div>
      )}
    </div>
  );
}
