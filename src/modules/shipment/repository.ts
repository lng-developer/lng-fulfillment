import {
  normalizeFulfillmentSearch,
  orderSearchClauses,
  shipmentSearchClauses,
} from "@/shared/fulfillment-search";
import type {
  AuditActorType,
  OrderSourceChannel,
  OrderStatus,
  Prisma,
  ShipmentStatus,
} from "@prisma/client";
import { prisma } from "@/shared/db";
import { AppError } from "@/shared/errors";
import { stopAutoShipmentForReset } from "@/modules/auto-shipment/reset";
import type { ResetVerification } from "./reset-policy";
import { createLifecycleOutboxInTransaction } from "@/modules/callback/repository";
import {
  etsyTrackingSyncOrderFilter,
  getEtsyTrackingSyncCreatedAfter,
  getEtsyTrackingSyncStep,
  getPendingTrackingSyncStep,
  trackingSyncOrderFilter,
  getTrackingSyncPurchaseAfter,
  VIETTEL_POST_ACTIVE_TRACKING_STATUSES,
} from "./tracking-sync-batch";
import {
  getPortalTrackingSyncState,
  withPortalTrackingSyncState,
} from "./portal-tracking-sync-state";
import {
  getFinalMileCarrier,
  getShippingMethod,
  withCarrierSafeMetadata,
  withFinalMileCarrier,
} from "./carrier-display";
import { normalizeViettelPostTrackingNumber } from "@/integrations/viettel-post/adapter";
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
  actualShipAt?: Date | null;
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
        ...(input.actualShipAt !== undefined ? { actualShipAt: input.actualShipAt } : {}),
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
          note: `${input.carrierCode} shipment creation failed.`,
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

export async function getOrderResetPreparation(tenantId: string, orderId: string) {
  return prisma.order.findFirst({ where: { tenantId, id: orderId },
    include: { shipments: { orderBy: { createdAt: "desc" } } } });
}

export async function resetCancelledOrderRecords(input: {
  tenantId: string;
  order: NonNullable<Awaited<ReturnType<typeof getOrderResetPreparation>>>;
  verified: ResetVerification[];
  actorType: AuditActorType;
  actorId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const conflict = () => new AppError("CONFLICT", "Đơn hoặc vận đơn đã thay đổi. Vui lòng tải lại và xác minh lại.", 409);
    const orderUpdate = await tx.order.updateMany({
      where: { id: input.order.id, tenantId: input.tenantId,
        status: input.order.status, updatedAt: input.order.updatedAt },
      data: { status: "FULFILLED" },
    });
    if (orderUpdate.count !== 1) throw conflict();
    const current = await tx.shipment.findMany({ where: { tenantId: input.tenantId, orderId: input.order.id },
      select: { id: true, updatedAt: true } });
    if (current.length !== input.order.shipments.length || current.some(s =>
      !input.order.shipments.some(old => old.id === s.id && old.updatedAt.getTime() === s.updatedAt.getTime()))) throw conflict();
    await stopAutoShipmentForReset(tx, input.tenantId, input.order.id);
    for (const shipment of input.order.shipments) {
      const verification = input.verified.find(v => v.shipmentId === shipment.id);
      const metadata = shipment.metadata && typeof shipment.metadata === "object" && !Array.isArray(shipment.metadata)
        ? shipment.metadata : {};
      await tx.shipment.update({ where: { id: shipment.id, tenantId: input.tenantId }, data: {
        status: "CANCELLED",
        ...(verification ? { carrierAccountId: verification.carrierAccountId,
          metadata: { ...metadata, resetVerifiedAt: verification.verifiedAt } as Prisma.InputJsonObject } : {}),
        statusHistory: { create: { tenantId: input.tenantId, status: "CANCELLED",
          note: "Archived for resubmission after cancellation verification. Identifiers retained.",
          actorType: input.actorType, actorId: input.actorId } },
      } });
    }
    await tx.orderStatusHistory.create({ data: { tenantId: input.tenantId, orderId: input.order.id,
      status: "FULFILLED", note: "Reset for manual resubmission; shipment history retained.",
      actorType: input.actorType, actorId: input.actorId } });
    await tx.auditLog.create({ data: { tenantId: input.tenantId, actorType: input.actorType,
      ...(input.actorType === "USER" ? { actorUserId: input.actorId } : {}),
      action: "ORDER_RESET_AFTER_CANCEL", resourceType: "Order", resourceId: input.order.id,
      metadata: { previousStatus: input.order.status, nextStatus: "FULFILLED",
        verified: input.verified, shipmentIds: input.order.shipments.map(s => s.id) } } });
    const latest = input.order.shipments[0];
    return { order: { id: input.order.id, status: "FULFILLED" as const },
      shipment: latest ? await tx.shipment.findFirst({ where: { id: latest.id, tenantId: input.tenantId } }) : null };
  }, { isolationLevel: "Serializable" }).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      throw new AppError("CONFLICT", "Đơn đang được xử lý đồng thời. Vui lòng tải lại và xác minh lại.", 409);
    }
    throw error;
  });
}

