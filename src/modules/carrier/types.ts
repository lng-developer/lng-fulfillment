export const CARRIER_CODES = ["YUNEXPRESS_OMS", "VIETTEL_POST"] as const;

export type CarrierCode = (typeof CARRIER_CODES)[number];

export const CARRIER_ERROR_REASONS = [
  "AUTHENTICATION_FAILED",
  "VALIDATION_FAILED",
  "RATE_LIMITED",
  "TEMPORARY_UNAVAILABLE",
  "NOT_SUPPORTED",
  "REMOTE_REJECTED",
  "REMOTE_TIMEOUT",
  "UNKNOWN",
] as const;

export type CarrierErrorReason = (typeof CARRIER_ERROR_REASONS)[number];

export type CarrierSafeMetadata = Record<
  string,
  string | number | boolean | null | string[] | number[]
>;

export type CarrierServerMetadata = {
  safe?: CarrierSafeMetadata;
  rawResponse?: unknown;
};

export type CarrierCredentialSource = "tenantCredential" | "envFallback";

export type CarrierRuntimeCredentialPayload = Record<
  string,
  string | number | boolean | null
>;

export type CarrierRuntimeCredentials = {
  source: CarrierCredentialSource;
  carrierAccountId?: string | null;
  credentialId?: string | null;
  payload: CarrierRuntimeCredentialPayload;
};

export type CarrierAdapterContext = {
  tenantId: string;
  requestId?: string;
  credentials?: CarrierRuntimeCredentials;
};

export type CarrierError = {
  carrierCode: string;
  reason: CarrierErrorReason;
  message: string;
  retryable: boolean;
  statusCode?: number;
  safeMetadata?: CarrierSafeMetadata;
  rawResponse?: unknown;
};

