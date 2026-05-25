import type { OrderStatus, Prisma } from "@prisma/client";
import type { ApiErrorCode } from "@/shared/errors";

export const MAX_PORTAL_ORDER_BATCH_SIZE = 50;
export const DEFAULT_ORDER_PAGE = 1;
export const DEFAULT_ORDER_PAGE_SIZE = 20;
export const MAX_ORDER_PAGE_SIZE = 100;

export const ORDER_LIST_SORT_FIELDS = [
  "receivedAt",
  "createdAt",
  "updatedAt",
  "externalOrderId",
  "orderNumber",
  "status",
] as const;

export type OrderListSortField = (typeof ORDER_LIST_SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

export type PortalOrderItemInput = {
  externalItemId?: string;
  sku?: string;
  name?: string;
  title?: string;
  quantity: number;
  asin?: string;
  listingId?: string;
  productType?: string;
  variant?: string;
  unitPrice?: number;
  currency?: string;
  weight?: number;
  declaredValue?: number;
  customizationUrl?: string;
  customizationData?: Prisma.InputJsonValue;
  snapshotImageUrl?: string;
  fulfillmentFile?: Prisma.InputJsonValue;
  listingSnapshot?: Prisma.InputJsonValue;
  costCenterSnapshot?: Prisma.InputJsonValue;
  productionStatus?: string;
  scaleStatus?: string;
  qcNote?: string;
  metadata?: Prisma.InputJsonValue;
  rawPayload: Prisma.InputJsonValue;
};

export type PortalOrderInput = {
  externalOrderId: string;
  orderNumber?: string;
  source?: string;
  sourceAccount?: string;
  shopName?: string;
  marketplace?: string;
  externalStatus?: string;
  purchaseAt?: Date;
  paidAt?: Date;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  recipientAddress?: Prisma.InputJsonValue;
  destinationCountry?: string;
  destinationState?: string;
  destinationCity?: string;
  destinationPostalCode?: string;
  shippingService?: string;
  shippingType?: string;
  currency?: string;
  orderTotal?: number;
  metadata?: Prisma.InputJsonValue;
  rawPayload: Prisma.InputJsonValue;
  items: PortalOrderItemInput[];
};

export type PortalOrderValidationError = {
  externalOrderId?: string;
  code: ApiErrorCode;
  message: string;
};

export type PortalOrdersValidationResult = {
  orders: PortalOrderInput[];
  errors: PortalOrderValidationError[];
  received: number;
};

export type PortalTenantContext = {
  tenantId: string;
  apiKeyId: string;
  scopes: string[];
};

export type ReceivedOrderSummary = {
  id: string;
  tenantId: string;
  externalOrderId: string;
  status: OrderStatus;
  receivedAt: Date;
};

export type PortalReceiveResult = {
  received: number;
  inserted: number;
  updated: 0;
  skipped: number;
  errors: PortalOrderValidationError[];
  orders: ReceivedOrderSummary[];
};

export type OrderListQuery = {
  page: number;
  pageSize: number;
  status?: OrderStatus;
  search?: string;
  from?: Date;
  to?: Date;
  sortBy: OrderListSortField;
  sortOrder: SortOrder;
};

export type OrderListItem = {
  id: string;
  externalOrderId: string;
  orderNumber: string | null;
  source: string | null;
  shopName: string | null;
  marketplace: string | null;
  status: OrderStatus;
  recipientName: string | null;
  destinationCountry: string | null;
  destinationState: string | null;
  destinationCity: string | null;
  destinationPostalCode: string | null;
  shippingService: string | null;
  shippingType: string | null;
  purchaseAt: Date | null;
  paidAt: Date | null;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
  firstSku: string | null;
  firstItemName: string | null;
  totalQuantity: number;
};

export type OrderDetail = {
  id: string;
  externalOrderId: string;
  orderNumber: string | null;
  source: string | null;
  sourceAccount: string | null;
  shopName: string | null;
  marketplace: string | null;
  externalStatus: string | null;
  purchaseAt: Date | null;
  paidAt: Date | null;
  status: OrderStatus;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  recipientAddress: Prisma.JsonValue | null;
  destinationCountry: string | null;
  destinationState: string | null;
  destinationCity: string | null;
  destinationPostalCode: string | null;
  shippingService: string | null;
  shippingType: string | null;
  currency: string | null;
  orderTotal: string | null;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  items: OrderDetailItem[];
  statusHistory: OrderDetailStatusHistory[];
};

export type OrderDetailItem = {
  id: string;
  externalItemId: string | null;
  sku: string | null;
  name: string | null;
  title: string | null;
  quantity: number;
  asin: string | null;
  listingId: string | null;
  productType: string | null;
  variant: string | null;
  unitPrice: string | null;
  currency: string | null;
  weight: string | null;
  declaredValue: string | null;
  customizationUrl: string | null;
  snapshotImageUrl: string | null;
  fulfillmentFileSummary: SafeJsonSummary | null;
  listingSnapshotSummary: SafeJsonSummary | null;
  costCenterSnapshotSummary: SafeJsonSummary | null;
  productionStatus: string | null;
  scaleStatus: string | null;
  qcNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderDetailStatusHistory = {
  id: string;
  status: OrderStatus;
  note: string | null;
  actorType: "USER" | "API_KEY" | "SYSTEM";
  createdAt: Date;
};

export type SafeJsonSummary = {
  type: "object" | "array" | "string" | "number" | "boolean";
  keys?: string[];
  itemCount?: number;
  valuePreview?: string;
};

export type PaginationMeta = {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
