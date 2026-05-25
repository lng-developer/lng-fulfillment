"use client";

import {
  ChevronDown,
  ChevronUp,
  Inbox,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getErrorMessage } from "@/lib/api/base";
import { getOrder, getOrders } from "@/lib/api/orders";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { OrderDetail, OrderListItem } from "@/types/orders";
import { OrderExpandPanel } from "./OrderExpandPanel";

const ORDER_STATUSES = [
  { label: "All statuses", value: "" },
  { label: "Received", value: "RECEIVED" },
  { label: "Ready to ship", value: "READY_TO_SHIP" },
  { label: "On hold", value: "ON_HOLD" },
  { label: "Cancelled", value: "CANCELLED" },
];

type SortState = {
  key: "receivedAt" | "status";
  direction: "asc" | "desc";
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
  const [detailCache, setDetailCache] = useState<Record<string, OrderDetail>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sort, setSort] = useState<SortState>({
    key: "receivedAt",
    direction: "desc",
  });
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
      setDetailCache((current) => ({ ...current, [orderId]: detail }));
      detailCacheRef.current = { ...detailCacheRef.current, [orderId]: detail };
    } catch (detailError) {
      setDetailErrors((current) => ({
        ...current,
        [orderId]: getErrorMessage(detailError),
      }));
    } finally {
      detailLoadingRef.current.delete(orderId);
    }
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
            sortBy: "receivedAt",
            sortOrder: "desc",
            search,
            status,
            from: from ? new Date(from).toISOString() : undefined,
            to: to ? new Date(to).toISOString() : undefined,
          },
          controller.signal,
        );

        setOrders(result.data);
        setPagination({
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          totalItems: result.pagination.totalItems,
          totalPages: result.pagination.totalPages,
        });
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setOrders([]);
          setError(getErrorMessage(loadError));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();

    return () => controller.abort();
  }, [from, page, reloadKey, search, status, to]);

  useEffect(() => {
    if (!orders.length) {
      setExpandedRows({});
      return;
    }

    setExpandedRows(
      Object.fromEntries(orders.map((order) => [order.id, true])),
    );
    orders.forEach((order) => {
      void ensureDetail(order.id);
    });
  }, [ensureDetail, orders]);

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

  const orderStats = useMemo(() => {
    const total = pagination.totalItems || orders.length;
    const ready = orders.filter((order) => order.status === "READY_TO_SHIP").length;
    const inTransit = orders.filter((order) => order.status === "IN_TRANSIT").length;
    const exceptions = orders.filter((order) => order.status === "EXCEPTION").length;

    return [
      { label: "Total", value: total, tone: "text-[var(--text-primary)]" },
      { label: "Ready to ship", value: ready, tone: "text-[var(--success)]" },
      { label: "In transit", value: inTransit, tone: "text-[var(--info)]" },
      { label: "Exceptions", value: exceptions, tone: "text-[var(--danger)]" },
    ];
  }, [orders, pagination.totalItems]);

  const expandAll = useCallback(() => {
    setExpandedRows(
      Object.fromEntries(sortedOrders.map((order) => [order.id, true])),
    );
    sortedOrders.forEach((order) => {
      void ensureDetail(order.id);
    });
  }, [ensureDetail, sortedOrders]);

  const collapseAll = useCallback(() => {
    setExpandedRows(
      Object.fromEntries(sortedOrders.map((order) => [order.id, false])),
    );
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

  return (
    <div className="grid gap-4">
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {orderStats.map((stat) => (
          <div
            className="rounded border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-3 shadow-soft"
            key={stat.label}
          >
            <p className="text-[11px] font-medium text-[var(--text-muted)]">
              {stat.label}
            </p>
            <p className={cn("mt-1 text-xl font-bold", stat.tone)}>
              {stat.value}
            </p>
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
              Current result set
            </p>
          </div>
        ))}
      </section>

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
        <ErrorState
          message={error}
          retry={() => setReloadKey((value) => value + 1)}
        />
      ) : null}

      {!isLoading && !error ? (
        <section className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
          {sortedOrders.length ? (
            <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-secondary)]">
              <button
                className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
                onClick={expandAll}
                type="button"
              >
                <ChevronDown className="h-[13px] w-[13px]" aria-hidden />
                Mở tất cả
              </button>
              <button
                className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
                onClick={collapseAll}
                type="button"
              >
                <ChevronUp className="h-[13px] w-[13px]" aria-hidden />
                Đóng tất cả
              </button>
              <span className="ml-auto text-[var(--text-muted)]">
                {pagination.totalItems} orders · Page {pagination.page}
              </span>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bg-surface2)]">
                  <th className="w-9 border-b border-[var(--border)] px-2 py-2.5" />
                  <TableHeader className="w-[180px]">Order #</TableHeader>
                  <TableHeader className="hidden w-[110px] md:table-cell">
                    Source
                  </TableHeader>
                  <SortableHeader
                    active={sort.key === "status"}
                    direction={sort.direction}
                    onClick={() => changeSort("status")}
                  >
                    Status
                  </SortableHeader>
                  <TableHeader className="w-[180px]">Recipient</TableHeader>
                  <TableHeader className="w-[180px]">Items</TableHeader>
                  <SortableHeader
                    active={sort.key === "receivedAt"}
                    className="w-[130px]"
                    direction={sort.direction}
                    onClick={() => changeSort("receivedAt")}
                  >
                    Received
                  </SortableHeader>
                  <TableHeader className="w-[120px]">Shipments</TableHeader>
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
                      onDraftCreated={() => {
                        setReloadKey((value) => value + 1);
                        setDetailCache((current) => {
                          const next = { ...current };
                          delete next[order.id];
                          detailCacheRef.current = next;
                          return next;
                        });
                        void ensureDetail(order.id);
                      }}
                      order={order}
                      role={role}
                      toggleRow={toggleRow}
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
  onDraftCreated,
}: {
  order: OrderListItem;
  detail: OrderDetail | null;
  detailError: string | null;
  isExpanded: boolean;
  role: Role;
  toggleRow: (orderId: string) => void;
  onDraftCreated: () => void;
}) {
  const orderIdentifier = order.orderNumber ?? order.externalOrderId;

  async function copyOrderIdentifier() {
    try {
      await copyText(orderIdentifier);
      toastSuccess("Order ID copied.");
    } catch {
      toastError("Failed to copy order ID.");
    }
  }

  return (
    <>
      <tr
        className={cn(
          "bg-[var(--bg-surface)] transition-colors hover:bg-[var(--bg-surface2)]",
          isExpanded
            ? ""
            : "border-b border-[var(--border)]",
        )}
      >
        <td className="w-9 px-2 pt-[10px] text-center align-top">
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
        <td className="px-3.5 py-2.5 align-top">
          <button
            aria-label={`Copy order ID ${orderIdentifier}`}
            className="block max-w-[170px] truncate font-mono text-xs font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
            onClick={copyOrderIdentifier}
            title="Click to copy"
            type="button"
          >
            {orderIdentifier}
          </button>
        </td>
        <td className="hidden px-3.5 py-2.5 align-top md:table-cell">
          <span className="inline-flex max-w-full rounded-full bg-[var(--brand-light)] px-2 py-0.5 text-[10px] font-medium text-[var(--brand-dark)]">
            <span className="truncate">{order.source ?? "unknown"}</span>
          </span>
        </td>
        <td className="px-3.5 py-2.5 align-top">
          <StatusBadge status={order.status} />
        </td>
        <td className="px-3.5 py-2.5 align-top">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--text-primary)]">
              {order.recipientName ?? "Not provided"}
            </p>
            <p className="truncate text-[11px] text-[var(--text-muted)]">
              {countryFlag(order.destinationCountry)}{" "}
              {order.destinationCountry ?? "No country"}
            </p>
          </div>
        </td>
        <td className="px-3.5 py-2.5 align-top">
          <span className="block truncate text-xs text-[var(--text-secondary)]">
            {order.itemCount} items
            {order.firstSku ? ` · ${order.firstSku}` : ""}
          </span>
        </td>
        <td className="px-3.5 py-2.5 align-top">
          <time
            className="text-xs text-[var(--text-secondary)]"
            dateTime={order.receivedAt}
            title={formatDateTime(order.receivedAt)}
          >
            {relativeTime(order.receivedAt)}
          </time>
        </td>
        <td className="px-3.5 py-2.5 align-top">
          <span className="text-xs text-[var(--text-muted)]">
            {detail?.items ? detail.items.length : order.itemCount} items
          </span>
        </td>
      </tr>
      {isExpanded ? (
        <tr>
          <td className="border-b border-[var(--border)] p-0" colSpan={8}>
            {detailError ? (
              <div className="bg-[var(--brand-light)] px-12 py-4">
                <ErrorState message={detailError} />
              </div>
            ) : (
              <OrderExpandPanel
                isLoading={!detail}
                onDraftCreated={onDraftCreated}
                order={detail}
                role={role}
              />
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
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
