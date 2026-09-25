import { OrderSourceChannel, ShipmentStatus } from "@prisma/client";
import { AppError } from "@/shared/errors";
import {
  DEFAULT_SHIPMENT_PAGE,
  DEFAULT_SHIPMENT_PAGE_SIZE,
  MAX_SHIPMENT_PAGE_SIZE,
  SHIPMENT_LIST_SORT_FIELDS,
  type CreateDraftShipmentInput,
  type ExecuteShipmentInput,
  type PreflightShipmentExecutionInput,
  type ShipOrderInput,
  type ShipOrderOptions,
  type ShipParcelOverride,
  type ShipOrdersBatchInput,
  type ShipmentListQuery,
  type ShipmentYunEnvironment,
  type SortOrder,
} from "./types";

export function validateCreateDraftShipmentInput(
  input: unknown,
): CreateDraftShipmentInput {
  if (typeof input !== "object" || input === null) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;
  const orderId = requiredString(body.orderId, "orderId");

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new AppError("VALIDATION_ERROR", "items is required.", 400);
  }

  const seenOrderItemIds = new Set<string>();
  const items = body.items.map((value) => {
    if (typeof value !== "object" || value === null) {
      throw new AppError("VALIDATION_ERROR", "shipment item must be an object.", 400);
    }

    const item = value as Record<string, unknown>;
    const orderItemId = requiredString(item.orderItemId, "orderItemId");

    if (seenOrderItemIds.has(orderItemId)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Duplicate orderItemId is not allowed.",
        400,
      );
    }
    seenOrderItemIds.add(orderItemId);

    if (!Number.isInteger(item.quantity) || Number(item.quantity) <= 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "quantity must be a positive integer.",
        400,
      );
    }

    return {
      orderItemId,
      quantity: Number(item.quantity),
    };
  });

  return {
    orderId,
    items,
  };
}

export function validateShipmentListQuery(
  searchParams: URLSearchParams,
): ShipmentListQuery {
  if (searchParams.has("tenantId")) {
    throw new AppError(
      "VALIDATION_ERROR",
      "tenantId query parameter is not supported for this endpoint.",
      400,
    );
  }

  return {
    page: parsePositiveInteger(
      searchParams.get("page"),
      DEFAULT_SHIPMENT_PAGE,
      "page",
    ),
    pageSize: parsePageSize(searchParams.get("pageSize")),
    status: parseShipmentStatus(searchParams.get("status")),
    sourceChannel: parseOrderSourceChannel(searchParams.get("sourceChannel")),
    orderId: optionalString(searchParams.get("orderId")),
    search: optionalString(searchParams.get("search")),
    sortBy: parseSortBy(searchParams.get("sortBy")),
    sortOrder: parseSortOrder(searchParams.get("sortOrder")),
  };
}

export function validateExecuteShipmentInput(input: unknown): ExecuteShipmentInput {
  if (typeof input !== "object" || input === null) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;

  return {
    carrierCode: requiredString(body.carrierCode, "carrierCode"),
    carrierAccountId:
      body.carrierAccountId === null
        ? null
        : optionalString(body.carrierAccountId),
    environment: parseYunEnvironment(body.environment),
  };
}

export function validateShipOrderInput(
  orderId: string,
  input: unknown,
): ShipOrderInput {
  if (typeof input !== "object" || input === null) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;

  return {
    orderId,
    environment: parseYunEnvironment(body.environment) ?? "test",
    options: parseShipOrderOptions(body.options),
  };
}

export function validateShipOrdersBatchInput(input: unknown): ShipOrdersBatchInput {
  if (typeof input !== "object" || input === null) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;
  const environment = parseYunEnvironment(body.environment) ?? "test";

  if (!Array.isArray(body.orderIds) || body.orderIds.length === 0) {
    throw new AppError("VALIDATION_ERROR", "orderIds is required.", 400);
  }

  if (body.orderIds.length > 10) {
    throw new AppError(
      "VALIDATION_ERROR",
      "YunExpress accepts at most 10 orders per batch.",
      400,
    );
  }

  const seen = new Set<string>();
  const orderIds = body.orderIds.map((value) => {
    const orderId = requiredString(value, "orderId");
    if (seen.has(orderId)) {
      throw new AppError("VALIDATION_ERROR", "Duplicate orderId is not allowed.", 400);
    }
    seen.add(orderId);
    return orderId;
  });
  const optionsByOrderId = parseBatchShipOrderOptions(
    body.optionsByOrderId,
    orderIds,
  );

  return {
    orderIds,
    environment,
    ...(optionsByOrderId ? { optionsByOrderId } : {}),
  };
}

