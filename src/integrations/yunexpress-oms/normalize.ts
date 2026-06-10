import { createCarrierError } from "@/modules/carrier/errors";
import type {
  CarrierSafeMetadata,
  CarrierNormalizedTrackingStatus,
  CarrierTrackingEvent,
  CreateCarrierShipmentResult,
  CancelCarrierShipmentResult,
  GetCarrierTrackingResult,
} from "@/modules/carrier/types";
import type {
  YunExpressCreateOrderLabelResponse,
  YunExpressCreateOrderLabelResponseItem,
  YunExpressCarrierItem,
  YunExpressDeleteOrderResponse,
  YunExpressGetCarrierResponse,
  YunExpressGetOrderResponse,
  YunExpressGetTrackingNumberResponse,
  YunExpressPrintLabelResponse,
  YunExpressTrackInfoEvent,
  YunExpressTrackInfoResponse,
} from "./types";

export function normalizeCreateOrderLabelResponse(
  response: YunExpressCreateOrderLabelResponse,
): CreateCarrierShipmentResult {
  if (response.Code !== "0000") {
    throw createCarrierError({
      carrierCode: "YUNEXPRESS_OMS",
      reason: "REMOTE_REJECTED",
      message: "YunExpress OMS request was rejected.",
      retryable: false,
      statusCode: 502,
      safeMetadata: {
        code: response.Code ?? null,
        message: response.Message ?? null,
        ...buildCreateOrderLabelFailureMetadata(response),
      },
      rawResponse: response,
    });
  }

  const item = response.Item?.[0];
  if (!item) {
    throw createCarrierError({
      carrierCode: "YUNEXPRESS_OMS",
      reason: "REMOTE_REJECTED",
      message: "YunExpress OMS response did not include shipment result.",
      retryable: false,
      statusCode: 502,
      safeMetadata: {
        code: response.Code,
        ...buildCreateOrderLabelFailureMetadata(response),
      },
      rawResponse: response,
    });
  }

  if (!isSuccessfulItem(item)) {
    throw createCarrierError({
      carrierCode: "YUNEXPRESS_OMS",
      reason: "REMOTE_REJECTED",
      message: "YunExpress OMS shipment creation was rejected.",
      retryable: false,
      statusCode: 502,
      safeMetadata: {
        code: response.Code,
        customerOrderNumber: item.CustomerOrderNumber ?? null,
        success: stringifyNullable(item.Success),
        remark: item.Remark ?? null,
        ...buildCreateOrderLabelItemFailureMetadata(item),
      },
      rawResponse: response,
    });
  }

  return {
    carrierCode: "YUNEXPRESS_OMS",
    carrierShipmentId: item.WayBillNumber ?? item.TrackingNumber ?? "",
    trackingNumber: item.TrackingNumber ?? null,
    labelUrl: item.Label?.Url ?? null,
    metadata: {
      safe: {
        wayBillNumber: item.WayBillNumber ?? null,
        labelType: item.Label?.LabelType ?? null,
        hasLabelString: Boolean(item.Label?.LabelString),
        remark: item.Remark ?? null,
      },
      rawResponse: response,
    },
  };
}

export function isExistingOrderCreateOrderLabelResponse(
  response: YunExpressCreateOrderLabelResponse,
) {
  const items = response.Item ?? [];
  const allItemsSuccessful =
    items.length > 0 && items.every((item) => isSuccessfulItem(item));

  if (response.Code === "0000" && allItemsSuccessful) {
    return false;
  }

  const searchableText = [
    response.Message,
    ...items.flatMap((item) => [
      item.Remark,
      item.CustomerOrderNumber,
      ...(item.Label?.OrderInfos?.flatMap((orderInfo) => [
        orderInfo.Error,
        stringifyNullable(orderInfo.Code),
      ]) ?? []),
    ]),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    /\balready\s+exists?\b/.test(searchableText) ||
    /\bexisting\s+order\b/.test(searchableText) ||
    /\bduplicat(?:e|ed|ion)\b/.test(searchableText) ||
    searchableText.includes("已存在") ||
    searchableText.includes("已经存在") ||
    searchableText.includes("重複") ||
    searchableText.includes("重复")
  );
}

