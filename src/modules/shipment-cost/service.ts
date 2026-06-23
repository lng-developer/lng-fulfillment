import type { ShipmentActualFeeStatus } from "@prisma/client";
import { mapCarrierErrorToAppError, resolveCarrierRuntimeCredentials } from "@/modules/carrier";
import { callYunExpressGetShippingFeeDetail } from "@/integrations/yunexpress-oms/client";
import {
  getYunExpressOmsConfig,
  validateYunExpressLiveConfig,
  type YunExpressOmsConfig,
} from "@/integrations/yunexpress-oms/config";
import { createYunExpressOmsAuthorizationHeader } from "@/integrations/yunexpress-oms/auth";
import { AppError } from "@/shared/errors";
import {
  countShipmentCosts,
  getShipmentCostWithCarrierIds,
  listShipmentCosts,
  markShipmentCostActualFeeAvailable,
  markShipmentCostActualFeeFailed,
} from "./repository";

export const DEFAULT_SHIPMENT_COST_PAGE = 1;
export const DEFAULT_SHIPMENT_COST_PAGE_SIZE = 20;
export const MAX_SHIPMENT_COST_PAGE_SIZE = 100;

export async function listShipmentCostRecords(
  tenantId: string,
  query: {
    page?: number;
    pageSize?: number;
    status?: ShipmentActualFeeStatus;
    search?: string;
  },
) {
  const page = normalizePage(query.page);
  const pageSize = normalizePageSize(query.pageSize);
  const listQuery = {
    page,
    pageSize,
    status: query.status,
    search: query.search?.trim() || undefined,
  };
  const [items, totalItems] = await Promise.all([
    listShipmentCosts(tenantId, listQuery),
    countShipmentCosts(tenantId, listQuery),
  ]);

  return {
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

export async function fetchYunActualShippingFee(input: {
  tenantId: string;
  shipmentId: string;
}) {
  const cost = await getShipmentCostWithCarrierIds(input);
  if (!cost) {
    throw new AppError("NOT_FOUND", "Shipment cost record not found.", 404);
  }

  if (cost.shipment.carrierCode !== "YUNEXPRESS_OMS") {
    throw new AppError("CONFLICT", "Shipment is not a YunExpress shipment.", 409);
  }

  const wayBillNumber = cost.shipment.carrierShipmentId;
  if (!wayBillNumber) {
    throw new AppError("CONFLICT", "YunExpress waybill number is missing.", 409);
  }

  const runtimeCredentials = await resolveCarrierRuntimeCredentials(
    input.tenantId,
    "YUNEXPRESS_OMS",
    null,
  );
  const config = buildConfigFromRuntime(runtimeCredentials.payload);
  const missing = validateYunExpressLiveConfig(config);
  if (missing.length > 0 || !config.baseUrl || !config.customerNo || !config.apiSecret) {
    throw new AppError("CARRIER_ERROR", "YunExpress OMS configuration is incomplete.", 503, {
      carrierCode: "YUNEXPRESS_OMS",
      missing,
    });
  }

  try {
    const response = await callYunExpressGetShippingFeeDetail({
      config: {
        baseUrl: config.baseUrl,
        lang: config.lang,
        timeoutMs: config.timeoutMs,
      },
      authorizationHeader: createYunExpressOmsAuthorizationHeader({
        customerNo: config.customerNo,
        apiSecret: config.apiSecret,
      }),
      wayBillNumber,
    });

    if (response.Code !== "0000" || !response.Item) {
      const updated = await markShipmentCostActualFeeFailed({
        tenantId: input.tenantId,
        shipmentId: input.shipmentId,
        code: response.Code ?? "UNKNOWN",
        message: response.Message ?? "YunExpress shipping fee is not available.",
      });
      throw new AppError("CARRIER_ERROR", "YunExpress shipping fee is not available.", 502, {
        carrierCode: "YUNEXPRESS_OMS",
        code: response.Code ?? null,
        message: response.Message ?? null,
        shipmentCost: updated,
      });
    }

    return markShipmentCostActualFeeAvailable({
      tenantId: input.tenantId,
      shipmentId: input.shipmentId,
      actualGrossWeight: toNumber(response.Item.GrossWeight),
      actualChargeWeight: toNumber(response.Item.ChargeWeight),
      actualFreight: toNumber(response.Item.Freight),
      actualFuelSurcharge: toNumber(response.Item.FuelSurcharge),
      actualRegistrationFee: toNumber(response.Item.RegistrationFee),
      actualProcessingFee: toNumber(response.Item.ProcessingFee),
      actualOtherFee: toNumber(response.Item.OtherFee),
      actualTotalFee: toNumber(response.Item.TotalFee),
      actualOccurrenceTime: parseYunDate(response.Item.OccurrenceTime),
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw mapCarrierErrorToAppError(error);
  }
}

function buildConfigFromRuntime(payload: Record<string, string | number | boolean | null>) {
  const envFallback = getYunExpressOmsConfig();

  return {
    baseUrl: typeof payload.baseUrl === "string" ? payload.baseUrl : envFallback.baseUrl,
    customerNo:
      typeof payload.customerNo === "string" ? payload.customerNo : envFallback.customerNo,
    apiSecret:
      typeof payload.apiSecret === "string" ? payload.apiSecret : envFallback.apiSecret,
    lang: typeof payload.lang === "string" ? payload.lang : envFallback.lang,
    liveEnabled:
      typeof payload.liveEnabled === "boolean"
        ? payload.liveEnabled
        : envFallback.liveEnabled,
    defaultShippingMethodCode:
      typeof payload.defaultShippingMethodCode === "string"
        ? payload.defaultShippingMethodCode
        : envFallback.defaultShippingMethodCode,
    defaultSourceCode:
      typeof payload.defaultSourceCode === "string"
        ? payload.defaultSourceCode
        : envFallback.defaultSourceCode,
    defaultSizeUnit:
      typeof payload.defaultSizeUnit === "string"
        ? payload.defaultSizeUnit
        : envFallback.defaultSizeUnit,
    timeoutMs:
      typeof payload.timeoutMs === "number" ? payload.timeoutMs : envFallback.timeoutMs,
  } satisfies YunExpressOmsConfig;
}

function normalizePage(value: number | undefined) {
  return Number.isInteger(value) && value && value > 0
    ? value
    : DEFAULT_SHIPMENT_COST_PAGE;
}

function normalizePageSize(value: number | undefined) {
  if (!Number.isInteger(value) || !value || value <= 0) {
    return DEFAULT_SHIPMENT_COST_PAGE_SIZE;
  }

  return Math.min(value, MAX_SHIPMENT_COST_PAGE_SIZE);
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseYunDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.includes("/") ? value.replace(/\//g, "-") : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
