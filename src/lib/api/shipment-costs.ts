import type { ApiSuccess, PaginationMeta, ShipmentCostSummary } from "@/types/orders";
import { apiFetch } from "./base";

export type ShipmentCostListItem = ShipmentCostSummary & {
  orderNumber: string | null;
  externalOrderId: string;
  sourceChannel: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
};

export async function getShipmentCosts(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const response = await apiFetch<
    ApiSuccess<{ shipmentCosts: ShipmentCostListItem[] }, PaginationMeta>
  >(`/api/shipment-costs?${query.toString()}`);

  return {
    data: response.data.shipmentCosts,
    pagination: response.meta?.pagination ?? {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? response.data.shipmentCosts.length,
      totalItems: response.data.shipmentCosts.length,
      totalPages: response.data.shipmentCosts.length ? 1 : 0,
    },
  };
}

export async function fetchShipmentActualFee(shipmentId: string) {
  const response = await apiFetch<ApiSuccess<{ shipmentCost: ShipmentCostSummary }>>(
    `/api/shipment-costs/${shipmentId}/fetch-yun-fee`,
    { method: "POST" },
  );

  return response.data.shipmentCost;
}