export function normalizeExistingOrderRecoveryResult(input: {
  createOrderLabelResponse: YunExpressCreateOrderLabelResponse;
  getOrderResponse: YunExpressGetOrderResponse;
  printLabelResponse?: YunExpressPrintLabelResponse | null;
}): CreateCarrierShipmentResult {
  const item = input.getOrderResponse.Item ?? null;
  const carrierShipmentId =
    safeString(item?.WayBillNumber) ??
    safeString(item?.OrderNumber) ??
    safeString(item?.TrackingNumber) ??
    safeString(item?.CustomerOrderNumber);
  const trackingNumber = safeString(item?.TrackingNumber);

  if (!item || (!carrierShipmentId && !trackingNumber)) {
    throw createCarrierError({
      carrierCode: "YUNEXPRESS_OMS",
      reason: "REMOTE_REJECTED",
      message:
        "YunExpress OMS reports the order already exists, but lookup did not return a usable shipment.",
      retryable: false,
      statusCode: 502,
      safeMetadata: {
        code: input.getOrderResponse.Code ?? null,
        message: input.getOrderResponse.Message ?? null,
        createOrderLabelCode: input.createOrderLabelResponse.Code ?? null,
        createOrderLabelMessage: input.createOrderLabelResponse.Message ?? null,
      },
      rawResponse: {
        createOrderLabel: input.createOrderLabelResponse,
        getOrder: input.getOrderResponse,
      },
    });
  }

  const labelItem = input.printLabelResponse?.Item?.[0] ?? null;
  const labelUrl = safeString(labelItem?.Url);

  return {
    carrierCode: "YUNEXPRESS_OMS",
    carrierShipmentId: carrierShipmentId ?? trackingNumber ?? "",
    trackingNumber,
    labelUrl,
    metadata: {
      safe: {
        recoveredFromExistingYunOrder: true,
        createOrderLabelCode: input.createOrderLabelResponse.Code ?? null,
        createOrderLabelMessage: input.createOrderLabelResponse.Message ?? null,
        customerOrderNumber: safeString(item.CustomerOrderNumber),
        wayBillNumber: safeString(item.WayBillNumber),
        yunOrderNumber: safeString(item.OrderNumber),
        yunStatus: safeScalarString(item.Status),
        labelType: safeString(labelItem?.LabelType),
        hasLabelUrl: Boolean(labelUrl),
        printLabelCode: input.printLabelResponse?.Code ?? null,
        printLabelMessage: input.printLabelResponse?.Message ?? null,
      },
      rawResponse: {
        createOrderLabel: input.createOrderLabelResponse,
        getOrder: input.getOrderResponse,
        printLabel: input.printLabelResponse ?? null,
      },
    },
  };
}

export function normalizeDeleteOrderResponse(
  response: YunExpressDeleteOrderResponse,
): CancelCarrierShipmentResult {
  if (response.Code !== "0000") {
    throw createCarrierError({
      carrierCode: "YUNEXPRESS_OMS",
      reason: "REMOTE_REJECTED",
      message: "YunExpress OMS delete request was rejected.",
      retryable: false,
      statusCode: 502,
      safeMetadata: {
        code: response.Code ?? null,
        message: response.Message ?? null,
      },
      rawResponse: response,
    });
  }

  const item = response.Item;
  if (!item?.OrderNumber) {
    throw createCarrierError({
      carrierCode: "YUNEXPRESS_OMS",
      reason: "REMOTE_REJECTED",
      message: "YunExpress OMS delete response did not include order result.",
      retryable: false,
      statusCode: 502,
      safeMetadata: {
        code: response.Code,
      },
      rawResponse: response,
    });
  }

  const status = String(item.Status ?? "");
  const cancelled = status === "5012" || /success/i.test(item.Remark ?? "");

  if (!cancelled) {
    throw createCarrierError({
      carrierCode: "YUNEXPRESS_OMS",
      reason: "REMOTE_REJECTED",
      message: "YunExpress OMS order was not deleted.",
      retryable: false,
      statusCode: 502,
      safeMetadata: {
        status: item.Status ?? null,
        remark: item.Remark ?? null,
      },
      rawResponse: response,
    });
  }

  return {
    carrierCode: "YUNEXPRESS_OMS",
    carrierShipmentId: item.OrderNumber,
    cancelled: true,
    metadata: {
      safe: {
        status: item.Status ?? null,
        remark: item.Remark ?? null,
      },
      rawResponse: response,
    },
  };
}

function isSuccessfulItem(item: YunExpressCreateOrderLabelResponseItem) {
  return item.Success === 1 || item.Success === "1" || item.Success === true;
}

