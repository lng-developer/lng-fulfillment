import { recordApiKeyAuditLog } from "@/modules/audit";
import { AppError } from "@/shared/errors";
import {
  countOrders,
  createPortalOrderWithItems,
  findOrderByExternalId,
  getOrderDetail as getOrderDetailRecord,
  listOrderDetailPage,
  listOrders as listOrderRecords,
} from "./repository";
import { validatePortalOrdersInput } from "./validation";
import type {
  OrderDetail,
  OrderListItem,
  OrderListQuery,
  PaginationMeta,
  PortalReceiveResult,
  PortalOrderAcceptance,
  PortalAutoShipmentSummary,
  PortalTenantContext,
  ReceivedOrderSummary,
} from "./types";

const REQUIRED_PORTAL_SCOPE = "orders:write";

export async function receivePortalOrders(
  input: unknown,
  tenantContext: PortalTenantContext,
): Promise<PortalReceiveResult> {
  if (!tenantContext.scopes.includes(REQUIRED_PORTAL_SCOPE)) {
    throw new AppError("FORBIDDEN", "API key scope is insufficient.", 403);
  }

  const validation = validatePortalOrdersInput(input);
  const orders: ReceivedOrderSummary[] = [];
  const acceptances: PortalOrderAcceptance[] = [];
  const autoShipment: PortalAutoShipmentSummary = {
    queued: 0,
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skippedDisabled: 0,
    missingSkuMapping: 0,
    methodConflict: 0,
    skippedExistingShipment: 0,
  };
  let inserted = 0;
  let skipped = 0;

  for (const order of validation.orders) {
    const result = await createPortalOrderWithItems({
      tenantId: tenantContext.tenantId,
      order,
      status: "FULFILLED",
      actorType: "API_KEY",
      actorId: tenantContext.apiKeyId,
    });

    if (result.action === "inserted") {
      inserted += 1;
      orders.push(result.order);
      autoShipment.queued += 1;
    } else {
      skipped += 1;
    }
    acceptances.push(toPortalOrderAcceptance(result));
  }

  await recordApiKeyAuditLog({
    tenantId: tenantContext.tenantId,
    action: "PORTAL_ORDERS_RECEIVED",
    resourceType: "PortalReceiveBatch",
    actorId: tenantContext.apiKeyId,
    metadata: {
      received: validation.received,
      inserted,
      skipped,
      errorCount: validation.errors.length,
      autoShipment,
      apiKeyId: tenantContext.apiKeyId,
    },
  });

  return {
    received: validation.received,
    inserted,
    updated: 0,
    skipped,
    errors: validation.errors,
    orders,
    acceptances,
    autoShipment,
  };
}

export function toPortalOrderAcceptance(input: {
  action: "inserted" | "skipped";
  order: ReceivedOrderSummary;
}): PortalOrderAcceptance {
  return {
    externalOrderId: input.order.externalOrderId,
    outcome: input.action === "inserted" ? "accepted" : "duplicate",
    fulfillmentOrderId: input.order.id,
    status: input.order.status,
    receivedAt: input.order.receivedAt,
  };
}

export async function listTenantOrders(
  tenantId: string,
  query: OrderListQuery,
): Promise<{
  orders: OrderListItem[];
  expandedOrders?: OrderDetail[];
  meta: PaginationMeta;
}> {
  if (query.includeExpanded) {
    const [expandedOrders, totalItems] = await Promise.all([
      listOrderDetailPage(tenantId, query),
      countOrders(tenantId, query),
    ]);

    return {
      orders: expandedOrders.map(toOrderListItem),
      expandedOrders,
      meta: {
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages:
            totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
        },
      },
    };
  }

  const [orders, totalItems] = await Promise.all([
    listOrderRecords(tenantId, query),
    countOrders(tenantId, query),
  ]);

  return {
    orders,
    meta: {
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
      },
    },
  };
}

export async function getTenantOrderDetail(
  tenantId: string,
  orderId: string,
): Promise<OrderDetail> {
  const order = await getOrderDetailRecord(tenantId, orderId);

  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  return order;
}

export async function getPortalOrderProcessingStatus(
  tenantId: string,
  externalOrderId: string,
) {
  const order = await findOrderByExternalId(tenantId, externalOrderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  return {
    externalOrderId: order.externalOrderId,
    orderStatus: order.status,
    receivedAt: order.receivedAt,
    autoShipment: order.autoShipmentJob,
  };
}

function toOrderListItem(order: OrderDetail): OrderListItem {
  const firstItem = order.items[0];
  const latestShipment = order.shipments?.[0];

  return {
    id: order.id,
    externalOrderId: order.externalOrderId,
    orderNumber: order.orderNumber,
    source: order.source,
    sourceChannel: order.sourceChannel,
    shopName: order.shopName,
    marketplace: order.marketplace,
    status: order.status,
    recipientName: order.recipientName,
    destinationCountry: order.destinationCountry,
    destinationState: order.destinationState,
    destinationCity: order.destinationCity,
    destinationPostalCode: order.destinationPostalCode,
    shippingService: order.shippingService,
    shippingType: order.shippingType,
    purchaseAt: order.purchaseAt,
    paidAt: order.paidAt,
    receivedAt: order.receivedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    itemCount: order.items.length,
    firstSku: firstItem?.sku ?? null,
    firstItemName: firstItem?.title ?? firstItem?.name ?? null,
    totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    latestShipmentStatus: latestShipment?.status ?? null,
    latestTrackingNumber: latestShipment?.trackingNumber ?? null,
    latestLabelUrl: latestShipment?.labelUrl ?? null,
    latestShipmentCost: latestShipment?.cost ?? null,
    autoShipmentJob: order.autoShipmentJob ?? null,
  };
}
