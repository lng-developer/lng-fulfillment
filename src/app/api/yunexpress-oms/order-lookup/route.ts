import { lookupYunExpressOmsOrder } from "@/modules/yunexpress-oms-lookup/service";
import type { YunExpressOmsOrderLookupResult } from "@/modules/yunexpress-oms-lookup/service";
import type {
  YunContact,
  YunLookupResponse,
  YunOrderInfo,
  YunOrderItem,
  YunParcel,
} from "@/types/order-lookup";
import { ok, error as errorResponse } from "@/shared/api-response";
import { AppError } from "@/shared/errors";
import {
  RATE_LIMIT_POLICIES,
  buildRateLimitKey,
  getClientIp,
  rateLimitOrThrow,
} from "@/shared/security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    rateLimitOrThrow({
      key: buildRateLimitKey(
        "yunexpress-oms:order-lookup",
        getClientIp(request),
      ),
      ...RATE_LIMIT_POLICIES.expensiveRead,
    });

    const url = new URL(request.url);
    const orderNumber = url.searchParams.get("orderNumber") ?? "";
    const result = await lookupYunExpressOmsOrder(orderNumber);

    return ok({ lookup: toPublicLookupResponse(result) });
  } catch (error) {
    return handleLookupError(error);
  }
}

function toPublicLookupResponse(
  result: YunExpressOmsOrderLookupResult,
): YunLookupResponse {
  return {
    searchCode: result.searchedOrderNumber,
    ...(result.labelLookupNumber ? { labelCode: result.labelLookupNumber } : {}),
    getOrder: {
      found: result.getOrder.found,
      code: result.getOrder.code ?? "",
      message: result.getOrder.message ?? "",
      ...(result.getOrder.item
        ? { item: toPublicOrderItem(result.getOrder.item) }
        : {}),
    },
    label: {
      attempted: result.labelPrint.attempted,
      ...(result.labelPrint.code ? { code: result.labelPrint.code } : {}),
      ...(result.labelPrint.message
        ? { message: result.labelPrint.message }
        : result.labelPrint.error
          ? { message: result.labelPrint.error }
          : {}),
      ...(result.labelPrint.labelType
        ? { labelType: result.labelPrint.labelType }
        : {}),
      hasUrl: result.labelPrint.hasLabelUrl,
      orderInfos: result.labelPrint.orderInfos.map(toPublicOrderInfo),
    },
  };
}

function toPublicOrderItem(item: Record<string, unknown>): YunOrderItem {
  return {
    ...pickString(item, "OrderNumber"),
    ...pickString(item, "CustomerOrderNumber"),
    ...pickString(item, "WayBillNumber"),
    ...pickString(item, "TrackingNumber"),
    ...pickString(item, "ShippingMethodCode"),
    ...pickString(item, "Status"),
    ...pickNumber(item, "PackageCount"),
    ...pickNumber(item, "PackageNumber"),
    ...pickNumber(item, "Length"),
    ...pickNumber(item, "Width"),
    ...pickNumber(item, "Height"),
    ...pickNumber(item, "Weight"),
    ...(toPublicContact(item.Receiver)
      ? { Receiver: toPublicContact(item.Receiver) }
      : {}),
    ...(toPublicContact(item.Sender)
      ? { Sender: toPublicContact(item.Sender) }
      : {}),
    ...(Array.isArray(item.Parcels)
      ? { Parcels: item.Parcels.map(toPublicParcel).filter(hasAnyObjectValue) }
      : {}),
    ...(Array.isArray(item.OrderInfos)
      ? {
          OrderInfos: item.OrderInfos
            .map(toPublicOrderInfo)
            .filter(hasAnyObjectValue),
        }
      : {}),
  };
}

function toPublicContact(value: unknown): YunContact | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const contact = {
    ...pickString(record, "FirstName"),
    ...pickString(record, "LastName"),
    ...pickString(record, "Company"),
    ...pickString(record, "CountryCode"),
    ...pickString(record, "Street"),
    ...pickString(record, "City"),
    ...pickString(record, "State"),
    ...pickString(record, "Zip"),
    ...pickString(record, "Phone"),
    ...pickString(record, "Email"),
  };

  return hasAnyValue(contact) ? contact : undefined;
}

function toPublicParcel(value: unknown): YunParcel {
  const record = asRecord(value);
  if (!record) {
    return {};
  }

  return {
    ...pickString(record, "SKU"),
    ...pickString(record, "EName"),
    ...pickString(record, "CName"),
    ...pickNumber(record, "Quantity"),
    ...pickNumber(record, "UnitPrice"),
    ...pickNumber(record, "UnitWeight"),
    ...pickString(record, "CurrencyCode"),
    ...pickString(record, "Remark"),
  };
}

function toPublicOrderInfo(value: unknown): YunOrderInfo {
  const record = asRecord(value);
  if (!record) {
    return {};
  }

  return {
    ...pickString(record, "CustomerOrderNumber"),
    ...pickString(record, "Code"),
    ...pickString(record, "Message"),
    ...pickString(record, "Error", "Message"),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(
  record: Record<string, unknown>,
  key: string,
  alias: string = key,
) {
  const value = record[key];
  if (value === null || value === undefined || value === "") {
    return {};
  }

  return { [alias]: String(value) };
}

function pickNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value === null || value === undefined || value === "") {
    return {};
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? { [key]: parsed } : {};
}

function hasAnyValue(record: Record<string, unknown>) {
  return Object.values(record).some(
    (value) => value !== undefined && value !== null && value !== "",
  );
}

function hasAnyObjectValue(record: object) {
  return Object.values(record).some(
    (value) => value !== undefined && value !== null && value !== "",
  );
}

function handleLookupError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  return errorResponse("INTERNAL_ERROR", "Internal server error.", 500);
}