export type NormalizedCarrierAddress = {
  name?: string;
  phone?: string;
  email?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type CreateCarrierShipmentItemInput = {
  shipmentItemId: string;
  orderItemId: string;
  externalItemId?: string | null;
  sku?: string | null;
  name?: string | null;
  quantity: number;
  weight?: number | null;
  declaredValue?: number | null;
  eName?: string | null;
  cName?: string | null;
  currencyCode?: string | null;
  invoicePart?: string | null;
  invoiceUsage?: string | null;
  remark?: string | null;
};

export type CreateCarrierShipmentInput = {
  tenantId: string;
  shipmentId: string;
  orderId: string;
  externalOrderId: string;
  orderNumber?: string | null;
  carrierCode: string;
  carrierAccountId?: string | null;
  recipient?: NormalizedCarrierAddress;
  destinationCountry?: string | null;
  items: CreateCarrierShipmentItemInput[];
  metadata?: CarrierSafeMetadata;
};

export type CreateCarrierShipmentResult = {
  carrierCode: string;
  carrierShipmentId: string;
  trackingNumber?: string | null;
  labelUrl?: string | null;
  retryable?: boolean;
  metadata?: CarrierServerMetadata;
};

export type GetCarrierLabelInput = {
  tenantId: string;
  shipmentId: string;
  carrierCode: string;
  carrierShipmentId: string;
  trackingNumber?: string | null;
  format?: "PDF" | "PNG" | "ZPL";
};

export type GetCarrierLabelResult = {
  carrierCode: string;
  carrierShipmentId: string;
  labelUrl?: string | null;
  labelData?: string | null;
  mimeType?: string | null;
  expiresAt?: Date | null;
  metadata?: CarrierServerMetadata;
};

export type GetCarrierTrackingInput = {
  tenantId: string;
  shipmentId: string;
  carrierCode: string;
  carrierShipmentId?: string | null;
  trackingNumber?: string | null;
  customerOrderNumber?: string | null;
};

export const CARRIER_TRACKING_STATUSES = [
  "TRACKING_PENDING",
  "IN_TRANSIT",
  "DELIVERED",
  "EXCEPTION",
  "CANCELLED",
  "RETURNED",
  "UNKNOWN",
] as const;

export type CarrierNormalizedTrackingStatus =
  (typeof CARRIER_TRACKING_STATUSES)[number];

export type CarrierTrackingEvent = {
  eventCode?: string | null;
  eventStatus: string;
  eventTime: Date;
  timezone?: string | null;
  statusCode?: number | null;
  statusDescription?: string | null;
  message?: string | null;
  location?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  description?: string | null;
};

export type GetCarrierTrackingResult = {
  carrierCode: string;
  carrierShipmentId?: string | null;
  trackingNumber?: string | null;
  status?: CarrierNormalizedTrackingStatus;
  packageState?: number | null;
  trackingStatus?: number | null;
  provider?: {
    carrierCode?: string | null;
    carrierName?: string | null;
    carrierWebsite?: string | null;
    carrierPhone?: string | null;
  } | null;
  events: CarrierTrackingEvent[];
  latestEvent?: CarrierTrackingEvent | null;
  errors?: Array<{
    code: string;
    message: string;
  }>;
  metadata?: CarrierServerMetadata;
};

export type CancelCarrierShipmentInput = {
  tenantId: string;
  shipmentId: string;
  carrierCode: string;
  carrierShipmentId: string;
  reason?: string;
};

export type CancelCarrierShipmentResult = {
  carrierCode: string;
  carrierShipmentId: string;
  cancelled: boolean;
  retryable?: boolean;
  metadata?: CarrierServerMetadata;
};

export type UpdateCarrierWeightInput = {
  tenantId: string;
  shipmentId: string;
  carrierCode: string;
  carrierShipmentId: string;
  weight: number;
  weightUnit: "kg" | "lb";
};

export type UpdateCarrierWeightResult = {
  carrierCode: string;
  carrierShipmentId: string;
  accepted: boolean;
  retryable?: boolean;
  metadata?: CarrierServerMetadata;
};

export type EstimateCarrierRateItemInput = {
  sku?: string | null;
  quantity: number;
  weight?: number | null;
  declaredValue?: number | null;
};

export type EstimateCarrierRateInput = {
  tenantId: string;
  carrierCode: string;
  carrierAccountId?: string | null;
  destinationCountry: string;
  items: EstimateCarrierRateItemInput[];
  metadata?: CarrierSafeMetadata;
};

export type EstimateCarrierRateResult = {
  carrierCode: string;
  serviceLevel?: string | null;
  amount?: number | null;
  currency?: string | null;
  estimatedDays?: number | null;
  retryable?: boolean;
  metadata?: CarrierServerMetadata;
};

export type CarrierAdapter = {
  carrierCode: string;
  assertCanCreateShipment?(
    input: CreateCarrierShipmentInput,
    context: CarrierAdapterContext,
  ): Promise<void>;
  createShipment(
    input: CreateCarrierShipmentInput,
    context: CarrierAdapterContext,
  ): Promise<CreateCarrierShipmentResult>;
  getLabel(
    input: GetCarrierLabelInput,
    context: CarrierAdapterContext,
  ): Promise<GetCarrierLabelResult>;
  getTracking(
    input: GetCarrierTrackingInput,
    context: CarrierAdapterContext,
  ): Promise<GetCarrierTrackingResult>;
  cancelShipment(
    input: CancelCarrierShipmentInput,
    context: CarrierAdapterContext,
  ): Promise<CancelCarrierShipmentResult>;
  updateWeight(
    input: UpdateCarrierWeightInput,
    context: CarrierAdapterContext,
  ): Promise<UpdateCarrierWeightResult>;
  estimateRate(
    input: EstimateCarrierRateInput,
    context: CarrierAdapterContext,
  ): Promise<EstimateCarrierRateResult>;
};

export type CarrierShipmentMappingPreview = {
  customerOrderNumber: string;
  shippingMethodCode: string;
  receiver: {
    country: string | null;
    state: string | null;
    city: string | null;
    postalCode: string | null;
  };
  package: {
    weight: number;
    length: number;
    width: number;
    height: number;
    packageCount: number;
  };
  parcels: Array<{
    sku: string | null;
    eName: string;
    cName: string;
    quantity: number;
    unitWeight: number | null;
    unitPrice: number | null;
  }>;
  sourceCode: string;
};

export type CarrierShipmentPreflightResult = {
  carrierCode: CarrierCode;
  credentialSource: "tenantCredential" | "envFallback" | "missing";
  credentialConfigured: boolean;
  liveEnabled: boolean;
  env: {
    baseUrlPresent: boolean;
    customerNoPresent: boolean;
    apiSecretPresent: boolean;
    defaultShippingMethodCode: string;
  };
  mappingPreview: CarrierShipmentMappingPreview;
  warnings: string[];
};
