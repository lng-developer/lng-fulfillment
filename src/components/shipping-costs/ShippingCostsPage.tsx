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
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Quản lý chi phí vận chuyển
          </h1>
          <p className="mt-1 max-w-[620px] text-xs leading-5 text-slate-500">
            Đối soát cước phí tạm tính và cước phí thực tế từ YunExpress sau khi đơn hàng được tính cước.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <SummaryPill label="Chờ cước" value={visibleSummary.pending} variant="amber" />
          <SummaryPill label="Đã có cước" value={visibleSummary.available} variant="emerald" />
          <SummaryPill label="Thất bại" value={visibleSummary.failed} variant="rose" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
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
            placeholder="Tìm theo Order, tracking, waybill..."
            value={searchInput}
          />
        </div>
        <select
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
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
          className="h-9 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          onClick={() => {
            setPage(1);
            setSearch(searchInput.trim());
          }}
          type="button"
        >
          Lọc
        </button>
        {canFetch ? (
          <button
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-md bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            disabled={selectedIds.size === 0}
            onClick={() => {
              void handleFetchSelected();
            }}
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Lấy cước đã chọn ({selectedIds.size})
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} retry={() => setReloadKey((value) => value + 1)} />
      ) : items.length === 0 ? (
        <EmptyState
          description="Chưa có dữ liệu cước phí vận chuyển. Vui lòng xác nhận xuất kho để hệ thống tính cước."
          heading="Không có bản ghi chi phí"
          icon={<ReceiptText className="h-6 w-6" aria-hidden />}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-left text-xs divide-y divide-slate-100">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-8 px-3 py-2.5">
                    <input
                      aria-label="Select all visible shipment costs"
                      checked={allCurrentPageSelected}
                      className="cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                      onChange={toggleSelectAllCurrentPage}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-3 py-2.5">Đơn hàng</th>
                  <th className="px-3 py-2.5">Kênh nguồn</th>
                  <th className="px-3 py-2.5">Waybill / Tracking</th>
                  <th className="px-3 py-2.5">Kích thước thực tế</th>
                  <th className="px-3 py-2.5">Cước tạm tính</th>
                  <th className="px-3 py-2.5">Cước thực tế Yun</th>
                  <th className="px-3 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr
                    className="hover:bg-slate-50/70 transition-colors"
                    key={item.id}
                  >
                    <td className="px-3 py-2.5 text-center align-middle">
                      <input
                        aria-label={`Select ${item.orderNumber ?? item.externalOrderId}`}
                        checked={selectedIds.has(item.shipmentId)}
                        className="cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                        onChange={() => toggleSelected(item.shipmentId)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="font-mono text-xs font-semibold text-indigo-600">
                        {item.orderNumber ?? item.externalOrderId}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.externalOrderId}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                        {item.sourceChannel ?? "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="font-mono text-xs text-slate-800">
                        {item.carrierShipmentId ?? "-"}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {item.trackingNumber ?? "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="font-medium text-slate-800">{formatKg(item.actualWeightKg)} kg</div>
                      <div className="text-[11px] text-slate-400">
                        {formatNumber(item.actualLengthCm)} × {formatNumber(item.actualWidthCm)} × {formatNumber(item.actualHeightCm)} cm
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Tính cước: {formatKg(item.chargeableWeightKg)} kg
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="font-bold text-slate-900">
                        {formatMoney(item.estimatedFee, item.estimatedCurrency)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Bậc: {item.estimatedWeightKg ? `${formatKg(item.estimatedWeightKg)} kg` : "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <ActualFeeCell item={item} />
                      {item.actualFetchErrorMessage ? (
                        <div className="mt-1 max-w-[220px] truncate text-[11px] text-rose-500">
                          {item.actualFetchErrorMessage}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right align-middle">
                      {canFetch ? (
                        <button
                          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
                          disabled={Boolean(pendingFetches[item.shipmentId])}
                          onClick={() => {
                            void handleFetchActualFee(item);
                          }}
                          type="button"
                        >
                          {pendingFetches[item.shipmentId] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          {item.actualFeeStatus === "AVAILABLE"
                            ? "Cập nhật cước"
                            : "Lấy cước Yun"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span>
              Trang {pagination.page} / {Math.max(1, pagination.totalPages)} ·{" "}
              {pagination.totalItems} bản ghi
            </span>
            <div className="flex gap-2">
              <button
                className="h-8 rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-40 transition-colors"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                type="button"
              >
                Trang trước
              </button>
              <button
                className="h-8 rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-40 transition-colors"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((value) => value + 1)}
                type="button"
              >
                Trang sau
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
      <span className="font-bold tabular-nums text-slate-900">
        {formatMoney(item.actualTotalFee, null)}
      </span>
      <button
        aria-expanded={isOpen}
        aria-label="Show actual fee details"
        className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-colors"
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
        <Info className="h-3 w-3" />
      </button>
      {isOpen && detailPosition ? (
        <div
          className="fixed z-[100] max-h-[280px] w-[300px] overflow-auto rounded-lg border border-slate-200 bg-white p-3.5 text-xs text-slate-600 shadow-xl"
          style={{
            left: detailPosition.left,
            top: detailPosition.top,
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Chi tiết cước YunExpress
            </span>
            <button
              aria-label="Close actual fee details"
              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              onClick={() => {
                setIsOpen(false);
                setDetailPosition(null);
              }}
              type="button"
            >
              Đóng
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
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

function SummaryPill({
  label,
  value,
  variant = "slate",
}: {
  label: string;
  value: number;
  variant?: "slate" | "amber" | "emerald" | "rose";
}) {
  const colorMap = {
    slate: "border-slate-200 bg-white text-slate-900",
    amber: "border-amber-200 bg-amber-50/60 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50/60 text-emerald-800",
    rose: "border-rose-200 bg-rose-50/60 text-rose-800",
  };

  return (
    <div className={`rounded-lg border px-3 py-1.5 text-center shadow-sm ${colorMap[variant]}`}>
      <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold">{value}</div>
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
    <div className="flex min-w-0 justify-between gap-2 text-xs">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 truncate text-right font-mono font-medium text-slate-800">
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
