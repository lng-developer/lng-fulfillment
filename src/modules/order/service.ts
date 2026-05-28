import { recordApiKeyAuditLog } from "@/modules/audit";
import { AppError } from "@/shared/errors";
import {
  countOrders,
  createPortalOrderWithItems,
  getOrderDetail as getOrderDetailRecord,
  listOrderDetailsByIds,
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
      status: "READY_TO_SHIP",
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
  const [orders, totalItems] = await Promise.all([
    listOrderRecords(tenantId, query),
    countOrders(tenantId, query),
  ]);
  const expandedOrders = query.includeExpanded
    ? await listOrderDetailsByIds(
        tenantId,
        orders.map((order) => order.id),
      )
    : undefined;

  return {
    orders,
    ...(expandedOrders ? { expandedOrders } : {}),
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
