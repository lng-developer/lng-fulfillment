import type {
  ApiSuccess,
  ShipmentAutomationConfig,
  ShipmentAutomationSetting,
  SkuShippingMethodMapping,
} from "@/types/settings";
import { apiFetch } from "./base";

export async function getShipmentAutomationConfig(signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<ShipmentAutomationConfig>>(
    "/api/tenants/current/shipment-automation",
    { signal },
  );

  return response.data;
}

export async function updateShipmentAutomationSetting(input: {
  autoCreateEnabled: boolean;
  environment: "test" | "live";
}) {
  const response = await apiFetch<
    ApiSuccess<{ setting: ShipmentAutomationSetting }>
  >("/api/tenants/current/shipment-automation", {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return response.data.setting;
}

export async function createSkuShippingMethodMapping(input: {
  skuCode: string;
  destinationCountryCode: string;
  shippingMethodCode: string;
  eName: string;
  cName: string;
  description?: string | null;
}) {
  const response = await apiFetch<
    ApiSuccess<{ mapping: SkuShippingMethodMapping }>
  >("/api/tenants/current/sku-shipping-methods", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.data.mapping;
}

export async function updateSkuShippingMethodMapping(
  mappingId: string,
  input: {
    shippingMethodCode?: string;
    eName?: string;
    cName?: string;
    description?: string | null;
    status?: "ACTIVE" | "DISABLED";
  },
) {
  const response = await apiFetch<
    ApiSuccess<{ mapping: SkuShippingMethodMapping }>
  >(`/api/tenants/current/sku-shipping-methods/${mappingId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return response.data.mapping;
}

export async function deleteSkuShippingMethodMapping(mappingId: string) {
  await apiFetch<ApiSuccess<{ deleted: boolean }>>(
    `/api/tenants/current/sku-shipping-methods/${mappingId}`,
    {
      method: "DELETE",
    },
  );
}
