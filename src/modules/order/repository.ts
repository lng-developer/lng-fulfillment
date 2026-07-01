import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";
import {
  shipmentCostSelect,
  toShipmentCostSummary,
} from "@/modules/shipment-cost/repository";
import { buildShipmentFailureSummary } from "./shipment-failure";
import type {
  OrderDetail,
  OrderListItem,
  OrderListQuery,
  PortalOrderInput,
  OrderPortalMetadata,
  PortalCostCenterSummary,
  PortalCustomizationOption,
  PortalFileLinks,
  PortalItemTrackingInfo,
  PortalListingSummary,
  ReceivedOrderSummary,
  SafeJsonSummary,
} from "./types";

type TransactionClient = Prisma.TransactionClient;

const orderAutoShipmentJobSelect = {
  id: true,
  status: true,
  shippingMethodCode: true,
  skuCodes: true,
  missingSkuCodes: true,
  conflictingMethods: true,
  shipmentId: true,
  errorCode: true,
  errorMessage: true,
  attemptCount: true,
  lastAttemptAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AutoShipmentJobSelect;

export async function findOrderByExternalId(
  tenantId: string,
  externalOrderId: string,
) {
  return prisma.order.findUnique({
    where: {
      tenantId_externalOrderId: {
        tenantId,
        externalOrderId,
      },
    },
    select: {
      id: true,
      tenantId: true,
      externalOrderId: true,
      status: true,
      receivedAt: true,
    },
  });
}

export async function createPortalOrderWithItems(input: {
  tenantId: string;
  order: PortalOrderInput;
  status: OrderStatus;
  actorType: "API_KEY";
  actorId: string;
}): Promise<{ action: "inserted" | "skipped"; order: ReceivedOrderSummary }> {
  return prisma.$transaction(async (tx) => {
    const existing = await findOrderByExternalIdInTransaction(
      tx,
      input.tenantId,
      input.order.externalOrderId,
    );

    if (existing) {
      return {
        action: "skipped",
        order: existing,
      };
    }

    const order = await tx.order.create({
      data: {
        tenantId: input.tenantId,
        externalOrderId: input.order.externalOrderId,
        orderNumber: input.order.orderNumber,
        source: input.order.source,
        sourceChannel: input.order.sourceChannel,
        sourceAccount: input.order.sourceAccount,
        shopName: input.order.shopName,
        marketplace: input.order.marketplace,
        externalStatus: input.order.externalStatus,
        purchaseAt: input.order.purchaseAt,
        paidAt: input.order.paidAt,
        status: input.status,
        recipientName: input.order.recipientName,
        recipientPhone: input.order.recipientPhone,
        recipientEmail: input.order.recipientEmail,
        recipientAddress: input.order.recipientAddress,
        destinationCountry: input.order.destinationCountry,
        destinationState: input.order.destinationState,
        destinationCity: input.order.destinationCity,
        destinationPostalCode: input.order.destinationPostalCode,
        shippingService: input.order.shippingService,
        shippingType: input.order.shippingType,
        currency: input.order.currency,
        orderTotal: input.order.orderTotal,
        metadata: input.order.metadata,
        rawPayload: input.order.rawPayload,
        items: {
          create: input.order.items.map((item) => ({
            tenantId: input.tenantId,
            externalItemId: item.externalItemId,
            sku: item.sku,
            name: item.name,
            title: item.title,
            quantity: item.quantity,
            asin: item.asin,
            listingId: item.listingId,
            productType: item.productType,
            variant: item.variant,
            unitPrice: item.unitPrice,
            currency: item.currency,
            weight: item.weight,
            declaredValue: item.declaredValue,
            customizationUrl: item.customizationUrl,
            customizationData: item.customizationData,
            snapshotImageUrl: item.snapshotImageUrl,
            fulfillmentFile: item.fulfillmentFile,
            listingSnapshot: item.listingSnapshot,
            costCenterSnapshot: item.costCenterSnapshot,
            productionStatus: item.productionStatus,
            scaleStatus: item.scaleStatus,
            qcNote: item.qcNote,
            metadata: item.metadata,
            rawPayload: item.rawPayload,
          })),
        },
        statusHistory: {
          create: {
            tenantId: input.tenantId,
            status: input.status,
            note: "Portal order received.",
            actorType: input.actorType,
            actorId: input.actorId,
          },
        },
      },
      select: {
        id: true,
        tenantId: true,
        externalOrderId: true,
        status: true,
        receivedAt: true,
      },
    });

    return {
      action: "inserted",
      order,
    };
  });
}

export async function listOrders(
  tenantId: string,
  query: OrderListQuery,
): Promise<OrderListItem[]> {
  const rows = await prisma.order.findMany({
    where: buildOrderWhereInput(tenantId, query),
    orderBy: {
      [query.sortBy]: query.sortOrder,
    },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    select: {
      id: true,
      externalOrderId: true,
      orderNumber: true,
      source: true,
      sourceChannel: true,
      shopName: true,
      marketplace: true,
      status: true,
      recipientName: true,
      destinationCountry: true,
      destinationState: true,
      destinationCity: true,
      destinationPostalCode: true,
      shippingService: true,
      shippingType: true,
      purchaseAt: true,
      paidAt: true,
      receivedAt: true,
      createdAt: true,
      updatedAt: true,
      items: {
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
        select: {
          sku: true,
          name: true,
          title: true,
        },
      },
      shipments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          status: true,
          trackingNumber: true,
          labelUrl: true,
          cost: {
            select: shipmentCostSelect,
          },
        },
      },
      autoShipmentJob: {
        select: orderAutoShipmentJobSelect,
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });
  const quantityRows = rows.length
    ? await prisma.orderItem.groupBy({
        by: ["orderId"],
        where: {
          tenantId,
          orderId: {
            in: rows.map((row) => row.id),
          },
        },
        _sum: {
          quantity: true,
        },
      })
    : [];
  const quantityByOrderId = new Map(
    quantityRows.map((row) => [row.orderId, row._sum.quantity ?? 0]),
  );

  return rows.map((row) => ({
    id: row.id,
    externalOrderId: row.externalOrderId,
    orderNumber: row.orderNumber,
    source: row.source,
    sourceChannel: row.sourceChannel,
    shopName: row.shopName,
    marketplace: row.marketplace,
    status: row.status,
    recipientName: row.recipientName,
    destinationCountry: row.destinationCountry,
    destinationState: row.destinationState,
    destinationCity: row.destinationCity,
    destinationPostalCode: row.destinationPostalCode,
    shippingService: row.shippingService,
    shippingType: row.shippingType,
    purchaseAt: row.purchaseAt,
    paidAt: row.paidAt,
    receivedAt: row.receivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    itemCount: row._count.items,
    firstSku: row.items[0]?.sku ?? null,
    firstItemName: row.items[0]?.title ?? row.items[0]?.name ?? null,
    totalQuantity: quantityByOrderId.get(row.id) ?? 0,
    latestShipmentStatus: row.shipments[0]?.status ?? null,
    latestTrackingNumber: row.shipments[0]?.trackingNumber ?? null,
    latestLabelUrl: row.shipments[0]?.labelUrl ?? null,
    latestShipmentCost: row.shipments[0]?.cost
      ? toShipmentCostSummary(row.shipments[0].cost)
      : null,
    autoShipmentJob: row.autoShipmentJob
      ? toOrderAutoShipmentJobSummary(row.autoShipmentJob)
      : null,
  }));
}

export async function countOrders(
  tenantId: string,
  query: OrderListQuery,
): Promise<number> {
  return prisma.order.count({
    where: buildOrderWhereInput(tenantId, query),
  });
}

export async function getOrderDetail(
  tenantId: string,
  orderId: string,
): Promise<OrderDetail | null> {
  const row = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
    },
    select: orderDetailSelect,
  });

  if (!row) {
    return null;
  }

  return toOrderDetail(row);
}

