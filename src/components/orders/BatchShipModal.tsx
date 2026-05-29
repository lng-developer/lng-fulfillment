"use client";

import { ChevronDown, Loader2, Truck, X } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getErrorMessage } from "@/lib/api/base";
import { shipOrdersBatch } from "@/lib/api/orders";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  BatchShipResult,
  OrderDetail,
  OrderListItem,
  ShipEnvironment,
  ShipOrderOptions,
} from "@/types/orders";
import { EnvironmentSelector } from "./EnvironmentSelector";
import { buildShipmentPreview, buildShipOptions } from "./ShipOrderModal";

export function BatchShipModal({
  orders,
  detailsByOrderId,
  onClose,
  onSuccess,
}: {
  orders: OrderListItem[];
  detailsByOrderId: Record<string, OrderDetail | undefined>;
  onClose: () => void;
  onSuccess: (result: BatchShipResult) => void;
}) {
  const [environment, setEnvironment] = useState<ShipEnvironment>("live");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BatchShipResult | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const canSubmit = orders.length > 0 && orders.length <= 10;

  const closeIfAllowed = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  async function handleSubmit() {
    if (!canSubmit || isSubmitting || result) {
      return;
    }

    setIsSubmitting(true);
    try {
      const optionsByOrderId = buildBatchOptionsByOrderId(
        orders,
        detailsByOrderId,
      );
      const response = await shipOrdersBatch(
        orders.map((order) => order.id),
        environment,
        optionsByOrderId,
      );
      setResult(response);
      onSuccess(response);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
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
      <div className="max-h-[90vh] w-full max-w-[620px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-sm bg-[var(--brand-light)] text-[var(--brand)]">
              <Truck className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {result ? "Shipment results" : "Create YunExpress shipments"}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {result
                  ? "Review the batch shipment result before closing."
                  : `You are about to create shipments for ${orders.length} orders.`}
              </p>
            </div>
          </div>
          <button
            aria-label="Close batch shipment modal"
            className="h-[26px] w-[26px] rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] p-1 text-[var(--text-muted)] hover:border-[#fca5a5] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-[calc(90vh-130px)] overflow-y-auto px-4 py-4">
          {result ? (
            <div className="grid gap-4">
              <div className="rounded-sm border border-[var(--success)] bg-[var(--success-bg)] p-3 text-sm font-semibold text-[var(--success-text)]">
                {result.succeeded.length} orders created successfully
              </div>
              <div className="rounded-sm border border-[var(--danger)] bg-[var(--danger-bg)] p-3 text-sm font-semibold text-[var(--danger-text)]">
                {result.failed.length} orders failed
              </div>
              {result.failed.length ? (
                <div className="overflow-hidden rounded-sm border border-[var(--border)]">
                  {result.failed.map((failure) => (
                    <div
                      className="grid grid-cols-[150px_1fr] gap-3 border-b border-[var(--border)] px-3 py-2 text-xs last:border-b-0"
                      key={failure.orderId}
                    >
                      <span className="font-mono text-[var(--brand)]">
                        {failure.orderId}
                      </span>
                      <span className="grid gap-1 text-[var(--danger-text)]">
                        <span>{failure.message}</span>
                        <SafeFailureDetails details={failure.details} />
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3 text-xs text-[var(--text-secondary)]">
                YunExpress batch limit: 10 orders.
              </div>
              <div className="overflow-hidden rounded-sm border border-[var(--border)]">
                {orders.map((order) => (
                  <div
                    className="border-b border-[var(--border)] last:border-b-0"
                    key={order.id}
                  >
                    <div className="grid grid-cols-[24px_150px_1fr_70px] items-center gap-3 px-3 py-2 text-xs">
                      <button
                        aria-label={
                          expandedOrderId === order.id
                            ? "Collapse order details"
                            : "Expand order details"
                        }
                        className="inline-flex h-6 w-6 items-center justify-center rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)]"
                        onClick={() =>
                          setExpandedOrderId((current) =>
                            current === order.id ? null : order.id,
                          )
                        }
                        type="button"
                      >
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            expandedOrderId === order.id ? "rotate-180" : "",
                          )}
                          aria-hidden
                        />
                      </button>
                      <button
                        className="truncate text-left font-mono text-[var(--brand)] hover:underline"
                        onClick={() =>
                          setExpandedOrderId((current) =>
                            current === order.id ? null : order.id,
                          )
                        }
                        type="button"
                      >
                        {order.orderNumber ?? order.externalOrderId}
                      </button>
                      <span className="truncate text-[var(--text-secondary)]">
                        {order.recipientName ?? "No recipient"}
                      </span>
                      <span className="text-right text-[var(--text-muted)]">
                        {order.itemCount} items
                      </span>
                    </div>
                    {expandedOrderId === order.id ? (
                      <BatchOrderDetails
                        detail={detailsByOrderId[order.id] ?? null}
                        order={order}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
              <EnvironmentSelector
                disabled={isSubmitting}
                onChange={setEnvironment}
                value={environment}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          {result ? (
            <button
              className="h-9 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white hover:bg-[var(--brand-dark)]"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          ) : (
            <>
              <button
                className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)] disabled:opacity-50"
                disabled={isSubmitting}
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSubmit || isSubmitting}
                onClick={handleSubmit}
                type="button"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                Create shipments
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function buildBatchOptionsByOrderId(
  orders: OrderListItem[],
  detailsByOrderId: Record<string, OrderDetail | undefined>,
): Record<string, ShipOrderOptions> {
  return Object.fromEntries(
    orders.map((order) => {
      const detail = detailsByOrderId[order.id] ?? null;
      const preview = buildShipmentPreview(order, detail);

      return [
        order.id,
        buildShipOptions(
          preview,
          preview.shippingMethodCode,
          preview.package,
          preview.parcels,
        ),
      ];
    }),
  );
}

function BatchOrderDetails({
  order,
  detail,
}: {
  order: OrderListItem;
  detail: OrderDetail | null;
}) {
  const preview = buildShipmentPreview(order, detail);

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-surface2)] px-3 py-3">
      <div className="grid gap-2 md:grid-cols-3">
        <Info label="Order ID" mono value={order.id} />
        <Info label="Order #" mono value={order.orderNumber ?? order.externalOrderId} />
        <Info label="Status" value={<StatusBadge status={order.status} />} />
        <Info label="Recipient" value={order.recipientName ?? "-"} />
        <Info
          label="Destination"
          value={[
            order.destinationCity,
            order.destinationState,
            order.destinationPostalCode,
            order.destinationCountry,
          ]
            .filter(Boolean)
            .join(", ") || "-"}
        />
        <Info label="Shipping type" value={order.shippingType ?? order.shippingService ?? "-"} />
        <Info label="Items" value={`${order.itemCount} items / ${order.totalQuantity} qty`} />
        <Info label="First SKU" mono value={order.firstSku ?? "-"} />
        <Info label="First item" value={order.firstItemName ?? "-"} />
        <Info label="Shipping method" mono value={preview.shippingMethodCode} />
        <Info
          label="Package"
          mono
          value={`${preview.package.weight}kg · ${preview.package.length}x${preview.package.width}x${preview.package.height}${preview.package.sizeUnits}`}
        />
        <Info label="Parcels" value={`${preview.parcels.length} rows`} />
      </div>
      {preview.parcels.length ? (
        <div className="mt-2 overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]">
          {preview.parcels.map((parcel, index) => (
            <div
              className="grid grid-cols-[130px_1fr_80px] gap-2 border-b border-[var(--border)] px-2 py-1.5 text-[11px] last:border-b-0"
              key={`${parcel.orderItemId ?? parcel.sku}-${index}`}
            >
              <span className="truncate font-mono text-[var(--brand)]">
                {parcel.sku}
              </span>
              <span className="truncate text-[var(--text-secondary)]">
                {parcel.eName} / {parcel.cName}
              </span>
              <span className="text-right text-[var(--text-muted)]">
                Qty {parcel.quantity}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SafeFailureDetails({ details }: { details: unknown }) {
  const safeText = summarizeFailureDetails(details);

  if (!safeText) {
    return null;
  }

  return (
    <span className="text-[11px] font-normal text-[var(--text-secondary)]">
      {safeText}
    </span>
  );
}

function summarizeFailureDetails(details: unknown) {
  if (typeof details !== "object" || details === null || Array.isArray(details)) {
    return "";
  }

  const record = details as Record<string, unknown>;
  const safeMetadata = record.safeMetadata;
  if (
    typeof safeMetadata === "object" &&
    safeMetadata !== null &&
    !Array.isArray(safeMetadata)
  ) {
    const metadata = safeMetadata as Record<string, unknown>;
    const itemRemarks = metadata.itemRemarks;
    if (Array.isArray(itemRemarks)) {
      return itemRemarks
        .filter((value): value is string => typeof value === "string")
        .slice(0, 2)
        .join(" ");
    }

    const message = metadata.message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "";
}

function Info({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1.5">
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className={cn(
          "truncate text-[11px] text-[var(--text-primary)]",
          mono ? "font-mono" : "",
        )}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}
