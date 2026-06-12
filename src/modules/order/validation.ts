import { OrderSourceChannel, OrderStatus, type Prisma } from "@prisma/client";
import { AppError } from "@/shared/errors";
import {
  DEFAULT_ORDER_PAGE,
  DEFAULT_ORDER_PAGE_SIZE,
  MAX_PORTAL_ORDER_BATCH_SIZE,
  MAX_ORDER_PAGE_SIZE,
  ORDER_LIST_SORT_FIELDS,
  type OrderListQuery,
  type PortalOrderInput,
  type PortalOrderItemInput,
  type PortalOrdersValidationResult,
  type PortalOrderValidationError,
  type SortOrder,
} from "./types";

export function validatePortalOrdersInput(
  input: unknown,
): PortalOrdersValidationResult {
  if (typeof input !== "object" || input === null) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;
  const rawOrders = Array.isArray(body.orders)
    ? body.orders
    : Array.isArray(body.data)
      ? body.data
      : undefined;

  if (!rawOrders) {
    throw new AppError(
      "VALIDATION_ERROR",
      "orders or data array is required.",
      400,
    );
  }

  if (rawOrders.length === 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      "orders or data array must not be empty.",
      400,
    );
  }

  if (rawOrders.length > MAX_PORTAL_ORDER_BATCH_SIZE) {
    throw new AppError(
      "VALIDATION_ERROR",
      `orders or data array must contain at most ${MAX_PORTAL_ORDER_BATCH_SIZE} orders.`,
      400,
    );
  }

  const orders: PortalOrderInput[] = [];
  const errors: PortalOrderValidationError[] = [];

  for (const value of rawOrders) {
    const result = validatePortalOrder(value);
    if ("error" in result) {
      errors.push(result.error);
    } else {
      orders.push(result.order);
    }
  }

  return {
    orders,
    errors,
    received: rawOrders.length,
  };
}

export function validateOrderListQuery(
  searchParams: URLSearchParams,
): OrderListQuery {
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
      DEFAULT_ORDER_PAGE,
      "page",
    ),
    pageSize: parsePageSize(searchParams.get("pageSize")),
    status: parseOrderStatus(searchParams.get("status")),
    sourceChannel: parseOrderSourceChannel(searchParams.get("sourceChannel")),
    search: optionalString(searchParams.get("search")),
    from: parseOptionalDate(searchParams.get("from"), "from"),
    to: parseOptionalDate(searchParams.get("to"), "to"),
    sortBy: parseSortBy(searchParams.get("sortBy")),
    sortOrder: parseSortOrder(searchParams.get("sortOrder")),
    includeExpanded: parseIncludeExpanded(searchParams.get("include")),
  };
}