export async function listOrderDetailsByIds(
  tenantId: string,
  orderIds: string[],
): Promise<OrderDetail[]> {
  if (!orderIds.length) {
    return [];
  }

  const rows = await prisma.order.findMany({
    where: {
      id: {
        in: orderIds,
      },
      tenantId,
    },
    select: orderDetailSelect,
  });
  const rowById = new Map(rows.map((row) => [row.id, row]));

  return orderIds
    .map((orderId) => rowById.get(orderId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map(toOrderDetail);
}

export async function listOrderDetailPage(
  tenantId: string,
  query: OrderListQuery,
): Promise<OrderDetail[]> {
  const rows = await prisma.order.findMany({
    where: buildOrderWhereInput(tenantId, query),
    orderBy: {
      [query.sortBy]: query.sortOrder,
    },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    select: orderDetailSelect,
  });

  return rows.map(toOrderDetail);
}

const orderDetailSelect = {
  id: true,
  externalOrderId: true,
  orderNumber: true,
  source: true,
  sourceChannel: true,
  sourceAccount: true,
  shopName: true,
  marketplace: true,
  externalStatus: true,
  purchaseAt: true,
  paidAt: true,
  status: true,
  recipientName: true,
  recipientPhone: true,
  recipientEmail: true,
  recipientAddress: true,
  destinationCountry: true,
  destinationState: true,
  destinationCity: true,
  destinationPostalCode: true,
  shippingService: true,
  shippingType: true,
  currency: true,
  orderTotal: true,
  metadata: true,
  receivedAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      externalItemId: true,
      sku: true,
      name: true,
      title: true,
      quantity: true,
      asin: true,
      listingId: true,
      productType: true,
      variant: true,
      unitPrice: true,
      currency: true,
      weight: true,
      declaredValue: true,
      customizationUrl: true,
      customizationData: true,
      snapshotImageUrl: true,
      metadata: true,
      fulfillmentFile: true,
      listingSnapshot: true,
      costCenterSnapshot: true,
      productionStatus: true,
      scaleStatus: true,
      qcNote: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  statusHistory: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      status: true,
      note: true,
      actorType: true,
      createdAt: true,
    },
  },
  shipments: {
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      carrierCode: true,
      carrierShipmentId: true,
      trackingNumber: true,
      labelUrl: true,
      metadata: true,
      cost: {
        select: shipmentCostSelect,
      },
      createdAt: true,
      updatedAt: true,
    },
  },
  autoShipmentJob: {
    select: orderAutoShipmentJobSelect,
  },
} satisfies Prisma.OrderSelect;