function buildCreateOrderLabelFailureMetadata(
  response: YunExpressCreateOrderLabelResponse,
): CarrierSafeMetadata {
  const items = response.Item ?? [];
  const itemRemarks = compactStrings(items.map((item) => item.Remark));
  const itemCustomerOrderNumbers = compactStrings(
    items.map((item) => item.CustomerOrderNumber),
  );
  const itemSuccessValues = compactStrings(
    items.map((item) => stringifyNullable(item.Success)),
  );
  const labelOrderInfoErrors = compactStrings(
    items.flatMap((item) =>
      item.Label?.OrderInfos?.map((orderInfo) => orderInfo.Error) ?? [],
    ),
  );
  const labelOrderInfoCodes = compactStrings(
    items.flatMap((item) =>
      item.Label?.OrderInfos?.map((orderInfo) =>
        stringifyNullable(orderInfo.Code),
      ) ?? [],
    ),
  );

  return {
    itemCount: items.length,
    ...(itemRemarks.length > 0 ? { itemRemarks } : {}),
    ...(itemCustomerOrderNumbers.length > 0 ? { itemCustomerOrderNumbers } : {}),
    ...(itemSuccessValues.length > 0 ? { itemSuccessValues } : {}),
    ...(labelOrderInfoErrors.length > 0 ? { labelOrderInfoErrors } : {}),
    ...(labelOrderInfoCodes.length > 0 ? { labelOrderInfoCodes } : {}),
  };
}

function buildCreateOrderLabelItemFailureMetadata(
  item: YunExpressCreateOrderLabelResponseItem,
): CarrierSafeMetadata {
  const labelOrderInfoErrors = compactStrings(
    item.Label?.OrderInfos?.map((orderInfo) => orderInfo.Error) ?? [],
  );
  const labelOrderInfoCodes = compactStrings(
    item.Label?.OrderInfos?.map((orderInfo) =>
      stringifyNullable(orderInfo.Code),
    ) ?? [],
  );

  return {
    ...(labelOrderInfoErrors.length > 0 ? { labelOrderInfoErrors } : {}),
    ...(labelOrderInfoCodes.length > 0 ? { labelOrderInfoCodes } : {}),
  };
}

