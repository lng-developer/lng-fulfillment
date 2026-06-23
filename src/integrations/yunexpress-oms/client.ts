import type { YunExpressOmsConfig } from "./config";
import {
  CarrierIntegrationError,
  createCarrierError,
} from "@/modules/carrier/errors";
import { createSafeTimingLogger } from "@/shared/timing";
import type {
  YunExpressCreateOrderLabelPayload,
  YunExpressCreateOrderLabelResponse,
  YunExpressDeleteOrderResponse,
  YunExpressGetCarrierResponse,
  YunExpressGetOrderResponse,
  YunExpressGetTrackingNumberResponse,
  YunExpressPrintLabelResponse,
  YunExpressShippingFeeDetailResponse,
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
  return yunFetchJson<YunExpressCreateOrderLabelResponse>({
    action: "create_order_label",
    fetchImpl: input.fetchImpl,
    timeoutMs: input.config.timeoutMs,
    url: buildCreateOrderLabelUrl(input.config.baseUrl),
    init: {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: input.authorizationHeader,
        "Content-Type": "application/json",
        "__lang": input.config.lang,
      },
      body: JSON.stringify(input.payload),
    },
  });
}

export async function callYunExpressDeleteOrder(input: {
  config: Required<
    Pick<YunExpressOmsConfig, "baseUrl" | "customerNo" | "apiSecret">
  > &
    Pick<YunExpressOmsConfig, "lang" | "timeoutMs">;
  authorizationHeader: string;
  orderNumber: string;
  orderType?: 1 | 2 | 3;
  fetchImpl?: typeof fetch;
}): Promise<YunExpressDeleteOrderResponse> {
  return yunFetchJson<YunExpressDeleteOrderResponse>({
    action: "delete_order",
    fetchImpl: input.fetchImpl,
    timeoutMs: input.config.timeoutMs,
    url: buildDeleteOrderUrl(input.config.baseUrl),
    init: {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: input.authorizationHeader,
        "Content-Type": "application/json",
        "__lang": input.config.lang,
      },
      body: JSON.stringify({
        OrderType: input.orderType ?? 1,
        OrderNumber: input.orderNumber,
      }),
    },
  });
}

export async function callYunExpressGetTrackingNumber(input: {
  config: Pick<YunExpressOmsConfig, "baseUrl" | "lang" | "timeoutMs"> & {
    baseUrl: string;
  };
  customerOrderNumber: string;
  authorizationHeader?: string;
  fetchImpl?: typeof fetch;
}): Promise<YunExpressGetTrackingNumberResponse> {
  return callYunExpressGet({
    action: "get_tracking_number",
    config: input.config,
    url: buildTrackingNumberUrl(input.config.baseUrl, input.customerOrderNumber),
    authorizationHeader: input.authorizationHeader,
    fetchImpl: input.fetchImpl,
  }) as Promise<YunExpressGetTrackingNumberResponse>;
}

export async function callYunExpressGetOrder(input: {
  config: Pick<YunExpressOmsConfig, "baseUrl" | "lang" | "timeoutMs"> & {
    baseUrl: string;
  };
  orderNumber: string;
  authorizationHeader?: string;
  fetchImpl?: typeof fetch;
}): Promise<YunExpressGetOrderResponse> {
  return callYunExpressGet({
    action: "get_order",
    config: input.config,
    url: buildGetOrderUrl(input.config.baseUrl, input.orderNumber),
    authorizationHeader: input.authorizationHeader,
    fetchImpl: input.fetchImpl,
  }) as Promise<YunExpressGetOrderResponse>;
}

export async function callYunExpressPrintLabel(input: {
  config: Pick<YunExpressOmsConfig, "baseUrl" | "lang" | "timeoutMs"> & {
    baseUrl: string;
  };
  orderNumbers: string[];
  authorizationHeader?: string;
  fetchImpl?: typeof fetch;
}): Promise<YunExpressPrintLabelResponse> {
  return yunFetchJson<YunExpressPrintLabelResponse>({
    action: "print_label",
    fetchImpl: input.fetchImpl,
    timeoutMs: input.config.timeoutMs,
    url: buildPrintLabelUrl(input.config.baseUrl),
    init: {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(input.authorizationHeader
          ? { Authorization: input.authorizationHeader }
          : {}),
        "Content-Type": "application/json",
        "__lang": input.config.lang,
      },
      body: JSON.stringify(input.orderNumbers),
    },
  });
}

