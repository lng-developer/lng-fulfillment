import type {
  AuditActorType,
  OrderSourceChannel,
  OrderStatus,
  Prisma,
  ShipmentStatus,
} from "@prisma/client";
import { prisma } from "@/shared/db";
import {
  amazonTrackingSyncOrderFilter,
  getTrackingSyncPurchaseAfter,
} from "./tracking-sync-batch";
import {
  getPortalTrackingSyncState,
  withPortalTrackingSyncState,
} from "./portal-tracking-sync-state";
import { getFinalMileCarrier, withFinalMileCarrier } from "./carrier-display";
import type {
  CreateDraftShipmentInput,
  ShipmentDetail,
  ShipmentListItem,
  ShipmentListQuery,
  ShipmentMutationSummary,
} from "./types";

export async function findOrderForDraftShipment(
  tenantId: string,
  orderId: string,
  orderItemIds: string[],
) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
    },
    select: {
      id: true,
      items: {
        where: {
          tenantId,
          id: {
            in: orderItemIds,
          },
        },
        select: {
          id: true,
          quantity: true,
        },
      },
    },
  });
}

export async function createDraftShipmentRecord(input: {
  tenantId: string;
  shipment: CreateDraftShipmentInput;
  actorType: AuditActorType;
  actorId?: string;
}): Promise<ShipmentDetail> {
  const row = await prisma.shipment.create({
    data: {
      tenantId: input.tenantId,
      orderId: input.shipment.orderId,
      status: "DRAFT",
      items: {
        create: input.shipment.items.map((item) => ({
          tenantId: input.tenantId,
          orderItemId: item.orderItemId,
          quantity: item.quantity,
        })),
      },
      statusHistory: {
        create: {
          tenantId: input.tenantId,
          status: "DRAFT",
          note: "Draft shipment created.",
          actorType: input.actorType,
          actorId: input.actorId,
        },
      },
    },
    select: shipmentDetailSelect,
  });

  return toShipmentDetail(row);
}

export async function findYunWebhookShipment(input: {
  waybillNumber?: string | null;
  trackingNumber?: string | null;
  customerOrderNumber?: string | null;
}): Promise<ShipmentDetail | null> {
  const waybillNumber = input.waybillNumber?.trim();
  const trackingNumber = input.trackingNumber?.trim();
  const customerOrderNumber = input.customerOrderNumber?.trim();

  const where: Prisma.ShipmentWhereInput[] = [];
  if (waybillNumber) {
    where.push({ carrierShipmentId: waybillNumber });
  }
  if (trackingNumber) {
    where.push({ trackingNumber });
  }
  if (customerOrderNumber) {
    where.push({
      order: {
        OR: [
          { externalOrderId: customerOrderNumber },
          { orderNumber: customerOrderNumber },
        ],
      },
    });
  }

  if (!where.length) {
    return null;
  }

  const row = await prisma.shipment.findFirst({
    where: {
      carrierCode: "YUNEXPRESS_OMS",
      OR: where,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: shipmentDetailSelect,
  });

  return row ? toShipmentDetail(row) : null;
}

export async function getOrderShipmentPreparation(
  tenantId: string,
  orderId: string,
) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      externalOrderId: true,
      orderNumber: true,
      sourceChannel: true,
      status: true,
      recipientName: true,
      recipientPhone: true,
      recipientEmail: true,
      recipientAddress: true,
      destinationCountry: true,
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
          weight: true,
          declaredValue: true,
        },
      },
    },
  });
}

export async function getDirectShipOrderPreparation(
  tenantId: string,
  orderId: string,
) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      externalOrderId: true,
      orderNumber: true,
      sourceChannel: true,
      status: true,
      recipientName: true,
      recipientPhone: true,
      recipientEmail: true,
      recipientAddress: true,
      destinationCountry: true,
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
          weight: true,
          declaredValue: true,
        },
      },
    },
  });
}

