"use client";

import type React from "react";
import {
  ArrowUpDown,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Copy,
  ExternalLink,
  Inbox,
  RotateCcw,
  Search,
  Truck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getErrorMessage } from "@/lib/api/base";
import { getOrder, getOrders } from "@/lib/api/orders";
import { useAuth } from "@/lib/auth-context";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { OrderDetail, OrderListItem } from "@/types/orders";
import { BatchShipModal } from "./BatchShipModal";
import { CancelYunModal } from "./CancelYunModal";
import { ConfirmShipModal } from "./ConfirmShipModal";
import { OrderExpandPanel } from "./OrderExpandPanel";
import { OrderStatusSummary } from "./OrderStatusSummary";
import { ResetOrderModal } from "./ResetOrderModal";
import { ShipOrderModal } from "./ShipOrderModal";

const ORDER_STATUSES = [
  { label: "All statuses", value: "" },
  { label: "Fulfilled", value: "FULFILLED" },
  { label: "In processing", value: "IN_PROCESSING" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "On hold", value: "ON_HOLD" },
  { label: "Ready to ship", value: "READY_TO_SHIP" },
  { label: "Received", value: "RECEIVED" },
];

const BATCH_LIMIT = 10;
const SHIPPED_CANCEL_WINDOW_MS = 30 * 60 * 1000;

type SortState = {
  key: "receivedAt" | "status";
  direction: "asc" | "desc";
};

