import type { YunExpressOmsConfig } from "./config";
import type {
  YunExpressCreateOrderLabelPayload,
  YunExpressCreateOrderLabelResponse,
  YunExpressGetCarrierResponse,
  YunExpressGetTrackingNumberResponse,
  YunExpressTrackInfoResponse,
} from "./types";

export async function callYunExpressCreateOrderLabel(input: {
  config: Required<
    Pick<YunExpressOmsConfig, "baseUrl" | "customerNo" | "apiSecret">
  > &
    YunExpressOmsConfig;
  authorizationHeader: string;
  payload: YunExpressCreateOrderLabelPayload[];
  fetchImpl?: typeof fetch;
}): Promise<YunExpressCreateOrderLabelResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.config.timeoutMs);
  const fetchImpl = input.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(
      buildCreateOrderLabelUrl(input.config.baseUrl),
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: input.authorizationHeader,
          "Content-Type": "application/json",
          "__lang": input.config.lang,
        },
        body: JSON.stringify(input.payload),
        signal: controller.signal,
      },
    );

    return (await response.json()) as YunExpressCreateOrderLabelResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callYunExpressGetTrackingNumber(input: {
  config: Pick<YunExpressOmsConfig, "baseUrl" | "lang" | "timeoutMs"> & {
    baseUrl: string;
  };
  customerOrderNumber: string;
  fetchImpl?: typeof fetch;
}): Promise<YunExpressGetTrackingNumberResponse> {
  return callYunExpressGet({
    config: input.config,
    url: buildTrackingNumberUrl(input.config.baseUrl, input.customerOrderNumber),
    fetchImpl: input.fetchImpl,
  }) as Promise<YunExpressGetTrackingNumberResponse>;
}

export async function callYunExpressGetTrackInfo(input: {
  config: Pick<YunExpressOmsConfig, "baseUrl" | "lang" | "timeoutMs"> & {
    baseUrl: string;
  };
  orderNumber: string;
  allInfo?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<YunExpressTrackInfoResponse> {
  return callYunExpressGet({
    config: input.config,
    url: buildTrackInfoUrl(input.config.baseUrl, input.orderNumber, input.allInfo),
    fetchImpl: input.fetchImpl,
  }) as Promise<YunExpressTrackInfoResponse>;
}

export async function callYunExpressGetCarrier(input: {
  config: Pick<YunExpressOmsConfig, "baseUrl" | "lang" | "timeoutMs"> & {
    baseUrl: string;
  };
  orderNumbers: string[];
  fetchImpl?: typeof fetch;
}): Promise<YunExpressGetCarrierResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.config.timeoutMs);
  const fetchImpl = input.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(buildGetCarrierUrl(input.config.baseUrl), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "__lang": input.config.lang,
      },
      body: JSON.stringify(input.orderNumbers),
      signal: controller.signal,
    });

    return (await response.json()) as YunExpressGetCarrierResponse;
  } finally {
    clearTimeout(timeout);
  }
}

async function callYunExpressGet(input: {
  config: Pick<YunExpressOmsConfig, "lang" | "timeoutMs">;
  url: string;
  fetchImpl?: typeof fetch;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.config.timeoutMs);
  const fetchImpl = input.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(input.url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "__lang": input.config.lang,
      },
      signal: controller.signal,
    });

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function buildCreateOrderLabelUrl(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  if (/\/api\/WayBill\/CreateOrderLabel$/i.test(normalizedBaseUrl)) {
    return normalizedBaseUrl;
  }

  if (/\/api\/WayBill$/i.test(normalizedBaseUrl)) {
    return `${normalizedBaseUrl}/CreateOrderLabel`;
  }

  if (/\/api$/i.test(normalizedBaseUrl)) {
    return `${normalizedBaseUrl}/WayBill/CreateOrderLabel`;
  }

  return `${normalizedBaseUrl}/api/WayBill/CreateOrderLabel`;
}

function buildTrackingNumberUrl(baseUrl: string, customerOrderNumber: string) {
  const url = new URL(buildApiUrl(baseUrl, "/api/Waybill/GetTrackingNumber"));
  url.searchParams.set("CustomerOrderNumber", customerOrderNumber);
  return url.toString();
}

function buildTrackInfoUrl(
  baseUrl: string,
  orderNumber: string,
  allInfo = true,
) {
  const path = allInfo
    ? "/api/Tracking/GetTrackAllInfo"
    : "/api/Tracking/GetTrackInfo";
  const url = new URL(buildApiUrl(baseUrl, path));
  url.searchParams.set("OrderNumber", orderNumber);
  return url.toString();
}

function buildGetCarrierUrl(baseUrl: string) {
  return buildApiUrl(baseUrl, "/api/Waybill/GetCarrier");
}

function buildApiUrl(baseUrl: string, apiPath: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  if (/\/api\/[A-Za-z]+\/[A-Za-z]+$/i.test(normalizedBaseUrl)) {
    const root = normalizedBaseUrl.replace(/\/api\/[A-Za-z]+\/[A-Za-z]+$/i, "");
    return `${root}${apiPath}`;
  }

  if (/\/api\/[A-Za-z]+$/i.test(normalizedBaseUrl)) {
    const root = normalizedBaseUrl.replace(/\/api\/[A-Za-z]+$/i, "");
    return `${root}${apiPath}`;
  }

  if (/\/api$/i.test(normalizedBaseUrl)) {
    const root = normalizedBaseUrl.replace(/\/api$/i, "");
    return `${root}${apiPath}`;
  }

  return `${normalizedBaseUrl}${apiPath}`;
}