export async function createDirectShipmentSuccessRecords(input: {
  tenantId: string;
  orderId: string;
  items: Array<{ orderItemId: string; quantity: number }>;
  status: Extract<ShipmentStatus, "CREATED" | "LABEL_READY" | "TRACKING_PENDING">;
  carrierCode: string;
  carrierAccountId: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  metadata?: Prisma.InputJsonValue;
  actorType: AuditActorType;
  actorId?: string;
}): Promise<ShipmentMutationSummary> {
  const row = await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
      data: {
        tenantId: input.tenantId,
        orderId: input.orderId,
        status: input.status,
        carrierCode: input.carrierCode,
        carrierAccountId: input.carrierAccountId,
        carrierShipmentId: input.carrierShipmentId,
        trackingNumber: input.trackingNumber,
        labelUrl: input.labelUrl,
        ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
        items: {
          create: input.items.map((item) => ({
            tenantId: input.tenantId,
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        },
        statusHistory: {
          create: {
            tenantId: input.tenantId,
            status: input.status,
            note: "YunExpress shipment created.",
            actorType: input.actorType,
            actorId: input.actorId,
          },
        },
      },
      select: shipmentMutationSummarySelect,
    });

    await tx.order.update({
      where: {
        id: input.orderId,
        tenantId: input.tenantId,
      },
      data: {
        status: "IN_PROCESSING",
        statusHistory: {
          create: {
            tenantId: input.tenantId,
            status: "IN_PROCESSING",
            note: "YunExpress shipment created. Waiting for ship confirmation.",
            actorType: input.actorType,
            actorId: input.actorId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return shipment;
  });

  return toShipmentMutationSummary(row);
}

export async function createDirectShipmentFailureRecord(input: {
  tenantId: string;
  orderId: string;
  items: Array<{ orderItemId: string; quantity: number }>;
  carrierCode: string;
  carrierAccountId: string | null;
  metadata?: Prisma.InputJsonValue;
  actorType: AuditActorType;
  actorId?: string;
}): Promise<ShipmentMutationSummary> {
  const row = await prisma.shipment.create({
    data: {
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: "FAILED_CREATE",
      carrierCode: input.carrierCode,
      carrierAccountId: input.carrierAccountId,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
      items: {
        create: input.items.map((item) => ({
          tenantId: input.tenantId,
          orderItemId: item.orderItemId,
          quantity: item.quantity,
        })),
      },
      statusHistory: {
        create: {
          tenantId: input.tenantId,
          status: "FAILED_CREATE",
          note: "YunExpress shipment creation failed.",
          actorType: input.actorType,
          actorId: input.actorId,
        },
      },
    },
    select: shipmentMutationSummarySelect,
  });

  return toShipmentMutationSummary(row);
}

export async function getOrderWorkflowState(
  tenantId: string,
  orderId: string,
) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
    },
    select: {
      id: true,
      status: true,
      statusHistory: {
        where: {
          status: "SHIPPED",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          createdAt: true,
        },
      },
    },
  });
}

export async function getOrderCostContext(tenantId: string, orderId: string) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
    },
    select: {
      destinationCountry: true,
      shippingService: true,
      shippingType: true,
    },
  });
}

export async function getDirectCancelYunPreparation(
  tenantId: string,
  orderId: string,
) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
    },
    select: {
      id: true,
      status: true,
      statusHistory: {
        where: {
          status: "SHIPPED",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          createdAt: true,
        },
      },
      shipments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          ...shipmentDetailSelect,
          metadata: true,
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  const shipment = order.shipments[0] ?? null;

  return {
    id: order.id,
    status: order.status,
    statusHistory: order.statusHistory,
    shipment: shipment
      ? { ...toShipmentDetail(shipment), metadata: shipment.metadata }
      : null,
  };
}

