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

export type OrderStatus =
  | "FULFILLED"
  | "IN_PROCESSING"
  | "SHIPPED"
  | "CANCELLED"
  | "ON_HOLD"
  | "READY_TO_SHIP"
  | "RECEIVED"
  | "DRAFT"
  | string;

export type OrderSourceChannel = "AMAZON" | "ETSY" | "MANUAL" | "UNKNOWN" | string;

export type ShipEnvironment = "test" | "live";

export const YUN_ENDPOINTS: Record<ShipEnvironment, string> = {
  test: "http://omsapi.uat.yunexpress.com/",
  live: "http://oms.api.yunexpress.com/",
};

export type ShipMappingPreview = {
  customerOrderNumber: string;
  shippingMethodCode: string;
  sourceCode: string;
  receiver: {
    country: string;
    state?: string;
    city?: string;
    postalCode?: string;
  };
  estimatedWeight?: number;
  parcelCount: number;
  items: Array<{
    sku: string;
    name?: string;
    quantity: number;
    unitWeight?: number;
    unitPrice?: number;
  }>;
};

export type ShipParcelOverride = {
  orderItemId?: string;
  sku?: string;
  eName?: string;
  cName?: string;
  unitPrice?: number;
  unitWeight?: number;
  currencyCode?: string;
  invoicePart?: string;
  invoiceUsage?: string;
  remark?: string;
};

export type ShipOrderOptions = {
  shippingMethodCode?: string;
  sourceCode?: string;
  receiverFirstName?: string;
  receiverLastName?: string;
  receiverCompany?: string;
  receiverCountryCode?: string;
  receiverStreet?: string;
  receiverCity?: string;
  receiverState?: string;
  receiverZip?: string;
  receiverPhone?: string;
  receiverEmail?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  sizeUnits?: string;
  packageCount?: number;
  applicationType?: number;
  returnOption?: number;
  tariffPrepay?: number;
  insuranceOption?: number;
  parcels?: ShipParcelOverride[];
};

export type BatchShipSuccess = {
  orderId: string;
  shipment?: {
    id?: string;
    status?: string;
    carrierCode?: string | null;
    carrierShipmentId?: string | null;
    trackingNumber?: string | null;
    labelUrl?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
};

export type BatchShipResult = {
  succeeded: BatchShipSuccess[];
  failed: Array<{ orderId: string; message: string; details?: unknown }>;
};

export type OrderListItem = {
  id: string;
  externalOrderId: string;
  orderNumber: string | null;
  source: string | null;
  sourceChannel: OrderSourceChannel | null;
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
  latestShipmentStatus: string | null;
  latestTrackingNumber: string | null;
  latestLabelUrl: string | null;
  trackingNumber?: string | null;
  carrierShipmentId?: string | null;
  labelUrl?: string | null;
  latestShipmentCarrier?: string | null;
  shipMappingPreview?: ShipMappingPreview | null;
};

export type OrderDetailItem = {
  id: string;
  externalItemId: string | null;
  sku: string | null;
  name: string | null;
  title: string | null;
  asin: string | null;
  listingId: string | null;
  productType: string | null;
  variant: string | null;
  quantity: number;
  unitPrice: string | null;
  currency: string | null;
  weight: string | null;
  declaredValue: string | null;
  customizationUrl: string | null;
  snapshotImageUrl: string | null;
  baseImageUrl: string | null;
  totalCustomizationPrice: string | null;
  customizationOptions: PortalCustomizationOption[];
  trackingInfo: PortalItemTrackingInfo | null;
  fulfillmentFiles: PortalFileLinks;
  costCenter: PortalCostCenterSummary | null;
  listing: PortalListingSummary | null;
  fulfillmentFileSummary: SafeJsonSummary | null;
  listingSnapshotSummary: SafeJsonSummary | null;
  costCenterSnapshotSummary: SafeJsonSummary | null;
  productionStatus: string | null;
  scaleStatus: string | null;
  qcNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PortalCustomizationOption = {
  label: string;
  value: string;
};

export type PortalItemTrackingInfo = {
  fulfillment: string | null;
  status: string | null;
  tracking: string | null;
  note: string | null;
};

export type PortalFileLinks = Record<string, string>;

export type PortalCostCenterSummary = {
  vendorProductId: string | null;
  vendorProductDisplayName: string | null;
  vendorProductSKU: string | null;
  sizeValue: string | null;
  colorValue: string | null;
};

export type PortalListingSummary = {
  asinType: string | null;
  productImageUrl: string | null;
  psd: PortalListingPsdSummary | null;
};

export type PortalListingPsdSummary = {
  status: string | null;
  fileExt: string | null;
  archive: boolean | null;
  fileName: string | null;
  mime: string | null;
  psdId: string | null;
  size: string | null;
  url: string | null;
};

export type SafeJsonSummary = {
  type: "object" | "array" | "string" | "number" | "boolean";
  keys?: string[];
  itemCount?: number;
  valuePreview?: string;
};

export type OrderDetail = {
  id: string;
  externalOrderId: string;
  orderNumber: string | null;
  source: string | null;
  sourceChannel: OrderSourceChannel | null;
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
  portalMetadata: OrderPortalMetadata | null;
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

export type OrderPortalMetadata = {
  merchantId: string | null;
  marketplaceId: string | null;
  portalCreatedAt: string | null;
  baseCost: string | null;
  addressValidation: boolean | null;
  scaleOverallStatus: string | null;
  scaledBy: PortalPersonSummary | null;
  seller: PortalPersonSummary | null;
};

export type PortalPersonSummary = {
  id: string | null;
  name: string | null;
  email: string | null;
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