export function validatePreflightShipmentExecutionInput(
  searchParams: URLSearchParams,
): PreflightShipmentExecutionInput {
  if (searchParams.has("tenantId")) {
    throw new AppError(
      "VALIDATION_ERROR",
      "tenantId query parameter is not supported for this endpoint.",
      400,
    );
  }

  return {
    carrierCode: optionalString(searchParams.get("carrierCode")) ?? "YUNEXPRESS_OMS",
    carrierAccountId: optionalString(searchParams.get("carrierAccountId")) ?? null,
  };
}

function requiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("VALIDATION_ERROR", `${fieldName} is required.`, 400);
  }

  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function parseShipOrderOptions(value: unknown): ShipOrderOptions | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("VALIDATION_ERROR", "options must be an object.", 400);
  }

  const body = value as Record<string, unknown>;
  const options: ShipOrderOptions = {
    shippingMethodCode: optionalString(body.shippingMethodCode),
    sourceCode: optionalString(body.sourceCode),
    receiverFirstName: optionalString(body.receiverFirstName),
    receiverLastName: optionalString(body.receiverLastName),
    receiverCompany: optionalString(body.receiverCompany),
    receiverCountryCode: optionalString(body.receiverCountryCode),
    receiverStreet: optionalString(body.receiverStreet),
    receiverCity: optionalString(body.receiverCity),
    receiverState: optionalString(body.receiverState),
    receiverZip: optionalString(body.receiverZip),
    receiverPhone: optionalString(body.receiverPhone),
    receiverEmail: optionalString(body.receiverEmail),
    weight: parseNonNegativeNumber(body.weight, "weight"),
    length: parseNonNegativeNumber(body.length, "length"),
    width: parseNonNegativeNumber(body.width, "width"),
    height: parseNonNegativeNumber(body.height, "height"),
    sizeUnits: optionalString(body.sizeUnits),
    packageCount: parsePositiveIntegerOption(body.packageCount, "packageCount"),
    applicationType: parseNonNegativeInteger(body.applicationType, "applicationType"),
    returnOption: parseNonNegativeInteger(body.returnOption, "returnOption"),
    tariffPrepay: parseNonNegativeInteger(body.tariffPrepay, "tariffPrepay"),
    insuranceOption: parseNonNegativeInteger(body.insuranceOption, "insuranceOption"),
    iossNumber: optionalString(body.iossNumber),
    parcels: parseShipParcelOverrides(body.parcels),
  };

  return Object.values(options).some((entry) => entry !== undefined)
    ? options
    : undefined;
}

function parseBatchShipOrderOptions(
  value: unknown,
  orderIds: string[],
): Record<string, ShipOrderOptions | undefined> | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "optionsByOrderId must be an object.",
      400,
    );
  }

  const allowedOrderIds = new Set(orderIds);
  const parsed: Record<string, ShipOrderOptions | undefined> = {};

  for (const [orderId, options] of Object.entries(value)) {
    if (!allowedOrderIds.has(orderId)) {
      continue;
    }

    parsed[orderId] = parseShipOrderOptions(options);
  }

  return Object.values(parsed).some(Boolean) ? parsed : undefined;
}