export async function cancelDirectYunShipmentRecords(input: {
  tenantId: string;
  orderId: string;
  shipmentId: string;
  metadata?: Prisma.InputJsonValue;
  actorType: AuditActorType;
  actorId?: string;
}): Promise<ShipmentMutationSummary> {
  const row = await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.update({
      where: {
        id: input.shipmentId,
        tenantId: input.tenantId,
      },
      data: {
        status: "CANCELLED",
        ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
        statusHistory: {
          create: {
            tenantId: input.tenantId,
            status: "CANCELLED",
            note: "Shipment cancelled in YunExpress.",
            actorType: input.actorType,
            actorId: input.actorId,
          },
        },
      },
      select: shipmentMutationSummarySelect,
    });

    await tx.order.update({
      where: {
        id: input.orderId,
        tenantId: input.tenantId,
      },
      data: {
        status: "CANCELLED",
        statusHistory: {
          create: {
            tenantId: input.tenantId,
            status: "CANCELLED",
            note: "YunExpress shipment cancelled.",
            actorType: input.actorType,
            actorId: input.actorId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return shipment;
  });

  return toShipmentMutationSummary(row);
}

export async function createInternalShipmentForOrder(input: {
  tenantId: string;
  orderId: string;
  items: Array<{ orderItemId: string; quantity: number }>;
  actorType: AuditActorType;
  actorId?: string;
}): Promise<ShipmentDetail> {
  const row = await prisma.shipment.create({
    data: {
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: "DRAFT",
      items: {
        create: input.items.map((item) => ({
          tenantId: input.tenantId,
          orderItemId: item.orderItemId,
          quantity: item.quantity,
        })),
      },
      statusHistory: {
        create: {
          tenantId: input.tenantId,
          status: "DRAFT",
          note: "Shipment prepared for YunExpress creation.",
          actorType: input.actorType,
          actorId: input.actorId,
        },
      },
    },
    select: shipmentDetailSelect,
  });

  return toShipmentDetail(row);
}

export async function updateOrderWorkflowStatus(input: {
  tenantId: string;
  orderId: string;
  status: Extract<
    OrderStatus,
    "FULFILLED" | "IN_PROCESSING" | "SHIPPED" | "CANCELLED"
  >;
  note: string;
  actorType: AuditActorType;
  actorId?: string;
}) {
  return prisma.order.update({
    where: {
      id: input.orderId,
      tenantId: input.tenantId,
    },
    data: {
      status: input.status,
      statusHistory: {
        create: {
          tenantId: input.tenantId,
          status: input.status,
          note: input.note,
          actorType: input.actorType,
          actorId: input.actorId,
        },
      },
    },
    select: {
      id: true,
      status: true,
    },
  });
}

export async function getLatestShipmentForOrder(
  tenantId: string,
  orderId: string,
) {
  const row = await prisma.shipment.findFirst({
    where: {
      tenantId,
      orderId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      ...shipmentDetailSelect,
      metadata: true,
    },
  });

  return row ? { ...toShipmentDetail(row), metadata: row.metadata } : null;
}

export async function updateShipmentCancelled(input: {
  tenantId: string;
  shipmentId: string;
  metadata?: Prisma.InputJsonValue;
  actorType: AuditActorType;
  actorId?: string;
}): Promise<ShipmentDetail> {
  const row = await prisma.shipment.update({
    where: {
      id: input.shipmentId,
      tenantId: input.tenantId,
    },
    data: {
      status: "CANCELLED",
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
      statusHistory: {
        create: {
          tenantId: input.tenantId,
          status: "CANCELLED",
          note: "Shipment cancelled in YunExpress.",
          actorType: input.actorType,
          actorId: input.actorId,
        },
      },
    },
    select: shipmentDetailSelect,
  });

  return toShipmentDetail(row);
}

export async function clearLatestShipmentCarrierArtifacts(input: {
  tenantId: string;
  orderId: string;
}): Promise<ShipmentDetail | null> {
  const latestShipment = await prisma.shipment.findFirst({
    where: {
      tenantId: input.tenantId,
      orderId: input.orderId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
    },
  });

  if (!latestShipment) {
    return null;
  }

  const row = await prisma.shipment.update({
    where: {
      id: latestShipment.id,
      tenantId: input.tenantId,
    },
    data: {
      carrierShipmentId: null,
      trackingNumber: null,
      labelUrl: null,
    },
    select: shipmentDetailSelect,
  });

  return toShipmentDetail(row);
}

export async function resetCancelledOrderRecords(input: {
  tenantId: string;
  orderId: string;
  actorType: AuditActorType;
  actorId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const orderUpdate = await tx.order.updateMany({
      where: {
        id: input.orderId,
        tenantId: input.tenantId,
        status: "CANCELLED",
      },
      data: {
        status: "FULFILLED",
      },
    });

    if (orderUpdate.count === 0) {
      return null;
    }

    await tx.orderStatusHistory.create({
      data: {
        tenantId: input.tenantId,
        orderId: input.orderId,
        status: "FULFILLED",
        note: "Cancelled order reset for shipment recreation.",
        actorType: input.actorType,
        actorId: input.actorId,
      },
    });

    const latestShipment = await tx.shipment.findFirst({
      where: {
        tenantId: input.tenantId,
        orderId: input.orderId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    });

    const shipment = latestShipment
      ? await tx.shipment.update({
          where: {
            id: latestShipment.id,
            tenantId: input.tenantId,
          },
          data: {
            carrierShipmentId: null,
            trackingNumber: null,
            labelUrl: null,
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
        })
      : null;

    return {
      order: {
        id: input.orderId,
        status: "FULFILLED" as const,
      },
      shipment,
    };
  });
}

export async function listShipments(
  tenantId: string,
  query: ShipmentListQuery,
): Promise<ShipmentListItem[]> {
  const rows = await prisma.shipment.findMany({
    where: buildShipmentWhereInput(tenantId, query),
    orderBy: {
      [query.sortBy]: query.sortOrder,
    },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    select: {
      id: true,
      orderId: true,
      status: true,
      carrierCode: true,
      carrierShipmentId: true,
      trackingNumber: true,
      actualShipAt: true,
      metadata: true,
      labelUrl: true,
      createdAt: true,
      updatedAt: true,
      order: {
        select: {
          orderNumber: true,
          externalOrderId: true,
          sourceChannel: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.order.orderNumber,
    externalOrderId: row.order.externalOrderId,
    sourceChannel: row.order.sourceChannel,
    status: row.status,
    carrierCode: row.carrierCode,
    carrierName: getFinalMileCarrier(row.metadata),
    carrierShipmentId: row.carrierShipmentId,
    trackingNumber: row.trackingNumber,
    actualShipAt: row.actualShipAt,
    portalTrackingSyncState: getPortalTrackingSyncState(row.metadata),
    labelUrl: row.labelUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    itemCount: row._count.items,
  }));
}

export async function savePortalTrackingSyncState(input: {
  tenantId: string;
  shipmentId: string;
  result: { attempted: true; delivered: boolean; status?: number };
}) {
  const shipment = await prisma.shipment.findFirst({
    where: { id: input.shipmentId, tenantId: input.tenantId },
    select: { metadata: true },
  });

  if (!shipment) {
    return;
  }

  await prisma.shipment.update({
    where: { id: input.shipmentId },
    data: {
      metadata: withPortalTrackingSyncState(shipment.metadata, input.result),
    },
  });
}

export async function countShipments(
  tenantId: string,
  query: ShipmentListQuery,
): Promise<number> {
  return prisma.shipment.count({
    where: buildShipmentWhereInput(tenantId, query),
  });
}

export async function listTrackingSyncCandidates(
  tenantId: string,
  limit: number,
) {
  return prisma.shipment.findMany({
    where: {
      tenantId,
      actualShipAt: null,
      carrierCode: { not: null },
      status: { not: "CANCELLED" },
      order: {
        ...amazonTrackingSyncOrderFilter(),
        purchaseAt: { gte: getTrackingSyncPurchaseAfter() },
      },
      OR: [
        { carrierShipmentId: { not: null } },
        { trackingNumber: { not: null } },
      ],
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true },
  });
}

export async function getShipmentDetail(
  tenantId: string,
  shipmentId: string,
): Promise<ShipmentDetail | null> {
  const row = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      tenantId,
    },
    select: shipmentDetailSelect,
  });

  return row ? toShipmentDetail(row) : null;
}

export async function getShipmentCarrierPreparation(
  tenantId: string,
  shipmentId: string,
) {
  return prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      orderId: true,
      status: true,
      carrierCode: true,
      carrierAccountId: true,
      order: {
        select: {
          externalOrderId: true,
          orderNumber: true,
          sourceChannel: true,
          recipientName: true,
          recipientPhone: true,
          recipientEmail: true,
          recipientAddress: true,
          destinationCountry: true,
        },
      },
      items: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          orderItemId: true,
          quantity: true,
          orderItem: {
            select: {
              externalItemId: true,
              sku: true,
              name: true,
              title: true,
              weight: true,
              declaredValue: true,
            },
          },
        },
      },
    },
  });
}

