"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Layers,
  Loader2,
  MoreHorizontal,
  Package,
  Printer,
  RotateCcw,
  Search,
  Truck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getErrorMessage } from "@/lib/api/base";
import {
  cancelYunShipment,
  confirmOrderShipped,
  getOrder,
  getOrders,
  resetOrder,
  shipOrder,
  shipOrdersBatch,
} from "@/lib/api/orders";
import { useAuth } from "@/lib/auth-context";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  OrderDetail,
  OrderListItem,
  ShipmentCostSummary,
} from "@/types/orders";
import { BatchShipModal, type BatchShipSubmitInput } from "./BatchShipModal";
import { CancelYunModal } from "./CancelYunModal";
import { OrderExpandPanel } from "./OrderExpandPanel";
import { ResetOrderModal } from "./ResetOrderModal";
import { ShipOrderModal, type ShipOrderSubmitInput } from "./ShipOrderModal";

const STATUS_TABS = [
  { label: "Tất cả", value: "" },
  { label: "Chờ đóng hàng", value: "READY_TO_SHIP" },
  { label: "Đang xử lý / Giao", value: "IN_PROCESSING" },
  { label: "Đã xuất kho", value: "SHIPPED" },
  { label: "Đã hủy", value: "CANCELLED" },
] as const;

const SOURCE_CHANNELS = [
  { label: "Tất cả kênh", value: "" },
  { label: "Amazon", value: "AMAZON" },
  { label: "Etsy", value: "ETSY" },
  { label: "Manual", value: "MANUAL" },
  { label: "Khác", value: "UNKNOWN" },
] as const;

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
  shipmentCost?: ShipmentCostSummary;
};

