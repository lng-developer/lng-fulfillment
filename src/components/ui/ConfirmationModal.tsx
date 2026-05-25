"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { WarningBox } from "./WarningBox";

export function ConfirmationModal({
  title,
  description,
  confirmLabel,
  variant = "default",
  requireTypedConfirmation,
  requireCheckbox,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  variant: "default" | "danger" | "live";
  requireTypedConfirmation?: string;
  requireCheckbox?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [typedValue, setTypedValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const canConfirm =
    (!requireTypedConfirmation ||
      typedValue === requireTypedConfirmation) &&
    (!requireCheckbox || checked) &&
    !isPending;
  const trapRef = useFocusTrap<HTMLDivElement>(
    true,
    isPending ? undefined : onCancel,
  );

  async function confirm() {
    if (!canConfirm) {
      return;
    }

    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(26,29,58,0.4)] p-4 backdrop-blur-[2px]"
      role="dialog"
    >
      <div
        className="w-full max-w-[480px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md"
        ref={trapRef}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <div className="flex gap-3">
            {variant !== "default" ? (
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-sm",
                  variant === "danger"
                    ? "bg-[var(--danger-bg)] text-[var(--danger)]"
                    : "bg-[var(--warning-bg)] text-[var(--warning)]",
                )}
              >
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </span>
            ) : null}
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {title}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{description}</p>
            </div>
          </div>
          <button
            className="h-[26px] w-[26px] rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] p-1 text-[var(--text-muted)] hover:border-[#fca5a5] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="grid gap-4 px-4 py-4">
          {variant === "live" ? (
            <WarningBox
              message="This action can trigger a live carrier operation. Confirm only when the shipment is ready."
              variant="danger"
            />
          ) : null}

          {requireCheckbox ? (
            <label className="flex gap-3 text-xs text-[var(--text-secondary)]">
              <input
                checked={checked}
                className="mt-1 h-4 w-4 rounded border-slate-300"
                onChange={(event) => setChecked(event.target.checked)}
                type="checkbox"
              />
              <span>{requireCheckbox}</span>
            </label>
          ) : null}

          {requireTypedConfirmation ? (
            <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
              Type{" "}
              <span className="font-mono text-xs text-slate-900">
                {requireTypedConfirmation}
              </span>
              <input
                className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 font-mono text-xs"
                onChange={(event) => setTypedValue(event.target.value)}
                value={typedValue}
              />
            </label>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          <button
            autoFocus
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
            data-autofocus="true"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50",
              variant === "danger" || variant === "live"
                ? "border-[#b91c1c] bg-[var(--danger)] hover:bg-[#b91c1c]"
                : "border-[var(--brand-dark)] bg-[var(--brand)] shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)]",
            )}
            disabled={!canConfirm}
            onClick={confirm}
            type="button"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {isPending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