export async function callYunExpressGetTrackInfo(input: {
  config: Pick<YunExpressOmsConfig, "baseUrl" | "lang" | "timeoutMs"> & {
    baseUrl: string;
  };
  orderNumber: string;
  allInfo?: boolean;
  authorizationHeader?: string;
  fetchImpl?: typeof fetch;
}): Promise<YunExpressTrackInfoResponse> {
  return callYunExpressGet({
    action: "get_track_info",
    config: input.config,
    url: buildTrackInfoUrl(input.config.baseUrl, input.orderNumber, input.allInfo),
    authorizationHeader: input.authorizationHeader,
    fetchImpl: input.fetchImpl,
  }) as Promise<YunExpressTrackInfoResponse>;
}

export async function callYunExpressGetCarrier(input: {
  config: Pick<YunExpressOmsConfig, "baseUrl" | "lang" | "timeoutMs"> & {
    baseUrl: string;
  };
  orderNumbers: string[];
  authorizationHeader?: string;
  fetchImpl?: typeof fetch;
}): Promise<YunExpressGetCarrierResponse> {
  return yunFetchJson<YunExpressGetCarrierResponse>({
    action: "get_carrier",
    fetchImpl: input.fetchImpl,
    timeoutMs: input.config.timeoutMs,
    url: buildGetCarrierUrl(input.config.baseUrl),
    init: {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(input.authorizationHeader
          ? { Authorization: input.authorizationHeader }
          : {}),
        "Content-Type": "application/json",
        "__lang": input.config.lang,
      },
      body: JSON.stringify(input.orderNumbers),
    },
  });
}

export async function callYunExpressGetShippingFeeDetail(input: {
  config: Pick<YunExpressOmsConfig, "baseUrl" | "lang" | "timeoutMs"> & {
    baseUrl: string;
  };
  wayBillNumber: string;
  authorizationHeader?: string;
  fetchImpl?: typeof fetch;
}): Promise<YunExpressShippingFeeDetailResponse> {
  return callYunExpressGet({
    action: "get_shipping_fee_detail",
    config: input.config,
    url: buildShippingFeeDetailUrl(input.config.baseUrl, input.wayBillNumber),
    authorizationHeader: input.authorizationHeader,
    fetchImpl: input.fetchImpl,
  }) as Promise<YunExpressShippingFeeDetailResponse>;
}

async function callYunExpressGet(input: {
  action: string;
  config: Pick<YunExpressOmsConfig, "lang" | "timeoutMs">;
  url: string;
  authorizationHeader?: string;
  fetchImpl?: typeof fetch;
}) {
  return yunFetchJson({
    action: input.action,
    fetchImpl: input.fetchImpl,
    timeoutMs: input.config.timeoutMs,
    url: input.url,
    init: {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(input.authorizationHeader
          ? { Authorization: input.authorizationHeader }
          : {}),
        "__lang": input.config.lang,
      },
    },
  });
}

