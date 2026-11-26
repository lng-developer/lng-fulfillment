"use client";

import { FULFILLMENT_SEARCH_PLACEHOLDER } from "@/shared/fulfillment-search";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShipmentDetailPanel } from "@/components/shipments/ShipmentDetailPanel";
import { syncTracking as syncShipmentTracking } from "@/lib/api/shipments";
import { PrintLabelModal } from "./PrintLabelModal";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  Layers,
  Loader2,
  MoreHorizontal,
  Package,
  Printer,
  QrCode,
  RotateCcw,
  RefreshCw,
  Eye,
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
  markOrdersReadyToShip,
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
import { CancelOrderModal } from "./CancelOrderModal";
import { DateFilterPopover } from "./DateFilterPopover";
import { OrderExpandPanel } from "./OrderExpandPanel";
import { ResetOrderModal } from "./ResetOrderModal";
import { ShipOrderModal, type ShipOrderSubmitInput } from "./ShipOrderModal";

const STATUS_TABS = [
  { label: "Tất cả", value: "" },
  { label: "Chờ sản xuất / QC", value: "RECEIVED" },
  { label: "Sẵn sàng ship (Đã QC)", value: "READY_TO_SHIP" },
  { label: "Đang giao", value: "IN_PROCESSING" },
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

type PendingOrderAction = "ship" | "cancel" | "sync" | "reset" | "qc";

export function OrdersTable({ role: roleProp }: { role?: Role }) {
  const { membership } = useAuth();
  const role = roleProp ?? membership?.role ?? "VIEWER";
  const [viewShipmentId, setViewShipmentId] = useState<string | null>(null);
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
  const [pendingVp, setPendingVp] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sourceChannel, setSourceChannel] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
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
  const [cancelOrderTarget, setCancelOrderTarget] = useState<OrderListItem | null>(null);
  const [resetTarget, setResetTarget] = useState<OrderListItem | null>(null);
  const [activeMenuOrderId, setActiveMenuOrderId] = useState<string | null>(null);
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, above: false });
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!activeMenuOrderId) return;
    const close = () => setActiveMenuOrderId(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        menuTriggerRef.current?.focus();
      }
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeMenuOrderId]);
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
            sortOrder,
            search,
            status,
            sourceChannel,
            pendingVp: pendingVp || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
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
  }, [fromDate, page, reloadKey, search, sourceChannel, status, toDate, pendingVp, sortOrder]);

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
          latestShipmentId: shipmentPatch?.id ?? order.latestShipmentId,
          latestCarrierCode: shipmentPatch?.carrierCode ?? order.latestCarrierCode,
          latestShipmentStatus: shipmentPatch?.status ?? order.latestShipmentStatus,
          latestShipmentIssue: shipmentPatch ? (shipmentPatch.status === "EXCEPTION" ? "Vận đơn cần đối soát với hãng vận chuyển." : null) : order.latestShipmentIssue,
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
  async function handleSyncVp(orderId: string, shipmentId: string) {
    setPendingOrderActions(current => ({ ...current, [orderId]: "sync" }));
    try {
      await syncShipmentTracking(shipmentId);
      toastSuccess("Đã đồng bộ vận đơn Viettel Post.");
      refreshOrders();
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setPendingOrderActions(current => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });
    }
  }

  async function handleExecuteShip(input: ShipOrderSubmitInput) {
    if (!shipTarget) return;
    const targetOrder = shipTarget;
    setShipTarget(null);

    setPendingOrderActions((current) => ({
      ...current,
      [targetOrder.id]: "ship",
    }));

    try {
      const result = await shipOrder(
        targetOrder.id,
        input.environment,
        input.options,
        input.carrierCode,
        input.carrierAccountId,
      );
      if (result.shipment?.status === "EXCEPTION") {
        applyOrderMutation(result);
        toastError("VP đã trả mã nhưng vận đơn chưa được xác minh hoặc đang lỗi. Cần đối soát trước khi gửi lại.");
        return;
      }
      const tracking = result.shipment?.trackingNumber;

      const labelUrl = result.shipment?.labelUrl;

      // Auto-open label PDF in new tab for thermal printing
      if (labelUrl) {
        window.open(labelUrl, "_blank", "noopener,noreferrer");
      }

      // Auto-confirm package dimensions in background for cost calculation
      if (input.carrierCode !== "VIETTEL_POST" && input.options.weight && input.options.length) {
        void confirmOrderShipped(targetOrder.id, {
          weightKg: input.options.weight,
          lengthCm: input.options.length,
          widthCm: input.options.width ?? 5,
          heightCm: input.options.height ?? 2,
        }).then((costRes) => {
          applyOrderMutation(costRes);
        }).catch(() => {});
      }

      const carrierName = input.carrierCode === "VIETTEL_POST" ? "Viettel Post" : "YunExpress";
      toastSuccess(`Tạo vận đơn ${carrierName} thành công! ${tracking ? `Mã tracking: ${tracking}` : "Đang chờ cấp tracking."}`);
      applyOrderMutation(result);
    } catch (err) {
      toastError(getErrorMessage(err));
      refreshOrders();
    } finally {
      setPendingOrderActions((current) => {
        const next = { ...current };
        delete next[targetOrder.id];
        return next;
      });
    }
  }

  async function handleBarcodeScan(e: React.FormEvent) {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    setIsScanning(true);
    try {
      const res = await markOrdersReadyToShip({ barcode: code });
      if (res.success) {
        toastSuccess(res.message);
        setBarcodeInput("");
        if (res.scannedOrder) {
          applyOrderMutation({
            orderId: res.scannedOrder.id,
            orderStatus: "READY_TO_SHIP",
          });
        }
      } else {
        toastError(res.message);
      }
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsScanning(false);
      barcodeInputRef.current?.focus();
    }
  }

  async function handleQcPass(orderIds: string[]) {
    if (!orderIds.length) return;

    setPendingOrderActions((current) => ({
      ...current,
      ...Object.fromEntries(orderIds.map((id) => [id, "qc" as const])),
    }));

    try {
      const res = await markOrdersReadyToShip({ orderIds });
      if (res.success) {
        toastSuccess(res.message);
        orderIds.forEach((id) => {
          applyOrderMutation({
            orderId: id,
            orderStatus: "READY_TO_SHIP",
          });
        });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          orderIds.forEach((id) => next.delete(id));
          return next;
        });
      } else {
        toastError(res.message);
      }
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setPendingOrderActions((current) => {
        const next = { ...current };
        orderIds.forEach((id) => delete next[id]);
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

  async function handleExport(exportSelectedOnly = false) {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ sortOrder });
      if (exportSelectedOnly && selectedIds.size > 0) {
        params.set("orderIds", Array.from(selectedIds).join(","));
      } else {
        if (status) params.set("status", status);
        if (pendingVp) params.set("pendingVp", "true");
        if (sourceChannel) params.set("sourceChannel", sourceChannel);
        if (search) params.set("search", search);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
      }

      const res = await fetch(`/api/orders/export?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Không thể xuất file. Vui lòng thử lại.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "orders_export.csv";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toastSuccess(`Xuất file "${filename}" thành công!`);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleResetOrder(order: OrderListItem, oldCarrierAccountId?: string) {
    setResetTarget(null);
    setPendingOrderActions((current) => ({ ...current, [order.id]: "reset" }));

    try {
      const result = await resetOrder(order.id, oldCarrierAccountId);
      toastSuccess("Đã reset và giữ lịch sử vận đơn. Chọn tài khoản mới ở bước Ship để gửi lại.");
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

  const selectedOrders = orders.filter((o) => selectedIds.has(o.id));
  const qcEligibleOrders = selectedOrders.filter(
    (o) => o.status === "RECEIVED" || o.status === "ON_HOLD",
  );
  const shipEligibleOrders = selectedOrders.filter(
    (o) => o.status === "READY_TO_SHIP",
  );

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
                  setPendingVp(false);
                  setSelectedIds(new Set());
                  setPage(1);
                }}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            disabled={isExporting}
            isLoading={isExporting}
            leftIcon={<Download className="h-3.5 w-3.5" />}
            onClick={() => void handleExport(selectedIds.size > 0)}
            size="sm"
            variant="secondary"
          >
            {selectedIds.size > 0
              ? `Xuất đơn đã chọn (${selectedIds.size})`
              : "Xuất Excel"}
          </Button>

          <Button
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={refreshOrders}
            size="sm"
            variant="secondary"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Quick QC Barcode Scan Bar */}
      {can.qcOrder(role) && (
        <form
          className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 shadow-sm"
          onSubmit={handleBarcodeScan}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 shrink-0">
            <QrCode className="h-4 w-4 text-emerald-600" />
            <span>Quét mã QC / Xong sản xuất:</span>
          </div>
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <input
              ref={barcodeInputRef}
              className="h-8 w-full rounded border border-emerald-300 bg-white px-2.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              disabled={isScanning}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Quét mã vạch hoặc nhập mã đơn (#...)..."
              value={barcodeInput}
            />
          </div>
          <Button
            className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
            disabled={!barcodeInput.trim() || isScanning}
            isLoading={isScanning}
            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
            size="sm"
            type="submit"
          >
            QC Pass
          </Button>
          <span className="hidden text-[11px] text-emerald-700 md:inline">
            (Bắn mã sản phẩm xưởng hoàn thành để mở khóa tạo vận đơn)
          </span>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-8 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={FULFILLMENT_SEARCH_PLACEHOLDER}
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

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={pendingVp}
              onChange={(event) => {
                setPendingVp(event.target.checked);
                setStatus("");
                setPage(1);
                setSelectedIds(new Set());
              }}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Chờ gửi VP
          </label>
          <select
            aria-label="Sắp xếp theo thời gian nhận đơn"
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value as "asc" | "desc");
              setPage(1);
              setSelectedIds(new Set());
            }}
          >
            <option value="desc">Mới nhất trước (DESC)</option>
            <option value="asc">Cũ nhất trước (ASC)</option>
          </select>
          {/* Modern Date Filter Popover */}
          <DateFilterPopover
            fromDate={fromDate}
            onChange={(from, to) => {
              setFromDate(from);
              setToDate(to);
              setPage(1);
            }}
            toDate={toDate}
          />

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
              disabled={shipEligibleOrders.length === 0}
              leftIcon={<Layers className="h-3.5 w-3.5" />}
              onClick={() => setShowBatchModal(true)}
              size="sm"
              variant="secondary"
            >
              Đóng hàng loạt ({shipEligibleOrders.length})
            </Button>
          )}
        </div>
      </div>

      {/* Batch Floating / Active selection banner */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-xs text-indigo-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Đã chọn {selectedIds.size} đơn hàng</span>
            {qcEligibleOrders.length > 0 && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                {qcEligibleOrders.length} chờ QC
              </span>
            )}
            {shipEligibleOrders.length > 0 && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                {shipEligibleOrders.length} sẵn sàng ship
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {can.qcOrder(role) && qcEligibleOrders.length > 0 && (
              <Button
                className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                onClick={() => void handleQcPass(qcEligibleOrders.map((o) => o.id))}
                size="sm"
              >
                QC Pass hàng loạt ({qcEligibleOrders.length})
              </Button>
            )}
            {can.shipOrder(role) && shipEligibleOrders.length > 0 && (
              <Button
                leftIcon={<Truck className="h-3.5 w-3.5" />}
                onClick={() => setShowBatchModal(true)}
                size="sm"
                variant="primary"
              >
                Đóng gói ({shipEligibleOrders.length})
              </Button>
            )}
            <Button
              className="h-8 text-xs"
              disabled={isExporting}
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={() => void handleExport(true)}
              size="sm"
              variant="secondary"
            >
              Xuất ({selectedIds.size})
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
                  const firstShipment = detail?.shipments?.[0] as
                    | (Record<string, unknown> & { labelUrl?: string | null; trackingNumber?: string | null })
                    | undefined;
                  const metadataCarrier =
                    firstShipment?.metadata &&
                    typeof firstShipment.metadata === "object" &&
                    !Array.isArray(firstShipment.metadata) &&
                    (firstShipment.metadata as Record<string, unknown>).carrier &&
                    typeof (firstShipment.metadata as Record<string, unknown>).carrier === "object"
                      ? ((firstShipment.metadata as Record<string, unknown>).carrier as Record<string, unknown>)
                      : null;
                  const labelUrl =
                    order.labelUrl ??
                    order.latestLabelUrl ??
                    firstShipment?.labelUrl ??
                    (typeof metadataCarrier?.labelUrl === "string" ? metadataCarrier.labelUrl : null) ??
                    null;
                  const latestShipmentId = order.latestShipmentId ??
                    (typeof firstShipment?.id === "string" ? firstShipment.id : null);
                  const hasVpShipment = Boolean(latestShipmentId) &&
                    order.latestCarrierCode === "VIETTEL_POST" &&
                    Boolean(order.latestShipmentStatus) &&
                    !["DRAFT", "FAILED_CREATE", "CANCELLED"].includes(order.latestShipmentStatus ?? "");
                  const isShipped =
                    order.status === "SHIPPED" ||
                    (order.latestShipmentStatus !== "CANCELLED" && Boolean(labelUrl)) ||
                    (order.status === "IN_PROCESSING" && Boolean(tracking));
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
                            <CopyButton value={order.orderNumber ?? order.externalOrderId} label="Sao chép mã đơn" />
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
                          {(order.latestShipmentIssue || order.latestShipmentStatus === "EXCEPTION") && (
                            <div className="mt-1 text-xs font-medium text-rose-700" role="status">{order.latestShipmentIssue || "Vận đơn có lỗi — cần kiểm tra hãng vận chuyển"}</div>
                          )}
                        </td>

                        {/* Tracking */}
                        <td className="px-3.5 py-2.5">
                          {tracking ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-semibold text-slate-800 text-[11px]">
                                {tracking}
                              </span>
                              <CopyButton value={tracking} label="Sao chép tracking" />
                              {(order.latestCarrierAccountId === "cmwjc0l9q0001iq1sse3mzemj" ||
                                labelUrl?.includes(".stg.") ||
                                order.latestLabelUrl?.includes(".stg.")) ? (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 border border-amber-300">
                                  STAGING
                                </span>
                              ) : (
                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 border border-emerald-200">
                                  PROD
                                </span>
                              )}
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
                            ) : hasVpShipment ? (
                              <>
                                <Button size="sm" variant="secondary" leftIcon={<Eye className="h-3.5 w-3.5" />}
                                  onClick={() => setViewShipmentId(latestShipmentId)}>
                                  Xem vận đơn
                                </Button>
                                {can.syncTracking(role) && (
                                  <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                                    onClick={() => void handleSyncVp(order.id, latestShipmentId!)}>
                                    Đồng bộ VP
                                  </Button>
                                )}
                                {labelUrl && (
                                  <Button size="sm" variant="secondary" leftIcon={<Printer className="h-3.5 w-3.5" />}
                                    onClick={() => setPrintOrderId(order.id)}>
                                    In nhãn
                                  </Button>
                                )}
                              </>
                            ) : isShipped ? (
                              (labelUrl || (order.latestCarrierCode === "VIETTEL_POST" && order.latestShipmentStatus !== "CANCELLED")) ? (
                                <button
                                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-600 px-3 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                                  type="button"
                                  onClick={() => setPrintOrderId(order.id)}
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  In nhãn
                                </button>
                              ) : (
                                <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-500">
                                  {tracking ? "Chờ nhãn in" : "Đã ship"}
                                </span>
                              )
                            ) : order.status === "RECEIVED" ? (
                              can.qcOrder(role) ? (
                                <Button
                                  className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                                  disabled={pendingAction === "qc"}
                                  isLoading={pendingAction === "qc"}
                                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                  onClick={() => void handleQcPass([order.id])}
                                  size="sm"
                                >
                                  QC Pass
                                </Button>
                              ) : (
                                <span className="text-xs font-medium text-amber-600">Chờ QC</span>
                              )
                            ) : order.status === "IN_PROCESSING" ? (
                              <span className="inline-flex h-8 items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 text-xs font-medium text-amber-800">
                                {order.latestShipmentStatus === "EXCEPTION" ? "Cần đối soát" : order.latestCarrierCode === "VIETTEL_POST" ? "Chờ VP xác nhận" : "Đang xử lý vận đơn"}
                              </span>
                            ) : can.shipOrder(role) && ["READY_TO_SHIP", "FULFILLED"].includes(order.status) ? (
                              <Button
                                disabled={Boolean(pendingAction)}
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
                                aria-expanded={isMenuOpen}
                                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-400 shadow-sm hover:bg-slate-50 hover:text-slate-700 flex items-center justify-center"
                                onClick={(event) => {
                                  const rect = event.currentTarget.getBoundingClientRect();
                                  menuTriggerRef.current = event.currentTarget;
                                  const above = window.innerHeight - rect.bottom < 150;
                                  setMenuPosition({ top: above ? rect.top - 4 : rect.bottom + 4,
                                    left: Math.max(8, Math.min(rect.right - 176, window.innerWidth - 184)), above });
                                  setActiveMenuOrderId(isMenuOpen ? null : order.id);
                                }}
                                type="button"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>

                              {isMenuOpen && createPortal(
                                <>
                                  <div
                                    className="fixed inset-0 z-20"
                                    onClick={() => setActiveMenuOrderId(null)}
                                  />
                                  <div className="fixed z-30 w-44 rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-dropdown text-left"
                                    style={{ top: menuPosition.top, left: menuPosition.left,
                                      transform: menuPosition.above ? "translateY(-100%)" : undefined }}>
                                    {can.qcOrder(role) &&
                                      (order.status === "RECEIVED" ||
                                        order.status === "ON_HOLD") && (
                                        <button
                                          className="w-full rounded px-2.5 py-1.5 text-left font-medium text-emerald-700 hover:bg-emerald-50"
                                          onClick={() => {
                                            setActiveMenuOrderId(null);
                                            void handleQcPass([order.id]);
                                          }}
                                          type="button"
                                        >
                                          QC Pass (Sẵn sàng ship)
                                        </button>
                                      )}
                                    {can.cancelOrder(role) && order.status !== "CANCELLED" && (
                                      <button type="button" disabled={Boolean(pendingAction)}
                                        className="w-full rounded px-2.5 py-1.5 text-left text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                        onClick={() => { setActiveMenuOrderId(null); setCancelOrderTarget(order); }}>
                                        Hủy đơn Fulfillment
                                      </button>
                                    )}
                                    {can.cancelYun(role) && isShipped && order.latestCarrierCode === "YUNEXPRESS_OMS" && (
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
                                    {can.cancelYun(role) && ["CANCELLED", "IN_PROCESSING", "READY_TO_SHIP", "SHIPPED"].includes(order.status) && <button
                                      disabled={Boolean(pendingAction)}
                                      className="w-full rounded px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                                      onClick={() => {
                                        setActiveMenuOrderId(null);
                                        setResetTarget(order);
                                      }}
                                      type="button"
                                    >
                                      Reset để gửi lại
                                    </button>}
                                  </div>
                                </>, document.body
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
          orders={shipEligibleOrders}
        />
      )}

      {viewShipmentId && (
        <ShipmentDetailPanel shipmentId={viewShipmentId} role={role}
          onClose={() => setViewShipmentId(null)} onChanged={refreshOrders} />
      )}

      {/* Cancel Yun Modal */}
      {cancelOrderTarget && (
        <CancelOrderModal order={cancelOrderTarget} onClose={() => setCancelOrderTarget(null)}
          onCancelled={() => {
            const orderId = cancelOrderTarget.id;
            setCancelOrderTarget(null);
            setSelectedIds(current => { const next = new Set(current); next.delete(orderId); return next; });
            setDetailCache(current => { const next = { ...current }; delete next[orderId]; return next; });
            refreshOrders();
          }} />
      )}
      {cancelTarget && (
        <CancelYunModal
          detail={detailCache[cancelTarget.id] ?? null}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => handleCancelYun(cancelTarget)}
          order={cancelTarget}
        />
      )}

      {/* Reset Order Modal */}
      {printOrderId && <PrintLabelModal orderId={printOrderId} onClose={() => setPrintOrderId(null)} />}
      {resetTarget && (
        <ResetOrderModal
          onClose={() => setResetTarget(null)}
          onSubmit={(oldAccount) => handleResetOrder(resetTarget, oldAccount)}
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
