import {
  apiFetch,
  unwrapData,
  type ApiSuccessEnvelope,
} from "./base";
import type { YunLookupResponse } from "@/types/order-lookup";

export async function lookupYunOrder(code: string): Promise<YunLookupResponse> {
  const qs = new URLSearchParams({ orderNumber: code.trim() });
  const response = await apiFetch<
    ApiSuccessEnvelope<{ lookup: YunLookupResponse }>
  >(`/api/yunexpress-oms/order-lookup?${qs.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  return unwrapData(response).lookup;
}

export function getLabelRedirectUrl(code: string): string {
  return `/api/yunexpress-oms/label-redirect?code=${encodeURIComponent(code)}`;
}
