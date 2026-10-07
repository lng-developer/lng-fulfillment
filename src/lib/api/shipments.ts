import type {
  ApiSuccess,
  PaginationMeta,
  PreflightResult,
  ShipmentDetail,
  ShipmentListItem,
  TrackingSyncApiResult,
} from "@/types/shipments";
import type { ShipOrderOptions } from "@/modules/shipment/types";
import { apiFetch, ApiError } from "./base";

export type ShipmentCarrierCode = "YUNEXPRESS_OMS" | "VIETTEL_POST";

export { ApiError as ApiClientError };

export type ShipmentListParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  sourceChannel?: "AMAZON" | "ETSY" | "MANUAL" | "UNKNOWN";
  orderId?: string;
  from?: string;
  to?: string;
  search?: string;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
};

export interface ShipmentListResponse {
  data: ShipmentListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalItems: number;
    totalPages: number;
  };
}

export async function getShipments(
  params: ShipmentListParams,
  signal?: AbortSignal,
): Promise<ShipmentListResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
    sortBy: params.sortBy ?? "createdAt",
    sortOrder: params.sortOrder ?? "desc",
  });

  if (params.status) query.set("status", params.status);
  if (params.sourceChannel) query.set("sourceChannel", params.sourceChannel);
  if (params.orderId) query.set("orderId", params.orderId);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.search) query.set("search", params.search);

  const response = await apiFetch<
    ApiSuccess<{ shipments: ShipmentListItem[] }, PaginationMeta>
  >(`/api/shipments?${query.toString()}`, { signal });
  const pagination = response.meta?.pagination;

  return {
    data: response.data.shipments,
    pagination: {
      page: pagination?.page ?? params.page ?? 1,
      pageSize:
        pagination?.pageSize ?? params.pageSize ?? response.data.shipments.length,
      total: pagination?.totalItems ?? response.data.shipments.length,
      totalItems: pagination?.totalItems ?? response.data.shipments.length,
      totalPages:
        pagination?.totalPages ?? (response.data.shipments.length ? 1 : 0),
    },
  };
}

export async function listShipments(
  params: ShipmentListParams,
  signal?: AbortSignal,
) {
  const result = await getShipments(params, signal);
  return {
    success: true as const,
    data: { shipments: result.data },
    meta: {
      pagination: {
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
      },
    },
  };
}

export async function getShipment(
  shipmentId: string,
  signal?: AbortSignal,
) {
  const response = await apiFetch<ApiSuccess<{ shipment: ShipmentDetail }>>(
    `/api/shipments/${shipmentId}`,
    { signal },
  );

  return response.data.shipment;
}

export async function getShipmentDetail(
  shipmentId: string,
  signal?: AbortSignal,
) {
  const shipment = await getShipment(shipmentId, signal);
  return { success: true as const, data: { shipment } };
}

export async function getPreflight(
  shipmentId: string,
  carrierCode: ShipmentCarrierCode = "YUNEXPRESS_OMS",
  carrierAccountId?: string | null,
  options?: ShipOrderOptions,
  signal?: AbortSignal,
) {
  const response = await apiFetch<ApiSuccess<PreflightResult>>(
    `/api/shipments/${shipmentId}/preflight`,
    { method: "POST", body: JSON.stringify({ carrierCode, carrierAccountId: carrierAccountId ?? null, options }), signal },
  );

  return response.data;
}

export async function runShipmentPreflight(
  shipmentId: string,
  carrierCode: ShipmentCarrierCode = "YUNEXPRESS_OMS",
  carrierAccountId?: string | null,
  options?: ShipOrderOptions,
  signal?: AbortSignal,
) {
  const result = await getPreflight(shipmentId, carrierCode, carrierAccountId, options, signal);
  return { success: true as const, data: result };
}

export async function createDraftShipment(
  orderId: string,
  items: { orderItemId: string; quantity: number }[],
) {
  const response = await apiFetch<ApiSuccess<{ shipment: ShipmentDetail }>>(
    "/api/shipments",
    {
      method: "POST",
      body: JSON.stringify({ orderId, items }),
    },
  );

  return response.data.shipment;
}

export async function executeShipment(
  shipmentId: string,
  carrierCode: ShipmentCarrierCode = "YUNEXPRESS_OMS",
  carrierAccountId: string | null = null,
  options?: ShipOrderOptions,
) {
  const response = await apiFetch<ApiSuccess<unknown>>(`/api/shipments/${shipmentId}/execute`, {
    method: "POST",
    body: JSON.stringify({
      carrierCode,
      carrierAccountId,
      options,
    }),
  });

  return response.data;
}

export async function syncTracking(shipmentId: string) {
  const response = await apiFetch<ApiSuccess<TrackingSyncApiResult>>(
    `/api/shipments/${shipmentId}/tracking`,
    { method: "POST" },
  );

  return response.data;
}

export type TrackingSyncBatchResult = {
  attempted: number;
  synced: number;
  noActualShipEvent: number;
  failed: number;
  portalSynced: number;
  portalFailed: number;
};

export type EtsyTrackingSyncBatchResult = {
  attempted: number;
  yunSynced: number;
  noActualShipEvent: number;
  yunFailed: number;
  portalSynced: number;
  portalFailed: number;
};

export async function syncTrackingBatch() {
  const response = await apiFetch<ApiSuccess<TrackingSyncBatchResult>>(
    "/api/shipments/tracking/batch",
    { method: "POST" },
  );

  return response.data;
}

export async function syncEtsyTrackingBatch() {
  const response = await apiFetch<ApiSuccess<EtsyTrackingSyncBatchResult>>(
    "/api/shipments/tracking/etsy-batch",
    { method: "POST" },
  );

  return response.data;
}

export async function syncShipmentTracking(shipmentId: string) {
  const result = await syncTracking(shipmentId);
  return { success: true as const, data: result };
}
