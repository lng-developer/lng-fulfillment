"use client";

import { Info, Loader2, ReceiptText, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { getErrorMessage } from "@/lib/api/base";
import {
  fetchShipmentActualFee,
  getShipmentCosts,
  type ShipmentCostListItem,
} from "@/lib/api/shipment-costs";
import { useAuth } from "@/lib/auth-context";
import { toastError, toastSuccess } from "@/lib/toast";

const PAGE_SIZE = 20;
const ACTUAL_FEE_DETAIL_WIDTH = 300;
const ACTUAL_FEE_DETAIL_HEIGHT = 210;
const FEE_STATUSES = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Available", value: "AVAILABLE" },
  { label: "Failed", value: "FAILED" },
];

export function ShippingCostsPage() {
  const { membership } = useAuth();
  const canFetch = ["OWNER", "ADMIN", "OPERATOR"].includes(membership?.role ?? "");
  const [items, setItems] = useState<ShipmentCostListItem[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingFetches, setPendingFetches] = useState<Record<string, boolean>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getShipmentCosts({
      page,
      pageSize: PAGE_SIZE,
      status,
      search,
    })
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        setItems(result.data);
        setPagination(result.pagination);
        setSelectedIds(new Set());
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [page, reloadKey, search, status]);

  const visibleSummary = useMemo(() => {
    const pending = items.filter((item) => item.actualFeeStatus === "PENDING").length;
    const available = items.filter((item) => item.actualFeeStatus === "AVAILABLE").length;
    const failed = items.filter((item) => item.actualFeeStatus === "FAILED").length;
    return { pending, available, failed };
  }, [items]);

  async function handleFetchActualFee(item: ShipmentCostListItem) {
    if (pendingFetches[item.shipmentId]) {
      return;
    }

    setPendingFetches((current) => ({ ...current, [item.shipmentId]: true }));
    try {
      const updated = await fetchShipmentActualFee(item.shipmentId);
      setItems((current) =>
        current.map((row) =>
          row.shipmentId === updated.shipmentId ? { ...row, ...updated } : row,
        ),
      );
      toastSuccess("Actual YunExpress fee fetched.");
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setPendingFetches((current) => {
        const next = { ...current };
        delete next[item.shipmentId];
        return next;
      });
    }
  }

  async function handleFetchSelected() {
    const selectedItems = items.filter((item) => selectedIds.has(item.shipmentId));
    if (!selectedItems.length) {
      return;
    }

    let succeeded = 0;
    let failed = 0;
    for (const item of selectedItems) {
      if (pendingFetches[item.shipmentId]) {
        continue;
      }

      setPendingFetches((current) => ({ ...current, [item.shipmentId]: true }));
      try {
        const updated = await fetchShipmentActualFee(item.shipmentId);
        setItems((current) =>
          current.map((row) =>
            row.shipmentId === updated.shipmentId ? { ...row, ...updated } : row,
          ),
        );
        succeeded += 1;
      } catch (err) {
        failed += 1;
        toastError(`${item.orderNumber ?? item.externalOrderId}: ${getErrorMessage(err)}`);
      } finally {
        setPendingFetches((current) => {
          const next = { ...current };
          delete next[item.shipmentId];
          return next;
        });
      }
    }

    if (succeeded > 0) {
      toastSuccess(`Fetched Yun fee for ${succeeded} selected order(s).`);
    }
    if (failed === 0) {
      setSelectedIds(new Set());
    }
  }

  const allCurrentPageSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item.shipmentId));

  function toggleSelected(shipmentId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(shipmentId)) {
        next.delete(shipmentId);
      } else {
        next.add(shipmentId);
      }
      return next;
    });
  }

  function toggleSelectAllCurrentPage() {
    setSelectedIds((current) => {
      if (allCurrentPageSelected) {
        return new Set();
      }

      const next = new Set(current);
      items.forEach((item) => next.add(item.shipmentId));
      return next;
    });
  }

  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">
            Shipping cost management
          </h1>
          <p className="mt-1 max-w-[620px] text-[13px] text-[var(--text-secondary)]">
            Review estimated fees from actual package data and fetch real
            YunExpress freight fees after carrier billing becomes available.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <SummaryPill label="Pending" value={visibleSummary.pending} />
          <SummaryPill label="Available" value={visibleSummary.available} />
          <SummaryPill label="Failed" value={visibleSummary.failed} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] p-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            className="h-9 w-full rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPage(1);
                setSearch(searchInput.trim());
              }
              if (event.key === "Escape") {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }
            }}
            placeholder="Search order, tracking, waybill..."
            value={searchInput}
          />
        </div>
        <select
          className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 text-xs text-[var(--text-primary)]"
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          value={status}
        >
          {FEE_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface2)]"
          onClick={() => {
            setPage(1);
            setSearch(searchInput.trim());
          }}
          type="button"
        >
          Apply
        </button>
        {canFetch ? (
          <button
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={selectedIds.size === 0}
            onClick={() => {
              void handleFetchSelected();
            }}
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Fetch selected ({selectedIds.size})
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} retry={() => setReloadKey((value) => value + 1)} />
      ) : items.length === 0 ? (
        <EmptyState
          description="Confirm shipped orders with actual package data before reviewing shipping costs."
          heading="No shipping cost records"
          icon={<ReceiptText className="h-6 w-6" aria-hidden />}
        />
      ) : (
        <div className="overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] bg-[var(--bg-surface2)] text-[10px] uppercase tracking-[0.07em] text-[var(--text-muted)]">
                <tr>
                  <th className="w-8 px-3 py-2">
                    <input
                      aria-label="Select all visible shipment costs"
                      checked={allCurrentPageSelected}
                      className="cursor-pointer accent-[var(--brand)]"
                      onChange={toggleSelectAllCurrentPage}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Waybill / Tracking</th>
                  <th className="px-3 py-2">Actual package</th>
                  <th className="px-3 py-2">Estimate</th>
                  <th className="px-3 py-2">Actual fee</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    className="border-b border-[var(--border)] last:border-b-0"
                    key={item.id}
                  >
                    <td className="px-3 py-2 text-center align-middle">
                      <input
                        aria-label={`Select ${item.orderNumber ?? item.externalOrderId}`}
                        checked={selectedIds.has(item.shipmentId)}
                        className="cursor-pointer accent-[var(--brand)]"
                        onChange={() => toggleSelected(item.shipmentId)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="font-mono text-[11px] font-semibold text-[var(--brand)]">
                        {item.orderNumber ?? item.externalOrderId}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {item.externalOrderId}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] px-2 py-0.5 font-mono text-[10px]">
                        {item.sourceChannel ?? "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="font-mono text-[11px]">
                        {item.carrierShipmentId ?? "-"}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--text-muted)]">
                        {item.trackingNumber ?? "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div>{formatKg(item.actualWeightKg)} kg</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {formatNumber(item.actualLengthCm)} x {formatNumber(item.actualWidthCm)} x {formatNumber(item.actualHeightCm)} cm
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Chargeable {formatKg(item.chargeableWeightKg)} kg
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="font-semibold">
                        {formatMoney(item.estimatedFee, item.estimatedCurrency)}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Bracket {item.estimatedWeightKg ? `${formatKg(item.estimatedWeightKg)} kg` : "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <ActualFeeCell item={item} />
                      {item.actualFetchErrorMessage ? (
                        <div className="mt-1 max-w-[220px] truncate text-[10px] text-[var(--danger)]">
                          {item.actualFetchErrorMessage}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right align-middle">
                      {canFetch ? (
                        <button
                          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--brand-light)] disabled:opacity-50"
                          disabled={Boolean(pendingFetches[item.shipmentId])}
                          onClick={() => {
                            void handleFetchActualFee(item);
                          }}
                          type="button"
                        >
                          {pendingFetches[item.shipmentId] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          {item.actualFeeStatus === "AVAILABLE"
                            ? "Refresh Yun fee"
                            : "Fetch Yun fee"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)]">
            <span>
              Page {pagination.page} / {Math.max(1, pagination.totalPages)} ·{" "}
              {pagination.totalItems} records
            </span>
            <div className="flex gap-2">
              <button
                className="h-8 rounded-sm border border-[var(--border-strong)] px-3 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                type="button"
              >
                Previous
              </button>
              <button
                className="h-8 rounded-sm border border-[var(--border-strong)] px-3 disabled:opacity-40"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((value) => value + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActualFeeCell({ item }: { item: ShipmentCostListItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const [detailPosition, setDetailPosition] = useState<{ left: number; top: number } | null>(
    null,
  );
  const detailButtonRef = useRef<HTMLButtonElement>(null);

  function getDetailPosition() {
    const rect = detailButtonRef.current?.getBoundingClientRect();
    if (!rect) {
      return null;
    }

    const viewportPadding = 12;
    let left = rect.right + 8;
    if (left + ACTUAL_FEE_DETAIL_WIDTH > window.innerWidth - viewportPadding) {
      left = Math.max(viewportPadding, rect.left - ACTUAL_FEE_DETAIL_WIDTH - 8);
    }

    const maxTop =
      window.innerHeight - ACTUAL_FEE_DETAIL_HEIGHT - viewportPadding;
    const top = Math.max(viewportPadding, Math.min(rect.top, maxTop));

    return { left, top };
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePosition = () => {
      setDetailPosition(getDetailPosition());
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-flex max-w-full items-center gap-1.5">
      <span className="font-semibold tabular-nums text-[var(--text-primary)]">
        {formatMoney(item.actualTotalFee, null)}
      </span>
      <button
        aria-expanded={isOpen}
        aria-label="Show actual fee details"
        className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--brand-mid)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            setDetailPosition(null);
            return;
          }

          setDetailPosition(getDetailPosition());
          setIsOpen(true);
        }}
        ref={detailButtonRef}
        type="button"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {isOpen && detailPosition ? (
        <div
          className="fixed z-[100] max-h-[280px] w-[300px] overflow-auto rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-[10px] text-[var(--text-secondary)] shadow-xl"
          style={{
            left: detailPosition.left,
            top: detailPosition.top,
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
              Actual fee details
            </span>
            <button
              aria-label="Close actual fee details"
              className="rounded-sm px-1.5 py-0.5 text-[11px] text-[var(--text-muted)] hover:bg-[var(--bg-surface2)] hover:text-[var(--text-primary)]"
              onClick={() => {
                setIsOpen(false);
                setDetailPosition(null);
              }}
              type="button"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <FeeLine label="Gross" value={formatKg(item.actualGrossWeight)} suffix="kg" />
            <FeeLine label="Charge" value={formatKg(item.actualChargeWeight)} suffix="kg" />
            <FeeLine label="Freight" value={formatMoney(item.actualFreight, null)} />
            <FeeLine label="Fuel" value={formatMoney(item.actualFuelSurcharge, null)} />
            <FeeLine label="Registration" value={formatMoney(item.actualRegistrationFee, null)} />
            <FeeLine label="Processing" value={formatMoney(item.actualProcessingFee, null)} />
            <FeeLine label="Other" value={formatMoney(item.actualOtherFee, null)} />
            <FeeLine label="Total" value={formatMoney(item.actualTotalFee, null)} />
            <FeeLine label="Fetched" value={formatDateTime(item.actualFetchedAt)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2">
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
      <div className="text-sm font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function FeeLine({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="flex min-w-0 justify-between gap-2">
      <span className="shrink-0 text-[var(--text-muted)]">{label}</span>
      <span className="min-w-0 truncate text-right font-mono text-[var(--text-primary)]">
        {value}
        {value !== "-" && suffix ? ` ${suffix}` : ""}
      </span>
    </div>
  );
}

function formatKg(value: string | null) {
  return formatNumber(value, 3);
}

function formatNumber(value: string | null, digits = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(parsed);
}

function formatMoney(value: string | null, currency: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }

  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      currency: "VND",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(parsed);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(parsed);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