type PendingOrderAction = "ship" | "cancel" | "sync" | "reset";

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
  const [sourceChannel, setSourceChannel] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailCache, setDetailCache] = useState<Record<string, OrderDetail>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [shipTarget, setShipTarget] = useState<OrderListItem | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<OrderListItem | null>(null);
  const [resetTarget, setResetTarget] = useState<OrderListItem | null>(null);
  const [activeMenuOrderId, setActiveMenuOrderId] = useState<string | null>(null);
  const [pendingOrderActions, setPendingOrderActions] = useState<
    Record<string, PendingOrderAction>
  >({});
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
    }, 350);

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
            sourceChannel,
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
  }, [page, reloadKey, search, sourceChannel, status]);

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
    const eligibleOrders = orders.filter((order) =>
      ["READY_TO_SHIP", "RECEIVED", "FULFILLED"].includes(order.status),
    );
    setSelectedIds(new Set(eligibleOrders.map((order) => order.id)));
  }, [orders]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  function applyOrderMutation(result: OrderMutationResult) {
    const now = new Date().toISOString();
    const shipmentPatch = result.shipment;

    setOrders((current) => {
      return current.map((order) => {
        if (order.id !== result.orderId) {
          return order;
        }

        return {
          ...order,
          status: result.orderStatus,
          updatedAt: now,
          latestShipmentStatus: shipmentPatch?.status ?? order.latestShipmentStatus,
          latestTrackingNumber: shipmentPatch?.trackingNumber ?? order.latestTrackingNumber,
          latestLabelUrl: shipmentPatch?.labelUrl ?? (result.labelUrl ?? order.latestLabelUrl),
          trackingNumber: shipmentPatch?.trackingNumber ?? (order.trackingNumber ?? null),
          carrierShipmentId: shipmentPatch?.carrierShipmentId ?? (order.carrierShipmentId ?? null),
          labelUrl: shipmentPatch?.labelUrl ?? (result.labelUrl ?? order.labelUrl ?? null),
          latestShipmentCarrier: shipmentPatch?.carrierCode ?? (order.latestShipmentCarrier ?? null),
          latestShipmentCost: result.shipmentCost ?? order.latestShipmentCost ?? null,
        };
      });
    });

    void ensureDetail(result.orderId);
  }

  // 1-Click fast fulfillment executor
  async function handleExecuteShip(input: ShipOrderSubmitInput) {
    if (!shipTarget) return;
    const targetOrder = shipTarget;
    setShipTarget(null);

    setPendingOrderActions((current) => ({
      ...current,
      [targetOrder.id]: "ship",
    }));

    try {
      const result = await shipOrder(targetOrder.id, input.environment, input.options);
      const tracking =
        result.shipment?.trackingNumber || result.orderId;
      const labelUrl = result.shipment?.labelUrl;

      // Auto-open label PDF in new tab for thermal printing
      if (labelUrl) {
        window.open(labelUrl, "_blank", "noopener,noreferrer");
      }

      // Auto-confirm package dimensions in background for cost calculation
      if (input.options.weight && input.options.length) {
        void confirmOrderShipped(targetOrder.id, {
          weightKg: input.options.weight,
          lengthCm: input.options.length,
          widthCm: input.options.width ?? 10,
          heightCm: input.options.height ?? 5,
        }).then((costRes) => {
          applyOrderMutation(costRes);
        }).catch(() => {});
      }

      toastSuccess(`Tạo vận đơn thành công! Mã tracking: ${tracking}`);
      applyOrderMutation(result);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setPendingOrderActions((current) => {
        const next = { ...current };
        delete next[targetOrder.id];
        return next;
      });
    }
  }

  async function handleBatchShip(input: BatchShipSubmitInput) {
    setShowBatchModal(false);
    const orderIds = input.orderIds;

    setPendingOrderActions((current) => ({
      ...current,
      ...Object.fromEntries(orderIds.map((id) => [id, "ship"])),
    }));

    try {
      const result = await shipOrdersBatch(
        orderIds,
        input.environment,
        input.optionsByOrderId,
      );

      const successCount = result.succeeded.length;
      const failedCount = result.failed.length;

      if (successCount) {
        toastSuccess(`Đã tạo thành công ${successCount} vận đơn!`);
        result.succeeded.forEach((s) => {
          applyOrderMutation({
            orderId: s.orderId,
            orderStatus: "IN_PROCESSING",
            shipment: s.shipment ?? undefined,
          });
        });
        clearSelection();
      }

      if (failedCount) {
        toastError(`${failedCount} đơn tạo vận đơn thất bại.`);
      }
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      orderIds.forEach((id) => {
        setPendingOrderActions((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      });
    }
  }

  async function handleCancelYun(order: OrderListItem) {
    setCancelTarget(null);
    setPendingOrderActions((current) => ({ ...current, [order.id]: "cancel" }));

    try {
      const result = await cancelYunShipment(order.id);
      toastSuccess("Đã hủy vận đơn YunExpress thành công.");
      applyOrderMutation(result);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setPendingOrderActions((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
    }
  }

  async function handleResetOrder(order: OrderListItem) {
    setResetTarget(null);
    setPendingOrderActions((current) => ({ ...current, [order.id]: "reset" }));

    try {
      const result = await resetOrder(order.id);
      toastSuccess("Đã thiết lập lại trạng thái đơn hàng.");
      applyOrderMutation(result);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setPendingOrderActions((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Quick Status Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-6">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.value;
            return (
              <button
                className={cn(
                  "relative py-3 text-xs font-medium transition-colors hover:text-slate-900",
                  active
                    ? "font-semibold text-indigo-600 border-b-2 border-indigo-600 -mb-px"
                    : "text-slate-500",
                )}
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value);
                  setPage(1);
                }}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <Button
          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          onClick={refreshOrders}
          size="sm"
          variant="secondary"
        >
          Làm mới
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-8 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo mã đơn, tracking, người nhận..."
            value={searchInput}
          />
          {searchInput && (
            <button
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              onClick={() => setSearchInput("")}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            onChange={(e) => {
              setSourceChannel(e.target.value);
              setPage(1);
            }}
            value={sourceChannel}
          >
            {SOURCE_CHANNELS.map((ch) => (
              <option key={ch.value} value={ch.value}>
                {ch.label}
              </option>
            ))}
          </select>

          {can.shipOrder(role) && (
            <Button
              disabled={selectedIds.size === 0}
              leftIcon={<Layers className="h-3.5 w-3.5" />}
              onClick={() => setShowBatchModal(true)}
              size="sm"
              variant="secondary"
            >
              Đóng hàng loạt ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Batch Floating / Active selection banner */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-xs text-indigo-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Đã chọn {selectedIds.size} đơn hàng</span>
            <span className="text-indigo-600">| Sẵn sàng tạo vận đơn hàng loạt</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              leftIcon={<Truck className="h-3.5 w-3.5" />}
              onClick={() => setShowBatchModal(true)}
              size="sm"
              variant="primary"
            >
              Đóng gói ngay
            </Button>
            <Button onClick={clearSelection} size="sm" variant="ghost">
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* Main Table */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} retry={refreshOrders} />
      ) : orders.length === 0 ? (
        <EmptyState
          description="Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại."
          heading="Chưa có đơn hàng"
          icon={<Package className="h-6 w-6" />}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-10 px-3.5 py-2.5">
                    <input
                      checked={
                        orders.length > 0 &&
                        orders.every((o) => selectedIds.has(o.id))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      onChange={(e) => {
                        if (e.target.checked) selectAll();
                        else clearSelection();
                      }}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-3.5 py-2.5">Mã đơn & Kênh</th>
                  <th className="px-3.5 py-2.5">Người nhận & Điểm đến</th>
                  <th className="px-3.5 py-2.5">Sản phẩm</th>
                  <th className="px-3.5 py-2.5 text-center">Trạng thái</th>
                  <th className="px-3.5 py-2.5">Mã Tracking</th>
                  <th className="px-3.5 py-2.5">Thời gian nhận</th>
                  <th className="px-3.5 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {orders.map((order) => {
                  const isExpanded = expandedRows[order.id] ?? false;
                  const isSelected = selectedIds.has(order.id);
                  const detail = detailCache[order.id] ?? null;
                  const tracking =
                    order.trackingNumber ??
                    order.latestTrackingNumber ??
                    detail?.shipments?.[0]?.trackingNumber ??
                    null;
                  const labelUrl =
                    order.labelUrl ??
                    order.latestLabelUrl ??
                    detail?.shipments?.[0]?.labelUrl ??
                    null;
                  const isShipped =
                    order.status === "SHIPPED" || Boolean(labelUrl);
                  const pendingAction = pendingOrderActions[order.id] ?? null;
                  const isMenuOpen = activeMenuOrderId === order.id;

                  return (
                    <Fragment key={order.id}>
                      <tr
                        className={cn(
                          "transition-colors hover:bg-slate-50/80",
                          isSelected ? "bg-indigo-50/30" : "",
                        )}
                      >
                        <td className="w-10 px-3.5 py-2.5">
                          <input
                            checked={isSelected}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            onChange={() => toggleSelect(order.id)}
                            type="checkbox"
                          />
                        </td>

                        {/* Order ID & Source */}
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">
                              #{order.orderNumber ?? order.externalOrderId}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                              {order.sourceChannel || "Manual"}
                            </span>
                          </div>
                          {order.shopName && (
                            <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                              {order.shopName}
                            </span>
                          )}
                        </td>

                        {/* Recipient & Country */}
                        <td className="px-3.5 py-2.5">
                          <div className="font-medium text-slate-800">
                            {order.recipientName || "Chưa có tên"}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <span className="font-mono font-semibold text-slate-700">
                              {countryFlag(order.destinationCountry)}{" "}
                              {order.destinationCountry}
                            </span>
                            {order.destinationCity && (
                              <span>• {order.destinationCity}</span>
                            )}
                          </div>
                        </td>

                        {/* Items */}
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                              {order.totalQuantity} món
                            </span>
                            {order.firstSku && (
                              <span className="font-mono text-[11px] text-slate-500 truncate max-w-[120px]">
                                {order.firstSku}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-2.5 text-center">
                          <StatusBadge status={order.status} />
                        </td>

                        {/* Tracking */}
                        <td className="px-3.5 py-2.5">
                          {tracking ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-semibold text-slate-800 text-[11px]">
                                {tracking}
                              </span>
                              <CopyButton value={tracking} />
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>

                        {/* Received Time */}
                        <td className="px-3.5 py-2.5 text-[11px] text-slate-500">
                          {relativeTime(order.receivedAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Primary Button */}
                            {pendingAction ? (
                              <span className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Đang xử lý...
                              </span>
                            ) : isShipped ? (
                              labelUrl ? (
                                <a
                                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-600 px-3 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                                  href={labelUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  In nhãn
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">Đã ship</span>
                              )
                            ) : can.shipOrder(role) ? (
                              <Button
                                leftIcon={<Truck className="h-3.5 w-3.5" />}
                                onClick={() => {
                                  if (!detailCacheRef.current[order.id]) {
                                    void ensureDetail(order.id);
                                  }
                                  setShipTarget(order);
                                }}
                                size="sm"
                                variant="primary"
                              >
                                Ship
                              </Button>
                            ) : null}

                            {/* Details expand toggle */}
                            <button
                              aria-label="Xem chi tiết đơn hàng"
                              className={cn(
                                "h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800 flex items-center justify-center",
                                isExpanded ? "bg-slate-100" : "",
                              )}
                              onClick={() => toggleRow(order.id)}
                              type="button"
                            >
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 transition-transform duration-150",
                                  isExpanded ? "rotate-180" : "",
                                )}
                              />
                            </button>

                            {/* Secondary menu ... */}
                            <div className="relative">
                              <button
                                aria-label="Tùy chọn khác"
                                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-400 shadow-sm hover:bg-slate-50 hover:text-slate-700 flex items-center justify-center"
                                onClick={() =>
                                  setActiveMenuOrderId(isMenuOpen ? null : order.id)
                                }
                                type="button"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>

                              {isMenuOpen && (
                                <>
                                  <div
                                    className="fixed inset-0 z-20"
                                    onClick={() => setActiveMenuOrderId(null)}
                                  />
                                  <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-dropdown text-left">
                                    {can.cancelYun(role) && isShipped && (
                                      <button
                                        className="w-full rounded px-2.5 py-1.5 text-left text-rose-600 hover:bg-rose-50"
                                        onClick={() => {
                                          setActiveMenuOrderId(null);
                                          setCancelTarget(order);
                                        }}
                                        type="button"
                                      >
                                        Hủy vận đơn Yun (30p)
                                      </button>
                                    )}
                                    <button
                                      className="w-full rounded px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                                      onClick={() => {
                                        setActiveMenuOrderId(null);
                                        setResetTarget(order);
                                      }}
                                      type="button"
                                    >
                                      Reset trạng thái đơn
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Order Detail Panel */}
                      {isExpanded && (
                        <tr>
                          <td className="p-0" colSpan={8}>
                            {detailErrors[order.id] ? (
                              <div className="p-4 bg-rose-50 border-b border-rose-200">
                                <ErrorState message={detailErrors[order.id]} />
                              </div>
                            ) : (
                              <OrderExpandPanel
                                isLoading={!detail}
                                order={detail}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Hiển thị{" "}
              <span className="font-semibold text-slate-800">
                {(pagination.page - 1) * pagination.pageSize + 1}
              </span>
              –
              <span className="font-semibold text-slate-800">
                {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)}
              </span>{" "}
              trong{" "}
              <span className="font-semibold text-slate-800">
                {pagination.totalItems}
              </span>{" "}
              đơn hàng
            </span>
            <div className="flex items-center gap-2">
              <Button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                size="sm"
                variant="secondary"
              >
                Trước
              </Button>
              <span className="text-xs text-slate-600">
                Trang {pagination.page} / {pagination.totalPages || 1}
              </span>
              <Button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                size="sm"
                variant="secondary"
              >
                Sau
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Fast Fulfillment Modal */}
      {shipTarget && (
        <ShipOrderModal
          detail={detailCache[shipTarget.id] ?? null}
          onClose={() => setShipTarget(null)}
          onSubmit={handleExecuteShip}
          order={shipTarget}
        />
      )}

      {/* Batch Ship Modal */}
      {showBatchModal && (
        <BatchShipModal
          detailsByOrderId={detailCache}
          onClose={() => setShowBatchModal(false)}
          onSubmit={handleBatchShip}
          orders={orders.filter((o) => selectedIds.has(o.id))}
        />
      )}

      {/* Cancel Yun Modal */}
      {cancelTarget && (
        <CancelYunModal
          detail={detailCache[cancelTarget.id] ?? null}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => handleCancelYun(cancelTarget)}
          order={cancelTarget}
        />
      )}

      {/* Reset Order Modal */}
      {resetTarget && (
        <ResetOrderModal
          onClose={() => setResetTarget(null)}
          onSubmit={() => handleResetOrder(resetTarget)}
          order={resetTarget}
        />
      )}
    </div>
  );
}

function countryFlag(countryCode: string | null | undefined) {
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

function relativeTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${Math.max(1, diffMins)} phút trước`;
  }
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}