async function yunFetchJson<T>(input: {
  action: string;
  url: string;
  init: RequestInit;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  const fetchImpl = input.fetchImpl ?? fetch;
  const timing = createSafeTimingLogger("yunExpressOmsClient", {
    carrierAction: input.action,
    method: input.init.method ?? "GET",
    timeoutMs: input.timeoutMs,
  });

  try {
    timing("fetchStarted");
    const response = await fetchImpl(input.url, {
      ...input.init,
      signal: controller.signal,
    });
    timing("httpResponseReceived", {
      httpStatus: response.status,
      ok: response.ok,
    });
    const responseText = await response.text();
    logRawYunResponse({
      action: input.action,
      httpStatus: response.status,
      ok: response.ok,
      body: responseText,
    });

    if (!response.ok) {
      const carrierError = mapYunHttpFailure(
        input.action,
        response,
        responseText,
      );
      timing("httpFailureMapped", {
        httpStatus: response.status,
      });
      throw new CarrierIntegrationError(
        createCarrierError(carrierError),
      );
    }

    try {
      const parsed = JSON.parse(responseText) as T;
      timing("jsonParsed");
      return parsed;
    } catch {
      timing("jsonParseFailed");
      throw new CarrierIntegrationError(
        createCarrierError({
          carrierCode: "YUNEXPRESS_OMS",
          reason: "REMOTE_REJECTED",
          message: "YunExpress OMS response was not valid JSON.",
          retryable: false,
          statusCode: 502,
          safeMetadata: {
            action: input.action,
          },
        }),
      );
    }
  } catch (error) {
    if (error instanceof CarrierIntegrationError) {
      throw error;
    }

    timing("fetchFailed", {
      errorName: getErrorName(error),
    });
    throw mapYunFetchFailure(error, input.action, input.timeoutMs);
  } finally {
    clearTimeout(timeout);
  }
}

function logRawYunResponse(input: {
  action: string;
  httpStatus: number;
  ok: boolean;
  body: string;
}) {
  if (process.env.YUN_OMS_DEBUG_RAW_RESPONSE !== "true") {
    return;
  }

  console.info(
    `[yun-raw-response:${input.action}] status=${input.httpStatus} ok=${input.ok}\n${input.body}`,
  );
}

function getErrorName(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
    ? error.name
    : "unknown";
}

function mapYunHttpFailure(
  action: string,
  response: Response,
  responseText: string,
): Parameters<typeof createCarrierError>[0] {
  const safeMetadata = {
    action,
    httpStatus: response.status,
    ...(response.statusText ? { statusText: response.statusText } : {}),
    ...readSafeYunFailureMetadata(responseText),
  };

  if (response.status === 429) {
    return {
      carrierCode: "YUNEXPRESS_OMS",
      reason: "RATE_LIMITED",
      message: "YunExpress OMS rate limit was reached.",
      retryable: true,
      statusCode: 429,
      safeMetadata,
    };
  }

  if (response.status >= 500) {
    return {
      carrierCode: "YUNEXPRESS_OMS",
      reason: "TEMPORARY_UNAVAILABLE",
      message: "YunExpress OMS is temporarily unavailable.",
      retryable: true,
      statusCode: 503,
      safeMetadata,
    };
  }

  return {
    carrierCode: "YUNEXPRESS_OMS",
    reason: "REMOTE_REJECTED",
    message:
      response.status === 421
        ? "YunExpress OMS rejected the request before processing. Check the selected environment, base URL, and credentials."
        : "YunExpress OMS rejected the request.",
    retryable: false,
    statusCode: 502,
    safeMetadata,
  };
}

function readSafeYunFailureMetadata(responseText: string) {
  try {
    const parsed = JSON.parse(responseText) as Record<string, unknown>;
    const resultCode = readString(parsed.ResultCode) ?? readString(parsed.Code);
    const resultDesc =
      readString(parsed.ResultDesc) ?? readString(parsed.Message);

    return {
      ...(resultCode ? { resultCode } : {}),
      ...(resultDesc ? { resultDesc } : {}),
    };
  } catch {
    return {};
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapYunFetchFailure(error: unknown, action: string, timeoutMs: number) {
  const name =
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
      ? error.name
      : null;

  if (name === "AbortError" || name === "TimeoutError") {
    return new CarrierIntegrationError(
      createCarrierError({
        carrierCode: "YUNEXPRESS_OMS",
        reason: "REMOTE_TIMEOUT",
        message: "YunExpress OMS request timed out.",
        retryable: true,
        statusCode: 503,
        safeMetadata: {
          action,
          timeoutMs,
        },
      }),
    );
  }

  return new CarrierIntegrationError(
    createCarrierError({
      carrierCode: "YUNEXPRESS_OMS",
      reason: "TEMPORARY_UNAVAILABLE",
      message: "YunExpress OMS request failed.",
      retryable: true,
      statusCode: 503,
      safeMetadata: {
        action,
      },
    }),
  );
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

function buildGetOrderUrl(baseUrl: string, orderNumber: string) {
  const url = new URL(buildApiUrl(baseUrl, "/api/WayBill/GetOrder"));
  url.searchParams.set("OrderNumber", orderNumber);
  return url.toString();
}

function buildPrintLabelUrl(baseUrl: string) {
  return buildApiUrl(baseUrl, "/api/Label/Print");
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

function buildShippingFeeDetailUrl(baseUrl: string, wayBillNumber: string) {
  const url = new URL(buildApiUrl(baseUrl, "/api/Freight/GetShippingFeeDetail"));
  url.searchParams.set("wayBillNumber", wayBillNumber);
  return url.toString();
}

function buildDeleteOrderUrl(baseUrl: string) {
  return buildApiUrl(baseUrl, "/api/WayBill/Delete");
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