function validatePortalOrder(
  value: unknown,
): { order: PortalOrderInput } | { error: PortalOrderValidationError } {
  if (typeof value !== "object" || value === null) {
    return validationError(undefined, "order must be an object");
  }

  const order = value as Record<string, unknown>;
  const externalOrderId = firstString(order.externalOrderId, order.orderId);
  if (!externalOrderId) {
    return validationError(undefined, "externalOrderId or orderId is required");
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    return validationError(externalOrderId, "items is required");
  }

  const items: PortalOrderItemInput[] = [];
  for (const item of order.items) {
    const result = validatePortalOrderItem(item);
    if ("error" in result) {
      return validationError(externalOrderId, result.error);
    }

    items.push(result.item);
  }

  const recipient = firstObject(order.recipient, order.customer_infor);
  const recipientAddressObject = firstOptionalObject(
    recipient.address,
    recipient.shippingAddress,
    recipient.Address,
  );
  const recipientAddress =
    recipientAddressObject ?? compactJsonObject({
      line1: firstString(
        recipient.line1,
        recipient.street,
        recipient.Street,
        recipient.address1,
        recipient.address,
      ),
      line2: firstString(
        recipient.line2,
        recipient.address2,
        recipient.address_2,
      ),
      city: firstString(recipient.city, recipient.City),
      state: firstString(recipient.state, recipient.State),
      postalCode: firstString(
        recipient.postalCode,
        recipient.zip,
        recipient.Zip,
        recipient.post_code,
        recipient.zip_code,
      ),
      country: firstString(
        recipient.country,
        recipient.countryCode,
        recipient.CountryCode,
      ),
    });
  const destinationCountry = firstString(
    recipient.country,
    recipient.countryCode,
    recipient.CountryCode,
    recipientAddress?.country,
    recipientAddress?.CountryCode,
  );
  const destinationState = firstString(
    recipient.state,
    recipient.State,
    recipientAddress?.state,
    recipientAddress?.State,
  );
  const destinationCity = firstString(
    recipient.city,
    recipient.City,
    recipientAddress?.city,
    recipientAddress?.City,
  );
  const destinationPostalCode = firstString(
    recipient.postalCode,
    recipient.zip,
    recipient.Zip,
    recipient.post_code,
    recipient.zip_code,
    recipientAddress?.postalCode,
    recipientAddress?.zip,
    recipientAddress?.Zip,
  );

  return {
    order: {
      externalOrderId,
      orderNumber: firstString(order.orderNumber, order.orderId),
      source: normalizePortalSource(order),
      sourceChannel: normalizePortalSourceChannel(order, externalOrderId),
      sourceAccount: firstString(order.sourceAccount, order.merchantId),
      shopName: optionalString(order.shopName),
      marketplace: firstString(order.marketplace, order.marketplaceId),
      externalStatus: firstString(order.externalStatus, order.status),
      purchaseAt: readOptionalDate(order.purchaseAt, order.purchase_date),
      paidAt: readOptionalDate(order.paidAt, order.payments_date),
      recipientName:
        firstString(recipient.name, recipient.fullName, recipient.customerName) ??
        joinName(recipient.firstName, recipient.lastName),
      recipientPhone: firstString(
        recipient.phone,
        recipient.Phone,
        recipient.phoneNumber,
        recipient.phone_number,
        recipient.tel,
      ),
      recipientEmail: firstString(recipient.email, recipient.Email),
      recipientAddress: recipientAddress as Prisma.InputJsonValue | undefined,
      destinationCountry,
      destinationState,
      destinationCity,
      destinationPostalCode,
      shippingService: optionalString(order.shippingService),
      shippingType: firstString(order.shippingType, order.shipping_type),
      currency: optionalString(order.currency),
      orderTotal: firstNumber(order.orderTotal, order.total, order.amount),
      metadata: buildOrderMetadata(order),
      rawPayload: value as Prisma.InputJsonValue,
      items,
    },
  };
}

function validatePortalOrderItem(
  value: unknown,
): { item: PortalOrderItemInput } | { error: string } {
  if (typeof value !== "object" || value === null) {
    return { error: "item must be an object" };
  }

  const item = value as Record<string, unknown>;
  const quantity = firstNumber(item.quantity, item.qty);
  if (!Number.isInteger(quantity) || Number(quantity) <= 0) {
    return { error: "item quantity must be a positive integer" };
  }

  const weight = optionalNumber(item.weight);
  const declaredValue = optionalNumber(item.declaredValue);
  const unitPrice = firstNumber(
    item.unitPrice,
    item.price,
    item.totalCustomizationPrice,
  );
  if (weight !== undefined && weight < 0) {
    return { error: "item weight must be greater than or equal to 0" };
  }

  if (declaredValue !== undefined && declaredValue < 0) {
    return { error: "item declaredValue must be greater than or equal to 0" };
  }

  if (unitPrice !== undefined && unitPrice < 0) {
    return { error: "item unitPrice must be greater than or equal to 0" };
  }

  return {
    item: {
      externalItemId: firstString(item.externalItemId, item.orderItemId),
      sku: optionalString(item.sku),
      name: firstString(item.name, item.title),
      title: firstString(item.title, item.name),
      quantity: Number(quantity),
      asin: optionalString(item.asin),
      listingId: optionalString(item.listingId),
      productType: optionalString(item.productType),
      variant: optionalString(item.variant),
      unitPrice,
      currency: optionalString(item.currency),
      weight,
      declaredValue,
      customizationUrl: firstString(item.customizationUrl, item.customized_url),
      customizationData: firstJson(item.customizationData, item.version3Data),
      snapshotImageUrl: firstString(item.snapshotImageUrl, item.snapshotImage),
      fulfillmentFile: firstJson(item.fulfillmentFile, item.fulfillment_file),
      listingSnapshot: firstJson(item.listingSnapshot, item.listing),
      costCenterSnapshot: firstJson(item.costCenterSnapshot, item.cost_center),
      productionStatus: firstString(
        item.productionStatus,
        firstObject(item.tracking_info).status,
      ),
      scaleStatus: firstString(item.scaleStatus, item.scale_status),
      qcNote: firstString(item.qcNote, item.qc_note),
      metadata: buildOrderItemMetadata(item),
      rawPayload: value as Prisma.InputJsonValue,
    },
  };
}

