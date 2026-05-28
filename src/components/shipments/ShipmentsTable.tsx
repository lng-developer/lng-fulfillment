"use client";

import { Inbox, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { getShipments } from "@/lib/api/shipments";
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

export function ShipmentsTable({
  onShipmentSelect,
  reloadKey: externalReloadKey = 0,
}: {
  onShipmentSelect: (shipmentId: string) => void;
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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
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
  }, [externalReloadKey, from, page, reloadKey, search, status, to]);

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
        key: "carrier",
        header: "Carrier",
        className: "hidden w-[150px] md:table-cell",
        render: (shipment) => (
          <span className="block truncate text-xs text-[var(--text-secondary)]">
            {shipment.carrierCode ?? "-"}
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
