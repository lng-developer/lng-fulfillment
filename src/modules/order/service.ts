import { recordApiKeyAuditLog } from "@/modules/audit";
import { processAutoShipmentForOrder } from "@/modules/auto-shipment";
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
  const autoShipment: PortalAutoShipmentSummary = {
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
      await processReceivedOrderAutoShipment({
        tenantId: tenantContext.tenantId,
        orderId: result.order.id,
        apiKeyId: tenantContext.apiKeyId,
        summary: autoShipment,
      });
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
    autoShipment,
  };
}

async function processReceivedOrderAutoShipment(input: {
  tenantId: string;
  orderId: string;
  apiKeyId: string;
  summary: PortalAutoShipmentSummary;
}) {
  input.summary.attempted += 1;

  try {
    const result = await processAutoShipmentForOrder({
      tenantId: input.tenantId,
      orderId: input.orderId,
      actorId: input.apiKeyId,
    });

    incrementAutoShipmentSummary(input.summary, result.status);
  } catch {
    input.summary.failed += 1;
  }
}

function incrementAutoShipmentSummary(
  summary: PortalAutoShipmentSummary,
  status: string,
) {
  switch (status) {
    case "SUCCEEDED":
      summary.succeeded += 1;
      break;
    case "FAILED":
      summary.failed += 1;
      break;
    case "SKIPPED_DISABLED":
      summary.skippedDisabled += 1;
      break;
    case "MISSING_SKU_MAPPING":
      summary.missingSkuMapping += 1;
      break;
    case "METHOD_CONFLICT":
      summary.methodConflict += 1;
      break;
    case "SKIPPED_EXISTING_SHIPMENT":
      summary.skippedExistingShipment += 1;
      break;
    default:
      summary.failed += 1;
      break;
  }
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
