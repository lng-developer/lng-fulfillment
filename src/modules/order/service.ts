import { recordApiKeyAuditLog } from "@/modules/audit";
import { AppError } from "@/shared/errors";
import {
  countOrders,
  createPortalOrderWithItems,
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
    } else {
      skipped += 1;
    }
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

function toOrderListItem(order: OrderDetail): OrderListItem {
  const firstItem = order.items[0];
  const latestShipment = order.shipments?.[0];

  return {
    id: order.id,
    externalOrderId: order.externalOrderId,
    orderNumber: order.orderNumber,
    source: order.source,
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
  };
}
