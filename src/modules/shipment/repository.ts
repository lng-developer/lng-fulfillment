import type { AuditActorType, Prisma, ShipmentStatus } from "@prisma/client";
import { prisma } from "@/shared/db";
import type {
  CreateDraftShipmentInput,
  ShipmentDetail,
  ShipmentListItem,
  ShipmentListQuery,
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
      labelUrl: true,
      createdAt: true,
      updatedAt: true,
      order: {
        select: {
          orderNumber: true,
          externalOrderId: true,
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
    status: row.status,
    carrierCode: row.carrierCode,
    carrierShipmentId: row.carrierShipmentId,
    trackingNumber: row.trackingNumber,
    labelUrl: row.labelUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    itemCount: row._count.items,
  }));
}

export async function countShipments(
  tenantId: string,
  query: ShipmentListQuery,
): Promise<number> {
  return prisma.shipment.count({
    where: buildShipmentWhereInput(tenantId, query),
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
  statusChanged: boolean;
  statusNote?: string;
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
      updatedAt: new Date(),
      ...(input.trackingNumber === undefined
        ? {}
        : { trackingNumber: input.trackingNumber }),
      ...(input.carrierShipmentId === undefined
        ? {}
        : { carrierShipmentId: input.carrierShipmentId }),
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
  orderId: true,
  status: true,
  carrierCode: true,
  carrierAccountId: true,
  carrierShipmentId: true,
  trackingNumber: true,
  labelUrl: true,
  createdAt: true,
  updatedAt: true,
  order: {
    select: {
      orderNumber: true,
      externalOrderId: true,
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

function toShipmentDetail(row: {
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
  order: {
    orderNumber: string | null;
    externalOrderId: string;
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
    orderId: row.orderId,
    orderNumber: row.order.orderNumber,
    externalOrderId: row.order.externalOrderId,
    status: row.status,
    carrierCode: row.carrierCode,
    carrierAccountId: row.carrierAccountId,
    carrierShipmentId: row.carrierShipmentId,
    trackingNumber: row.trackingNumber,
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

function buildShipmentWhereInput(
  tenantId: string,
  query: ShipmentListQuery,
): Prisma.ShipmentWhereInput {
  return {
    tenantId,
    ...(query.status ? { status: query.status } : {}),
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
