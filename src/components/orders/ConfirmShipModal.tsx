"use client";

import { CheckCircle, ExternalLink, Loader2, X } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import { getErrorMessage } from "@/lib/api/base";
import { confirmOrderShipped } from "@/lib/api/orders";
import { toastError, toastSuccess } from "@/lib/toast";
import type { OrderDetail, OrderListItem } from "@/types/orders";

export function ConfirmShipModal({
  order,
  detail,
  onClose,
  onSuccess,
}: {
  order: OrderListItem;
  detail: OrderDetail | null;
  onClose: () => void;
  onSuccess: (result: Awaited<ReturnType<typeof confirmOrderShipped>>) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const latestShipment = detail?.shipments?.[0] ?? null;
  const labelUrl = order.labelUrl ?? order.latestLabelUrl ?? latestShipment?.labelUrl ?? null;
  const trackingNumber =
    order.trackingNumber ?? order.latestTrackingNumber ?? latestShipment?.trackingNumber ?? null;

  const closeIfAllowed = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  async function handleConfirm() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await confirmOrderShipped(order.id);
      const openUrl = result.labelUrl ?? labelUrl;
      if (openUrl) {
        window.open(openUrl, "_blank", "noopener,noreferrer");
      }
      toastSuccess("Order marked as shipped.");
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
            <span className="grid h-8 w-8 place-items-center rounded-sm bg-[var(--success-bg)] text-[var(--success)]">
              <CheckCircle className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Confirm shipment completed?
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                This will mark the order as SHIPPED and open the YunExpress label.
              </p>
            </div>
          </div>
          <button
            aria-label="Close confirm shipment modal"
            className="h-[26px] w-[26px] rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] p-1 text-[var(--text-muted)] hover:border-[#fca5a5] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="grid gap-2 px-4 py-4 text-xs">
          <InfoRow label="Order #" mono value={order.orderNumber ?? order.externalOrderId} />
          <InfoRow label="Tracking #" mono value={trackingNumber ?? "-"} />
          <InfoRow
            label="Label"
            value={
              labelUrl ? (
                <span className="inline-flex items-center gap-1 text-[var(--success-text)]">
                  Available <ExternalLink className="h-3 w-3" aria-hidden />
                </span>
              ) : (
                <span className="text-[var(--warning-text)]">Not available</span>
              )
            }
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          <button
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)] disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleConfirm}
            type="button"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Confirm and open label
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
      <span
        className={mono ? "text-right font-mono text-[11px]" : "text-right"}
      >
        {value}
      </span>
    </div>
  );
}
