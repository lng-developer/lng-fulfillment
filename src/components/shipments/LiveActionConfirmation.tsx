"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api/base";
import { executeShipment, type ShipmentCarrierCode } from "@/lib/api/shipments";
import { toastError } from "@/lib/toast";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { getCarrierPresentation } from "./carrier-presentation";
import type { ShipOrderOptions } from "@/modules/shipment/types";

export function LiveActionConfirmation({
  shipmentId,
  carrierCode = "YUNEXPRESS_OMS",
  carrierAccountId = null,
  options,
  onSuccess,
  onCancel,
}: {
  shipmentId: string;
  carrierCode?: ShipmentCarrierCode;
  carrierAccountId?: string | null;
  options?: ShipOrderOptions;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const presentation = getCarrierPresentation(carrierCode);

  useEffect(() => {
    setChecked(false);
    setTypedValue("");
    setHasSubmitted(false);
    setError(null);
  }, [carrierAccountId, carrierCode, options]);

  const canConfirm =
    checked && typedValue === presentation.confirmationText && !isSubmitting && !hasSubmitted;
  const trapRef = useFocusTrap<HTMLDivElement>(
    true,
    isSubmitting ? undefined : onCancel,
  );

  async function confirm() {
    if (!canConfirm) {
      return;
    }

    setIsSubmitting(true);
    setHasSubmitted(true);
    setError(null);

    try {
      await executeShipment(shipmentId, carrierCode, carrierAccountId, options);
      onSuccess();
    } catch (executionError) {
      const safeMessage = getErrorMessage(executionError);
      setError(
        "Live shipment execution failed. Review shipment state and try from a fresh confirmation.",
      );
      toastError(`Shipment execution failed. ${safeMessage}`);
      setIsSubmitting(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(26,29,58,0.4)] p-4 backdrop-blur-[2px]"
      role="dialog"
    >
      <div
        className="w-full max-w-[520px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md"
        ref={trapRef}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <div className="flex gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-[var(--danger-bg)] text-[var(--danger)]">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                LIVE CARRIER ACTION - Cannot be undone
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {presentation.liveWarning}
              </p>
            </div>
          </div>
          <button
            className="h-[26px] w-[26px] rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] p-1 text-[var(--text-muted)] hover:border-[#fca5a5] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </header>

        <div className="grid gap-4 px-5 py-4">
          <div className="rounded-sm border border-[#fca5a5] bg-[var(--danger-bg)] p-3 text-[11px] text-[var(--danger-text)]">
            <p>This action:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Will be submitted to {presentation.name} immediately</li>
              <li>Cannot be automatically reversed</li>
              <li>May incur carrier charges</li>
            </ul>
          </div>

          <label className="flex items-start gap-3 text-xs text-[var(--text-secondary)]">
            <input
              checked={checked}
              className="mt-1 h-4 w-4 rounded border-[var(--border-strong)]"
              disabled={isSubmitting || hasSubmitted}
              onChange={(event) => setChecked(event.target.checked)}
              type="checkbox"
            />
            <span>I understand this is a live carrier operation</span>
          </label>

          <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
            Type to confirm:
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              {presentation.confirmationText}
            </span>
            <input
              className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 font-mono text-xs text-[var(--text-primary)] disabled:cursor-not-allowed disabled:bg-[var(--bg-surface2)]"
              disabled={isSubmitting || hasSubmitted}
              onChange={(event) => setTypedValue(event.target.value)}
              value={typedValue}
            />
          </label>

          {error ? (
            <p className="rounded-sm border border-[#fca5a5] bg-[var(--danger-bg)] p-3 text-xs text-[var(--danger-text)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          <button
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#b91c1c] bg-[var(--danger)] px-3 text-xs font-medium text-white hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
            disabled={!canConfirm}
            onClick={confirm}
            type="button"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Confirm - Execute Live
          </button>
        </footer>
      </div>
    </div>
  );
}
