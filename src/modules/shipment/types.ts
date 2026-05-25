import type { AuditActorType, ShipmentStatus } from "@prisma/client";
import type {
  CarrierCode,
  CarrierNormalizedTrackingStatus,
  CarrierShipmentMappingPreview,
  CarrierTrackingEvent,
} from "@/modules/carrier";

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
  status: ShipmentStatus;
  carrierCode: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
};

export type ShipmentDetail = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  externalOrderId: string;
  status: ShipmentStatus;
  carrierCode: string | null;
  carrierAccountId: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: ShipmentDetailItem[];
  statusHistory: ShipmentDetailStatusHistory[];
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
};

export type PreflightShipmentExecutionInput = {
  carrierCode: string;
  carrierAccountId?: string | null;
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

export type ShipmentTrackingSyncResult = {
  shipment: {
    id: string;
    status: ShipmentStatus;
    carrierCode: string | null;
    carrierShipmentId: string | null;
    trackingNumber: string | null;
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
};

export type PaginationMeta = {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
