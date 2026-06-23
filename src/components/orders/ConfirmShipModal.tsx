"use client";

import { AlertTriangle, CheckCircle, ExternalLink, Loader2, X } from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/api/base";
import { confirmOrderShipped } from "@/lib/api/orders";
import { toastError, toastSuccess } from "@/lib/toast";
import { calculateShipmentCostEstimate } from "@/modules/shipment-cost/estimate";
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
  const [weightKg, setWeightKg] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const latestShipment = detail?.shipments?.[0] ?? null;
  const labelUrl = order.labelUrl ?? order.latestLabelUrl ?? latestShipment?.labelUrl ?? null;
  const trackingNumber =
    order.trackingNumber ?? order.latestTrackingNumber ?? latestShipment?.trackingNumber ?? null;
  const actualPackage = useMemo(() => {
    const parsed = {
      weightKg: Number(weightKg),
      lengthCm: Number(lengthCm),
      widthCm: Number(widthCm),
      heightCm: Number(heightCm),
    };

    if (
      Object.values(parsed).some((value) => !Number.isFinite(value) || value <= 0)
    ) {
      return null;
    }

    return parsed;
  }, [heightCm, lengthCm, weightKg, widthCm]);
  const estimate = useMemo(() => {
    if (!actualPackage) {
      return null;
    }

    try {
      return calculateShipmentCostEstimate({
        actualWeightKg: actualPackage.weightKg,
        lengthCm: actualPackage.lengthCm,
        widthCm: actualPackage.widthCm,
        heightCm: actualPackage.heightCm,
        countryCode: order.destinationCountry,
        shippingMethodCode:
          order.shipMappingPreview?.shippingMethodCode ?? order.shippingService,
      });
    } catch {
      return null;
    }
  }, [actualPackage, order.destinationCountry, order.shipMappingPreview, order.shippingService]);

  const closeIfAllowed = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  async function handleConfirm() {
    if (isSubmitting || !actualPackage) {
      return;
    }

    setIsSubmitting(true);
    const openedWindow = labelUrl
      ? window.open(labelUrl, "_blank", "noopener,noreferrer")
      : null;
    onClose();

    try {
      const result = await confirmOrderShipped(order.id, actualPackage);
      const openUrl = result.labelUrl ?? labelUrl;
      if (openUrl && !openedWindow) {
        window.open(openUrl, "_blank", "noopener,noreferrer");
      }
      toastSuccess("Order marked as shipped.");
      onSuccess(result);
    } catch (error) {
      toastError(getErrorMessage(error));
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
                Enter actual package data before marking this order as SHIPPED.
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

        <div className="grid gap-3 px-4 py-4 text-xs">
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
          <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3">
            <NumberField
              label="Actual weight (kg)"
              onChange={setWeightKg}
              placeholder="0.10"
              value={weightKg}
            />
            <NumberField
              label="Length (cm)"
              onChange={setLengthCm}
              placeholder="20"
              value={lengthCm}
            />
            <NumberField
              label="Width (cm)"
              onChange={setWidthCm}
              placeholder="15"
              value={widthCm}
            />
            <NumberField
              label="Height (cm)"
              onChange={setHeightCm}
              placeholder="5"
              value={heightCm}
            />
          </div>
          <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
              Estimated shipping cost
            </div>
            {estimate ? (
              <div className="grid gap-1.5">
                <InfoRow
                  label="Volumetric weight"
                  value={`${estimate.volumetricWeightKg.toFixed(3)} kg`}
                />
                <InfoRow
                  label="Chargeable weight"
                  value={`${estimate.chargeableWeightKg.toFixed(3)} kg`}
                />
                <InfoRow
                  label="Estimated fee"
                  value={
                    estimate.estimatedFee !== null
                      ? formatVnd(estimate.estimatedFee)
                      : "No rate found"
                  }
                />
                {estimate.volumetricBracketWarning ? (
                  <div className="mt-2 flex gap-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    <AlertTriangle
                      aria-hidden
                      className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
                    />
                    <div>
                      <div className="font-semibold">
                        Volumetric weight may increase the fee bracket.
                      </div>
                      <div className="mt-0.5 leading-relaxed">
                        Volume is only{" "}
                        {formatKgDelta(
                          estimate.volumetricBracketWarning.volumetricWeightKg -
                            estimate.volumetricBracketWarning.actualWeightKg,
                        )}{" "}
                        above actual weight, but billing moves from{" "}
                        {formatKgDelta(
                          estimate.volumetricBracketWarning.actualWeightBracketKg,
                        )}{" "}
                        to{" "}
                        {formatKgDelta(
                          estimate.volumetricBracketWarning.chargeableWeightBracketKg,
                        )}
                        . Potential saving:{" "}
                        <span className="font-semibold">
                          {formatWarningMoney(
                            estimate.volumetricBracketWarning.estimatedPotentialSaving,
                            estimate.volumetricBracketWarning.estimatedCurrency,
                          )}
                        </span>
                        . Check dimensions if the package can be measured smaller.
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-[var(--text-muted)]">
                Enter actual weight and dimensions to calculate the estimate.
              </p>
            )}
          </div>
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
            disabled={isSubmitting || !actualPackage}
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

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 text-xs text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
        min="0"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step="0.01"
        type="number"
        value={value}
      />
    </label>
  );
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatKgDelta(value: number) {
  return `${value.toFixed(3)} kg`;
}

function formatWarningMoney(value: number, currency: string) {
  if (currency === "VND") {
    return formatVnd(value);
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value)} ${currency}`;
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