type OrderMutationShipment = {
  id?: string;
  status?: string;
  carrierCode?: string | null;
  carrierShipmentId?: string | null;
  trackingNumber?: string | null;
  labelUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type OrderMutationResult = {
  orderId: string;
  orderStatus: string;
  labelUrl?: string | null;
  shipment?: OrderMutationShipment;
};

export function OrdersTable({ role: roleProp }: { role?: Role }) {
  const { membership } = useAuth();
  const role = roleProp ?? membership?.role ?? "VIEWER";
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailCache, setDetailCache] = useState<Record<string, OrderDetail>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sort, setSort] = useState<SortState>({
    key: "receivedAt",
    direction: "desc",
  });
  const [shipTarget, setShipTarget] = useState<OrderListItem | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<OrderListItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderListItem | null>(null);
  const [resetTarget, setResetTarget] = useState<OrderListItem | null>(null);
  const detailCacheRef = useRef(detailCache);
  const detailLoadingRef = useRef(new Set<string>());

  useEffect(() => {
    detailCacheRef.current = detailCache;
  }, [detailCache]);

  const ensureDetail = useCallback(async (orderId: string) => {
    if (detailCacheRef.current[orderId] || detailLoadingRef.current.has(orderId)) {
      return;
    }

    detailLoadingRef.current.add(orderId);
    setDetailErrors((current) => {
      const next = { ...current };
      delete next[orderId];
      return next;
    });

    try {
      const detail = await getOrder(orderId);
      setDetailCache((current) => {
        const next = { ...current, [orderId]: detail };
        detailCacheRef.current = next;
        return next;
      });
    } catch (detailError) {
      setDetailErrors((current) => ({
        ...current,
        [orderId]: getErrorMessage(detailError),
      }));
    } finally {
      detailLoadingRef.current.delete(orderId);
    }
  }, []);

  const refreshOrders = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getOrders(
          {
            page,
            pageSize: 20,
            include: "expanded",
            sortBy: "receivedAt",
            sortOrder: "desc",
            search,
            status,
            from: from ? new Date(from).toISOString() : undefined,
            to: to ? new Date(to).toISOString() : undefined,
          },
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setOrders(result.data);
        if (result.expandedData) {
          const expandedById = Object.fromEntries(
            result.expandedData.map((order) => [order.id, order]),
          );
          setDetailCache((current) => {
            const next = { ...current, ...expandedById };
            detailCacheRef.current = next;
            return next;
          });
        }
        setPagination({
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          totalItems: result.pagination.totalItems,
          totalPages: result.pagination.totalPages,
        });
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setOrders([]);
        setError(getErrorMessage(loadError));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();

    return () => controller.abort();
  }, [from, page, reloadKey, search, status, to]);

  useEffect(() => {
    if (!orders.length) {
      setExpandedRows({});
      setSelectedIds(new Set());
      return;
    }

    setExpandedRows(Object.fromEntries(orders.map((order) => [order.id, true])));
    setSelectedIds(new Set());
  }, [orders]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((first, second) => {
        const direction = sort.direction === "asc" ? 1 : -1;

        if (sort.key === "receivedAt") {
          return (
            (new Date(first.receivedAt).getTime() -
              new Date(second.receivedAt).getTime()) *
            direction
          );
        }

        return first.status.localeCompare(second.status) * direction;
      }),
    [orders, sort],
  );

  const eligibleOrders = useMemo(
    () => sortedOrders.filter(isEligibleForShip),
    [sortedOrders],
  );
  const selectedOrders = useMemo(
    () => sortedOrders.filter((order) => selectedIds.has(order.id)),
    [selectedIds, sortedOrders],
  );
  const overLimit = selectedIds.size > BATCH_LIMIT;

  const expandAll = useCallback(() => {
    setExpandedRows(Object.fromEntries(sortedOrders.map((order) => [order.id, true])));
    sortedOrders.forEach((order) => {
      if (!detailCacheRef.current[order.id]) {
        void ensureDetail(order.id);
      }
    });
  }, [ensureDetail, sortedOrders]);

  const collapseAll = useCallback(() => {
    setExpandedRows(Object.fromEntries(sortedOrders.map((order) => [order.id, false])));
  }, [sortedOrders]);

  const toggleRow = useCallback(
    (orderId: string) => {
      const nextState = !expandedRows[orderId];
      setExpandedRows((current) => ({ ...current, [orderId]: nextState }));

      if (nextState) {
        void ensureDetail(orderId);
      }
    },
    [ensureDetail, expandedRows],
  );

  const toggleSelect = useCallback((orderId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(eligibleOrders.map((order) => order.id)));
  }, [eligibleOrders]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  function changeSort(key: SortState["key"]) {
    setSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { key, direction: "asc" },
    );
  }

  function handleBatchSuccess(result: { succeeded: string[] }) {
    const now = new Date().toISOString();
    selectedOrders
      .filter((order) => result.succeeded.includes(order.id))
      .forEach((order) => {
        applyOrderMutation({
          orderId: order.id,
          orderStatus: "IN_PROCESSING",
          shipment: {
            status: "CREATED",
            createdAt: now,
            updatedAt: now,
          },
        });
      });
    clearSelection();
  }

  function handleOrderMutation(result: OrderMutationResult) {
    applyOrderMutation(result);
  }

  function applyOrderMutation(result: OrderMutationResult) {
    const now = new Date().toISOString();
    const shipmentPatch = result.shipment;

    setOrders((current) => {
      const next = current.map((order) => {
        if (order.id !== result.orderId) {
          return order;
        }

        return {
          ...order,
          status: result.orderStatus,
          updatedAt: now,
          latestShipmentStatus: hasOwn(shipmentPatch, "status")
            ? shipmentPatch.status ?? null
            : order.latestShipmentStatus,
          latestTrackingNumber: hasOwn(shipmentPatch, "trackingNumber")
            ? shipmentPatch.trackingNumber ?? null
            : order.latestTrackingNumber,
          latestLabelUrl: hasOwn(shipmentPatch, "labelUrl")
            ? shipmentPatch.labelUrl ?? null
            : result.labelUrl ?? order.latestLabelUrl,
          trackingNumber: hasOwn(shipmentPatch, "trackingNumber")
            ? shipmentPatch.trackingNumber ?? null
            : order.trackingNumber ?? null,
          carrierShipmentId: hasOwn(shipmentPatch, "carrierShipmentId")
            ? shipmentPatch.carrierShipmentId ?? null
            : order.carrierShipmentId ?? null,
          labelUrl: hasOwn(shipmentPatch, "labelUrl")
            ? shipmentPatch.labelUrl ?? null
            : result.labelUrl ?? order.labelUrl ?? null,
          latestShipmentCarrier: hasOwn(shipmentPatch, "carrierCode")
            ? shipmentPatch.carrierCode ?? null
            : order.latestShipmentCarrier ?? null,
        };
      });

      return status && result.orderStatus !== status
        ? next.filter((order) => order.id !== result.orderId)
        : next;
    });

    setDetailCache((current) => {
      const detail = current[result.orderId];
      if (!detail) {
        return current;
      }

      const nextDetail = {
        ...detail,
        status: result.orderStatus,
        updatedAt: now,
        statusHistory: [
          {
            id: `local-${result.orderId}-${result.orderStatus}-${Date.now()}`,
            status: result.orderStatus,
            note: mutationStatusNote(result.orderStatus),
            actorType: "USER" as const,
            createdAt: now,
          },
          ...detail.statusHistory,
        ],
        shipments: patchDetailShipments(detail, shipmentPatch, now),
      };

      const next = { ...current, [result.orderId]: nextDetail };
      detailCacheRef.current = next;
      return next;
    });

    if (status && result.orderStatus !== status) {
      setExpandedRows((current) => {
        const next = { ...current };
        delete next[result.orderId];
        return next;
      });
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(result.orderId);
        return next;
      });
      setPagination((current) => ({
        ...current,
        totalItems: Math.max(0, current.totalItems - 1),
      }));
    }
  }

  return (
    <div className="grid gap-4">
      <OrderStatusSummary
        isLoading={isLoading}
        orders={orders}
        totalItems={pagination.totalItems}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden
          />
          <input
            className="h-9 w-full rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] pl-9 pr-3 text-xs text-[var(--text-primary)] shadow-soft"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search order number, SKU, recipient"
            type="search"
            value={searchInput}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] shadow-soft hover:border-[var(--brand-mid)]"
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            value={status}
          >
            {ORDER_STATUSES.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] shadow-soft hover:border-[var(--brand-mid)]"
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            type="date"
            value={from}
          />
          <input
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] shadow-soft hover:border-[var(--brand-mid)]"
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            type="date"
            value={to}
          />
        </div>
      </div>

      {isLoading ? <LoadingSkeleton rows={10} /> : null}

      {!isLoading && error ? (
        <ErrorState message={error} retry={refreshOrders} />
      ) : null}

      {!isLoading && !error ? (
        <section className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
          {sortedOrders.length ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
              <button
                className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
                onClick={expandAll}
                type="button"
              >
                <ChevronsDown className="h-[13px] w-[13px]" aria-hidden />
                Mở tất cả
              </button>
              <button
                className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
                onClick={collapseAll}
                type="button"
              >
                <ChevronsUp className="h-[13px] w-[13px]" aria-hidden />
                Đóng tất cả
              </button>
              <div className="mx-1 h-4 w-px bg-[var(--border)]" />

              {selectedIds.size > 0 ? (
                <span>
                  Selected <strong>{selectedIds.size}</strong>/{BATCH_LIMIT}
                </span>
              ) : null}
              {overLimit ? (
                <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                  YunExpress supports up to 10 orders per batch
                </span>
              ) : null}
              {can.shipOrder(role) ? (
                <button
                  className="ml-auto inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-2.5 text-xs font-medium text-white hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={selectedIds.size === 0 || overLimit}
                  onClick={() => setShowBatchModal(true)}
                  type="button"
                >
                  <Truck className="h-3 w-3" aria-hidden />
                  Ship selected ({selectedIds.size})
                </button>
              ) : (
                <span className="ml-auto text-[11px] text-[var(--text-muted)]">
                  {orders.length} orders
                </span>
              )}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bg-surface2)]">
                  <th className="w-8 border-b border-[var(--border)] px-2 py-2.5">
                    <input
                      aria-label="Select all eligible orders"
                      checked={Boolean(
                        eligibleOrders.length > 0 &&
                          eligibleOrders.every((order) => selectedIds.has(order.id)),
                      )}
                      className="cursor-pointer accent-[var(--brand)]"
                      disabled={!eligibleOrders.length || !can.shipOrder(role)}
                      onChange={(event) =>
                        event.target.checked ? selectAll() : clearSelection()
                      }
                      type="checkbox"
                    />
                  </th>
                  <th className="w-9 border-b border-[var(--border)] px-2 py-2.5" />
                  <TableHeader className="w-[180px]">Order #</TableHeader>
                  <SortableHeader
                    active={sort.key === "status"}
                    direction={sort.direction}
                    onClick={() => changeSort("status")}
                  >
                    Status
                  </SortableHeader>
                  <TableHeader className="w-[180px]">Recipient</TableHeader>
                  <TableHeader className="w-[170px]">Items</TableHeader>
                  <TableHeader className="w-[150px]">Tracking</TableHeader>
                  <TableHeader className="w-[150px]">Shipment</TableHeader>
                  <SortableHeader
                    active={sort.key === "receivedAt"}
                    className="w-[130px]"
                    direction={sort.direction}
                    onClick={() => changeSort("receivedAt")}
                  >
                    Received
                  </SortableHeader>
                  <TableHeader className="w-[190px]">Actions</TableHeader>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order) => {
                  const isExpanded = expandedRows[order.id] ?? false;
                  const detail = detailCache[order.id] ?? null;
                  const detailError = detailErrors[order.id] ?? null;

                  return (
                    <OrderRows
                      detail={detail}
                      detailError={detailError}
                      isExpanded={isExpanded}
                      key={order.id}
                      onCancel={setCancelTarget}
                      onConfirm={setConfirmTarget}
                      onReset={setResetTarget}
                      onShip={(target) => {
                        if (!detailCacheRef.current[target.id]) {
                          void ensureDetail(target.id);
                        }
                        setShipTarget(target);
                      }}
                      order={order}
                      role={role}
                      selected={selectedIds.has(order.id)}
                      toggleRow={toggleRow}
                      toggleSelect={toggleSelect}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          {!sortedOrders.length ? (
            <EmptyState
              description="Orders will appear here when received from Portal."
              heading="No orders yet."
              icon={<Inbox className="h-6 w-6" aria-hidden />}
            />
          ) : null}

          {sortedOrders.length ? (
            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-3.5 py-3 text-xs text-[var(--text-muted)]">
              <span>
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </span>
              <div className="flex gap-2">
                <button
                  className="h-8 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="h-8 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPage((value) =>
                      Math.min(Math.max(pagination.totalPages, 1), value + 1),
                    )
                  }
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {shipTarget ? (
        <ShipOrderModal
          detail={detailCache[shipTarget.id] ?? null}
          onClose={() => setShipTarget(null)}
          onSuccess={handleOrderMutation}
          order={shipTarget}
        />
      ) : null}

      {showBatchModal ? (
        <BatchShipModal
          detailsByOrderId={detailCache}
          onClose={() => setShowBatchModal(false)}
          onSuccess={handleBatchSuccess}
          orders={selectedOrders.filter(isEligibleForShip).slice(0, BATCH_LIMIT)}
        />
      ) : null}

      {confirmTarget ? (
        <ConfirmShipModal
          detail={detailCache[confirmTarget.id] ?? null}
          onClose={() => setConfirmTarget(null)}
          onSuccess={handleOrderMutation}
          order={confirmTarget}
        />
      ) : null}

      {cancelTarget ? (
        <CancelYunModal
          detail={detailCache[cancelTarget.id] ?? null}
          onClose={() => setCancelTarget(null)}
          onSuccess={handleOrderMutation}
          order={cancelTarget}
        />
      ) : null}

      {resetTarget ? (
        <ResetOrderModal
          onClose={() => setResetTarget(null)}
          onSuccess={handleOrderMutation}
          order={resetTarget}
        />
      ) : null}
    </div>
  );
}

function OrderRows({
  order,
  detail,
  detailError,
  isExpanded,
  role,
  toggleRow,
  selected,
  toggleSelect,
  onShip,
  onConfirm,
  onCancel,
  onReset,
}: {
  order: OrderListItem;
  detail: OrderDetail | null;
  detailError: string | null;
  isExpanded: boolean;
  role: Role;
  toggleRow: (orderId: string) => void;
  selected: boolean;
  toggleSelect: (orderId: string) => void;
  onShip: (order: OrderListItem) => void;
  onConfirm: (order: OrderListItem) => void;
  onCancel: (order: OrderListItem) => void;
  onReset: (order: OrderListItem) => void;
}) {
  const orderIdentifier = order.orderNumber ?? order.externalOrderId;
  const shipment = getLatestShipmentInfo(order, detail);

  async function copyOrderIdentifier() {
    try {
      await copyText(orderIdentifier);
      toastSuccess("Order ID copied.");
    } catch {
      toastError("Failed to copy order ID.");
    }
  }

  async function copyTracking() {
    if (!shipment.trackingNumber) {
      return;
    }

    try {
      await copyText(shipment.trackingNumber);
      toastSuccess("Tracking copied.");
    } catch {
      toastError("Failed to copy tracking.");
    }
  }

  return (
    <>
      <tr
        className={cn(
          "bg-[var(--bg-surface)] transition-colors hover:bg-[var(--bg-surface2)]",
          isExpanded ? "" : "border-b border-[var(--border)]",
        )}
      >
        <td className="w-8 px-2 py-2.5 text-center align-middle">
          {isEligibleForShip(order) ? (
            <input
              aria-label={`Select order ${orderIdentifier}`}
              checked={Boolean(selected)}
              className="cursor-pointer accent-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-30"
              disabled={!can.shipOrder(role)}
              onChange={() => toggleSelect(order.id)}
              type="checkbox"
            />
          ) : (
            <input
              aria-label={`Order ${orderIdentifier} is not eligible for batch ship`}
              checked={false}
              className="cursor-not-allowed opacity-30"
              disabled
              onChange={() => undefined}
              type="checkbox"
            />
          )}
        </td>
        <td className="w-9 px-2 py-2.5 text-center align-middle">
          <button
            aria-label={isExpanded ? "Collapse row" : "Expand row"}
            className={cn(
              "inline-flex h-[22px] w-[22px] items-center justify-center rounded-xs border transition-all duration-150",
              isExpanded
                ? "border-[var(--brand-mid)] bg-[var(--brand-light)] text-[var(--brand)]"
                : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)]",
            )}
            onClick={(event) => {
              event.stopPropagation();
              toggleRow(order.id);
            }}
            type="button"
          >
            <ChevronDown
              className={cn(
                "h-[13px] w-[13px] transition-transform duration-150",
                isExpanded ? "rotate-180" : "",
              )}
              aria-hidden
            />
          </button>
        </td>
        <td className="px-3.5 py-2.5 align-middle">
          <button
            aria-label={`Copy order ID ${orderIdentifier}`}
            className="inline-flex max-w-[170px] items-center gap-1 truncate font-mono text-[11px] font-semibold text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
            onClick={copyOrderIdentifier}
            title="Click to copy"
            type="button"
          >
            <span className="truncate">{orderIdentifier}</span>
            <Copy className="h-3 w-3 shrink-0" aria-hidden />
          </button>
        </td>
        <td className="px-3.5 py-2.5 align-middle">
          <StatusBadge status={order.status} />
        </td>
        <td className="px-3.5 py-2.5 align-middle">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--text-primary)]">
              {order.recipientName ?? "Not provided"}
            </p>
            <p className="truncate text-[11px] text-[var(--text-muted)]">
              {countryFlag(order.destinationCountry)}{" "}
              {order.destinationCity ?? order.destinationCountry ?? "No address"}
            </p>
          </div>
        </td>
        <td className="px-3.5 py-2.5 align-middle">
          <span className="block truncate text-xs text-[var(--text-secondary)]">
            {order.itemCount} items
            {order.firstSku ? ` · ${order.firstSku}` : ""}
          </span>
          {order.firstItemName ? (
            <span className="block max-w-[160px] truncate text-[10px] text-[var(--text-muted)]">
              {order.firstItemName}
            </span>
          ) : null}
        </td>
        <td className="px-3.5 py-2.5 align-middle">
          {shipment.trackingNumber ? (
            <div className="flex items-center gap-1">
              <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                {shipment.trackingNumber}
              </span>
              <button
                aria-label="Copy tracking number"
                className="rounded-xs border border-transparent p-0.5 text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--brand)]"
                onClick={copyTracking}
                type="button"
              >
                <Copy className="h-3 w-3" aria-hidden />
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-[var(--text-muted)]">-</span>
          )}
        </td>
        <td className="px-3.5 py-2.5 align-middle">
          {shipment.status ? (
            <div className="grid gap-1">
              <StatusBadge status={shipment.status} />
              {shipment.carrier ? (
                <div className="font-mono text-[9px] text-[var(--text-muted)]">
                  {shipment.carrier}
                </div>
              ) : null}
              {shipment.labelUrl ? (
                <a
                  className="inline-flex items-center gap-0.5 text-[10px] text-[var(--brand)] hover:underline"
                  href={shipment.labelUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="h-[9px] w-[9px]" aria-hidden />
                  Label
                </a>
              ) : null}
            </div>
          ) : (
            <span className="text-[11px] text-[var(--text-muted)]">-</span>
          )}
        </td>
        <td className="px-3.5 py-2.5 align-middle">
          <time
            className="text-xs text-[var(--text-secondary)]"
            dateTime={order.receivedAt}
            title={formatDateTime(order.receivedAt)}
          >
            {relativeTime(order.receivedAt)}
          </time>
        </td>
        <td className="px-3.5 py-2.5 align-middle">
          <OrderActions
            labelUrl={shipment.labelUrl}
            canCancelShipped={canCancelShippedOrder(order.status, detail)}
            onCancel={() => onCancel(order)}
            onConfirm={() => onConfirm(order)}
            onReset={() => onReset(order)}
            onShip={() => onShip(order)}
            order={order}
            role={role}
          />
        </td>
      </tr>
      {isExpanded ? (
        <tr>
          <td className="border-b border-[var(--border)] p-0" colSpan={10}>
            {detailError ? (
              <div className="bg-[var(--brand-light)] px-12 py-4">
                <ErrorState message={detailError} />
              </div>
            ) : (
              <OrderExpandPanel isLoading={!detail} order={detail} />
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function OrderActions({
  order,
  role,
  labelUrl,
  canCancelShipped,
  onShip,
  onConfirm,
  onCancel,
  onReset,
}: {
  order: OrderListItem;
  role: Role;
  labelUrl: string | null;
  canCancelShipped: boolean;
  onShip: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onReset: () => void;
}) {
  if (!can.shipOrder(role)) {
    return null;
  }

  switch (order.status) {
    case "FULFILLED":
    case "READY_TO_SHIP":
      return (
        <button
          className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-2.5 text-xs font-medium text-white hover:bg-[var(--brand-dark)]"
          onClick={onShip}
          type="button"
        >
          <Truck className="h-3 w-3" aria-hidden />
          Ship
        </button>
      );

    case "IN_PROCESSING":
      return (
        <div className="flex flex-wrap gap-1.5">
          {can.confirmShip(role) ? (
            <button
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#a7f3d0] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--success)] hover:bg-[var(--success-bg)]"
              onClick={onConfirm}
              type="button"
            >
              <CheckCircle className="h-3 w-3" aria-hidden />
              Confirm ship
            </button>
          ) : null}
          {can.cancelYun(role) ? (
            <button
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#fca5a5] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)]"
              onClick={onCancel}
              type="button"
            >
              <X className="h-3 w-3" aria-hidden />
              Cancel Yun
            </button>
          ) : null}
        </div>
      );

    case "SHIPPED":
      return (
        <div className="flex flex-wrap gap-1.5">
          {labelUrl ? (
            <a
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
              href={labelUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              Open label
            </a>
          ) : null}
          {can.cancelYun(role) && canCancelShipped ? (
            <button
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#fca5a5] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)]"
              onClick={onCancel}
              title="Available within 30 minutes after confirm ship"
              type="button"
            >
              <X className="h-3 w-3" aria-hidden />
              Cancel Yun
            </button>
          ) : null}
        </div>
      );

    case "CANCELLED":
      return can.resetOrder(role) ? (
        <button
          className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
          onClick={onReset}
          type="button"
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          Reset order
        </button>
      ) : (
        <span className="text-[11px] text-[var(--text-muted)]">Cancelled</span>
      );

    default:
      return null;
  }
}

function TableHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border-b border-[var(--border)] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]",
        className,
      )}
    >
      {children}
    </th>
  );
}

function SortableHeader({
  children,
  active,
  direction,
  onClick,
  className,
}: {
  children: React.ReactNode;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border-b border-[var(--border)] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]",
        className,
      )}
    >
      <button
        className="inline-flex items-center gap-1 hover:text-[var(--brand)]"
        onClick={onClick}
        type="button"
      >
        {children}
        {active ? (
          direction === "asc" ? (
            <ChevronUp className="h-3 w-3" aria-hidden />
          ) : (
            <ChevronDown className="h-3 w-3" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3" aria-hidden />
        )}
      </button>
    </th>
  );
}

