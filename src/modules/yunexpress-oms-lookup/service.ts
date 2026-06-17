import {
  getYunExpressOmsConfig,
  validateYunExpressLiveConfig,
} from "@/integrations/yunexpress-oms/config";
import { createYunExpressOmsAuthorizationHeader } from "@/integrations/yunexpress-oms/auth";
import {
  callYunExpressGetOrder,
  callYunExpressPrintLabel,
} from "@/integrations/yunexpress-oms/client";
import type {
  YunExpressGetOrderResponse,
  YunExpressOrderItem,
  YunExpressPrintLabelResponse,
} from "@/integrations/yunexpress-oms/types";
import { CarrierIntegrationError } from "@/modules/carrier/errors";
import { AppError } from "@/shared/errors";

export type YunExpressOmsOrderLookupResult = {
  searchedOrderNumber: string;
  labelLookupNumber: string | null;
  getOrder: {
    code: string | null;
    message: string | null;
    found: boolean;
    item: YunExpressOrderItem | null;
    raw: YunExpressGetOrderResponse;
  };
  labelPrint: {
    attempted: boolean;
    lookupNumber: string | null;
    code: string | null;
    message: string | null;
    labelType: string | null;
    labelUrl: string | null;
    hasLabelUrl: boolean;
    orderInfos: NonNullable<
      NonNullable<YunExpressPrintLabelResponse["Item"]>[number]["OrderInfos"]
    >;
    raw: YunExpressPrintLabelResponse | null;
    error: string | null;
  };
};

export async function lookupYunExpressOmsOrder(
  rawOrderNumber: string,
): Promise<YunExpressOmsOrderLookupResult> {
  const orderNumber = rawOrderNumber.trim();

  if (!orderNumber) {
    throw new AppError("VALIDATION_ERROR", "Order number is required.", 400);
  }

  if (orderNumber.length > 120) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Order number must be 120 characters or fewer.",
      400,
    );
  }

  const config = getYunExpressOmsConfig();
  const missing = validateYunExpressLiveConfig(config).filter(
    (key) => key === "YUN_OMS_BASE_URL",
  );

  if (missing.length > 0 || !config.baseUrl) {
    throw new AppError(
      "CARRIER_ERROR",
      "YunExpress OMS lookup configuration is incomplete.",
      503,
      {
        carrierCode: "YUNEXPRESS_OMS",
        missing,
      },
    );
  }
  const authorizationHeader =
    config.customerNo && config.apiSecret
      ? createYunExpressOmsAuthorizationHeader({
          customerNo: config.customerNo,
          apiSecret: config.apiSecret,
        })
      : undefined;

  try {
    const getOrder = await callYunExpressGetOrder({
      config: {
        baseUrl: config.baseUrl,
        lang: config.lang,
        timeoutMs: config.timeoutMs,
      },
      orderNumber,
      authorizationHeader,
    });
    const item = getOrder.Item ?? null;
    const labelLookupNumber = getLabelLookupNumber(item, orderNumber);
    const labelPrint = labelLookupNumber
      ? await printLabelSafely(
          { ...config, baseUrl: config.baseUrl },
          labelLookupNumber,
          authorizationHeader,
        )
      : buildSkippedLabelPrintResult();

    return {
      searchedOrderNumber: orderNumber,
      labelLookupNumber,
      getOrder: {
        code: getOrder.Code ?? null,
        message: getOrder.Message ?? null,
        found: Boolean(item),
        item,
        raw: getOrder,
      },
      labelPrint,
    };
  } catch (error) {
    if (error instanceof CarrierIntegrationError) {
      const carrierError = error.carrierError;
      return buildRejectedGetOrderLookupResult(orderNumber, {
        code: readString(carrierError.safeMetadata?.resultCode),
        message:
          readString(carrierError.safeMetadata?.resultDesc) ??
          carrierError.message,
      });
    }

    throw error;
  }
}

function getLabelLookupNumber(
  item: YunExpressOrderItem | null,
  fallback: string,
) {
  return (
    readString(item?.WayBillNumber) ??
    readString(item?.TrackingNumber) ??
    readString(item?.OrderNumber) ??
    readString(item?.CustomerOrderNumber) ??
    fallback
  );
}

async function printLabelSafely(
  config: ReturnType<typeof getYunExpressOmsConfig> & { baseUrl: string },
  lookupNumber: string,
  authorizationHeader: string | undefined,
): Promise<YunExpressOmsOrderLookupResult["labelPrint"]> {
  try {
    const response = await callYunExpressPrintLabel({
      config: {
        baseUrl: config.baseUrl,
        lang: config.lang,
        timeoutMs: config.timeoutMs,
      },
      orderNumbers: [lookupNumber],
      authorizationHeader,
    });
    const firstItem = response.Item?.[0] ?? null;
    const labelUrl = readString(firstItem?.Url);

    return {
      attempted: true,
      lookupNumber,
      code: response.Code ?? null,
      message: response.Message ?? null,
      labelType: readString(firstItem?.LabelType),
      labelUrl,
      hasLabelUrl: Boolean(labelUrl),
      orderInfos: firstItem?.OrderInfos ?? [],
      raw: response,
      error: null,
    };
  } catch (error) {
    if (error instanceof CarrierIntegrationError) {
      return {
        attempted: true,
        lookupNumber,
        code: null,
        message: null,
        labelType: null,
        labelUrl: null,
        hasLabelUrl: false,
        orderInfos: [],
        raw: null,
        error: error.carrierError.message,
      };
    }

    throw error;
  }
}

function buildSkippedLabelPrintResult(): YunExpressOmsOrderLookupResult["labelPrint"] {
  return {
    attempted: false,
    lookupNumber: null,
    code: null,
    message: null,
    labelType: null,
    labelUrl: null,
    hasLabelUrl: false,
    orderInfos: [],
    raw: null,
    error: "No YunExpress order number was available for label lookup.",
  };
}

function buildRejectedGetOrderLookupResult(
  orderNumber: string,
  failure: {
    code: string | null;
    message: string | null;
  },
): YunExpressOmsOrderLookupResult {
  return {
    searchedOrderNumber: orderNumber,
    labelLookupNumber: null,
    getOrder: {
      code: failure.code,
      message: failure.message,
      found: false,
      item: null,
      raw: {
        ...(failure.code ? { Code: failure.code } : {}),
        ...(failure.message ? { Message: failure.message } : {}),
        Item: null,
      },
    },
    labelPrint: buildSkippedLabelPrintResult(),
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
