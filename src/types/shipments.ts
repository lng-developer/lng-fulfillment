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

export type ShipmentStatus =
  | "DRAFT"
  | "PENDING"
  | "CREATED"
  | "FAILED_CREATE"
  | "FAILED_LABEL"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "EXCEPTION"
  | "CANCELLED"
  | "RETURNED"
  | "TRACKING_PENDING"
  | "UNKNOWN";

export type ShipmentListItem = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  externalOrderId: string;
  sourceChannel: "AMAZON" | "ETSY" | "MANUAL" | "UNKNOWN" | null;
  status: ShipmentStatus;
  carrierCode: string | null;
  carrierName: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
  actualShipAt: string | null;
  portalTrackingSyncState: "SYNCED" | "FAILED" | null;
  labelUrl: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type ShipmentDetailItem = {
  id: string;
  orderItemId: string;
  externalItemId: string | null;
  sku: string | null;
  name: string | null;
  quantity: number;
  orderItemQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentStatusHistoryItem = {
  id: string;
  status: ShipmentStatus;
  note: string | null;
  actorType: "USER" | "API_KEY" | "SYSTEM";
  actorId: string | null;
  createdAt: string;
};

export type ShipmentDetail = ShipmentListItem & {
  carrierAccountId: string | null;
  items: ShipmentDetailItem[];
  statusHistory: ShipmentStatusHistoryItem[];
};

export type PreflightResult = {
  shipmentId: string;
  shipmentStatus: ShipmentStatus;
  carrierCode: string;
  credentialSource: "tenantCredential" | "envFallback" | "missing";
  credentialConfigured: boolean;
  liveEnabled: boolean;
  env: {
    baseUrlPresent: boolean;
    customerNoPresent: boolean;
    apiSecretPresent: boolean;
    defaultShippingMethodCode: string;
  };
  mappingPreview: {
    customerOrderNumber: string;
    shippingMethodCode: string;
    receiver: {
      country: string;
      state?: string;
      city?: string;
      postalCode?: string;
    };
    package: {
      weight: number;
      length?: number;
      width?: number;
      height?: number;
      packageCount: number;
    };
    parcels: Array<{
      sku: string;
      eName: string;
      cName?: string;
      quantity: number;
      unitWeight: number;
      unitPrice: number;
    }>;
    sourceCode: string;
  };
  warnings: string[];
};

export type TrackingResult = {
  status: ShipmentStatus | string | null;
  trackingNumber?: string | null;
  latestEvent?: string | null;
  eventsCount?: number;
};

export type TrackingSyncApiResult = {
  shipment: {
    id: string;
    status: ShipmentStatus;
    carrierCode: string | null;
    carrierShipmentId: string | null;
    trackingNumber: string | null;
    updatedAt: string;
  };
  tracking: {
    status: ShipmentStatus | string | null;
    latestEvent: {
      eventTime: string;
      message: string;
      location: string | null;
    } | null;
    eventsCount: number;
  };
};