function getLatestShipmentInfo(order: OrderListItem, detail: OrderDetail | null) {
  const latestShipment = detail?.shipments?.[0] ?? null;

  return {
    trackingNumber:
      order.trackingNumber ??
      order.latestTrackingNumber ??
      latestShipment?.trackingNumber ??
      null,
    carrierShipmentId:
      order.carrierShipmentId ?? latestShipment?.carrierShipmentId ?? null,
    labelUrl: order.labelUrl ?? order.latestLabelUrl ?? latestShipment?.labelUrl ?? null,
    status: order.latestShipmentStatus ?? latestShipment?.status ?? null,
    carrier: order.latestShipmentCarrier ?? latestShipment?.carrierCode ?? null,
  };
}

function patchDetailShipments(
  detail: OrderDetail,
  shipmentPatch: OrderMutationShipment | undefined,
  timestamp: string,
) {
  if (!shipmentPatch) {
    return detail.shipments;
  }

  const currentShipments = detail.shipments ?? [];
  const firstShipment = currentShipments[0] ?? null;
  const shipmentId = shipmentPatch.id ?? firstShipment?.id;

  if (!shipmentId) {
    return currentShipments;
  }

  const patchedShipment = {
    id: shipmentId,
    orderId: detail.id,
    orderNumber: detail.orderNumber,
    externalOrderId: detail.externalOrderId,
    status: hasOwn(shipmentPatch, "status")
      ? shipmentPatch.status ?? firstShipment?.status ?? "CREATED"
      : firstShipment?.status ?? "CREATED",
    carrierCode: hasOwn(shipmentPatch, "carrierCode")
      ? shipmentPatch.carrierCode ?? null
      : firstShipment?.carrierCode ?? "YUNEXPRESS_OMS",
    carrierShipmentId: hasOwn(shipmentPatch, "carrierShipmentId")
      ? shipmentPatch.carrierShipmentId ?? null
      : firstShipment?.carrierShipmentId ?? null,
    trackingNumber: hasOwn(shipmentPatch, "trackingNumber")
      ? shipmentPatch.trackingNumber ?? null
      : firstShipment?.trackingNumber ?? null,
    labelUrl: hasOwn(shipmentPatch, "labelUrl")
      ? shipmentPatch.labelUrl ?? null
      : firstShipment?.labelUrl ?? null,
    createdAt: shipmentPatch.createdAt ?? firstShipment?.createdAt ?? timestamp,
    updatedAt: shipmentPatch.updatedAt ?? timestamp,
    itemCount: firstShipment?.itemCount ?? detail.items.length,
  };

  if (currentShipments.some((shipment) => shipment.id === shipmentId)) {
    return currentShipments.map((shipment) =>
      shipment.id === shipmentId ? { ...shipment, ...patchedShipment } : shipment,
    );
  }

  return [patchedShipment, ...currentShipments];
}