export async function updateShipmentExecutionStarted(input: {
  tenantId: string;
  shipmentId: string;
  carrierCode: string;
  carrierAccountId: string | null;
  actorType: AuditActorType;
  actorId?: string;
}): Promise<ShipmentDetail> {
  const row = await prisma.shipment.update({
    where: {
      id: input.shipmentId,
      tenantId: input.tenantId,
    },
    data: {
      carrierCode: input.carrierCode,
      carrierAccountId: input.carrierAccountId,
      status: "CREATING",
      statusHistory: {
        create: {
          tenantId: input.tenantId,
          status: "CREATING",
          note: "Shipment execution started.",
          actorType: input.actorType,
          actorId: input.actorId,
        },
      },
    },
    select: shipmentDetailSelect,
  });

  return toShipmentDetail(row);
}

export async function updateShipmentExecutionSucceeded(input: {
  tenantId: string;
  shipmentId: string;
  status: Extract<ShipmentStatus, "CREATED" | "LABEL_READY" | "TRACKING_PENDING">;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  metadata?: Prisma.InputJsonValue;
  actorType: AuditActorType;
  actorId?: string;
}): Promise<ShipmentDetail> {
  const row = await prisma.shipment.update({
    where: {
      id: input.shipmentId,
      tenantId: input.tenantId,
    },
    data: {
      status: input.status,
      carrierShipmentId: input.carrierShipmentId,
      trackingNumber: input.trackingNumber,
      labelUrl: input.labelUrl,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
      statusHistory: {
        create: {
          tenantId: input.tenantId,
          status: input.status,
          note: "Shipment execution completed.",
          actorType: input.actorType,
          actorId: input.actorId,
        },
      },
    },
    select: shipmentDetailSelect,
  });

  return toShipmentDetail(row);
}