function validationError(
  externalOrderId: string | undefined,
  message: string,
): { error: PortalOrderValidationError } {
  return {
    error: {
      externalOrderId,
      code: "VALIDATION_ERROR",
      message,
    },
  };
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

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const stringValue = optionalString(value);
    if (stringValue) {
      return stringValue;
    }
  }

  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const numberValue = optionalNumber(value);
    if (numberValue !== undefined) {
      return numberValue;
    }
  }

  return undefined;
}

function firstObject(...values: unknown[]): Record<string, unknown> {
  return firstOptionalObject(...values) ?? {};
}

function firstOptionalObject(
  ...values: unknown[]
): Record<string, unknown> | undefined {
  for (const value of values) {
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      return value as Record<string, unknown>;
    }
  }

  return undefined;
}

function compactJsonObject(
  value: Record<string, unknown>,
): Prisma.InputJsonObject | undefined {
  const entries = Object.entries(value).filter(([, entryValue]) => {
    return entryValue !== undefined && entryValue !== null && entryValue !== "";
  });

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries) as Prisma.InputJsonObject;
}

function optionalJsonObject(value: unknown): Prisma.InputJsonValue | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function optionalJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function buildOrderMetadata(
  order: Record<string, unknown>,
): Prisma.InputJsonValue | undefined {
  return mergeJsonObjects(
    optionalJsonObject(order.metadata),
    compactJsonObject({
      merchantId: optionalString(order.merchantId),
      marketplaceId: optionalString(order.marketplaceId),
      portalCreatedAt: optionalString(order.createdAt),
      baseCost: optionalNumber(order.base_cost),
      cases: optionalJson(order.case),
      addressValidation:
        typeof order.address_validation === "boolean"
          ? order.address_validation
          : undefined,
      scaleOverallStatus: optionalString(order.scale_overall_status),
      scaledBy: optionalJsonObject(order.scaledBy),
      seller: optionalJsonObject(order.seller),
    }),
  );
}

function buildOrderItemMetadata(
  item: Record<string, unknown>,
): Prisma.InputJsonValue | undefined {
  return mergeJsonObjects(
    optionalJsonObject(item.metadata),
    compactJsonObject({
      baseImageUrl: optionalString(item.baseImageUrl),
      totalCustomizationPrice: optionalNumber(item.totalCustomizationPrice),
      trackingInfo: optionalJsonObject(item.tracking_info),
    }),
  );
}

function mergeJsonObjects(
  ...values: (Prisma.InputJsonValue | undefined)[]
): Prisma.InputJsonValue | undefined {
  const merged: Record<string, unknown> = {};

  for (const value of values) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      continue;
    }

    Object.assign(merged, value);
  }

  return Object.keys(merged).length
    ? (merged as Prisma.InputJsonObject)
    : undefined;
}

function firstJson(...values: unknown[]): Prisma.InputJsonValue | undefined {
  for (const value of values) {
    const jsonValue = optionalJson(value);
    if (jsonValue !== undefined) {
      return jsonValue;
    }
  }

  return undefined;
}

