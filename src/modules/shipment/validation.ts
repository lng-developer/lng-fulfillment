import { ShipmentStatus } from "@prisma/client";
import { AppError } from "@/shared/errors";
import {
  DEFAULT_SHIPMENT_PAGE,
  DEFAULT_SHIPMENT_PAGE_SIZE,
  MAX_SHIPMENT_PAGE_SIZE,
  SHIPMENT_LIST_SORT_FIELDS,
  type CreateDraftShipmentInput,
  type ExecuteShipmentInput,
  type PreflightShipmentExecutionInput,
  type ShipmentListQuery,
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
