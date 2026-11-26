"use client";

import { FULFILLMENT_SEARCH_PLACEHOLDER } from "@/shared/fulfillment-search";

import { ExternalLink, RefreshCw, RotateCcw, Search, Truck } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ShipmentHistory, ShipmentStatus } from "./ShipmentHistory";
import { getErrorMessage } from "@/lib/api/base";
import {
  getShipments,
  syncEtsyTrackingBatch,
  syncTrackingBatch,
} from "@/lib/api/shipments";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ShipmentListItem } from "@/types/shipments";

const SHIPMENT_STATUSES = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Đang vận chuyển (In transit)", value: "IN_TRANSIT" },
  { label: "Đã giao (Delivered)", value: "DELIVERED" },
  { label: "Đã tạo nhãn (Created)", value: "CREATED" },
  { label: "Chờ tracking / vận chuyển", value: "TRACKING_PENDING" },
  { label: "Bất thường (Exception)", value: "EXCEPTION" },
  { label: "Đã hủy", value: "CANCELLED" },
];

const CARRIER_TABS = [
  { label: "Tất cả hãng", value: "" },
  { label: "YunExpress", value: "YUNEXPRESS_OMS" },
  { label: "Viettel Post", value: "VIETTEL_POST" },
] as const;

export function ShipmentsTable({
  onShipmentSelect,
  role,
  reloadKey: externalReloadKey = 0,
}: {
  onShipmentSelect: (shipmentId: string) => void;
  role: Role;
  reloadKey?: number;
}) {
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [isEtsySyncing, setIsEtsySyncing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadShipments() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getShipments(
          {
            page,
            pageSize: 20,
            groupByOrder: true,
            carrierCode: carrierFilter || undefined,
            search,
            status,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setShipments(response.data);
        setExpandedHistory({});
        setPagination({
          page: response.pagination.page,
          pageSize: response.pagination.pageSize,
          totalItems: response.pagination.totalItems,
          totalPages: response.pagination.totalPages,
        });
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(getErrorMessage(loadError));
        setShipments([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadShipments();

    return () => controller.abort();
  }, [externalReloadKey, page, reloadKey, search, status, carrierFilter]);

  const filteredShipments = shipments;

  async function handleCarrierSync() {
    setIsBatchSyncing(true);
    try {
      const result = await syncTrackingBatch(carrierFilter ?? undefined);
      toastSuccess(
        carrierFilter === "VIETTEL_POST"
          ? `VP: cập nhật ${result.synced} vận đơn; liên kết mới ${result.reconciliation?.reconciled ?? 0}; cần kiểm tra ${result.reconciliation?.reviewRequired ?? 0}; tài khoản lỗi ${result.reconciliation?.failedAccounts ?? 0}.`
          : `Đồng bộ hãng thành công: ${result.synced} / ${result.attempted} vận đơn đã cập nhật.`,
      );
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsBatchSyncing(false);
    }
  }

  async function handleEtsySync() {
    setIsEtsySyncing(true);
    try {
      const result = await syncEtsyTrackingBatch();
      toastSuccess(
        `Đồng bộ Etsy: ${result.portalSynced} / ${result.attempted} đơn cập nhật mã tracking thành công.`,
      );
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsEtsySyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Carrier Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-6">
          {CARRIER_TABS.map((tab) => {
            const active = carrierFilter === tab.value;
            return (
              <button
                className={cn(
                  "relative py-3 text-xs font-medium transition-colors hover:text-slate-900",
                  active
                    ? "font-semibold text-indigo-600 border-b-2 border-indigo-600 -mb-px"
                    : "text-slate-500",
                )}
                key={tab.value}
                onClick={() => { setCarrierFilter(tab.value); setPage(1); }}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {can.syncTracking(role) && (
            <>
              <Button
                isLoading={isCarrierSyncing(isBatchSyncing)}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={handleCarrierSync}
                size="sm"
                variant="secondary"
              >
                {carrierFilter === "VIETTEL_POST"
                  ? "Đồng bộ Viettel Post"
                  : carrierFilter === "YUNEXPRESS_OMS"
                    ? "Đồng bộ Yun"
                    : "Đồng bộ hãng"}
              </Button>
              <Button
                isLoading={isEtsySyncing}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={handleEtsySync}
                size="sm"
                variant="primary"
              >
                Đồng bộ Etsy
              </Button>
            </>
          )}
          <Button
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={() => setReloadKey((k) => k + 1)}
            size="sm"
            variant="ghost"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {(search || status) && <p className="text-xs text-slate-500">Tìm trong cả lịch sử; mỗi dòng hiển thị vận đơn mới nhất của đơn hàng.</p>}
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
        </div>

        <select
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          value={status}
        >
          {SHIPMENT_STATUSES.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
            </option>
          ))}
        </select>
      </div>

      {/* Shipments Data Table */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} retry={() => setReloadKey((k) => k + 1)} />
      ) : filteredShipments.length === 0 ? (
        <EmptyState
          description="Không tìm thấy vận đơn nào phù hợp với bộ lọc."
          heading="Chưa có vận đơn"
          icon={<Truck className="h-6 w-6" />}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3.5 py-2.5">Mã Vận đơn & Đơn</th>
                  <th className="px-3.5 py-2.5">Hãng (Amazon)</th>
                  <th className="px-3.5 py-2.5">Mã Tracking</th>
                  <th className="px-3.5 py-2.5">Gói dịch vụ (Amazon)</th>
                  <th className="px-3.5 py-2.5 text-center">Trạng thái</th>
                  <th className="px-3.5 py-2.5">Đồng bộ Portal</th>
                  <th className="px-3.5 py-2.5">Ngày gửi / Tạo</th>
                  <th className="px-3.5 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredShipments.map((shipment) => (
                  <Fragment key={shipment.orderId}>
                  <tr
                    className="cursor-pointer transition-colors hover:bg-slate-50/80"
                    key={shipment.id}
                    onClick={() => onShipmentSelect(shipment.id)}
                  >
                    {/* Order & Shipment IDs */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">
                          #{shipment.orderNumber ?? shipment.externalOrderId ?? shipment.id}
                        </span>
                        {(shipment.orderNumber ?? shipment.externalOrderId) && (
                          <CopyButton value={(shipment.orderNumber ?? shipment.externalOrderId)!} label="Sao chép mã đơn" />
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 block truncate max-w-[150px]">
                        {shipment.carrierShipmentId ?? shipment.id}
                      </span>
                    </td>

                    {/* Carrier (Amazon Carrier) */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">
                          {shipment.carrierName ?? (shipment.carrierCode === "VIETTEL_POST" ? "USPS" : shipment.carrierCode === "YUNEXPRESS_OMS" ? "YunExpress" : (shipment.carrierCode ?? "Other"))}
                        </span>
                        {shipment.carrierCode === "VIETTEL_POST" && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            Viettel Post
                          </span>
                        )}
                        {(shipment.carrierAccountId === "cmwjc0l9q0001iq1sse3mzemj" || shipment.labelUrl?.includes(".stg.")) ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 border border-amber-300">
                            STAGING
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 border border-emerald-200">
                            PROD
                          </span>
                        )}
                      </div>
                      {shipment.sourceChannel && (
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Kênh: {shipment.sourceChannel}
                        </span>
                      )}
                    </td>

                    {/* Tracking */}
                    <td className="px-3.5 py-2.5">
                      {shipment.trackingNumber ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="font-mono font-bold text-indigo-700 text-[11px]">
                            {shipment.trackingNumber}
                          </span>
                          <CopyButton value={shipment.trackingNumber} label="Sao chép tracking" />
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Chờ tạo tracking</span>
                      )}
                    </td>

                    {/* Shipping Method (Amazon Ship Method) */}
                    <td className="px-3.5 py-2.5">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 font-mono">
                        {shipment.shippingMethod ?? (shipment.carrierName === "USPS" || shipment.carrierCode === "VIETTEL_POST" ? "USPS First Class" : "Standard")}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3.5 py-2.5 text-center">
                      <ShipmentStatus shipment={shipment} />
                    </td>

                    {/* Portal Sync State */}
                    <td className="px-3.5 py-2.5">
                      {shipment.portalTrackingSyncState === "SYNCED" ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          Đã sync Etsy
                        </span>
                      ) : shipment.portalTrackingSyncState === "FAILED" ? (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                          Lỗi sync
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Chưa sync</span>
                      )}
                    </td>

                    {/* Ship Date & Created Time */}
                    <td className="px-3.5 py-2.5">
                      <span className="font-mono font-bold text-slate-800 text-[11px] block">
                        {shipment.actualShipAt ? formatAmazonDate(shipment.actualShipAt) : "Chưa xác nhận gửi"}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Tạo: {formatDate(shipment.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {shipment.labelUrl && shipment.status !== "CANCELLED" && (
                          <a
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
                            href={shipment.labelUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Nhãn in
                          </a>
                        )}
                        {!!shipment.history?.length && (
                          <button type="button" aria-expanded={!!expandedHistory[shipment.orderId]} aria-controls={`history-${shipment.orderId}`}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500"
                            onClick={() => setExpandedHistory(current => ({...current, [shipment.orderId]: !current[shipment.orderId]}))}>
                            Lịch sử ({shipment.history.length})
                          </button>
                        )}
                        <Button
                          onClick={() => onShipmentSelect(shipment.id)}
                          size="sm"
                          variant="ghost"
                        >
                          Hành trình
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedHistory[shipment.orderId] && !!shipment.history?.length && (
                    <tr id={`history-${shipment.orderId}`}><td colSpan={8} className="bg-slate-50">
                      <ShipmentHistory shipments={shipment.history} onSelect={onShipmentSelect} />
                    </td></tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
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
    </div>
  );
}

function formatAmazonDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isCarrierSyncing(value: boolean) {
  return value;
}