function parseShipParcelOverrides(value: unknown): ShipParcelOverride[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new AppError("VALIDATION_ERROR", "options.parcels must be an array.", 400);
  }

  if (value.length > 50) {
    throw new AppError(
      "VALIDATION_ERROR",
      "options.parcels must contain at most 50 items.",
      400,
    );
  }

  return value.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new AppError("VALIDATION_ERROR", "parcel override must be an object.", 400);
    }

    const parcel = entry as Record<string, unknown>;
    return {
      orderItemId: optionalString(parcel.orderItemId),
      sku: optionalString(parcel.sku),
      eName: optionalString(parcel.eName),
      cName: optionalString(parcel.cName),
      unitPrice: parseNonNegativeNumber(parcel.unitPrice, "unitPrice"),
      unitWeight: parseNonNegativeNumber(parcel.unitWeight, "unitWeight"),
      currencyCode: optionalString(parcel.currencyCode),
      invoicePart: optionalString(parcel.invoicePart),
      invoiceUsage: optionalString(parcel.invoiceUsage),
      remark: optionalString(parcel.remark),
    };
  });
}

function parseNonNegativeNumber(value: unknown, fieldName: string) {
  const numberValue = optionalNumber(value);
  if (numberValue === undefined) {
    return undefined;
  }

  if (numberValue < 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${fieldName} must be greater than or equal to 0.`,
      400,
    );
  }

  return numberValue;
}

function parsePositiveIntegerOption(value: unknown, fieldName: string) {
  const numberValue = optionalNumber(value);
  if (numberValue === undefined) {
    return undefined;
  }

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${fieldName} must be a positive integer.`,
      400,
    );
  }

  return numberValue;
}

function parseNonNegativeInteger(value: unknown, fieldName: string) {
  const numberValue = optionalNumber(value);
  if (numberValue === undefined) {
    return undefined;
  }

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${fieldName} must be a non-negative integer.`,
      400,
    );
  }

  return numberValue;
}

function parseYunEnvironment(value: unknown): ShipmentYunEnvironment | undefined {
  const environment = optionalString(value);
  if (!environment) {
    return undefined;
  }

  if (environment !== "test" && environment !== "live") {
    throw new AppError("VALIDATION_ERROR", "environment must be test or live.", 400);
  }

  return environment;
}

function parsePositiveInteger(
  value: string | null,
  defaultValue: number,
  fieldName: string,
) {
  if (value === null || value === "") {
    return defaultValue;
  }

  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${fieldName} must be a positive integer.`,
      400,
    );
  }

  return numberValue;
}

function parsePageSize(value: string | null) {
  const pageSize = parsePositiveInteger(
    value,
    DEFAULT_SHIPMENT_PAGE_SIZE,
    "pageSize",
  );

  if (pageSize > MAX_SHIPMENT_PAGE_SIZE) {
    throw new AppError(
      "VALIDATION_ERROR",
      `pageSize must be less than or equal to ${MAX_SHIPMENT_PAGE_SIZE}.`,
      400,
    );
  }

  return pageSize;
}

function parseShipmentStatus(value: string | null) {
  const status = optionalString(value);
  if (!status) {
    return undefined;
  }

  if (!Object.values(ShipmentStatus).includes(status as ShipmentStatus)) {
    throw new AppError("VALIDATION_ERROR", "status is invalid.", 400);
  }

  return status as ShipmentStatus;
}

function parseOrderSourceChannel(value: string | null) {
  const sourceChannel = optionalString(value);
  if (!sourceChannel) {
    return undefined;
  }

  if (!Object.values(OrderSourceChannel).includes(sourceChannel as OrderSourceChannel)) {
    throw new AppError("VALIDATION_ERROR", "sourceChannel is invalid.", 400);
  }

  return sourceChannel as OrderSourceChannel;
}

function parseSortBy(value: string | null) {
  const sortBy = optionalString(value) ?? "createdAt";
  if (!SHIPMENT_LIST_SORT_FIELDS.includes(sortBy as ShipmentListQuery["sortBy"])) {
    throw new AppError("VALIDATION_ERROR", "sortBy is invalid.", 400);
  }

  return sortBy as ShipmentListQuery["sortBy"];
}

function parseSortOrder(value: string | null): SortOrder {
  const sortOrder = optionalString(value) ?? "desc";
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new AppError("VALIDATION_ERROR", "sortOrder must be asc or desc.", 400);
  }

  return sortOrder;
}