function hasOwn<T extends object, K extends PropertyKey>(
  value: T | undefined,
  key: K,
): value is T & Record<K, unknown> {
  return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
}

function mutationStatusNote(status: string) {
  switch (status) {
    case "IN_PROCESSING":
      return "YunExpress shipment created.";
    case "SHIPPED":
      return "Shipment confirmed.";
    case "CANCELLED":
      return "YunExpress shipment cancelled.";
    case "FULFILLED":
      return "Cancelled order reset.";
    default:
      return "Order status updated.";
  }
}

function canCancelShippedOrder(status: string, detail: OrderDetail | null) {
  if (status !== "SHIPPED") {
    return false;
  }

  const shippedAtValue = detail?.statusHistory
    ?.filter((entry) => entry.status === "SHIPPED")
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    )[0]?.createdAt;

  if (!shippedAtValue) {
    return false;
  }

  const shippedAt = new Date(shippedAtValue).getTime();
  return Number.isFinite(shippedAt) && Date.now() - shippedAt <= SHIPPED_CANCEL_WINDOW_MS;
}

function relativeTime(value: string) {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const absMs = Math.abs(diffMs);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const [unit, unitMs] of units) {
    if (absMs >= unitMs) {
      return formatter.format(Math.round(diffMs / unitMs), unit);
    }
  }

  return "just now";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand("copy");
    if (!copied) {
      throw new Error("Copy failed");
    }
  } finally {
    document.body.removeChild(textarea);
  }
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

function isEligibleForShip(order: OrderListItem) {
  return order.status === "FULFILLED" || order.status === "READY_TO_SHIP";
}