export async function listShipments(
  tenantId: string,
  query: ShipmentListQuery,
): Promise<ShipmentListItem[]> {
  const groups = query.groupByOrder ? await prisma.shipment.groupBy({
    by: ["orderId"],
    where: buildShipmentWhereInput(tenantId, query),
    _max: { createdAt: true, updatedAt: true },
    orderBy: [{ _max: { [query.sortBy]: query.sortOrder } }, { orderId: "asc" }],
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  }) : null;
  if (groups?.length === 0) return [];
  const rows = await prisma.shipment.findMany({
    where: groups ? { tenantId, orderId: { in: groups.map(group => group.orderId) }, ...(query.carrierCode ? { carrierCode: query.carrierCode } : {}) } : buildShipmentWhereInput(tenantId, query),
    orderBy: groups ? [{ createdAt: "desc" }, { id: "desc" }] : { [query.sortBy]: query.sortOrder },
    skip: groups ? undefined : (query.page - 1) * query.pageSize,
    take: groups ? undefined : query.pageSize,
    select: {
      id: true,
      orderId: true,
      status: true,
      carrierCode: true,
      carrierAccountId: true,
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

  const mapped = rows.map((row) => ({
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.order.orderNumber,
    externalOrderId: row.order.externalOrderId,
    sourceChannel: row.order.sourceChannel,
    status: row.status,
    carrierCode: row.carrierCode,
    carrierName: getFinalMileCarrier(row.metadata) ?? (row.carrierCode === "VIETTEL_POST" ? "USPS" : row.carrierCode),
    shippingMethod: getShippingMethod(row.metadata) ?? (row.carrierCode === "VIETTEL_POST" ? "USPS First Class" : "Standard"),
    carrierAccountId: row.carrierAccountId,
    carrierShipmentId: row.carrierShipmentId,
    trackingNumber: row.trackingNumber,
    actualShipAt: row.actualShipAt,
    portalTrackingSyncState: getPortalTrackingSyncState(row.metadata),
    labelUrl: row.labelUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    itemCount: row._count.items,
  }));
  if (!groups) return mapped;
  return groups.flatMap(group => {
    const [latest, ...history] = mapped.filter(row => row.orderId === group.orderId);
    return latest ? [{ ...latest, history }] : [];
  });
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
  if (query.groupByOrder) return prisma.order.count({where: {tenantId, shipments: {some: buildShipmentWhereInput(tenantId, query)}}});
  return prisma.shipment.count({
    where: buildShipmentWhereInput(tenantId, query),
  });
}

export async function listTrackingSyncCandidates(
  tenantId: string,
  limit: number,
  carrierCode?: string,
) {
  const where: Prisma.ShipmentWhereInput = {
    tenantId,
    status: { not: "CANCELLED" },
    OR: [
      { carrierShipmentId: { not: null } },
      { trackingNumber: { not: null } },
    ],
  };

  if (carrierCode === "VIETTEL_POST") {
    where.carrierCode = "VIETTEL_POST";
    where.status = { in: [...VIETTEL_POST_ACTIVE_TRACKING_STATUSES] as ShipmentStatus[] };
  } else {
    where.carrierCode = { not: null };
    where.AND = [{
      OR: [
        {
          carrierCode: "VIETTEL_POST",
          status: { in: [...VIETTEL_POST_ACTIVE_TRACKING_STATUSES] as ShipmentStatus[] },
        },
        {
          order: {
            ...trackingSyncOrderFilter(),
            purchaseAt: { gte: getTrackingSyncPurchaseAfter() },
          },
        },
      ],
    }];
  }

  const rows = await prisma.shipment.findMany({
    where,
    orderBy: { updatedAt: "asc" },
    take: limit * 10,
    select: { id: true, actualShipAt: true, metadata: true },
  });

  return rows
    .map((row) => ({
      id: row.id,
      step: getPendingTrackingSyncStep({
        actualShipAt: row.actualShipAt,
        portalTrackingSyncState: getPortalTrackingSyncState(row.metadata),
      }),
    }))
    .filter((row) => row.step !== "skip")
    .slice(0, limit);
}

export async function listEtsyTrackingSyncCandidates(
  tenantId: string,
  limit: number,
) {
  const rows = await prisma.shipment.findMany({
    where: {
      tenantId,
      carrierCode: { not: null },
      status: { not: "CANCELLED" },
      createdAt: { gte: getEtsyTrackingSyncCreatedAfter() },
      order: etsyTrackingSyncOrderFilter(),
      OR: [
        { carrierShipmentId: { not: null } },
        { trackingNumber: { not: null } },
      ],
    },
    orderBy: { updatedAt: "asc" },
    take: limit * 10,
    select: { id: true, actualShipAt: true, metadata: true },
  });

  return rows
    .map((row) => ({
      id: row.id,
      step: getEtsyTrackingSyncStep({
        actualShipAt: row.actualShipAt,
        portalTrackingSyncState: getPortalTrackingSyncState(row.metadata),
      }),
    }))
    .filter((row) => row.step !== "skip")
    .slice(0, limit);
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
  actualShipAt?: Date | null;
  metadata?: Prisma.InputJsonValue;
  actorType: AuditActorType;
  actorId?: string;
}): Promise<ShipmentDetail> {
  const row = await prisma.$transaction(async (tx) => {
    const row = await tx.shipment.update({
      where: {
        id: input.shipmentId,
        tenantId: input.tenantId,
      },
      data: {
        status: input.status,
        carrierShipmentId: input.carrierShipmentId,
        trackingNumber: input.trackingNumber,
        labelUrl: input.labelUrl,
        ...(input.actualShipAt !== undefined ? { actualShipAt: input.actualShipAt } : {}),
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

    if (row.carrierCode === "VIETTEL_POST") {
      await createLifecycleOutboxInTransaction(tx, {
        eventType: input.status === "LABEL_READY" ? "shipment.label_ready" : "shipment.created",
        tenantId: input.tenantId,
        orderId: row.orderId,
        shipmentId: row.id,
        externalOrderId: row.order.externalOrderId,
        shipment: {
          shipmentId: row.id,
          carrierCode: "VIETTEL_POST",
          carrierShipmentId: row.carrierShipmentId,
          trackingNumber: row.trackingNumber,
          labelUrl: row.labelUrl,
          status: row.status,
          actualShipAt: row.actualShipAt?.toISOString() ?? null,
        },
      });
    }

    return row;
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
  const row = await prisma.$transaction(async (tx) => {
    const row = await tx.shipment.update({
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

    if (row.carrierCode === "VIETTEL_POST") {
      await createLifecycleOutboxInTransaction(tx, {
        eventType: "shipment.failed",
        tenantId: input.tenantId,
        orderId: row.orderId,
        shipmentId: row.id,
        externalOrderId: row.order.externalOrderId,
        shipment: {
          shipmentId: row.id,
          carrierCode: "VIETTEL_POST",
          carrierShipmentId: row.carrierShipmentId,
          trackingNumber: row.trackingNumber,
          labelUrl: row.labelUrl,
          status: row.status,
          actualShipAt: row.actualShipAt?.toISOString() ?? null,
        },
        failure: { code: "SHIPMENT_CREATE_FAILED", message: "Shipment creation failed." },
      });
    }

    return row;
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
  labelUrl?: string | null;
  carrierMetadata?: Record<string, unknown>;
  actualShipAt?: Date;
  actualShipEvidence?: Prisma.InputJsonValue;
  statusChanged: boolean;
  emitLifecycleEvent?: boolean;
  statusNote?: string;
  actorType: AuditActorType;
  actorId?: string;
}): Promise<ShipmentDetail> {
  const row = await prisma.$transaction(async (tx) => {
    const shipmentMetadata = (input.carrierName || input.carrierMetadata)
      ? await tx.shipment.findFirst({
          where: { id: input.shipmentId, tenantId: input.tenantId },
          select: { metadata: true },
        })
      : null;

    let updatedMetadata: Prisma.InputJsonValue | undefined = undefined;
    if (shipmentMetadata) {
      let meta: Prisma.InputJsonValue = shipmentMetadata.metadata as Prisma.InputJsonValue;
      if (input.carrierName) {
        meta = withFinalMileCarrier(meta, input.carrierName);
      }
      if (input.carrierMetadata) {
        meta = withCarrierSafeMetadata(meta, input.carrierMetadata);
      }
      updatedMetadata = meta;
    }

    const row = await tx.shipment.update({
      where: {
        id: input.shipmentId,
        tenantId: input.tenantId,
        status: { not: "CANCELLED" },
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
        ...(input.labelUrl === undefined
          ? {}
          : { labelUrl: input.labelUrl }),
        ...(updatedMetadata !== undefined
          ? { metadata: updatedMetadata }
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

    if (row.carrierCode === "VIETTEL_POST" && input.emitLifecycleEvent) {
      await createLifecycleOutboxInTransaction(tx, {
        eventType: input.actualShipAt
          ? "shipment.carrier_handoff_confirmed"
          : "tracking.updated",
        tenantId: input.tenantId,
        orderId: row.orderId,
        shipmentId: row.id,
        externalOrderId: row.order.externalOrderId,
        shipment: {
          shipmentId: row.id,
          carrierCode: "VIETTEL_POST",
          carrierShipmentId: row.carrierShipmentId,
          trackingNumber: row.trackingNumber,
          labelUrl: row.labelUrl,
          status: row.status,
          actualShipAt: row.actualShipAt?.toISOString() ?? null,
        },
      });
    }

    return row;
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
  metadata: Prisma.JsonValue | null;
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
    carrierName: getFinalMileCarrier(row.metadata) ?? (row.carrierCode === "VIETTEL_POST" ? "USPS" : row.carrierCode),
    shippingMethod: getShippingMethod(row.metadata) ?? (row.carrierCode === "VIETTEL_POST" ? "USPS First Class" : "Standard"),
    carrierAccountId: row.carrierAccountId,
    carrierShipmentId: row.carrierShipmentId,
    trackingNumber: row.trackingNumber,
    actualShipAt: row.actualShipAt,
    actualShipEvidence: row.actualShipEvidence,
    portalTrackingSyncState: getPortalTrackingSyncState(row.metadata),
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
  const search = normalizeFulfillmentSearch(query.search);
  return {
    tenantId,
    ...(query.carrierCode ? { carrierCode: query.carrierCode } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.sourceChannel ? { order: { sourceChannel: query.sourceChannel } } : {}),
    ...(query.orderId ? { orderId: query.orderId } : {}),
    ...(search
      ? {
          OR: [...shipmentSearchClauses(search), { order: { tenantId, OR: orderSearchClauses(search) } }],
        }
      : {}),
  };
}

export async function findOrdersForViettelPostSync(
  tenantId: string,
  externalOrderIds: string[],
) {
  return prisma.order.findMany({
    where: {
      tenantId,
      OR: [
        { externalOrderId: { in: externalOrderIds } },
        { orderNumber: { in: externalOrderIds } },
      ],
    },
    select: {
      id: true,
      externalOrderId: true,
      orderNumber: true,
      sourceChannel: true,
      shipments: {
        select: {
          id: true,
          status: true,
          carrierCode: true,
          carrierAccountId: true,
          trackingNumber: true,
          carrierShipmentId: true,
          labelUrl: true,
          actualShipAt: true,
          metadata: true,
        },
      },
      items: {
        select: {
          id: true,
          quantity: true,
        },
      },
    },
  });
}

export async function linkViettelPostTrackingToShipment(input: {
  tenantId: string;
  shipmentId: string;
  carrierShipmentId: string;
  trackingNumber: string;
  labelUrl?: string | null;
  status: ShipmentStatus;
  metadata?: Prisma.InputJsonValue;
  actorType: AuditActorType;
  actorId?: string;
}) {
  return prisma.shipment.update({
    where: {
      id: input.shipmentId,
      tenantId: input.tenantId,
      status: { not: "CANCELLED" },
    },
    data: {
      carrierCode: "VIETTEL_POST",
      carrierShipmentId: input.carrierShipmentId,
      trackingNumber: normalizeViettelPostTrackingNumber(input.trackingNumber) ?? input.trackingNumber,
      labelUrl: input.labelUrl ?? null,
      status: input.status,
      updatedAt: new Date(),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      statusHistory: {
        create: {
          tenantId: input.tenantId,
          status: input.status,
          note: "Tracking synced from Viettel Post Global.",
          actorType: input.actorType,
          actorId: input.actorId,
        },
      },
    },
  });
}

export async function createViettelPostShipmentForOrder(input: {
  tenantId: string;
  orderId: string;
  carrierShipmentId: string;
  trackingNumber: string;
  labelUrl?: string | null;
  status: ShipmentStatus;
  items: Array<{ orderItemId: string; quantity: number }>;
  metadata?: Prisma.InputJsonValue;
  actorType: AuditActorType;
  actorId?: string;
}) {
  return prisma.shipment.create({
    data: {
      tenantId: input.tenantId,
      orderId: input.orderId,
      carrierCode: "VIETTEL_POST",
      carrierShipmentId: input.carrierShipmentId,
      trackingNumber: normalizeViettelPostTrackingNumber(input.trackingNumber) ?? input.trackingNumber,
      labelUrl: input.labelUrl ?? null,
      status: input.status,
      ...(input.metadata ? { metadata: input.metadata } : {}),
      items: {
        create: input.items.map((it) => ({
          tenantId: input.tenantId,
          orderItemId: it.orderItemId,
          quantity: it.quantity,
        })),
      },
      statusHistory: {
        create: {
          tenantId: input.tenantId,
          status: input.status,
          note: "Shipment created via Viettel Post Global tracking sync.",
          actorType: input.actorType,
          actorId: input.actorId,
        },
      },
    },
  });
}


export function getShipmentLabelRecord(tenantId: string, shipmentId: string) {
  return prisma.shipment.findFirst({ where: { tenantId, id: shipmentId },
    select: { status: true, carrierCode: true, carrierAccountId: true, carrierShipmentId: true, trackingNumber: true, labelUrl: true, metadata: true } });
}
