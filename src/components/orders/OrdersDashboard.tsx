"use client";

import { useEffect, useMemo, useState } from "react";
import { ShipmentExecutionPreparation } from "@/components/shipments/ShipmentExecutionPreparation";
import { getErrorMessage } from "@/lib/api/base";
import { getOrder, getOrders } from "@/lib/api/orders";
import styles from "./OrdersDashboard.module.css";

type PaginationMeta = {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

type OrderListItem = {
  id: string;
  externalOrderId: string;
  orderNumber: string | null;
  source: string | null;
  shopName: string | null;
  marketplace: string | null;
  status: OrderStatus;
  recipientName: string | null;
  destinationCountry: string | null;
  destinationState: string | null;
  destinationCity: string | null;
  destinationPostalCode: string | null;
  shippingService: string | null;
  shippingType: string | null;
  purchaseAt: string | null;
  paidAt: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  firstSku: string | null;
  firstItemName: string | null;
  totalQuantity: number;
};

type OrderDetail = {
  id: string;
  externalOrderId: string;
  orderNumber: string | null;
  source: string | null;
  sourceAccount: string | null;
  shopName: string | null;
  marketplace: string | null;
  externalStatus: string | null;
  purchaseAt: string | null;
  paidAt: string | null;
  status: OrderStatus;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  recipientAddress: unknown;
  destinationCountry: string | null;
  destinationState: string | null;
  destinationCity: string | null;
  destinationPostalCode: string | null;
  shippingService: string | null;
  shippingType: string | null;
  currency: string | null;
  orderTotal: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    externalItemId: string | null;
    sku: string | null;
    name: string | null;
    title: string | null;
    asin: string | null;
    listingId: string | null;
    productType: string | null;
    variant: string | null;
    quantity: number;
    unitPrice: string | null;
    currency: string | null;
    weight: string | null;
    declaredValue: string | null;
    customizationUrl: string | null;
    snapshotImageUrl: string | null;
    fulfillmentFileSummary: unknown;
    listingSnapshotSummary: unknown;
    costCenterSnapshotSummary: unknown;
    productionStatus: string | null;
    scaleStatus: string | null;
    qcNote: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  statusHistory: Array<{
    id: string;
    status: OrderStatus;
    note: string | null;
    actorType: "USER" | "API_KEY" | "SYSTEM";
    createdAt: string;
  }>;
};

type OrderStatus = "RECEIVED" | "READY_TO_SHIP" | "CANCELLED" | "ON_HOLD";

const ORDER_STATUSES: Array<{ label: string; value: "" | OrderStatus }> = [
  { label: "All statuses", value: "" },
  { label: "Received", value: "RECEIVED" },
  { label: "Ready to ship", value: "READY_TO_SHIP" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "On hold", value: "ON_HOLD" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function OrdersDashboard() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta["pagination"]>({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"" | OrderStatus>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      setError(null);
      setIsLoading(true);

      try {
        const result = await getOrders(
          { page, pageSize, search: debouncedSearch, status },
          controller.signal,
        );

        setOrders(result.data as OrderListItem[]);
        setPagination({
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          totalItems: result.pagination.totalItems,
          totalPages: result.pagination.totalPages,
        });
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setError(getErrorMessage(loadError));
          setOrders([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }

    loadOrders();

    return () => controller.abort();
  }, [debouncedSearch, page, pageSize, refreshToken, status]);

  useEffect(() => {
    if (!selectedOrderId) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    const currentOrderId = selectedOrderId;
    const controller = new AbortController();

    async function loadDetail() {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const result = await getOrder(currentOrderId, controller.signal);
        setDetail(result as OrderDetail);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setDetail(null);
          setDetailError(getErrorMessage(loadError));
        }
      } finally {
        setIsDetailLoading(false);
      }
    }

    loadDetail();

    return () => controller.abort();
  }, [selectedOrderId]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const hasPreviousPage = pagination.page > 1;
  const hasNextPage =
    pagination.totalPages > 0 && pagination.page < pagination.totalPages;

  function refreshOrders() {
    if (isLoading || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setRefreshToken((value) => value + 1);
  }

  return (
    <section className={styles.ordersSection} aria-labelledby="orders-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.kicker}>Orders</p>
          <h2 id="orders-title" className={styles.title}>
            Tenant orders
          </h2>
        </div>
        <button
          className={styles.secondaryButton}
          disabled={isLoading || isRefreshing}
          onClick={refreshOrders}
          type="button"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className={styles.controls} aria-label="Order filters">
        <label className={styles.field}>
          <span>Search</span>
          <input
            className={styles.input}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Order number, external id, recipient"
            type="search"
            value={searchInput}
          />
        </label>

        <label className={styles.field}>
          <span>Status</span>
          <select
            className={styles.select}
            onChange={(event) => {
              setStatus(event.target.value as "" | OrderStatus);
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
        </label>

        <label className={styles.field}>
          <span>Page size</span>
          <select
            className={styles.select}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            value={pageSize}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className={styles.errorState} role="alert">
          {error}
        </div>
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order number</th>
              <th>External ID</th>
              <th>Status</th>
              <th>Recipient</th>
              <th>Country</th>
              <th>Received</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRows />
            ) : orders.length ? (
              orders.map((order) => (
                <tr
                  className={
                    order.id === selectedOrderId ? styles.selectedRow : undefined
                  }
                  key={order.id}
                >
                  <td>
                    <button
                      className={styles.rowButton}
                      onClick={() => setSelectedOrderId(order.id)}
                      type="button"
                    >
                      {order.orderNumber ?? "Unnumbered"}
                    </button>
                  </td>
                  <td>{order.externalOrderId}</td>
                  <td>
                <span className={statusClassName(order.status)}>
                  {formatStatus(order.status)}
                </span>
              </td>
                  <td>{order.recipientName ?? "Not provided"}</td>
                  <td>{order.destinationCountry ?? "Not provided"}</td>
                  <td>{formatDate(order.receivedAt)}</td>
                  <td>{order.itemCount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className={styles.emptyState} colSpan={7}>
                  No orders match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <span>
          Page {pagination.totalPages ? pagination.page : 0} of{" "}
          {pagination.totalPages} | {pagination.totalItems} orders
        </span>
        <div className={styles.paginationButtons}>
          <button
            className={styles.secondaryButton}
            disabled={!hasPreviousPage || isLoading}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            Previous
          </button>
          <button
            className={styles.secondaryButton}
            disabled={!hasNextPage || isLoading}
            onClick={() => setPage((value) => value + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>

      <OrderDetailPanel
        detail={detail}
        error={detailError}
        isLoading={isDetailLoading}
        selectedOrder={selectedOrder}
      />
    </section>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <tr key={index}>
          <td colSpan={7}>
            <div className={styles.loadingLine} />
          </td>
        </tr>
      ))}
    </>
  );
}

function OrderDetailPanel({
  detail,
  error,
  isLoading,
  selectedOrder,
}: {
  detail: OrderDetail | null;
  error: string | null;
  isLoading: boolean;
  selectedOrder: OrderListItem | null;
}) {
  if (!selectedOrder) {
    return (
      <aside className={styles.detailPanel} aria-label="Order detail">
        <p className={styles.emptyDetail}>Select an order to view details.</p>
      </aside>
    );
  }

  if (isLoading) {
    return (
      <aside className={styles.detailPanel} aria-label="Order detail">
        <p className={styles.emptyDetail}>Loading order detail...</p>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className={styles.detailPanel} aria-label="Order detail">
        <p className={styles.detailError} role="alert">
          {error}
        </p>
      </aside>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <aside className={styles.detailPanel} aria-label="Order detail">
      <div className={styles.detailHeader}>
        <div>
          <p className={styles.kicker}>Detail</p>
          <h3>{detail.orderNumber ?? detail.externalOrderId}</h3>
        </div>
        <span className={statusClassName(detail.status)}>
          {formatStatus(detail.status)}
        </span>
      </div>

      <div className={styles.detailGrid}>
        <DetailItem label="External ID" value={detail.externalOrderId} />
        <DetailItem label="Source" value={detail.source ?? "Not provided"} />
        <DetailItem label="Shop" value={detail.shopName ?? "Not provided"} />
        <DetailItem
          label="Marketplace"
          value={detail.marketplace ?? "Not provided"}
        />
        <DetailItem label="Recipient" value={detail.recipientName ?? "Not provided"} />
        <DetailItem label="Email" value={detail.recipientEmail ?? "Not provided"} />
        <DetailItem label="Phone" value={detail.recipientPhone ?? "Not provided"} />
        <DetailItem
          label="Destination"
          value={
            [detail.destinationCity, detail.destinationState, detail.destinationCountry]
              .filter(Boolean)
              .join(", ") || "Not provided"
          }
        />
        <DetailItem
          label="Shipping"
          value={detail.shippingService ?? detail.shippingType ?? "Not provided"}
        />
        <DetailItem
          label="Order total"
          value={
            detail.orderTotal
              ? `${detail.orderTotal}${detail.currency ? ` ${detail.currency}` : ""}`
              : "Not provided"
          }
        />
        <DetailItem label="Received" value={formatDate(detail.receivedAt)} />
      </div>

      <ShipmentExecutionPreparation
        orderId={detail.id}
        orderItems={detail.items.map((item) => ({
          id: item.id,
          name: item.title ?? item.name,
          quantity: item.quantity,
          sku: item.sku,
        }))}
      />

      <div className={styles.detailBlock}>
        <h4>Items</h4>
        {detail.items.length ? (
          <div className={styles.compactList}>
            {detail.items.map((item) => (
              <div className={styles.compactRow} key={item.id}>
                <div>
                  <strong>
                    {item.title ?? item.name ?? item.sku ?? "Unnamed item"}
                  </strong>
                  <span>{item.sku ?? "No SKU"}</span>
                </div>
                <span>Qty {item.quantity}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyDetail}>No items found.</p>
        )}
      </div>

      <div className={styles.detailBlock}>
        <h4>Status history</h4>
        {detail.statusHistory.length ? (
          <ol className={styles.timeline}>
            {detail.statusHistory.map((entry) => (
              <li key={entry.id}>
                <strong>{formatStatus(entry.status)}</strong>
                <span>
                  {entry.note ?? "No note"} | {entry.actorType} |{" "}
                  {formatDate(entry.createdAt)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.emptyDetail}>No status history found.</p>
        )}
      </div>

    </aside>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatStatus(status: OrderStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function statusClassName(status: OrderStatus) {
  return `${styles.statusBadge} ${styles[`status${status}`] ?? ""}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
