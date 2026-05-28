import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";
import type {
  OrderDetail,
  OrderListItem,
  OrderListQuery,
  PortalOrderInput,
  ReceivedOrderSummary,
  SafeJsonSummary,
} from "./types";

type TransactionClient = Prisma.TransactionClient;

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

const orderDetailSelect = {
  id: true,
  externalOrderId: true,
  orderNumber: true,
  source: true,
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
      snapshotImageUrl: true,
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
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.OrderSelect;

function toOrderDetail(row: Prisma.OrderGetPayload<{ select: typeof orderDetailSelect }>): OrderDetail {
  return {
    id: row.id,
    externalOrderId: row.externalOrderId,
    orderNumber: row.orderNumber,
    source: row.source,
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
    receivedAt: row.receivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: row.items.map((item) => ({
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
      snapshotImageUrl: item.snapshotImageUrl,
      fulfillmentFileSummary: summarizeJson(item.fulfillmentFile),
      listingSnapshotSummary: summarizeJson(item.listingSnapshot),
      costCenterSnapshotSummary: summarizeJson(item.costCenterSnapshot),
      productionStatus: item.productionStatus,
      scaleStatus: item.scaleStatus,
      qcNote: item.qcNote,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    statusHistory: row.statusHistory,
    shipments: row.shipments,
  };
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