function compactStrings(values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function stringifyNullable(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

export function normalizeGetTrackingNumberResponse(
  response: YunExpressGetTrackingNumberResponse,
): {
  carrierShipmentId?: string | null;
  trackingNumber?: string | null;
  status: CarrierNormalizedTrackingStatus;
  errors: GetCarrierTrackingResult["errors"];
  safeMetadata: Record<string, string | number | boolean | null>;
} {
  assertSuccessfulResponse(response, "YunExpress OMS tracking number request was rejected.");

  const item = response.Items?.[0];
  if (!item) {
    return {
      carrierShipmentId: null,
      trackingNumber: null,
      status: "UNKNOWN",
      errors: [{ code: "EMPTY_RESPONSE", message: "Tracking number response was empty." }],
      safeMetadata: {
        trackingNumberStatus: null,
      },
    };
  }

  const statusCode = toNumber(item.Status);
  const status = mapTrackingNumberStatus(statusCode);
  const errors =
    statusCode === 4
      ? [
          {
            code: "TRACKING_NUMBER_FAILED",
            message: item.Remark || "Tracking number generation failed.",
          },
        ]
      : [];

  return {
    carrierShipmentId: safeString(item.WayBillNumber),
    trackingNumber: safeString(item.TrackingNumber),
    status,
    errors,
    safeMetadata: {
      trackingNumberStatus: statusCode,
      trackingNumberRemark: safeString(item.Remark),
    },
  };
}

export function normalizeTrackInfoResponse(
  response: YunExpressTrackInfoResponse,
  fallback: {
    carrierShipmentId?: string | null;
    trackingNumber?: string | null;
  } = {},
): GetCarrierTrackingResult {
  assertSuccessfulResponse(response, "YunExpress OMS tracking request was rejected.");

  const item = response.Item;
  if (!item) {
    return {
      carrierCode: "YUNEXPRESS_OMS",
      carrierShipmentId: fallback.carrierShipmentId ?? null,
      trackingNumber: fallback.trackingNumber ?? null,
      status: "UNKNOWN",
      packageState: null,
      trackingStatus: null,
      provider: null,
      events: [],
      latestEvent: null,
      errors: [{ code: "EMPTY_RESPONSE", message: "Tracking response was empty." }],
      metadata: { safe: { source: "yunexpress_oms_tracking" } },
    };
  }

  const packageState = toNumber(item.PackageState);
  const trackingStatus = toNumber(item.TrackingStatus);
  const events = normalizeTrackingEvents(item.OrderTrackingDetails ?? []);
  const latestEvent = events[events.length - 1] ?? null;
  const normalizedStatus = mapYunExpressTrackingStatus({
    packageState,
    trackingStatus,
  });

  return {
    carrierCode: "YUNEXPRESS_OMS",
    carrierShipmentId: safeString(item.WayBillNumber) ?? fallback.carrierShipmentId ?? null,
    trackingNumber: safeString(item.TrackingNumber) ?? fallback.trackingNumber ?? null,
    status: normalizedStatus,
    packageState,
    trackingStatus,
    provider: {
      carrierName: safeString(item.CarrierName) ?? safeString(item.ProviderName),
      carrierPhone: safeString(item.ProviderTelephone),
      carrierWebsite: safeString(item.ProviderSite),
    },
    events,
    latestEvent,
    errors: [],
    metadata: {
      safe: {
        packageState,
        trackingStatus,
        providerPresent: Boolean(item.ProviderName || item.CarrierName),
        eventCount: events.length,
      },
    },
  };
}

export function normalizeGetCarrierResponse(
  response: YunExpressGetCarrierResponse,
): NonNullable<GetCarrierTrackingResult["provider"]> | null {
  assertSuccessfulResponse(response, "YunExpress OMS carrier request was rejected.");

  const item = response.Item?.[0];
  if (!item) {
    return null;
  }

  return normalizeCarrierItem(item);
}

export function mergeCarrierProvider(
  tracking: GetCarrierTrackingResult,
  provider: NonNullable<GetCarrierTrackingResult["provider"]> | null,
): GetCarrierTrackingResult {
  if (!provider) {
    return tracking;
  }

  return {
    ...tracking,
    provider: {
      ...tracking.provider,
      ...provider,
    },
    metadata: {
      safe: {
        ...(tracking.metadata?.safe ?? {}),
        carrierProviderPresent: true,
      },
    },
  };
}

export function mapYunExpressTrackingStatus(input: {
  packageState?: number | null;
  trackingStatus?: number | null;
}): CarrierNormalizedTrackingStatus {
  if (input.packageState === 5 || input.trackingStatus === 100) {
    return "CANCELLED";
  }

  if (input.packageState === 7 || input.trackingStatus === 90) {
    return "RETURNED";
  }

  if (input.packageState === 6 || input.trackingStatus === 40 || input.trackingStatus === 60) {
    return "EXCEPTION";
  }

  if (input.packageState === 3 || input.packageState === 4 || input.trackingStatus === 50) {
    return "DELIVERED";
  }

  if (input.packageState === 2 || input.trackingStatus === 20 || input.trackingStatus === 30) {
    return "IN_TRANSIT";
  }

  if (input.packageState === 1 || input.trackingStatus === 10 || input.trackingStatus === 0) {
    return "TRACKING_PENDING";
  }

  return "UNKNOWN";
}

function assertSuccessfulResponse(
  response: { Code?: string; Message?: string },
  message: string,
) {
  if (response.Code !== "0000") {
    throw createCarrierError({
      carrierCode: "YUNEXPRESS_OMS",
      reason: "REMOTE_REJECTED",
      message,
      retryable: false,
      statusCode: 502,
      safeMetadata: {
        code: response.Code ?? null,
        message: response.Message ?? null,
      },
      rawResponse: response,
    });
  }
}

function mapTrackingNumberStatus(
  status: number | null,
): CarrierNormalizedTrackingStatus {
  if (status === 1 || status === 3) {
    return "TRACKING_PENDING";
  }

  if (status === 2) {
    return "TRACKING_PENDING";
  }

  if (status === 4) {
    return "EXCEPTION";
  }

  return "UNKNOWN";
}

function normalizeTrackingEvents(
  events: YunExpressTrackInfoEvent[],
): CarrierTrackingEvent[] {
  const normalized: CarrierTrackingEvent[] = [];

  for (const event of events) {
      const statusCode = toNumber(event.TrackingStatus);
      const eventTime = toDate(event.ProcessDate);

      if (!eventTime) {
        continue;
      }

      normalized.push({
        eventCode: safeString(event.TrackNodeCode),
        eventStatus: mapYunExpressTrackingStatus({
          trackingStatus: statusCode,
        }),
        eventTime,
        timezone: safeString(event.ProcessTimezone),
        statusCode,
        statusDescription: safeString(event.TrackCodeDescription),
        message: safeString(event.ProcessContent),
        location: safeString(event.ProcessLocation),
        country: safeString(event.ProcessCountry),
        province: safeString(event.ProcessProvince),
        city: safeString(event.ProcessCity),
        description: safeString(event.ProcessContent),
      });
  }

  return normalized.sort(
    (left, right) => left.eventTime.getTime() - right.eventTime.getTime(),
  );
}

function normalizeCarrierItem(
  item: YunExpressCarrierItem,
): NonNullable<GetCarrierTrackingResult["provider"]> {
  return {
    carrierCode: safeString(item.CarrierCode),
    carrierName: safeString(item.CarrierEName) ?? safeString(item.CarrierCName),
    carrierPhone: safeString(item.CarrierPhone),
    carrierWebsite: safeString(item.CarrierWebsite),
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function safeScalarString(value: unknown): string | null {
  if (typeof value === "string") {
    return safeString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}
