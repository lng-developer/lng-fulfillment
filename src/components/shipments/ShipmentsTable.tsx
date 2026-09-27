"use client";

import { Inbox, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getTrackingSyncStatus,
  type TrackingSyncBatchUiResult,
} from "./tracking-sync-status";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
} from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getErrorMessage } from "@/lib/api/base";
import {
  getShipments,
  syncEtsyTrackingBatch,
  syncTrackingBatch,
} from "@/lib/api/shipments";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import type { ShipmentListItem } from "@/types/shipments";

const SHIPMENT_STATUSES = [
  { label: "All statuses", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING" },
  { label: "Created", value: "CREATED" },
  { label: "Failed create", value: "FAILED_CREATE" },
  { label: "Tracking pending", value: "TRACKING_PENDING" },
  { label: "In transit", value: "IN_TRANSIT" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Exception", value: "EXCEPTION" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Returned", value: "RETURNED" },
];

const SHIPMENT_SOURCES = [
  { label: "All sources", value: "" },
  { label: "Amazon", value: "AMAZON" },
  { label: "Etsy", value: "ETSY" },
  { label: "Manual", value: "MANUAL" },
  { label: "Unknown", value: "UNKNOWN" },
] as const;

type ShipmentSource = Exclude<ShipmentListItem["sourceChannel"], null>;
type BatchSource = "AMAZON" | "ETSY" | "ALL";

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
  const [status, setStatus] = useState("");
  const [sourceChannel, setSourceChannel] = useState<ShipmentSource | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [batchSource, setBatchSource] = useState<BatchSource>("ALL");
  const [lastBatchResult, setLastBatchResult] =
    useState<TrackingSyncBatchUiResult | null>(null);
  const [sort, setSort] = useState<DataTableSort>({
    key: "createdAt",
    direction: "desc",
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

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
            search,
            status,
            sourceChannel: sourceChannel || undefined,
            from: from ? new Date(from).toISOString() : undefined,
            to: to ? new Date(to).toISOString() : undefined,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setShipments(response.data);
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
  }, [externalReloadKey, from, page, reloadKey, search, sourceChannel, status, to]);

  const filteredShipments = useMemo(() => {
    return shipments.filter((shipment) => {
      const createdAt = new Date(shipment.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        return true;
      }

      if (from && createdAt < new Date(`${from}T00:00:00`)) {
        return false;
      }

      if (to && createdAt > new Date(`${to}T23:59:59`)) {
        return false;
      }

      return true;
    });
  }, [from, shipments, to]);

  const sortedShipments = useMemo(
    () =>
      [...filteredShipments].sort((first, second) => {
        const direction = sort.direction === "asc" ? 1 : -1;

        if (sort.key === "createdAt") {
          return (
            (new Date(first.createdAt).getTime() -
              new Date(second.createdAt).getTime()) *
            direction
          );
        }

        if (sort.key === "status") {
          return first.status.localeCompare(second.status) * direction;
        }

        return 0;
      }),
    [filteredShipments, sort],
  );

  const columns = useMemo<Array<DataTableColumn<ShipmentListItem>>>(
    () => [
      {
        key: "shipmentId",
        header: "Shipment ID",
        className: "w-[190px]",
        render: (shipment) => (
          <span className="block truncate font-mono text-xs text-[var(--text-primary)]">
            {shipment.id}
          </span>
        ),
      },
      {
        key: "orderNumber",
        header: "Order",
        className: "w-[160px]",
        render: (shipment) => (
          <span className="block truncate font-mono text-xs font-semibold text-[var(--brand)]">
            {shipment.orderNumber ?? shipment.externalOrderId}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        className: "w-[150px]",
        sortable: true,
        render: (shipment) => <StatusBadge status={shipment.status} />,
      },
      {
        key: "source",
        header: "Source",
        className: "hidden w-[100px] md:table-cell",
        render: (shipment) => (
          <span className="text-xs text-[var(--text-secondary)]">
            {shipment.sourceChannel ?? "Unknown"}
          </span>
        ),
      },
      {
        key: "carrier",
        header: "Carrier",
        className: "hidden w-[150px] md:table-cell",
        render: (shipment) => (
          <span className="block truncate text-xs text-[var(--text-secondary)]">
            {shipment.carrierName ??
              (shipment.carrierCode === "YUNEXPRESS_OMS"
                ? "YunExpress"
                : shipment.carrierCode ?? "-")}
          </span>
        ),
      },
      {
        key: "trackingNumber",
        header: "Tracking",
        className: "w-[210px]",
        render: (shipment) =>
          shipment.trackingNumber ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono text-xs text-[var(--text-primary)]">
                {shipment.trackingNumber}
              </span>
              <span onClick={(event) => event.stopPropagation()}>
                <CopyButton label="Copy tracking number" value={shipment.trackingNumber} />
              </span>
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">-</span>
          ),
      },
      {
        key: "actualShipAt",
        header: "Carrier nhận hàng",
        className: "hidden w-[170px] lg:table-cell",
        render: (shipment) =>
          shipment.actualShipAt ? (
            <time
              className="text-xs text-[var(--text-secondary)]"
              dateTime={shipment.actualShipAt}
              title={formatDate(shipment.actualShipAt)}
            >
              {formatDate(shipment.actualShipAt)}
            </time>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Chờ event</span>
          ),
      },
      {
        key: "portalTrackingSyncState",
        header: "Đồng bộ Portal",
        className: "hidden w-[145px] lg:table-cell",
        render: (shipment) => {
          if (shipment.portalTrackingSyncState === "SYNCED") {
            return <span className="text-xs text-emerald-700">Đã sync</span>;
          }

          if (shipment.portalTrackingSyncState === "FAILED") {
            return <span className="text-xs text-red-700">Lỗi sync</span>;
          }

          return <span className="text-xs text-[var(--text-muted)]">Chưa xác nhận</span>;
        },
      },
      {
        key: "createdAt",
        header: "Created",
        className: "hidden w-[140px] md:table-cell",
        sortable: true,
        render: (shipment) => (
          <time
            className="text-xs text-[var(--text-secondary)]"
            dateTime={shipment.createdAt}
            title={formatDate(shipment.createdAt)}
          >
            {relativeTime(shipment.createdAt)}
          </time>
        ),
      },
    ],
    [],
  );

  async function handleBatchSync() {
    setIsBatchSyncing(true);
    try {
      const result = await runTrackingBatch(batchSource);
      toastSuccess(
        `Tracking batch: ${result.yunSynced} Yun updated, ${result.portalSynced} Portal synced.`,
      );
      setLastBatchResult({ ...result, completedAt: new Date().toISOString() });
      setReloadKey((value) => value + 1);
    } catch (batchError) {
      toastError(getErrorMessage(batchError));
    } finally {
      setIsBatchSyncing(false);
    }
  }

  const batchStatus = getTrackingSyncStatus({
    isSyncing: isBatchSyncing,
    result: lastBatchResult,
  });

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden
          />
          <input
            className="h-9 w-full rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] pl-9 pr-3 text-xs text-[var(--text-primary)] shadow-soft"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search tracking or carrier shipment ID"
            type="search"
            value={searchInput}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {can.syncTracking(role) ? (
            <div className="flex gap-2">
              <select
                aria-label="Tracking sync source"
                className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] shadow-soft hover:border-[var(--brand-mid)]"
                disabled={isBatchSyncing}
                onChange={(event) => setBatchSource(event.target.value as BatchSource)}
                value={batchSource}
              >
                <option value="ALL">Tất cả nguồn</option>
                <option value="AMAZON">Amazon</option>
                <option value="ETSY">Etsy</option>
              </select>
              <button
                className="h-9 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isBatchSyncing}
                onClick={handleBatchSync}
                type="button"
              >
                {isBatchSyncing ? "Đang sync tracking..." : "Sync tracking"}
              </button>
            </div>
          ) : null}
          <select
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] shadow-soft hover:border-[var(--brand-mid)]"
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            value={status}
          >
            {SHIPMENT_STATUSES.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] shadow-soft hover:border-[var(--brand-mid)]"
            onChange={(event) => {
              setSourceChannel(event.target.value as ShipmentSource | "");
              setPage(1);
            }}
            value={sourceChannel}
          >
            {SHIPMENT_SOURCES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] shadow-soft hover:border-[var(--brand-mid)]"
            onChange={(event) => setFrom(event.target.value)}
            type="date"
            value={from}
          />
          <input
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] shadow-soft hover:border-[var(--brand-mid)]"
            onChange={(event) => setTo(event.target.value)}
            type="date"
            value={to}
          />
        </div>
      </div>

      {batchStatus?.state === "syncing" ? (
        <section
          aria-live="polite"
          className="flex items-center gap-3 rounded-sm border border-[var(--brand-mid)] bg-[var(--brand-soft)] px-4 py-3 text-sm text-[var(--text-primary)]"
        >
          <Loader2 className="h-4 w-4 animate-spin text-[var(--brand)]" aria-hidden />
          <div>
            <p className="font-medium">{batchStatus.title}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Carrier được kiểm tra tuần tự. Kết quả sẽ hiển thị ngay khi batch hoàn tất.
            </p>
          </div>
        </section>
      ) : null}

      {batchStatus?.state === "completed" && lastBatchResult ? (
        <section className="rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {batchStatus.title} · {batchSourceLabel(lastBatchResult.source)}
            </p>
            <time className="text-xs text-[var(--text-muted)]" dateTime={lastBatchResult.completedAt}>
              {formatDate(lastBatchResult.completedAt)}
            </time>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <BatchMetric label="Đã kiểm tra" value={lastBatchResult.attempted} />
            <BatchMetric label="Yun có event" value={lastBatchResult.yunSynced} />
            <BatchMetric label="Yun chờ event" value={lastBatchResult.noActualShipEvent} />
            <BatchMetric label="Yun lỗi" value={lastBatchResult.yunFailed} />
            <BatchMetric label="Portal đã sync" value={lastBatchResult.portalSynced} />
            <BatchMetric label="Portal lỗi" value={lastBatchResult.portalFailed} />
          </div>
          <p className="mt-3 text-xs text-[var(--text-secondary)]">Batch chỉ gọi Yun cho shipment chưa có pickup; Portal chỉ nhận shipment đã có event.</p>
        </section>
      ) : null}

      {isLoading ? <LoadingSkeleton rows={10} /> : null}

      {!isLoading && error ? (
        <ErrorState
          message={error}
          retry={() => setReloadKey((value) => value + 1)}
        />
      ) : null}

      {!isLoading && !error ? (
        <DataTable
          columns={columns}
          data={sortedShipments}
          empty={
            <EmptyState
              description="Create a draft shipment from an order to get started."
              heading="No shipments yet"
              icon={<Inbox className="h-6 w-6" aria-hidden />}
            />
          }
          getRowKey={(shipment) => shipment.id}
          onPageChange={setPage}
          onRowClick={(shipment) => onShipmentSelect(shipment.id)}
          onSortChange={setSort}
          pagination={pagination}
          sort={sort}
        />
      ) : null}
    </div>
  );
}

