export type ApiSuccess<TData, TMeta = Record<string, unknown>> = {
  success: true;
  data: TData;
  meta?: TMeta;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type PaginationMeta = {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type OrderListItem = {
  id: string;
  externalOrderId: string;
  orderNumber: string | null;
  source: string | null;
  shopName: string | null;
  marketplace: string | null;
  status: string;
  recipientName: string | null;
  destinationCountry: string | null;
  destinationState: string | null;
  destinationCity: string | null;
  destinationPostalCode: string | null;
  shippingService: string | null;
  shippingType: string | null;
  purchaseAt: string | null;
  paidAt: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  firstSku: string | null;
  firstItemName: string | null;
  totalQuantity: number;
};

export type OrderDetailItem = {
  id: string;
  externalItemId: string | null;
  sku: string | null;
  name: string | null;
  title: string | null;
  quantity: number;
  unitPrice: string | null;
  currency: string | null;
  weight: string | null;
  declaredValue: string | null;
  productionStatus: string | null;
  scaleStatus: string | null;
  qcNote: string | null;
  createdAt: string;
  updatedAt: string;
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
  purchaseAt: string | null;
  paidAt: string | null;
  status: string;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  recipientAddress: unknown;
  destinationCountry: string | null;
  destinationState: string | null;
  destinationCity: string | null;
  destinationPostalCode: string | null;
  shippingService: string | null;
  shippingType: string | null;
  currency: string | null;
  orderTotal: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  items: OrderDetailItem[];
  statusHistory: Array<{
    id: string;
    status: string;
    note: string | null;
    actorType: "USER" | "API_KEY" | "SYSTEM";
    createdAt: string;
  }>;
  shipments?: ShipmentListItem[];
};

export type ShipmentListItem = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  externalOrderId: string;
  status: string;
  carrierCode: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};
