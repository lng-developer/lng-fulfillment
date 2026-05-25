"use client";

import {
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  ShoppingCart,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusBadge, formatStatus } from "@/components/ui/StatusBadge";
import { getErrorMessage } from "@/lib/api/base";
import { getOrder } from "@/lib/api/orders";
import { createDraftShipment, getShipments } from "@/lib/api/shipments";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import type { OrderDetail, OrderDetailItem } from "@/types/orders";
import type { ShipmentListItem } from "@/types/shipments";

const SAFE_DETAIL_ERROR = "We could not load order detail.";
const SAFE_SHIPMENT_ERROR = "We could not load related shipments.";

export function OrderDetailDrawer({
  orderId,
  role,
  onClose,
  onShipmentCreated,
}: {
  orderId: string | null;
  role: Role;
  onClose: () => void;
  onShipmentCreated?: () => void;
}) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isShipmentsLoading, setIsShipmentsLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [shipmentsError, setShipmentsError] = useState<string | null>(null);
  const [shipmentsReloadKey, setShipmentsReloadKey] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    onClose();
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, [onClose]);

  useEffect(() => {
    if (!orderId) {
      setDetail(null);
      setShipments([]);
      return;
    }

    const currentOrderId = orderId;
    const controller = new AbortController();

    async function loadDetail() {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const order = await getOrder(currentOrderId, controller.signal);
        setDetail(order);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setDetail(null);
          setDetailError(getErrorMessage(error) || SAFE_DETAIL_ERROR);
        }
      } finally {
        setIsDetailLoading(false);
      }
    }

    loadDetail();

    return () => controller.abort();
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const currentOrderId = orderId;
    const controller = new AbortController();

    async function loadShipments() {
      setIsShipmentsLoading(true);
      setShipmentsError(null);

      try {
        const result = await getShipments(
          {
            orderId: currentOrderId,
            page: 1,
            pageSize: 20,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          controller.signal,
        );

        setShipments(result.data);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setShipments([]);
          setShipmentsError(getErrorMessage(error) || SAFE_SHIPMENT_ERROR);
        }
      } finally {
        setIsShipmentsLoading(false);
      }
    }

    loadShipments();

    return () => controller.abort();
  }, [orderId, shipmentsReloadKey]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, orderId]);

  if (!orderId) {
    return null;
  }

  const title = detail?.orderNumber ?? detail?.externalOrderId ?? "Order detail";

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Close order detail"
        className="absolute inset-0 bg-[rgba(26,29,58,0.4)] backdrop-blur-[2px]"
        onClick={handleClose}
        type="button"
      />
      <aside
        aria-label="Order detail"
        className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--bg-surface)] shadow-drawer md:max-w-[520px]"
      >
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <button
            className="h-[26px] w-[26px] rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] p-1 text-[var(--text-muted)] hover:border-[#fca5a5] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
            onClick={handleClose}
            ref={closeButtonRef}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-mono text-[13px] font-bold text-[var(--text-primary)]">
              {title}
            </h2>
          </div>
          {detail ? <StatusBadge status={detail.status} /> : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {isDetailLoading ? <LoadingSkeleton rows={6} /> : null}
          {!isDetailLoading && detailError ? (
            <ErrorState
              message={detailError}
              retry={() => {
                if (orderId) {
                  setDetail(null);
                  setDetailError(null);
                }
              }}
            />
          ) : null}
          {!isDetailLoading && !detailError && detail ? (
            <div className="grid gap-5">
              <Section icon={<Package />} title="Order Summary">
                <InfoGrid
                  rows={[
                    ["Source", detail.source ?? "Not provided"],
                    [
                      "Shop",
                      [detail.shopName, detail.marketplace]
                        .filter(Boolean)
                        .join(" · ") || "Not provided",
                    ],
                    ["Purchased", formatDate(detail.purchaseAt)],
                    ["Paid", formatDate(detail.paidAt)],
                    ["Received", formatDate(detail.receivedAt)],
                  ]}
                />
              </Section>

              <Section icon={<UserRound />} title="Recipient">
                <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3 text-xs text-[var(--text-secondary)]">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {detail.recipientName ?? "Not provided"}
                  </p>
                  <p className="mt-1">{formatAddress(detail)}</p>
                  <p className="mt-1 text-[var(--text-muted)]">
                    Shipping:{" "}
                    {detail.shippingService ?? detail.shippingType ?? "Not provided"}
                  </p>
                </div>
              </Section>

              <Section
                icon={<ShoppingCart />}
                title={`Items (${detail.items.length})`}
              >
                <div className="overflow-hidden rounded-sm border border-[var(--border)]">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-[var(--bg-surface2)]">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
                          SKU
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
                          Name
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-mono text-[10px] text-[var(--brand-dark)]">
                            {item.sku ?? "-"}
                          </td>
                          <td className="max-w-40 truncate px-3 py-2 text-[var(--text-secondary)]">
                            {item.title ?? item.name ?? "Unnamed item"}
                          </td>
                          <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                            {formatMoney(item.unitPrice, item.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section icon={<CheckCircle2 />} title="Status History">
                {detail.statusHistory.length ? (
                  <ol className="grid gap-3">
                    {detail.statusHistory.map((entry) => (
                      <li className="flex gap-3" key={entry.id}>
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--brand)]" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)]">
                            {formatStatus(entry.status)}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {entry.note ?? "No note"} · {entry.actorType} ·{" "}
                            {formatDate(entry.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">No status history.</p>
                )}
              </Section>

              <Section icon={<Truck />} title={`Related Shipments (${shipments.length})`}>
                {isShipmentsLoading ? <LoadingSkeleton rows={3} /> : null}
                {!isShipmentsLoading && shipmentsError ? (
                  <p className="text-sm text-red-700">{shipmentsError}</p>
                ) : null}
                {!isShipmentsLoading && !shipmentsError ? (
                  shipments.length ? (
                    <div className="grid gap-2">
                      {shipments.map((shipment) => (
                        <div
                          className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3"
                          key={shipment.id}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-mono text-[10px] font-semibold text-[var(--text-primary)]">
                              {shipment.id}
                            </p>
                            <StatusBadge status={shipment.status} />
                          </div>
                          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                            {shipment.carrierCode ?? "No carrier"} ·{" "}
                            {shipment.itemCount} items ·{" "}
                            {formatDate(shipment.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      description="No draft or carrier shipments have been created for this order."
                      heading="No related shipments"
                      icon={<Truck className="h-6 w-6" aria-hidden />}
                    />
                  )
                ) : null}
              </Section>

              {can.createShipment(role) ? (
                <CreateDraftShipmentForm
                  items={detail.items}
                  onCreated={() => {
                    setShipmentsReloadKey((value) => value + 1);
                    onShipmentCreated?.();
                  }}
                  orderId={detail.id}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function CreateDraftShipmentForm({
  orderId,
  items,
  onCreated,
}: {
  orderId: string;
  items: OrderDetailItem[];
  onCreated: () => void;
}) {
  const initialSelection = useMemo(
    () =>
      Object.fromEntries(
        items.map((item) => [
          item.id,
          { selected: true, quantity: Math.max(1, item.quantity) },
        ]),
      ) as Record<string, { selected: boolean; quantity: number }>,
    [items],
  );
  const [selection, setSelection] = useState(initialSelection);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedItems = items
    .map((item) => ({
      orderItemId: item.id,
      quantity: selection[item.id]?.quantity ?? 0,
      selected: selection[item.id]?.selected ?? false,
      max: item.quantity,
    }))
    .filter((item) => item.selected && item.quantity > 0 && item.quantity <= item.max);

  async function submit() {
    setMessage(null);
    setError(null);

    if (!selectedItems.length) {
      setError("Select at least one item.");
      return;
    }

    setIsPending(true);
    try {
      await createDraftShipment(
        orderId,
        selectedItems.map(({ orderItemId, quantity }) => ({
          orderItemId,
          quantity,
        })),
      );

      setMessage("Draft shipment created.");
      toastSuccess("Draft shipment created.");
      onCreated();
    } catch {
      setError("We could not create a draft shipment.");
      toastError("Failed to create shipment. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="rounded border border-[var(--border)] bg-[var(--bg-surface2)] p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <Plus className="h-4 w-4 text-[var(--brand)]" aria-hidden />
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">
          Create Draft Shipment
        </h3>
      </div>

      <div className="grid gap-2">
        {items.map((item) => {
          const row = selection[item.id] ?? {
            selected: false,
            quantity: Math.max(1, item.quantity),
          };

          return (
            <label
              className="flex items-center gap-3 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-xs"
              key={item.id}
            >
              <input
                checked={row.selected}
                className="h-4 w-4 rounded border-[var(--border-strong)]"
                onChange={(event) =>
                  setSelection((current) => ({
                    ...current,
                    [item.id]: { ...row, selected: event.target.checked },
                  }))
                }
                type="checkbox"
              />
              <span className="min-w-0 flex-1 truncate">
                <span className="rounded-full bg-[var(--brand-light)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--brand-dark)]">
                  {item.sku ?? "NO-SKU"}
                </span>{" "}
                <span className="text-[var(--text-secondary)]">
                  {item.title ?? item.name ?? "Unnamed item"}
                </span>
              </span>
              <input
                aria-label={`Quantity for ${item.sku ?? item.id}`}
                className="h-8 w-20 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 text-right text-xs"
                max={item.quantity}
                min={1}
                onChange={(event) => {
                  const nextQuantity = Number(event.target.value);
                  setSelection((current) => ({
                    ...current,
                    [item.id]: {
                      ...row,
                      quantity: Number.isInteger(nextQuantity)
                        ? nextQuantity
                        : row.quantity,
                    },
                  }));
                }}
                type="number"
                value={row.quantity}
              />
              <span className="text-[10px] text-[var(--text-muted)]">max {item.quantity}</span>
            </label>
          );
        })}
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? (
        <p className="mt-3 text-sm text-emerald-700">{message}</p>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <button
          className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
          onClick={() => {
            setSelection(initialSelection);
            setMessage(null);
            setError(null);
          }}
          type="button"
        >
          Cancel
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isPending}
          onClick={submit}
          type="button"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          Create Draft Shipment
        </button>
      </div>
    </section>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactElement;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 border-b border-[var(--border)] pb-5 last:border-0">
      <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
        <span className="text-[var(--brand)]">{icon}</span>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.07em]">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function InfoGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-2 gap-3">
      {rows.map(([label, value]) => (
        <div className="min-w-0" key={label}>
          <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
          <dd className="truncate font-mono text-[11px] font-medium text-[var(--text-primary)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value: string | null, currency: string | null) {
  if (!value) {
    return "-";
  }

  return `${value}${currency ? ` ${currency}` : ""}`;
}

function formatAddress(detail: OrderDetail) {
  return (
    [
      detail.destinationCity,
      detail.destinationState,
      detail.destinationCountry,
      detail.destinationPostalCode,
    ]
      .filter(Boolean)
      .join(", ") || "Address not provided"
  );
}