async function runTrackingBatch(source: BatchSource): Promise<TrackingSyncBatchUiResult> {
  if (source === "AMAZON") {
    return normalizeAmazonBatch(await syncTrackingBatch(), source);
  }

  if (source === "ETSY") {
    return {
      ...(await syncEtsyTrackingBatch()),
      source,
      completedAt: new Date().toISOString(),
    };
  }

  const amazon = normalizeAmazonBatch(await syncTrackingBatch(), source);
  const etsy = await syncEtsyTrackingBatch();
  return {
    source,
    attempted: amazon.attempted + etsy.attempted,
    yunSynced: amazon.yunSynced + etsy.yunSynced,
    noActualShipEvent: amazon.noActualShipEvent + etsy.noActualShipEvent,
    yunFailed: amazon.yunFailed + etsy.yunFailed,
    portalSynced: amazon.portalSynced + etsy.portalSynced,
    portalFailed: amazon.portalFailed + etsy.portalFailed,
    completedAt: new Date().toISOString(),
  };
}

function normalizeAmazonBatch(
  result: Awaited<ReturnType<typeof syncTrackingBatch>>,
  source: BatchSource,
): TrackingSyncBatchUiResult {
  return {
    source,
    attempted: result.attempted,
    yunSynced: result.synced,
    noActualShipEvent: result.noActualShipEvent,
    yunFailed: result.failed,
    portalSynced: result.portalSynced,
    portalFailed: result.portalFailed,
    completedAt: new Date().toISOString(),
  };
}

function batchSourceLabel(source: BatchSource) {
  if (source === "AMAZON") return "Amazon";
  if (source === "ETSY") return "Etsy";
  return "Tất cả nguồn";
}

function BatchMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-[var(--bg-muted)] px-3 py-2">
      <p className="text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