function toOrderDetail(row: Prisma.OrderGetPayload<{ select: typeof orderDetailSelect }>): OrderDetail {
  return {
    id: row.id,
    externalOrderId: row.externalOrderId,
    orderNumber: row.orderNumber,
    source: row.source,
    sourceChannel: row.sourceChannel,
    sourceAccount: row.sourceAccount,
    shopName: row.shopName,
    marketplace: row.marketplace,
    externalStatus: row.externalStatus,
    purchaseAt: row.purchaseAt,
    paidAt: row.paidAt,
    status: row.status,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    recipientEmail: row.recipientEmail,
    recipientAddress: row.recipientAddress,
    destinationCountry: row.destinationCountry,
    destinationState: row.destinationState,
    destinationCity: row.destinationCity,
    destinationPostalCode: row.destinationPostalCode,
    shippingService: row.shippingService,
    shippingType: row.shippingType,
    currency: row.currency,
    orderTotal: row.orderTotal?.toString() ?? null,
    portalMetadata: buildOrderPortalMetadata(row.metadata),
    receivedAt: row.receivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: row.items.map((item) => {
      const baseImageUrl = readOptionalString(item.metadata, "baseImageUrl");

      return {
        id: item.id,
        externalItemId: item.externalItemId,
        sku: item.sku,
        name: item.name,
        title: item.title,
        quantity: item.quantity,
        asin: item.asin,
        listingId: item.listingId,
        productType: item.productType,
        variant: item.variant,
        unitPrice: item.unitPrice?.toString() ?? null,
        currency: item.currency,
        weight: item.weight?.toString() ?? null,
        declaredValue: item.declaredValue?.toString() ?? null,
        customizationUrl: item.customizationUrl,
        snapshotImageUrl: item.snapshotImageUrl ?? baseImageUrl,
        baseImageUrl,
        totalCustomizationPrice: readOptionalNumberString(
          item.metadata,
          "totalCustomizationPrice",
        ),
        customizationOptions: buildCustomizationOptions(item.customizationData),
        trackingInfo: buildPortalItemTrackingInfo(item.metadata),
        fulfillmentFiles: buildPortalFileLinks(item.fulfillmentFile),
        costCenter: buildPortalCostCenter(item.costCenterSnapshot),
        listing: buildPortalListing(item.listingSnapshot),
        fulfillmentFileSummary: summarizeJson(item.fulfillmentFile),
        listingSnapshotSummary: summarizeJson(item.listingSnapshot),
        costCenterSnapshotSummary: summarizeJson(item.costCenterSnapshot),
        productionStatus: item.productionStatus,
        scaleStatus: item.scaleStatus,
        qcNote: item.qcNote,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    }),
    statusHistory: row.statusHistory,
    shipments: row.shipments.map((shipment) => ({
      id: shipment.id,
      status: shipment.status,
      carrierCode: shipment.carrierCode,
      carrierShipmentId: shipment.carrierShipmentId,
      trackingNumber: shipment.trackingNumber,
      labelUrl: shipment.labelUrl,
      failure:
        shipment.status === "FAILED_CREATE"
          ? buildShipmentFailureSummary(shipment.metadata)
          : null,
      cost: shipment.cost ? toShipmentCostSummary(shipment.cost) : null,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    })),
    autoShipmentJob: row.autoShipmentJob
      ? toOrderAutoShipmentJobSummary(row.autoShipmentJob)
      : null,
  };
}

function toOrderAutoShipmentJobSummary(
  job: Prisma.AutoShipmentJobGetPayload<{
    select: typeof orderAutoShipmentJobSelect;
  }>,
) {
  return {
    id: job.id,
    status: job.status,
    shippingMethodCode: job.shippingMethodCode,
    skuCodes: job.skuCodes,
    missingSkuCodes: job.missingSkuCodes,
    conflictingMethods: job.conflictingMethods,
    shipmentId: job.shipmentId,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    attemptCount: job.attemptCount,
    lastAttemptAt: job.lastAttemptAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function buildOrderPortalMetadata(
  value: Prisma.JsonValue | null,
): OrderPortalMetadata | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const metadata: OrderPortalMetadata = {
    merchantId: readOptionalString(record, "merchantId"),
    marketplaceId: readOptionalString(record, "marketplaceId"),
    portalCreatedAt: readOptionalString(record, "portalCreatedAt"),
    baseCost: readOptionalNumberString(record, "baseCost"),
    addressValidation: readOptionalBoolean(record, "addressValidation"),
    scaleOverallStatus: readOptionalString(record, "scaleOverallStatus"),
    scaledBy: buildPortalPersonSummary(record.scaledBy),
    seller: buildPortalPersonSummary(record.seller),
  };

  return hasAnyPortalMetadataValue(metadata) ? metadata : null;
}

function buildPortalPersonSummary(value: unknown) {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  return {
    id: readOptionalString(record, "_id") ?? readOptionalString(record, "id"),
    name:
      readOptionalString(record, "full_name") ??
      readOptionalString(record, "name"),
    email: readOptionalString(record, "email"),
  };
}

function hasAnyPortalMetadataValue(metadata: OrderPortalMetadata) {
  return Object.values(metadata).some((value) => {
    if (value === null) {
      return false;
    }

    if (typeof value !== "object") {
      return true;
    }

    return Object.values(value).some((nestedValue) => nestedValue !== null);
  });
}

function buildCustomizationOptions(
  value: Prisma.JsonValue | null,
): PortalCustomizationOption[] {
  if (value === null) {
    return [];
  }

  const options: PortalCustomizationOption[] = [];
  collectCustomizationOptions(value, options);
  return dedupeCustomizationOptions(options).slice(0, 50);
}

function collectCustomizationOptions(
  value: Prisma.JsonValue,
  options: PortalCustomizationOption[],
) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectCustomizationOptions(entry, options);
    }
    return;
  }

  const record = asRecord(value);
  if (!record) {
    return;
  }

  appendCustomizationOption(record, options);

  const customizationInfo = asRecord(record.customizationInfo);
  const surfaces = customizationInfo?.surfaces;
  if (Array.isArray(surfaces)) {
    for (const surface of surfaces) {
      const surfaceRecord = asRecord(surface);
      const areas = surfaceRecord?.areas;
      if (Array.isArray(areas)) {
        for (const area of areas) {
          collectCustomizationOptions(area, options);
        }
      }
    }
  }

  const children = record.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      collectCustomizationOptions(child, options);
    }
  }
}