export async function updateShipmentExecutionFailed(input: {
  tenantId: string;
  shipmentId: string;
  metadata?: Prisma.InputJsonValue;
  actorType: AuditActorType;
  actorId?: string;
}): Promise<ShipmentDetail> {
  const row = await prisma.shipment.update({
    where: {
      id: input.shipmentId,
      tenantId: input.tenantId,
    },
    data: {
      status: "FAILED_CREATE",
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
      statusHistory: {
        create: {
          tenantId: input.tenantId,
          status: "FAILED_CREATE",
          note: "Shipment execution failed.",
          actorType: input.actorType,
          actorId: input.actorId,
        },
      },
    },
    select: shipmentDetailSelect,
  });

  return toShipmentDetail(row);
}

export async function updateShipmentTrackingSyncResult(input: {
  tenantId: string;
  shipmentId: string;
  status: ShipmentStatus;
  trackingNumber?: string | null;
  carrierShipmentId?: string | null;
  carrierName?: string | null;
  actualShipAt?: Date;
  actualShipEvidence?: Prisma.InputJsonValue;
  statusChanged: boolean;
  statusNote?: string;
  actorType: AuditActorType;
  actorId?: string;
}): Promise<ShipmentDetail> {
  const shipmentMetadata = input.carrierName
    ? await prisma.shipment.findFirst({
        where: { id: input.shipmentId, tenantId: input.tenantId },
        select: { metadata: true },
      })
    : null;

  const row = await prisma.shipment.update({
    where: {
      id: input.shipmentId,
      tenantId: input.tenantId,
    },
    data: {
      status: input.status,
      updatedAt: new Date(),
      ...(input.trackingNumber === undefined
        ? {}
        : { trackingNumber: input.trackingNumber }),
      ...(input.carrierShipmentId === undefined
        ? {}
        : { carrierShipmentId: input.carrierShipmentId }),
      ...(input.carrierName && shipmentMetadata
        ? { metadata: withFinalMileCarrier(shipmentMetadata.metadata, input.carrierName) }
        : {}),
      ...(input.actualShipAt === undefined
        ? {}
        : {
            actualShipAt: input.actualShipAt,
            actualShipEvidence: input.actualShipEvidence,
          }),
      ...(input.statusChanged
        ? {
            statusHistory: {
              create: {
                tenantId: input.tenantId,
                status: input.status,
                note: input.statusNote ?? "Shipment tracking synced.",
                actorType: input.actorType,
                actorId: input.actorId,
              },
            },
          }
        : {}),
    },
    select: shipmentDetailSelect,
  });

  return toShipmentDetail(row);
}

