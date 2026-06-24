export type PlatformAdminRole = "PLATFORM_ADMIN" | "PLATFORM_SUPPORT";
export type PlatformTenantStatus = "ACTIVE" | "DISABLED";
export type PlatformTenantType = "INTERNAL" | "CLIENT" | "PARTNER";
export type PlatformTenantRole = "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";
export type PlatformMembershipStatus = "ACTIVE" | "DISABLED" | "INVITED";

export type PlatformPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PlatformTenantSummary = {
  id: string;
  name: string;
  slug: string;
  type: PlatformTenantType;
  status: PlatformTenantStatus;
  membersCount: number;
  ownersCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PlatformTenantDetail = PlatformTenantSummary & {
  apiKeysCount: number;
  ordersCount: number;
  shipmentsCount: number;
  carrierAccountsCount: number;
};

export type PlatformMember = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  userStatus: "ACTIVE" | "DISABLED";
  role: PlatformTenantRole;
  membershipStatus: PlatformMembershipStatus;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAuditLog = {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  actorType: "USER" | "API_KEY" | "SYSTEM";
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type YunWebhookEventStatus =
  | "RECEIVED"
  | "PROCESSED"
  | "DUPLICATE"
  | "FAILED"
  | "UNMATCHED";

export type YunWebhookEventCategory =
  | "TRACKING"
  | "FEE"
  | "ABNORMAL"
  | "UNKNOWN";

export type PlatformYunWebhookEvent = {
  id: string;
  eventId: string | null;
  eventType: string | null;
  eventCategory: YunWebhookEventCategory;
  dataCode: string | null;
  waybillNumber: string | null;
  trackingNumber: string | null;
  customerOrderNumber: string | null;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  shipmentId: string | null;
  shipmentStatus: string | null;
  shipmentOrderNumber: string | null;
  shipmentExternalOrderId: string | null;
  shipmentCostId: string | null;
  shipmentActualFeeStatus: string | null;
  shipmentActualTotalFee: string | null;
  status: YunWebhookEventStatus;
  errorMessage: string | null;
  safeMetadata: Record<string, unknown> | null;
  receivedAt: string;
  processedAt: string | null;
  canReprocess: boolean;
};

export type PlatformYunWebhookEventDetail = PlatformYunWebhookEvent & {
  timestampHeader: string | null;
  signatureHeaderMasked: string | null;
  decryptedPayload: Record<string, unknown> | null;
};

export type PlatformYunWebhookStats = {
  total: number;
  failed: number;
  unmatched: number;
  needsAttention: number;
  processed: number;
  tracking: number;
  fee: number;
  abnormal: number;
};

export type PlatformYunWebhookSetup = {
  webhookUrl: string;
  receiverPath: string;
  enabled: boolean;
  encryptionKeyConfigured: boolean;
  registrationMode: "manual";
  requiredHeaders: string[];
  requestBodyShape: { encrypt: string };
  checklist: string[];
  warnings: string[];
};