function appendCustomizationOption(
  record: Record<string, Prisma.JsonValue>,
  options: PortalCustomizationOption[],
) {
  const label = readOptionalString(record, "label") ?? readOptionalString(record, "name");
  const optionSelection = asRecord(record.optionSelection);
  const optionValue =
    readOptionalString(record, "value") ??
    readOptionalString(record, "displayValue") ??
    readOptionalString(record, "inputValue") ??
    readOptionalString(record, "text") ??
    readOptionalString(record, "optionValue") ??
    readOptionalString(optionSelection, "label") ??
    readOptionalString(optionSelection, "name");

  if (!label || !optionValue) {
    return;
  }

  options.push({
    label,
    value: optionValue,
  });
}

function dedupeCustomizationOptions(
  options: PortalCustomizationOption[],
): PortalCustomizationOption[] {
  const seen = new Set<string>();
  const deduped: PortalCustomizationOption[] = [];

  for (const option of options) {
    const key = `${option.label}\u0000${option.value}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(option);
  }

  return deduped;
}

function buildPortalItemTrackingInfo(
  value: Prisma.JsonValue | null,
): PortalItemTrackingInfo | null {
  const metadata = asRecord(value);
  const record = asRecord(metadata?.trackingInfo);
  if (!record) {
    return null;
  }

  const trackingInfo = {
    fulfillment: readOptionalString(record, "fulfillment"),
    status: readOptionalString(record, "status"),
    tracking: readOptionalString(record, "tracking"),
    note: readOptionalString(record, "note"),
  };

  return Object.values(trackingInfo).some((entry) => entry !== null)
    ? trackingInfo
    : null;
}

function buildPortalFileLinks(value: Prisma.JsonValue | null): PortalFileLinks {
  const record = asRecord(value);
  if (!record) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[1].trim().length > 0,
    ),
  );
}

function buildPortalCostCenter(
  value: Prisma.JsonValue | null,
): PortalCostCenterSummary | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const costCenter = {
    vendorProductId: readOptionalString(record, "vendorProductId"),
    vendorProductDisplayName: readOptionalString(
      record,
      "vendorProductDisplayName",
    ),
    vendorProductSKU: readOptionalString(record, "vendorProductSKU"),
    sizeValue: readOptionalString(record, "sizeValue"),
    colorValue: readOptionalString(record, "colorValue"),
  };

  return Object.values(costCenter).some((entry) => entry !== null)
    ? costCenter
    : null;
}

function buildPortalListing(
  value: Prisma.JsonValue | null,
): PortalListingSummary | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const listing = {
    asinType: readOptionalString(record, "asin_type"),
    productImageUrl: readOptionalString(record, "product_image"),
    psd: buildPortalListingPsd(record.psd),
  };

  return listing.asinType || listing.productImageUrl || listing.psd
    ? listing
    : null;
}

function buildPortalListingPsd(value: unknown) {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const psd = {
    status: readOptionalString(record, "status"),
    fileExt: readOptionalString(record, "file_ext"),
    archive: readOptionalBoolean(record, "archive"),
    fileName: readOptionalString(record, "file_name"),
    mime: readOptionalString(record, "mime"),
    psdId: readOptionalString(record, "psd_id"),
    size: readOptionalNumberString(record, "size"),
    url: readOptionalString(record, "url"),
  };

  return Object.values(psd).some((entry) => entry !== null) ? psd : null;
}

function asRecord(value: unknown): Record<string, Prisma.JsonValue> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, Prisma.JsonValue>;
}

function readOptionalString(value: unknown, key: string): string | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const entry = record[key];
  if (typeof entry !== "string") {
    return null;
  }

  const trimmed = entry.trim();
  return trimmed || null;
}

function readOptionalNumberString(value: unknown, key: string): string | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const entry = record[key];
  if (typeof entry === "number" && Number.isFinite(entry)) {
    return String(entry);
  }

  if (typeof entry === "string" && entry.trim()) {
    return entry.trim();
  }

  return null;
}

function readOptionalBoolean(value: unknown, key: string): boolean | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  return typeof record[key] === "boolean" ? record[key] : null;
}

function summarizeJson(value: Prisma.JsonValue | null): SafeJsonSummary | null {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      itemCount: value.length,
    };
  }

  if (typeof value === "object") {
    return {
      type: "object",
      keys: Object.keys(value).slice(0, 10),
    };
  }

  if (typeof value === "string") {
    return {
      type: "string",
      valuePreview: truncateJsonScalar(value),
    };
  }

  if (typeof value === "number") {
    return {
      type: "number",
      valuePreview: String(value),
    };
  }

  return {
    type: "boolean",
    valuePreview: String(value),
  };
}

function truncateJsonScalar(value: string): string {
  return value.length <= 120 ? value : `${value.slice(0, 117)}...`;
}

async function findOrderByExternalIdInTransaction(
  tx: TransactionClient,
  tenantId: string,
  externalOrderId: string,
) {
  return tx.order.findUnique({
    where: {
      tenantId_externalOrderId: {
        tenantId,
        externalOrderId,
      },
    },
    select: {
      id: true,
      tenantId: true,
      externalOrderId: true,
      status: true,
      receivedAt: true,
    },
  });
}

function buildOrderWhereInput(
  tenantId: string,
  query: OrderListQuery,
): Prisma.OrderWhereInput {
  return {
    tenantId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.sourceChannel ? { sourceChannel: query.sourceChannel } : {}),
    ...(query.autoShipmentStatus
      ? {
          autoShipmentJob: {
            is: {
              status: query.autoShipmentStatus,
            },
          },
        }
      : {}),
    ...(query.from || query.to
      ? {
          receivedAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            {
              externalOrderId: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              orderNumber: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              recipientName: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
}
