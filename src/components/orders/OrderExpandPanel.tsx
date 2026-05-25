"use client";

import {
  CheckCircle2,
  Loader2,
  Plus,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, formatStatus } from "@/components/ui/StatusBadge";
import { getErrorMessage } from "@/lib/api/base";
import { createDraftShipment, getShipments } from "@/lib/api/shipments";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { OrderDetail, OrderDetailItem } from "@/types/orders";
import type { ShipmentListItem } from "@/types/shipments";

export function OrderExpandPanel({
  order,
  isLoading = false,
  onDraftCreated,
  role,
}: {
  order: OrderDetail | null;
  isLoading?: boolean;
  onDraftCreated: () => void;
  role: Role;
}) {
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [isShipmentsLoading, setIsShipmentsLoading] = useState(false);
  const [shipmentsError, setShipmentsError] = useState<string | null>(null);
  const [shipmentsReloadKey, setShipmentsReloadKey] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (!order) {
      setShipments([]);
      return;
    }

    const currentOrderId = order.id;
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
          setShipmentsError(getErrorMessage(error));
        }
      } finally {
        setIsShipmentsLoading(false);
      }
    }

    loadShipments();

    return () => controller.abort();
  }, [order, shipmentsReloadKey]);

  if (isLoading || !order) {
    return <OrderExpandSkeleton />;
  }

  const canCreate = can.createShipment(role);

  return (
    <div className="bg-[var(--brand-light)] px-3 pb-3 pt-0 sm:pl-12 sm:pr-3.5">
      <div className="grid gap-3 pt-3">
        <div className="grid gap-3 xl:grid-cols-3">
          <PanelCard icon={<Store />} title="Order info">
            <KeyValue label="Shop" value={order.shopName ?? "Not provided"} />
            <KeyValue
              label="Marketplace"
              value={order.marketplace ?? "Not provided"}
            />
            <KeyValue label="Source" value={order.source ?? "unknown"} />
            <KeyValue label="Received" value={formatDateTime(order.receivedAt)} />
          </PanelCard>

          <PanelCard icon={<UserRound />} title="Recipient">
            <KeyValue
              label="Name"
              value={order.recipientName ?? "Not provided"}
            />
            <KeyValue label="Address" value={formatAddress(order)} />
            <KeyValue
              label="Country"
              value={`${countryFlag(order.destinationCountry)} ${
                order.destinationCountry ?? "Not provided"
              }`.trim()}
            />
            <KeyValue
              label="Phone"
              value={order.recipientPhone ?? "Not provided"}
            />
          </PanelCard>

          <PanelCard icon={<CheckCircle2 />} title="Status history">
            {order.statusHistory.length ? (
              <ol className="grid gap-2">
                {order.statusHistory
                  .slice()
                  .sort(
                    (first, second) =>
                      new Date(second.createdAt).getTime() -
                      new Date(first.createdAt).getTime(),
                  )
                  .map((entry, index, entries) => (
                    <li className="relative flex gap-2" key={entry.id}>
                      {index < entries.length - 1 ? (
                        <span className="absolute left-[5px] top-4 h-full border-l border-[var(--border)]" />
                      ) : null}
                      <span
                        className={cn(
                          "relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                          statusDotClass(entry.status),
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                          {formatStatus(entry.status)}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {formatShortDate(entry.createdAt)}
                        </p>
                        {entry.note ? (
                          <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                            {entry.note}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="text-[11px] text-[var(--text-muted)]">
                No status history.
              </p>
            )}
          </PanelCard>
        </div>

        <PanelCard icon={<ShoppingCart />} title="Items">
          <div className="overflow-hidden rounded-sm border border-[var(--border)]">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[var(--bg-surface2)]">
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
              <tbody>
                {order.items.map((item) => (
                  <tr className="border-t border-[var(--border)]" key={item.id}>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-[var(--brand-light)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--brand-dark)]">
                        {item.sku ?? "NO-SKU"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                      {item.title ?? item.name ?? "Unnamed item"}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-[var(--text-secondary)]">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-[var(--text-secondary)]">
                      {formatMoney(item.unitPrice, item.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelCard>

        <PanelCard icon={<Truck />} title="Shipments">
          {isShipmentsLoading ? (
            <p className="text-[11px] text-[var(--text-muted)]">
              Loading shipments...
            </p>
          ) : null}
          {!isShipmentsLoading && shipmentsError ? (
            <p className="text-[11px] text-[var(--danger-text)]">
              {shipmentsError}
            </p>
          ) : null}
          {!isShipmentsLoading && !shipmentsError ? (
            <div className="flex flex-wrap items-center gap-2">
              {shipments.length ? (
                shipments.map((shipment) => (
                  <div
                    className="flex items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] px-2 py-1 text-[11px]"
                    key={shipment.id}
                  >
                    <StatusBadge status={shipment.status} />
                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                      {shipment.id}
                    </span>
                    {shipment.trackingNumber ? (
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        {shipment.trackingNumber}
                      </span>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState
                  description="No shipments yet."
                  heading="No related shipments"
                  icon={<Truck className="h-6 w-6" aria-hidden />}
                />
              )}
              {canCreate ? (
                <button
                  className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-2.5 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)]"
                  onClick={() => setShowCreateForm(true)}
                  type="button"
                >
                  <Plus className="h-3 w-3" aria-hidden />
                  {shipments.length ? "Add Shipment" : "Create Draft Shipment"}
                </button>
              ) : null}
            </div>
          ) : null}

          {showCreateForm ? (
            <CreateDraftShipmentForm
              items={order.items}
              onCancel={() => setShowCreateForm(false)}
              onCreated={() => {
                setShowCreateForm(false);
                setShipmentsReloadKey((value) => value + 1);
                onDraftCreated();
              }}
              orderId={order.id}
            />
          ) : null}
        </PanelCard>
      </div>
    </div>
  );
}

function CreateDraftShipmentForm({
  orderId,
  items,
  onCancel,
  onCreated,
}: {
  orderId: string;
  items: OrderDetailItem[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const initialSelection = useMemo(
    () =>
      Object.fromEntries(
        items.map((item) => [
          item.id,
          { checked: true, quantity: Math.max(1, item.quantity) },
        ]),
      ) as Record<string, { checked: boolean; quantity: number }>,
    [items],
  );
  const [selection, setSelection] = useState(initialSelection);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelection(initialSelection);
  }, [initialSelection]);

  const selectedItems = items
    .map((item) => ({
      orderItemId: item.id,
      quantity: selection[item.id]?.quantity ?? 0,
      checked: selection[item.id]?.checked ?? false,
      max: item.quantity,
    }))
    .filter((item) => item.checked && item.quantity > 0 && item.quantity <= item.max);

  async function submitDraft() {
    setError(null);

    if (!selectedItems.length) {
      setError("Select at least one valid item quantity.");
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
      toastSuccess("Draft shipment created.");
      onCreated();
    } catch {
      setError("Failed to create shipment. Please try again.");
      toastError("Failed to create shipment. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mt-3 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <div className="mb-3 text-[11px] font-semibold text-[var(--text-primary)]">
        Select items
      </div>
      <div className="grid gap-1">
        {items.map((item) => {
          const row = selection[item.id] ?? {
            checked: true,
            quantity: Math.max(1, item.quantity),
          };

          return (
            <label
              className="flex items-center gap-2 border-b border-[var(--border)] py-2 text-xs last:border-b-0"
              key={item.id}
            >
              <input
                checked={row.checked}
                className="h-4 w-4 rounded border-[var(--border-strong)]"
                onChange={(event) =>
                  setSelection((current) => ({
                    ...current,
                    [item.id]: { ...row, checked: event.target.checked },
                  }))
                }
                type="checkbox"
              />
              <span className="rounded-full bg-[var(--brand-light)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--brand-dark)]">
                {item.sku ?? "NO-SKU"}
              </span>
              <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
                {item.title ?? item.name ?? "Unnamed item"}
              </span>
              <input
                aria-label={`Quantity for ${item.sku ?? item.id}`}
                className="h-7 w-14 rounded-xs border border-[var(--border-strong)] bg-[var(--bg-surface)] px-1 text-center text-xs"
                max={item.quantity}
                min={1}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setSelection((current) => ({
                    ...current,
                    [item.id]: {
                      ...row,
                      quantity: Number.isInteger(value) ? value : row.quantity,
                    },
                  }));
                }}
                type="number"
                value={row.quantity}
              />
              <span className="text-[var(--text-muted)]">/ {item.quantity}</span>
            </label>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 text-[11px] text-[var(--danger-text)]">{error}</p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          className="h-8 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
          disabled={isPending}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isPending}
          onClick={submitDraft}
          type="button"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
          Create Draft
        </button>
      </div>
    </div>
  );
}

function OrderExpandSkeleton() {
  return (
    <div className="bg-[var(--brand-light)] px-3 py-4 sm:px-12">
      <div className="mb-3 grid gap-3 xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            className="h-24 animate-pulse rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]"
            key={item}
          />
        ))}
      </div>
      <div className="h-20 animate-pulse rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]" />
    </div>
  );
}

function PanelCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactElement;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-soft">
      <div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        <span className="text-[var(--brand)]">
          {icon}
        </span>
        {title}
      </div>
      {children}
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] py-1.5 last:border-b-0">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="max-w-[65%] text-right font-mono text-[11px] text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

function formatAddress(order: OrderDetail) {
  const normalized = [
    order.destinationCity,
    order.destinationState,
    order.destinationCountry,
    order.destinationPostalCode,
  ]
    .filter(Boolean)
    .join(", ");

  if (normalized) {
    return normalized;
  }

  if (typeof order.recipientAddress === "string") {
    return order.recipientAddress;
  }

  return "Address not provided";
}

function countryFlag(countryCode: string | null) {
  if (!countryCode || !/^[A-Za-z]{2}$/.test(countryCode)) {
    return "";
  }

  const base = 127397;
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + base))
    .join("");
}

function formatDateTime(value: string | null) {
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

function formatShortDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value: string | null, currency: string | null) {
  if (!value) {
    return "-";
  }

  return currency ? `${value} ${currency}` : value;
}

function statusDotClass(status: string) {
  if (["READY_TO_SHIP", "DELIVERED"].includes(status)) {
    return "bg-[var(--success)] shadow-[0_0_0_3px_var(--success-bg)]";
  }

  if (["IN_TRANSIT", "CREATED"].includes(status)) {
    return "bg-[var(--info)] shadow-[0_0_0_3px_var(--info-bg)]";
  }

  if (["EXCEPTION", "FAILED_CREATE", "FAILED_LABEL"].includes(status)) {
    return "bg-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]";
  }

  return "bg-[var(--text-muted)] shadow-[0_0_0_3px_#f1f5f9]";
}
