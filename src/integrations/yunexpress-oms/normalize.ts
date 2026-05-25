import { createCarrierError } from "@/modules/carrier/errors";
import type {
  CarrierNormalizedTrackingStatus,
  CarrierTrackingEvent,
  CreateCarrierShipmentResult,
  GetCarrierTrackingResult,
} from "@/modules/carrier/types";
import type {
  YunExpressCreateOrderLabelResponse,
  YunExpressCreateOrderLabelResponseItem,
  YunExpressCarrierItem,
  YunExpressGetCarrierResponse,
  YunExpressGetTrackingNumberResponse,
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
        remark: item.Remark ?? null,
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

function isSuccessfulItem(item: YunExpressCreateOrderLabelResponseItem) {
  return item.Success === 1 || item.Success === "1" || item.Success === true;
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