function readOptionalDate(...values: unknown[]): Date | undefined {
  for (const value of values) {
    const dateString = optionalString(value);
    if (!dateString) {
      continue;
    }

    const date = new Date(dateString);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return undefined;
}

function joinName(firstName: unknown, lastName: unknown): string | undefined {
  const parts = [optionalString(firstName), optionalString(lastName)].filter(
    Boolean,
  );
  return parts.length ? parts.join(" ") : undefined;
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
    DEFAULT_ORDER_PAGE_SIZE,
    "pageSize",
  );

  if (pageSize > MAX_ORDER_PAGE_SIZE) {
    throw new AppError(
      "VALIDATION_ERROR",
      `pageSize must be less than or equal to ${MAX_ORDER_PAGE_SIZE}.`,
      400,
    );
  }

  return pageSize;
}

function parseOrderStatus(value: string | null) {
  const status = optionalString(value);
  if (!status) {
    return undefined;
  }

  if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
    throw new AppError("VALIDATION_ERROR", "status is invalid.", 400);
  }

  return status as OrderStatus;
}

function parseOrderSourceChannel(value: string | null) {
  const sourceChannel = optionalString(value);
  if (!sourceChannel) {
    return undefined;
  }

  if (
    !Object.values(OrderSourceChannel).includes(
      sourceChannel as OrderSourceChannel,
    )
  ) {
    throw new AppError("VALIDATION_ERROR", "sourceChannel is invalid.", 400);
  }

  return sourceChannel as OrderSourceChannel;
}

function normalizePortalSource(order: Record<string, unknown>) {
  const source = firstString(order.source);
  if (!source || normalizeSourceChannelValue(source)) {
    return "portal";
  }

  return source;
}

function normalizePortalSourceChannel(
  order: Record<string, unknown>,
  externalOrderId: string,
): OrderSourceChannel {
  const explicit = firstString(
    order.sourceChannel,
    order.source_channel,
    order.salesChannel,
    order.sales_channel,
    order.source,
    order.channel,
    order.platform,
    order.marketplace,
    order.marketplaceId,
  );
  const inferred = normalizeSourceChannelValue(explicit);
  if (inferred) {
    return inferred;
  }

  return inferSourceChannelFromOrderId(externalOrderId);
}

function normalizeSourceChannelValue(
  value: string | undefined,
): OrderSourceChannel | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === "AMZ" || normalized.includes("AMAZON")) {
    return OrderSourceChannel.AMAZON;
  }

  if (normalized.includes("ETSY")) {
    return OrderSourceChannel.ETSY;
  }

  if (normalized.includes("MANUAL")) {
    return OrderSourceChannel.MANUAL;
  }

  if (normalized === OrderSourceChannel.UNKNOWN) {
    return OrderSourceChannel.UNKNOWN;
  }

  if (Object.values(OrderSourceChannel).includes(normalized as OrderSourceChannel)) {
    return normalized as OrderSourceChannel;
  }

  return undefined;
}

function inferSourceChannelFromOrderId(externalOrderId: string): OrderSourceChannel {
  if (/^\d{3}-\d{7}-\d{7}(?:-.+)?$/.test(externalOrderId)) {
    return OrderSourceChannel.AMAZON;
  }

  return OrderSourceChannel.UNKNOWN;
}

function parseOptionalDate(value: string | null, fieldName: string) {
  const dateString = optionalString(value);
  if (!dateString) {
    return undefined;
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${fieldName} must be a valid ISO date.`,
      400,
    );
  }

  return date;
}

function parseSortBy(value: string | null) {
  const sortBy = optionalString(value) ?? "receivedAt";
  if (!ORDER_LIST_SORT_FIELDS.includes(sortBy as OrderListQuery["sortBy"])) {
    throw new AppError("VALIDATION_ERROR", "sortBy is invalid.", 400);
  }

  return sortBy as OrderListQuery["sortBy"];
}

function parseSortOrder(value: string | null): SortOrder {
  const sortOrder = optionalString(value) ?? "desc";
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new AppError("VALIDATION_ERROR", "sortOrder must be asc or desc.", 400);
  }

  return sortOrder;
}

function parseIncludeExpanded(value: string | null) {
  const include = optionalString(value);
  if (!include) {
    return false;
  }

  if (include !== "expanded") {
    throw new AppError("VALIDATION_ERROR", "include is invalid.", 400);
  }

  return true;
}
