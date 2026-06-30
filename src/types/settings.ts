import type { Role } from "@/lib/rbac";

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

export type TenantProfile = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: Role;
  membershipStatus: "ACTIVE" | "DISABLED" | string;
};

export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: "ACTIVE" | "REVOKED";
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

export type ApiKeyCreateResponse = {
  apiKey: string;
  apiKeyRecord: ApiKey;
};

export type Member = {
  id: string;
  membershipId?: string;
  userId: string;
  email: string;
  name?: string | null;
  role: Role;
  status?: "ACTIVE" | "DISABLED";
  membershipStatus?: "ACTIVE" | "DISABLED";
  createdAt: string;
};

export type CarrierAccount = {
  id: string;
  carrierCode: string;
  displayName: string;
  status: "ACTIVE" | "DISABLED" | string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  credential?: {
    id: string;
    credentialType: string;
    keyPrefix: string | null;
    status: string;
    lastValidatedAt: string | null;
    expiresAt: string | null;
    updatedAt: string;
  } | null;
};

export type ShipmentAutomationSetting = {
  id: string | null;
  tenantId: string;
  autoCreateEnabled: boolean;
  environment: "test" | "live";
  createdAt: string | null;
  updatedAt: string | null;
};

export type SkuShippingMethodMapping = {
  id: string;
  skuCode: string;
  shippingMethodCode: string;
  description: string | null;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
};

export type ShipmentAutomationConfig = {
  setting: ShipmentAutomationSetting;
  mappings: SkuShippingMethodMapping[];
};

export type CredentialFormValues = {
  customerNo: string;
  apiSecret: string;
  baseUrl: string;
  lang: string;
  shippingMethodCode: string;
  sourceCode: string;
  sizeUnit: "cm" | "inch";
  liveEnabled: boolean;
};

export type AuditLog = {
  id: string;
  action: string;
  actorType: "USER" | "API_KEY" | "SYSTEM";
  actorUserId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorKeyPrefix?: string | null;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
