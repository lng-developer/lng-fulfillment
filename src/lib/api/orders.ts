import type {
  ApiSuccess,
  OrderDetail,
  OrderListItem,
  PaginationMeta,
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
