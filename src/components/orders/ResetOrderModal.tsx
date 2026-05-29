"use client";

import type React from "react";
import { Loader2, RotateCcw, X } from "lucide-react";
import { useCallback, useState } from "react";
import { getErrorMessage } from "@/lib/api/base";
import { resetOrder } from "@/lib/api/orders";
import { toastError, toastSuccess } from "@/lib/toast";
import type { OrderListItem } from "@/types/orders";

export function ResetOrderModal({
  order,
  onClose,
  onSuccess,
}: {
  order: OrderListItem;
  onClose: () => void;
  onSuccess: (result: Awaited<ReturnType<typeof resetOrder>>) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeIfAllowed = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  async function handleReset() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetOrder(order.id);
      toastSuccess("Order reset. You can create a shipment again.");
      onSuccess(result);
      onClose();
    } catch (error) {
      toastError(getErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(26,29,58,0.4)] p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeIfAllowed();
        }
      }}
      role="dialog"
    >
      <div className="w-full max-w-[480px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-sm bg-[var(--brand-light)] text-[var(--brand)]">
              <RotateCcw className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Reset cancelled order?
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                This moves the order back to FULFILLED so it can be shipped again.
              </p>
            </div>
          </div>
          <button
            aria-label="Close reset order modal"
            className="h-[26px] w-[26px] rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] p-1 text-[var(--text-muted)] hover:border-[#fca5a5] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="grid gap-3 px-4 py-4">
          <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3 text-xs text-[var(--text-secondary)]">
            Existing cancelled shipment history remains unchanged. A new YunExpress
            shipment can be created from the reset order.
          </div>
          <div className="grid gap-2 text-xs">
            <InfoRow label="Order #" mono value={order.orderNumber ?? order.externalOrderId} />
            <InfoRow label="Current status" value="CANCELLED" />
            <InfoRow label="Next status" value="FULFILLED" />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          <button
            autoFocus
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)] disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Keep cancelled
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleReset}
            type="button"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Reset order
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-2 last:border-b-0">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={mono ? "text-right font-mono text-[11px]" : "text-right"}>
        {value}
      </span>
    </div>
  );
}