const shipmentDetailSelect = {
  id: true,
  tenantId: true,
  orderId: true,
  status: true,
  carrierCode: true,
  carrierAccountId: true,
  carrierShipmentId: true,
  trackingNumber: true,
  actualShipAt: true,
  actualShipEvidence: true,
  labelUrl: true,
  createdAt: true,
  updatedAt: true,
  order: {
    select: {
      orderNumber: true,
      externalOrderId: true,
      sourceChannel: true,
    },
  },
  items: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      orderItemId: true,
      quantity: true,
      createdAt: true,
      updatedAt: true,
      orderItem: {
        select: {
          externalItemId: true,
          sku: true,
          name: true,
          quantity: true,
        },
      },
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
      actorId: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ShipmentSelect;

const shipmentMutationSummarySelect = {
  id: true,
  orderId: true,
  status: true,
  carrierCode: true,
  carrierAccountId: true,
  carrierShipmentId: true,
  trackingNumber: true,
  labelUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ShipmentSelect;

function toShipmentDetail(row: {
  id: string;
  tenantId: string;
  orderId: string;
  status: ShipmentStatus;
  carrierCode: string | null;
  carrierAccountId: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
  actualShipAt: Date | null;
  actualShipEvidence: Prisma.JsonValue | null;
  labelUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  order: {
    orderNumber: string | null;
    externalOrderId: string;
    sourceChannel: OrderSourceChannel | null;
  };
  items: Array<{
    id: string;
    orderItemId: string;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    orderItem: {
      externalItemId: string | null;
      sku: string | null;
      name: string | null;
      title?: string | null;
      quantity: number;
    };
  }>;
  statusHistory: Array<{
    id: string;
    status: ShipmentStatus;
    note: string | null;
    actorType: AuditActorType;
    actorId: string | null;
    createdAt: Date;
  }>;
}): ShipmentDetail {
  return {
    id: row.id,
    tenantId: row.tenantId,
    orderId: row.orderId,
    orderNumber: row.order.orderNumber,
    externalOrderId: row.order.externalOrderId,
    sourceChannel: row.order.sourceChannel,
    status: row.status,
    carrierCode: row.carrierCode,
    carrierAccountId: row.carrierAccountId,
    carrierShipmentId: row.carrierShipmentId,
    trackingNumber: row.trackingNumber,
    actualShipAt: row.actualShipAt,
    actualShipEvidence: row.actualShipEvidence,
    labelUrl: row.labelUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: row.items.map((item) => ({
      id: item.id,
      orderItemId: item.orderItemId,
      externalItemId: item.orderItem.externalItemId,
      sku: item.orderItem.sku,
      name: item.orderItem.name,
      quantity: item.quantity,
      orderItemQuantity: item.orderItem.quantity,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    statusHistory: row.statusHistory,
  };
}

function toShipmentMutationSummary(row: {
  id: string;
  orderId: string;
  status: ShipmentStatus;
  carrierCode: string | null;
  carrierAccountId: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ShipmentMutationSummary {
  return {
    id: row.id,
    orderId: row.orderId,
    status: row.status,
    carrierCode: row.carrierCode,
    carrierAccountId: row.carrierAccountId,
    carrierShipmentId: row.carrierShipmentId,
    trackingNumber: row.trackingNumber,
    labelUrl: row.labelUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function buildShipmentWhereInput(
  tenantId: string,
  query: ShipmentListQuery,
): Prisma.ShipmentWhereInput {
  return {
    tenantId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.sourceChannel ? { order: { sourceChannel: query.sourceChannel } } : {}),
    ...(query.orderId ? { orderId: query.orderId } : {}),
    ...(query.search
      ? {
          OR: [
            {
              trackingNumber: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              carrierShipmentId: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
}
