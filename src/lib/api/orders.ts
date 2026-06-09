import type {
  ApiSuccess,
  BatchShipResult,
  OrderDetail,
  OrderListItem,
  PaginationMeta,
  ShipOrderOptions,
  ShipEnvironment,
} from "@/types/orders";
import { apiFetch } from "./base";

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  include?: "expanded";
}

export interface OrderListResponse {
  data: OrderListItem[];
  expandedData?: OrderDetail[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalItems: number;
    totalPages: number;
  };
}

export async function getOrders(
  params: OrderListParams,
  signal?: AbortSignal,
): Promise<OrderListResponse> {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const response = await apiFetch<
    ApiSuccess<
      { orders: OrderListItem[]; expandedOrders?: OrderDetail[] },
      PaginationMeta
    >
  >(`/api/orders?${query.toString()}`, { signal });
  const pagination = response.meta?.pagination;

  return {
    data: response.data.orders,
    expandedData: response.data.expandedOrders,
    pagination: {
      page: pagination?.page ?? params.page ?? 1,
      pageSize: pagination?.pageSize ?? params.pageSize ?? response.data.orders.length,
      total: pagination?.totalItems ?? response.data.orders.length,
      totalItems: pagination?.totalItems ?? response.data.orders.length,
      totalPages:
        pagination?.totalPages ?? (response.data.orders.length ? 1 : 0),
    },
  };
}

export async function getOrder(
  orderId: string,
  signal?: AbortSignal,
): Promise<OrderDetail> {
  const response = await apiFetch<ApiSuccess<{ order: OrderDetail }>>(
    `/api/orders/${orderId}`,
    { signal },
  );

  return response.data.order;
}

export type ShipOrderEnvironment = ShipEnvironment;

export async function shipOrder(
  orderId: string,
  environment: ShipOrderEnvironment,
  options?: ShipOrderOptions,
) {
  const response = await apiFetch<
    ApiSuccess<{
      orderId: string;
      orderStatus: string;
      shipment?: {
        id?: string;
        status?: string;
        carrierCode?: string | null;
        carrierShipmentId?: string | null;
        trackingNumber?: string | null;
        labelUrl?: string | null;
      };
    }>
  >(
    `/api/orders/${orderId}/ship`,
    {
      method: "POST",
      body: JSON.stringify({ environment, ...(options ? { options } : {}) }),
    },
  );

  return response.data;
}

export async function confirmOrderShipped(orderId: string) {
  const response = await apiFetch<
    ApiSuccess<{
      orderId: string;
      orderStatus: string;
      labelUrl: string | null;
      shipment?: {
        id?: string;
        status?: string;
        carrierShipmentId?: string | null;
        trackingNumber?: string | null;
        labelUrl?: string | null;
      };
    }>
  >(`/api/orders/${orderId}/confirm-shipped`, {
    method: "POST",
  });

  return response.data;
}

export async function cancelYunShipment(orderId: string) {
  const response = await apiFetch<
    ApiSuccess<{
      orderId: string;
      orderStatus: string;
      shipment?: {
        id?: string;
        status?: string;
        carrierShipmentId?: string | null;
        trackingNumber?: string | null;
      };
    }>
  >(
    `/api/orders/${orderId}/cancel-yun`,
    {
      method: "POST",
    },
  );

  return response.data;
}

export const cancelYunOrder = cancelYunShipment;

export async function resetOrder(orderId: string) {
  const response = await apiFetch<
    ApiSuccess<{
      orderId: string;
      orderStatus: string;
      shipment?: {
        id?: string;
        status?: string;
        carrierCode?: string | null;
        carrierShipmentId?: string | null;
        trackingNumber?: string | null;
        labelUrl?: string | null;
      };
    }>
  >(
    `/api/orders/${orderId}/reset`,
    {
      method: "POST",
    },
  );

  return response.data;
}

export async function shipOrdersBatch(
  orderIds: string[],
  environment: ShipOrderEnvironment,
  optionsByOrderId?: Record<string, ShipOrderOptions | undefined>,
): Promise<BatchShipResult> {
  const response = await apiFetch<
    ApiSuccess<{
      results: Array<{
        orderId: string;
        success: boolean;
        shipment?: {
          id?: string;
          status?: string;
          carrierCode?: string | null;
          carrierShipmentId?: string | null;
          trackingNumber?: string | null;
          labelUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        error?: { message?: string; details?: unknown } | null;
      }>;
    }>
  >("/api/orders/ship-batch", {
    method: "POST",
    body: JSON.stringify({
      orderIds,
      environment,
      ...(optionsByOrderId ? { optionsByOrderId } : {}),
    }),
  });

  return {
    succeeded: response.data.results
      .filter((item) => item.success)
      .map((item) => ({
        orderId: item.orderId,
        shipment: item.shipment,
      })),
    failed: response.data.results
      .filter((item) => !item.success)
      .map((item) => ({
        orderId: item.orderId,
        message: item.error?.message ?? "Failed to create shipment.",
        details: item.error?.details,
      })),
  };
}
