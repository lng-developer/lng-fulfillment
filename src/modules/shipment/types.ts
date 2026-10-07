import type {
  AuditActorType,
  OrderSourceChannel,
  Prisma,
  ShipmentStatus,
} from "@prisma/client";
import type {
  CarrierCode,
  CarrierNormalizedTrackingStatus,
  CarrierShipmentMappingPreview,
  CarrierTrackingEvent,
} from "@/modules/carrier";
import type {
  ActualPackageInput,
  ShipmentCostSummary,
} from "@/modules/shipment-cost/types";
import type { PortalTrackingSyncState } from "./portal-tracking-sync-state";

export const DEFAULT_SHIPMENT_PAGE = 1;
export const DEFAULT_SHIPMENT_PAGE_SIZE = 20;
export const MAX_SHIPMENT_PAGE_SIZE = 100;

export const SHIPMENT_LIST_SORT_FIELDS = ["createdAt", "updatedAt"] as const;

export type ShipmentListSortField = (typeof SHIPMENT_LIST_SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

export type CreateDraftShipmentInput = {
  orderId: string;
  items: CreateDraftShipmentItemInput[];
};

export type CreateDraftShipmentItemInput = {
  orderItemId: string;
  quantity: number;
};

export type ShipmentActor = {
  actorType: Extract<AuditActorType, "USER" | "SYSTEM">;
  actorId?: string;
};

export type ShipmentListQuery = {
  page: number;
  pageSize: number;
  status?: ShipmentStatus;
  sourceChannel?: OrderSourceChannel;
  orderId?: string;
  search?: string;
  sortBy: ShipmentListSortField;
  sortOrder: SortOrder;
};

export type ShipmentListItem = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  externalOrderId: string;
  sourceChannel: OrderSourceChannel | null;
  status: ShipmentStatus;
  carrierCode: string | null;
  carrierName: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
  actualShipAt: Date | null;
  portalTrackingSyncState: PortalTrackingSyncState | null;
  labelUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
};

export type ShipmentDetail = {
  id: string;
  tenantId: string;
  orderId: string;
  orderNumber: string | null;
  externalOrderId: string;
  sourceChannel: OrderSourceChannel | null;
  status: ShipmentStatus;
  carrierCode: string | null;
  carrierAccountId: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
  actualShipAt: Date | null;
  actualShipEvidence: Prisma.JsonValue | null;
  portalTrackingSyncState: PortalTrackingSyncState | null;
  labelUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: ShipmentDetailItem[];
  statusHistory: ShipmentDetailStatusHistory[];
};

export type ShipmentMutationSummary = {
  id: string;
  orderId: string;
  status: ShipmentStatus;
  carrierCode: string | null;
  carrierAccountId?: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShipmentDetailItem = {
  id: string;
  orderItemId: string;
  externalItemId: string | null;
  sku: string | null;
  name: string | null;
  quantity: number;
  orderItemQuantity: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ShipmentDetailStatusHistory = {
  id: string;
  status: ShipmentStatus;
  note: string | null;
  actorType: AuditActorType;
  actorId: string | null;
  createdAt: Date;
};

export type PrepareShipmentCarrierExecutionInput = {
  shipmentId: string;
  carrierCode: string;
  carrierAccountId?: string | null;
};

export type PrepareShipmentCarrierExecutionResult = {
  shipment: ShipmentDetail;
  carrierCode: CarrierCode;
  carrierAccountId: string | null;
  adapterRegistered: boolean;
  nextTask: "V2-032 — Shipment Execution Service";
};

export type ExecuteShipmentInput = {
  carrierCode: string;
  carrierAccountId?: string | null;
  environment?: ShipmentYunEnvironment;
  options?: ShipOrderOptions;
};

export type ShipmentYunEnvironment = "test" | "live";

export type ShipOrderInput = {
  orderId: string;
  environment: ShipmentYunEnvironment;
  options?: ShipOrderOptions;
};

export type ShipOrdersBatchInput = {
  orderIds: string[];
  environment: ShipmentYunEnvironment;
  optionsByOrderId?: Record<string, ShipOrderOptions | undefined>;
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
  iossNumber?: string;
  hsCode?: string;
  parcels?: ShipParcelOverride[];
};

export type PreflightShipmentExecutionInput = {
  carrierCode: string;
  carrierAccountId?: string | null;
  options?: ShipOrderOptions;
};

export type ShipmentExecutionPreflightResult = {
  shipmentId: string;
  shipmentStatus: ShipmentStatus;
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

export type ExecuteShipmentResult = {
  shipment: ShipmentDetail;
  carrierCode: CarrierCode;
  carrierAccountId: string | null;
};

export type ShipOrderResult = {
  shipment: ShipmentMutationSummary;
  carrierCode: CarrierCode;
  carrierAccountId: string | null;
  orderId: string;
  orderStatus: "IN_PROCESSING";
  environment: ShipmentYunEnvironment;
};

export type ShipOrdersBatchResult = {
  results: Array<{
    orderId: string;
    success: boolean;
    shipment?: ShipmentMutationSummary;
    error?: {
      code: string;
      message: string;
      details?: unknown;
    };
  }>;
};

export type ConfirmOrderShippedResult = {
  orderId: string;
  orderStatus: "SHIPPED";
  labelUrl: string;
  shipment: ShipmentDetail;
  shipmentCost: ShipmentCostSummary;
};

export type ConfirmOrderShippedInput = {
  actualPackage: ActualPackageInput;
};

export type CancelOrderYunResult = {
  orderId: string;
  orderStatus: "CANCELLED";
  shipment: ShipmentMutationSummary;
};

export type ResetCancelledOrderResult = {
  orderId: string;
  orderStatus: "FULFILLED";
  shipment?: {
    id: string;
    status: ShipmentStatus;
    carrierCode: string | null;
    carrierShipmentId: string | null;
    trackingNumber: string | null;
    labelUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type ShipmentTrackingSyncResult = {
  shipment: {
    id: string;
    status: ShipmentStatus;
    carrierCode: string | null;
    carrierShipmentId: string | null;
    trackingNumber: string | null;
    actualShipAt: Date | null;
    updatedAt: Date;
  };
  tracking: {
    status: CarrierNormalizedTrackingStatus | null;
    latestEvent: Pick<
      CarrierTrackingEvent,
      "eventTime" | "message" | "location"
    > | null;
    eventsCount: number;
  };
  portalTrackingSyncState: "SYNCED" | "FAILED" | null;
};

export type EtsyTrackingSyncBatchResult = {
  attempted: number;
  yunSynced: number;
  noActualShipEvent: number;
  yunFailed: number;
  portalSynced: number;
  portalFailed: number;
};

export type PaginationMeta = {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
