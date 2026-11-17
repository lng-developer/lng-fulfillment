import type { AuditActorType, OrderSourceChannel, OrderStatus } from "@prisma/client";
import { recordApiKeyAuditLog, recordUserAuditLog } from "@/modules/audit";
import { AppError } from "@/shared/errors";
import {
  countOrders,
  createPortalOrderWithItems,
  findOrderByBarcodeOrNumber,
  findOrderByExternalId,
  findOrdersByExternalIds,
  getOrderDetail as getOrderDetailRecord,
  listOrderDetailPage,
  listOrders as listOrderRecords,
  listOrdersForExport,
  updateOrdersToReadyToShip,
} from "./repository";
import { validatePortalOrdersInput } from "./validation";
import type {
  MarkOrdersReadyToShipInput,
  MarkOrdersReadyToShipResult,
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

  const externalOrderIds = validation.orders.map((o) => o.externalOrderId);
  const existingOrders = await findOrdersByExternalIds(
    tenantContext.tenantId,
    externalOrderIds,
  );
  const existingMap = new Map(
    existingOrders.map((o) => [o.externalOrderId, o]),
  );

  const toInsert = validation.orders.filter(
    (order) => !existingMap.has(order.externalOrderId),
  );
  const insertResults = new Map<
    string,
    { action: "inserted" | "skipped"; order: ReceivedOrderSummary }
  >();

  const CHUNK_SIZE = 5;
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map((order) =>
        createPortalOrderWithItems({
          tenantId: tenantContext.tenantId,
          order,
          status: "RECEIVED",
          actorType: "API_KEY",
          actorId: tenantContext.apiKeyId,
        }),
      ),
    );
    chunk.forEach((order, index) => {
      insertResults.set(order.externalOrderId, results[index]);
    });
  }

  for (const order of validation.orders) {
    const existing = existingMap.get(order.externalOrderId);
    const result = existing
      ? { action: "skipped" as const, order: existing }
      : insertResults.get(order.externalOrderId)!;

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
    disposition: input.action === "inserted" ? "accepted" : "duplicate",
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

  const primaryShipment =
    order.shipments.find((s) => s.actualShipAt && s.trackingNumber) ??
    order.shipments.find((s) => s.trackingNumber) ??
    order.shipments[order.shipments.length - 1] ??
    null;

  const shipDate = primaryShipment?.actualShipAt ?? primaryShipment?.createdAt ?? null;
  const carrier = primaryShipment?.carrierCode ?? null;

  return {
    externalOrderId: order.externalOrderId,
    orderStatus: order.status,
    carrier,
    carrierCode: carrier,
    trackingNumber: primaryShipment?.trackingNumber ?? null,
    shipDate,
    shipdate: shipDate,
    shippedAt: primaryShipment?.actualShipAt ?? null,
    receivedAt: order.receivedAt,
    autoShipment: order.autoShipmentJob,
    packages: order.shipments.map((shipment) => {
      const packageShipDate = shipment.actualShipAt ?? shipment.createdAt ?? null;
      return {
        packageId: shipment.carrierShipmentId || shipment.id,
        carrierShipmentId: shipment.carrierShipmentId,
        status: shipment.status,
        carrier: shipment.carrierCode,
        carrierCode: shipment.carrierCode,
        trackingNumber: shipment.trackingNumber,
        shipDate: packageShipDate,
        shipdate: packageShipDate,
        shippedAt: shipment.actualShipAt,
        labelUrl: shipment.labelUrl,
        externalItemIds: shipment.items
          .map((item) => item.orderItem.externalItemId)
          .filter((externalItemId): externalItemId is string => Boolean(externalItemId)),
      };
    }),
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

export async function markOrdersReadyToShip(
  tenantId: string,
  input: MarkOrdersReadyToShipInput,
  actor: { actorType: AuditActorType; actorId?: string },
): Promise<MarkOrdersReadyToShipResult> {
  const barcode = input.barcode?.trim();

  if (barcode) {
    const order = await findOrderByBarcodeOrNumber(tenantId, barcode);
    if (!order) {
      return {
        success: false,
        updatedCount: 0,
        orders: [],
        message: `Không tìm thấy đơn hàng với mã "${barcode}". Vui lòng kiểm tra lại.`,
      };
    }

    if (order.status === "READY_TO_SHIP") {
      return {
        success: true,
        updatedCount: 0,
        orders: [order],
        scannedOrder: order,
        message: `Đơn #${order.orderNumber || order.externalOrderId} đã ở trạng thái Sẵn sàng ship (Đã QC) trước đó.`,
      };
    }

    if (["IN_PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
      return {
        success: false,
        updatedCount: 0,
        orders: [order],
        scannedOrder: order,
        message: `Đơn #${order.orderNumber || order.externalOrderId} đã được tạo vận đơn hoặc đang giao (${order.status}). Không thể QC lại.`,
      };
    }

    if (order.status === "CANCELLED") {
      return {
        success: false,
        updatedCount: 0,
        orders: [order],
        scannedOrder: order,
        message: `Đơn #${order.orderNumber || order.externalOrderId} đã bị hủy. Không thể chuyển trạng thái.`,
      };
    }

    const updated = await updateOrdersToReadyToShip({
      tenantId,
      orderIds: [order.id],
      note: input.note,
      actorType: actor.actorType,
      actorId: actor.actorId,
    });

    if (actor.actorType === "USER" && actor.actorId) {
      await recordUserAuditLog({
        tenantId,
        actorUserId: actor.actorId,
        action: "ORDER_QC_PASSED",
        resourceType: "Order",
        resourceId: order.id,
        metadata: {
          barcode,
          previousStatus: order.status,
          newStatus: "READY_TO_SHIP",
        },
      });
    }

    return {
      success: true,
      updatedCount: updated.length,
      orders: updated,
      scannedOrder: updated[0] || { ...order, status: "READY_TO_SHIP" },
      message: `QC Pass thành công đơn #${order.orderNumber || order.externalOrderId}. Đã sẵn sàng tạo vận đơn!`,
    };
  }

  const orderIds = (input.orderIds || []).filter(Boolean);
  if (!orderIds.length) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Vui lòng chọn ít nhất 1 đơn hàng hoặc nhập mã đơn.",
      400,
    );
  }

  const updated = await updateOrdersToReadyToShip({
    tenantId,
    orderIds,
    note: input.note,
    actorType: actor.actorType,
    actorId: actor.actorId,
  });

  if (actor.actorType === "USER" && actor.actorId) {
    await recordUserAuditLog({
      tenantId,
      actorUserId: actor.actorId,
      action: "BATCH_ORDER_QC_PASSED",
      resourceType: "OrderBatch",
      resourceId: updated.map((o: { id: string }) => o.id).join(","),
      metadata: {
        requestedCount: orderIds.length,
        updatedCount: updated.length,
        orderIds: updated.map((o: { id: string }) => o.id),
      },
    });
  }

  return {
    success: true,
    updatedCount: updated.length,
    orders: updated,
    message:
      updated.length > 0
        ? `Đã cập nhật trạng thái Sẵn sàng ship (QC Pass) cho ${updated.length} đơn hàng!`
        : "Không có đơn hàng nào ở trạng thái Chờ sản xuất / QC để cập nhật.",
  };
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Chờ sản xuất / QC",
  READY_TO_SHIP: "Sẵn sàng ship (Đã QC)",
  IN_PROCESSING: "Đang giao",
  SHIPPED: "Đã xuất kho",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
  ON_HOLD: "Tạm giữ",
};

export function buildOrdersCsv(orders: OrderDetail[]): string {
  const headers = [
    "Mã đơn hàng",
    "Mã đơn sàn (External ID)",
    "Kênh bán",
    "Cửa hàng",
    "Thị trường",
    "Trạng thái đơn",
    "Tên người nhận",
    "Số điện thoại",
    "Quốc gia",
    "Tỉnh/Bang",
    "Thành phố",
    "Mã bưu điện",
    "Địa chỉ chi tiết",
    "SKU",
    "Tên sản phẩm",
    "Số lượng",
    "ASIN",
    "Đơn giá",
    "Tiền tệ",
    "Tùy biến (Customization)",
    "Link ảnh Customize",
    "Link tải Customization (Amazon Caps)",
    "Link file in sản xuất",
    "Trạng thái sản xuất",
    "Trạng thái scale",
    "Đơn vị vận chuyển",
    "Mã vận đơn (Tracking)",
    "Link nhãn in (Label)",
    "Ngày mua hàng",
    "Ngày nhận đơn",
  ];

  const rows: string[] = [headers.map(escapeCsv).join(",")];

  for (const order of orders) {
    const latestShipment = order.shipments?.[0];
    const trackingNumber = latestShipment?.trackingNumber ?? "";
    const carrierCode = latestShipment?.carrierCode ?? "";
    const labelUrl = latestShipment?.labelUrl ?? "";

    const recipientAddress = order.recipientAddress as Record<
      string,
      unknown
    > | null;
    const addressLine1 =
      typeof recipientAddress?.line1 === "string"
        ? recipientAddress.line1
        : typeof recipientAddress?.addressLine1 === "string"
        ? recipientAddress.addressLine1
        : "";
    const addressLine2 =
      typeof recipientAddress?.line2 === "string"
        ? recipientAddress.line2
        : typeof recipientAddress?.addressLine2 === "string"
        ? recipientAddress.addressLine2
        : "";
    const fullAddress = [addressLine1, addressLine2].filter(Boolean).join(", ");

    const formattedPurchaseAt = order.purchaseAt
      ? new Date(order.purchaseAt).toLocaleString("vi-VN")
      : "";
    const formattedReceivedAt = order.receivedAt
      ? new Date(order.receivedAt).toLocaleString("vi-VN")
      : "";

    const items = order.items.length > 0 ? order.items : [null];

    for (const item of items) {
      const customizationText = item?.customizationOptions?.length
        ? item.customizationOptions
            .map((opt) => `${opt.label}: ${opt.value}`)
            .join("; ")
        : "";

      const fileLinks = item?.fulfillmentFiles
        ? Object.entries(item.fulfillmentFiles)
            .map(([slot, url]) => `${slot}: ${url}`)
            .join(" | ")
        : "";

      const row = [
        order.orderNumber || order.externalOrderId,
        order.externalOrderId,
        order.sourceChannel || "Manual",
        order.shopName || "",
        order.marketplace || "",
        ORDER_STATUS_LABELS[order.status] || order.status,
        order.recipientName || "",
        order.recipientPhone || "",
        order.destinationCountry || "",
        order.destinationState || "",
        order.destinationCity || "",
        order.destinationPostalCode || "",
        fullAddress,
        item?.sku || "",
        item?.title || item?.name || "",
        item?.quantity ? String(item.quantity) : "1",
        item?.asin || "",
        item?.unitPrice ? (Number(item.unitPrice) / 100).toFixed(2) : "",
        item?.currency || order.currency || "USD",
        customizationText,
        item?.snapshotImageUrl || "",
        item?.customizationUrl || "",
        fileLinks,
        item?.productionStatus || "",
        item?.scaleStatus || "",
        carrierCode,
        trackingNumber,
        labelUrl,
        formattedPurchaseAt,
        formattedReceivedAt,
      ];

      rows.push(row.map(escapeCsv).join(","));
    }
  }

  return "\uFEFF" + rows.join("\r\n");
}

export async function exportOrdersCsv(
  tenantId: string,
  query: {
    orderIds?: string[];
    status?: OrderStatus;
    sourceChannel?: OrderSourceChannel;
    search?: string;
    from?: Date;
    to?: Date;
  },
): Promise<{ filename: string; csv: string; count: number }> {
  const orders = await listOrdersForExport(tenantId, query);
  const csv = buildOrdersCsv(orders);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}${String(now.getDate()).padStart(2, "0")}_${String(
    now.getHours(),
  ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const filename = `orders_export_${dateStr}.csv`;
  return { filename, csv, count: orders.length };
}


