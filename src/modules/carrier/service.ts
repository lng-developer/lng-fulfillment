import type {
  CarrierAccount,
  CarrierCredential,
  CarrierAccountStatus,
  CarrierCredentialType,
  Prisma,
  TenantRole,
} from "@prisma/client";
import { CarrierCredentialType as PrismaCarrierCredentialType } from "@prisma/client";

import { recordUserAuditLog } from "@/modules/audit";
import {
  getYunExpressOmsConfig,
  validateYunExpressLiveConfig,
} from "@/integrations/yunexpress-oms/config";
import { AppError } from "@/shared/errors";
import type {
  CarrierRuntimeCredentials,
  CarrierRuntimeCredentialPayload,
} from "./types";
import {
  assertCarrierCredentialEncryptionConfigured,
  buildCredentialKeyPrefix,
  decryptCarrierCredentialPayload,
  encryptCarrierCredentialPayload,
} from "@/shared/security";

import {
  createCarrierAccountRecord,
  createCarrierCredentialRecord,
  disableCarrierCredentialRecord,
  findCarrierAccountRecord,
  findCarrierAccountSummaryRecord,
  findCarrierCredentialRecord,
  findDefaultCarrierAccountRecord,
  findCarrierMembershipForUser,
  listCarrierAccountRecords,
  listCarrierAccountSummaryRecords,
  updateCarrierAccountRecord,
} from "./repository";
import { isKnownCarrierCode, normalizeCarrierCode } from "./registry";

const CARRIER_ACCOUNT_MANAGE_ROLES: TenantRole[] = ["OWNER", "ADMIN"];
const CARRIER_ACCOUNT_STATUSES = ["ACTIVE", "DISABLED"] as const;
const CARRIER_CREDENTIAL_MODES = ["encryptedPayload", "secretRef"] as const;
const YUNEXPRESS_DEFAULT_LANG = "en-US";
const YUNEXPRESS_DEFAULT_SHIPPING_METHOD_CODE = "THZXR";
const YUNEXPRESS_DEFAULT_SOURCE_CODE = "API";
const YUNEXPRESS_DEFAULT_SIZE_UNIT = "cm";
const MAX_DISPLAY_NAME_LENGTH = 100;
const MAX_SAFE_STRING_LENGTH = 120;
const MAX_SECRET_REF_LENGTH = 300;
const SAFE_TEXT_PATTERN = /^[A-Za-z0-9 _./:@*+-]+$/;
const SAFE_KEY_PREFIX_PATTERN = /^[A-Za-z0-9_.:*+-]{3,80}$/;
const VIETTEL_POST_AUTH_HOSTS = new Set([
  "auth-staging.logistek.com.vn",
  "auth-global.viettelpost.vn",
]);
const VIETTEL_POST_ORDER_HOSTS = new Set([
  "order-staging.logistek.com.vn",
  "api-global.viettelpost.vn",
]);
const YUNEXPRESS_CREDENTIAL_KEYS = [
  "customerNo",
  "apiSecret",
  "baseUrl",
  "lang",
  "defaultShippingMethodCode",
  "defaultSourceCode",
  "defaultSizeUnit",
  "liveEnabled",
] as const;
const VIETTEL_POST_CREDENTIAL_KEYS = [
  "clientId",
  "clientSecret",
  "authUrl",
  "orderUrl",
  "lineShipId",
  "shipFromFirstName",
  "shipFromLastName",
  "shipFromPhoneNumber",
  "shipFromAddress1",
  "shipFromCountry",
  "shipFromState",
  "shipFromCity",
  "shipFromZipCode",
  "liveEnabled",
] as const;

export type CarrierAccountSummary = {
  id: string;
  tenantId: string;
  carrierCode: string;
  displayName: string;
  status: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CarrierCredentialSummary = {
  id: string;
  tenantId: string;
  carrierAccountId: string;
  credentialType: CarrierCredentialType;
  keyPrefix: string | null;
  status: string;
  encryptionVersion: string | null;
  keyVersion: string | null;
  lastValidatedAt: Date | null;
  rotatedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CarrierAccountManagementSummary = Omit<
  CarrierAccountSummary,
  "tenantId"
> & {
  credential: Omit<CarrierCredentialSummary, "tenantId" | "carrierAccountId"> | null;
};

export type CarrierAccountCreateInput = {
  carrierCode: string;
  displayName: string;
  isDefault: boolean;
};

export type CarrierAccountUpdateInput = {
  displayName?: string;
  status?: Extract<CarrierAccountStatus, "ACTIVE" | "DISABLED">;
  isDefault?: boolean;
};

export type CarrierCredentialSaveInput =
  | {
      credentialType: "YUNEXPRESS_OMS";
      mode: "encryptedPayload";
      credentials: YunExpressOmsCredentialPayload;
    }
  | {
      credentialType: "VIETTEL_POST";
      mode: "encryptedPayload";
      credentials: ViettelPostCredentialPayload;
    }
  | {
      credentialType: CarrierCredentialType;
      mode: "secretRef";
      secretRef: string;
      keyPrefix: string;
    };

export type YunExpressOmsCredentialPayload = {
  customerNo: string;
  apiSecret: string;
  baseUrl: string;
  lang: string;
  defaultShippingMethodCode: string;
  defaultSourceCode: string;
  defaultSizeUnit: string;
  liveEnabled: boolean;
};

export type ViettelPostCredentialPayload = {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  orderUrl: string;
  lineShipId: string;
  shipFromFirstName: string;
  shipFromLastName: string;
  shipFromPhoneNumber: string;
  shipFromAddress1: string;
  shipFromCountry: string;
  shipFromState: string;
  shipFromCity: string;
  shipFromZipCode: string;
  liveEnabled: boolean;
};

export type ResolvedCarrierCredentials =
  | {
      source: "encryptedPayload";
      carrierCode: string;
      account: CarrierAccountSummary;
      credential: CarrierCredentialSummary;
      payload: unknown;
    }
  | {
      source: "secretRef";
      carrierCode: string;
      account: CarrierAccountSummary;
      credential: CarrierCredentialSummary;
      secretRef: string;
    }
  | {
      source: "env";
      carrierCode: "YUNEXPRESS_OMS";
      payload: {
        baseUrl: string;
        customerNo: string;
        apiSecret: string;
        lang: string;
        liveEnabled: boolean;
        defaultShippingMethodCode: string;
        defaultSourceCode: string;
        defaultSizeUnit: string;
        timeoutMs: number;
      };
    };

export type CarrierCredentialRuntimeStatus = {
  credentialSource: "tenantCredential" | "envFallback" | "missing";
  credentialConfigured: boolean;
  liveEnabled: boolean;
  carrierAccountId: string | null;
  credentialId: string | null;
  runtimeCredentials?: CarrierRuntimeCredentials;
  warnings: string[];
};

function toCarrierAccountSummary(account: CarrierAccount): CarrierAccountSummary {
  return {
    id: account.id,
    tenantId: account.tenantId,
    carrierCode: account.carrierCode,
    displayName: account.displayName,
    status: account.status,
    isDefault: account.isDefault,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

function toCarrierCredentialSummary(
  credential: CarrierCredential,
): CarrierCredentialSummary {
  return {
    id: credential.id,
    tenantId: credential.tenantId,
    carrierAccountId: credential.carrierAccountId,
    credentialType: credential.credentialType,
    keyPrefix: credential.keyPrefix,
    status: credential.status,
    encryptionVersion: credential.encryptionVersion,
    keyVersion: credential.keyVersion,
    lastValidatedAt: credential.lastValidatedAt,
    rotatedAt: credential.rotatedAt,
    expiresAt: credential.expiresAt,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
  };
}

function toCarrierCredentialManagementSummary(
  credential: Omit<CarrierCredentialSummary, "tenantId" | "carrierAccountId">,
) {
  return credential;
}

function toCarrierAccountManagementSummary(account: {
  id: string;
  carrierCode: string;
  displayName: string;
  status: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  credentials: Array<{
    id: string;
    credentialType: CarrierCredentialType;
    keyPrefix: string | null;
    status: string;
    encryptionVersion: string | null;
    keyVersion: string | null;
    lastValidatedAt: Date | null;
    rotatedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): CarrierAccountManagementSummary {
  return {
    id: account.id,
    carrierCode: account.carrierCode,
    displayName: account.displayName,
    status: account.status,
    isDefault: account.isDefault,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    credential: account.credentials[0]
      ? toCarrierCredentialManagementSummary(account.credentials[0])
      : null,
  };
}

function assertKnownCarrierCode(carrierCode: string) {
  const normalized = normalizeCarrierCode(carrierCode);
  if (!isKnownCarrierCode(normalized)) {
    throw new AppError("CARRIER_ERROR", "Carrier is not supported.", 400, {
      carrierCode: normalized,
    });
  }

  return normalized;
}

function resolveYunExpressEnvFallback(): ResolvedCarrierCredentials {
  const config = getYunExpressOmsConfig();
  const missing = validateYunExpressLiveConfig(config);

  if (missing.length > 0 || !config.baseUrl || !config.customerNo || !config.apiSecret) {
    throw new AppError("CARRIER_ERROR", "Carrier credentials are not configured.", 503, {
      carrierCode: "YUNEXPRESS_OMS",
      source: "env",
      missingConfigCount: missing.length,
    });
  }

  return {
    source: "env",
    carrierCode: "YUNEXPRESS_OMS",
    payload: {
      baseUrl: config.baseUrl,
      customerNo: config.customerNo,
      apiSecret: config.apiSecret,
      lang: config.lang,
      liveEnabled: config.liveEnabled,
      defaultShippingMethodCode: config.defaultShippingMethodCode,
      defaultSourceCode: config.defaultSourceCode,
      defaultSizeUnit: config.defaultSizeUnit,
      timeoutMs: config.timeoutMs,
    },
  };
}

export async function listCarrierAccounts(tenantId: string) {
  const accounts = await listCarrierAccountRecords(tenantId);
  return accounts.map(toCarrierAccountSummary);
}

export async function listManagedCarrierAccounts(
  tenantId: string,
  actorUserId: string,
) {
  await assertCanManageCarrierCredentials(tenantId, actorUserId);

  const accounts = await listCarrierAccountSummaryRecords(tenantId);
  return accounts.map(toCarrierAccountManagementSummary);
}

export async function getCarrierAccountSummary(
  tenantId: string,
  carrierAccountId: string,
) {
  const account = await findCarrierAccountRecord(tenantId, carrierAccountId);
  return account ? toCarrierAccountSummary(account) : null;
}

export async function getDefaultCarrierAccount(tenantId: string, carrierCode: string) {
  const normalizedCarrierCode = assertKnownCarrierCode(carrierCode);
  const account = await findDefaultCarrierAccountRecord(tenantId, normalizedCarrierCode);
  return account ? toCarrierAccountSummary(account) : null;
}

export async function getCarrierCredentialSummary(
  tenantId: string,
  carrierAccountId: string,
) {
  const account = await findCarrierAccountRecord(tenantId, carrierAccountId);
  if (!account) {
    return null;
  }

  const credential = await findCarrierCredentialRecord(tenantId, carrierAccountId);
  return credential ? toCarrierCredentialSummary(credential) : null;
}

export async function getManagedCarrierAccount(
  tenantId: string,
  carrierAccountId: string,
  actorUserId: string,
) {
  await assertCanManageCarrierCredentials(tenantId, actorUserId);

  const account = await findCarrierAccountSummaryRecord(tenantId, carrierAccountId);
  if (!account) {
    throw new AppError("NOT_FOUND", "Carrier account not found.", 404);
  }

  return toCarrierAccountManagementSummary(account);
}

export async function createCarrierAccount(
  tenantId: string,
  input: CarrierAccountCreateInput,
  actorUserId: string,
) {
  await assertCanManageCarrierCredentials(tenantId, actorUserId);
  const carrierCode = assertKnownCarrierCode(input.carrierCode);

  const account = await createCarrierAccountRecord({
    tenantId,
    carrierCode,
    displayName: input.displayName,
    status: "ACTIVE",
    isDefault: input.isDefault,
    actorUserId,
  });

  const summary = toCarrierAccountManagementSummary(account);
  await recordUserAuditLog({
    tenantId,
    actorUserId,
    action: "CARRIER_ACCOUNT_CREATED",
    resourceType: "CarrierAccount",
    resourceId: summary.id,
    metadata: {
      carrierAccountId: summary.id,
      carrierCode: summary.carrierCode,
      status: summary.status,
      isDefault: summary.isDefault,
    },
  });

  return summary;
}

export async function updateCarrierAccount(
  tenantId: string,
  carrierAccountId: string,
  input: CarrierAccountUpdateInput,
  actorUserId: string,
) {
  await assertCanManageCarrierCredentials(tenantId, actorUserId);

  const current = await findCarrierAccountRecord(tenantId, carrierAccountId);
  if (!current) {
    throw new AppError("NOT_FOUND", "Carrier account not found.", 404);
  }

  if (input.status === "DISABLED" && input.isDefault === true) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Disabled carrier account cannot be default.",
      400,
    );
  }

  const updated = await updateCarrierAccountRecord({
    tenantId,
    carrierAccountId,
    carrierCode: current.carrierCode,
    displayName: input.displayName,
    status: input.status,
    isDefault: input.isDefault,
    actorUserId,
  });

  if (!updated) {
    throw new AppError("NOT_FOUND", "Carrier account not found.", 404);
  }

  const summary = toCarrierAccountManagementSummary(updated);
  await recordUserAuditLog({
    tenantId,
    actorUserId,
    action: "CARRIER_ACCOUNT_UPDATED",
    resourceType: "CarrierAccount",
    resourceId: summary.id,
    metadata: {
      carrierAccountId: summary.id,
      carrierCode: summary.carrierCode,
      previousStatus: current.status,
      status: summary.status,
      isDefault: summary.isDefault,
    },
  });

  return summary;
}

export async function saveCarrierCredential(
  tenantId: string,
  carrierAccountId: string,
  input: CarrierCredentialSaveInput,
  actorUserId: string,
) {
  await assertCanManageCarrierCredentials(tenantId, actorUserId);

  const account = await findCarrierAccountRecord(tenantId, carrierAccountId);
  if (!account) {
    throw new AppError("NOT_FOUND", "Carrier account not found.", 404);
  }

  if (account.carrierCode !== input.credentialType) {
    throw new AppError(
      "VALIDATION_ERROR",
      "credentialType must match carrier account carrierCode.",
      400,
    );
  }

  const encryptedInput = buildCredentialPersistenceInput(input);
  const { credential, rotatedCount } = await createCarrierCredentialRecord({
    tenantId,
    carrierAccountId,
    credentialType: input.credentialType,
    secretRef: encryptedInput.secretRef,
    encryptedPayload: encryptedInput.encryptedPayload,
    keyPrefix: encryptedInput.keyPrefix,
    encryptionVersion: encryptedInput.encryptionVersion,
    keyVersion: encryptedInput.keyVersion,
    expiresAt: null,
    actorUserId,
  });

  if (rotatedCount > 0) {
    await recordUserAuditLog({
      tenantId,
      actorUserId,
      action: "CARRIER_CREDENTIAL_UPDATED",
      resourceType: "CarrierCredential",
      resourceId: credential.id,
      metadata: {
        carrierAccountId,
        carrierCode: account.carrierCode,
        credentialType: credential.credentialType,
        status: "ROTATED",
        rotatedCount,
      },
    });
  }

  await recordUserAuditLog({
    tenantId,
    actorUserId,
    action: "CARRIER_CREDENTIAL_CREATED",
    resourceType: "CarrierCredential",
    resourceId: credential.id,
    metadata: {
      carrierAccountId,
      carrierCode: account.carrierCode,
      credentialId: credential.id,
      credentialType: credential.credentialType,
      status: credential.status,
      keyPrefix: credential.keyPrefix,
    },
  });

  return credential;
}

export async function disableCarrierCredential(
  tenantId: string,
  carrierAccountId: string,
  credentialId: string,
  actorUserId: string,
) {
  await assertCanManageCarrierCredentials(tenantId, actorUserId);

  const account = await findCarrierAccountRecord(tenantId, carrierAccountId);
  if (!account) {
    throw new AppError("NOT_FOUND", "Carrier account not found.", 404);
  }

  const credential = await disableCarrierCredentialRecord({
    tenantId,
    carrierAccountId,
    credentialId,
    actorUserId,
  });

  if (!credential) {
    throw new AppError("NOT_FOUND", "Carrier credential not found.", 404);
  }

  await recordUserAuditLog({
    tenantId,
    actorUserId,
    action: "CARRIER_CREDENTIAL_DISABLED",
    resourceType: "CarrierCredential",
    resourceId: credential.id,
    metadata: {
      carrierAccountId,
      carrierCode: account.carrierCode,
      credentialId: credential.id,
      credentialType: credential.credentialType,
      status: credential.status,
      keyPrefix: credential.keyPrefix,
    },
  });

  return credential;
}

export async function resolveCarrierCredentials(
  tenantId: string,
  carrierCode: string,
  carrierAccountId?: string | null,
): Promise<ResolvedCarrierCredentials> {
  const normalizedCarrierCode = assertKnownCarrierCode(carrierCode);
  const account = carrierAccountId
    ? await findCarrierAccountRecord(tenantId, carrierAccountId)
    : await findDefaultCarrierAccountRecord(tenantId, normalizedCarrierCode);

  if (!account) {
    if (carrierAccountId) {
      throw new AppError("NOT_FOUND", "Carrier account not found.", 404);
    }

    if (normalizedCarrierCode === "YUNEXPRESS_OMS") {
      return resolveYunExpressEnvFallback();
    }

    throw new AppError("CARRIER_ERROR", "Carrier account is not configured.", 503, {
      carrierCode: normalizedCarrierCode,
    });
  }

  if (account.carrierCode !== normalizedCarrierCode) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Carrier account does not match carrier code.",
      400,
      {
        carrierCode: normalizedCarrierCode,
        carrierAccountId: account.id,
      },
    );
  }

  if (account.status !== "ACTIVE") {
    throw new AppError("CARRIER_ERROR", "Carrier account is disabled.", 409, {
      carrierCode: normalizedCarrierCode,
      carrierAccountId: account.id,
    });
  }

  const credential = await findCarrierCredentialRecord(tenantId, account.id);
  if (!credential) {
    if (!carrierAccountId && normalizedCarrierCode === "YUNEXPRESS_OMS") {
      return resolveYunExpressEnvFallback();
    }

    throw new AppError("CARRIER_ERROR", "Carrier credential is not configured.", 503, {
      carrierCode: normalizedCarrierCode,
      carrierAccountId: account.id,
    });
  }

  const accountSummary = toCarrierAccountSummary(account);
  const credentialSummary = toCarrierCredentialSummary(credential);

  if (credential.secretRef) {
    return {
      source: "secretRef",
      carrierCode: normalizedCarrierCode,
      account: accountSummary,
      credential: credentialSummary,
      secretRef: credential.secretRef,
    };
  }

  if (credential.encryptedPayload) {
    return {
      source: "encryptedPayload",
      carrierCode: normalizedCarrierCode,
      account: accountSummary,
      credential: credentialSummary,
      payload: decryptCarrierCredentialPayload(credential.encryptedPayload),
    };
  }

  throw new AppError("CARRIER_ERROR", "Carrier credential payload is not configured.", 503, {
    carrierCode: normalizedCarrierCode,
    carrierAccountId: account.id,
  });
}

export async function resolveCarrierRuntimeCredentials(
  tenantId: string,
  carrierCode: string,
  carrierAccountId?: string | null,
): Promise<CarrierRuntimeCredentials> {
  const resolved = await resolveCarrierCredentials(
    tenantId,
    carrierCode,
    carrierAccountId,
  );

  if (resolved.source === "env") {
    return {
      source: "envFallback",
      carrierAccountId: null,
      credentialId: null,
      payload: resolved.payload,
    };
  }

  if (resolved.source === "secretRef") {
    throw new AppError(
      "CARRIER_ERROR",
      "Carrier secret reference resolution is not implemented.",
      501,
      {
        carrierCode: resolved.carrierCode,
        carrierAccountId: resolved.account.id,
        credentialId: resolved.credential.id,
        credentialSource: "tenantCredential",
      },
    );
  }

  return {
    source: "tenantCredential",
    carrierAccountId: resolved.account.id,
    credentialId: resolved.credential.id,
    payload:
      resolved.carrierCode === "YUNEXPRESS_OMS"
        ? normalizeYunExpressRuntimePayload(resolved.payload)
        : normalizeViettelPostRuntimePayload(resolved.payload),
  };
}

export async function getCarrierCredentialRuntimeStatus(
  tenantId: string,
  carrierCode: string,
  carrierAccountId?: string | null,
): Promise<CarrierCredentialRuntimeStatus> {
  try {
    const runtimeCredentials = await resolveCarrierRuntimeCredentials(
      tenantId,
      carrierCode,
      carrierAccountId,
    );

    return {
      credentialSource: runtimeCredentials.source,
      credentialConfigured: true,
      liveEnabled: Boolean(runtimeCredentials.payload.liveEnabled),
      carrierAccountId: runtimeCredentials.carrierAccountId ?? null,
      credentialId: runtimeCredentials.credentialId ?? null,
      runtimeCredentials,
      warnings: [],
    };
  } catch (error) {
    if (error instanceof AppError) {
      const details =
        typeof error.details === "object" && error.details !== null
          ? (error.details as Record<string, unknown>)
          : {};
      const credentialSource =
        details.credentialSource === "tenantCredential" ? "tenantCredential" : "missing";

      return {
        credentialSource,
        credentialConfigured: false,
        liveEnabled: false,
        carrierAccountId:
          typeof details.carrierAccountId === "string"
            ? details.carrierAccountId
            : null,
        credentialId:
          typeof details.credentialId === "string" ? details.credentialId : null,
        warnings: [error.message],
      };
    }

    throw error;
  }
}

export function validateCarrierAccountCreateInput(
  input: unknown,
): CarrierAccountCreateInput {
  if (!isObject(input)) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;
  return {
    carrierCode: validateCarrierCode(body.carrierCode),
    displayName: validateDisplayName(body.displayName),
    isDefault: validateOptionalBoolean(body.isDefault, false, "isDefault"),
  };
}

export function validateCarrierAccountUpdateInput(
  input: unknown,
): CarrierAccountUpdateInput {
  if (!isObject(input)) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;
  const update: CarrierAccountUpdateInput = {};

  if (body.displayName !== undefined) {
    update.displayName = validateDisplayName(body.displayName);
  }

  if (body.status !== undefined) {
    update.status = validateCarrierAccountStatus(body.status);
  }

  if (body.isDefault !== undefined) {
    update.isDefault = validateOptionalBoolean(body.isDefault, false, "isDefault");
  }

  if (
    update.displayName === undefined &&
    update.status === undefined &&
    update.isDefault === undefined
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "displayName, status, or isDefault is required.",
      400,
    );
  }

  return update;
}

export function validateCarrierCredentialSaveInput(
  input: unknown,
): CarrierCredentialSaveInput {
  if (!isObject(input)) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;
  assertAllowedKeys(body, [
    "credentialType",
    "mode",
    "credentials",
    "secretRef",
    "keyPrefix",
  ]);

  const credentialType = validateCredentialType(body.credentialType);
  const mode = validateMode(body.mode);

  if (mode === "encryptedPayload") {
    if (credentialType === "YUNEXPRESS_OMS") {
      return {
        credentialType,
        mode,
        credentials: validateYunExpressCredentialPayload(body.credentials),
      };
    }

    if (credentialType === "VIETTEL_POST") {
      return {
        credentialType,
        mode,
        credentials: validateViettelPostCredentialPayload(body.credentials),
      };
    }

    throw new AppError(
      "VALIDATION_ERROR",
      "encryptedPayload mode currently supports YUNEXPRESS_OMS and VIETTEL_POST.",
      400,
    );
  }

  return {
    credentialType,
    mode,
    secretRef: validateSecretRef(body.secretRef),
    keyPrefix: validateKeyPrefix(body.keyPrefix),
  };
}

async function assertCanManageCarrierCredentials(
  tenantId: string,
  actorUserId: string,
) {
  const membership = await findCarrierMembershipForUser(tenantId, actorUserId);

  if (!membership || membership.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "Tenant access denied.", 403);
  }

  if (!CARRIER_ACCOUNT_MANAGE_ROLES.includes(membership.role)) {
    throw new AppError("FORBIDDEN", "Insufficient tenant role.", 403);
  }
}

function buildCredentialPersistenceInput(input: CarrierCredentialSaveInput): {
  secretRef?: string;
  encryptedPayload?: Prisma.InputJsonValue;
  keyPrefix: string;
  encryptionVersion?: string;
  keyVersion?: string;
} {
  if (input.mode === "secretRef") {
    return {
      secretRef: input.secretRef,
      keyPrefix: input.keyPrefix,
    };
  }

  assertCarrierCredentialEncryptionConfigured();
  const encryptedPayload = encryptCarrierCredentialPayload(input.credentials);
  return {
    encryptedPayload: encryptedPayload as unknown as Prisma.InputJsonValue,
    keyPrefix: buildCredentialKeyPrefix(input.credentials),
    encryptionVersion: encryptedPayload.encryptionVersion,
    keyVersion: encryptedPayload.keyVersion,
  };
}

function validateCarrierCode(value: unknown) {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "carrierCode is required.", 400);
  }

  return assertKnownCarrierCode(value);
}

function normalizeYunExpressRuntimePayload(
  payload: unknown,
): CarrierRuntimeCredentialPayload {
  if (!isObject(payload)) {
    throw new AppError("CARRIER_ERROR", "Carrier credential payload is invalid.", 503, {
      carrierCode: "YUNEXPRESS_OMS",
      credentialSource: "tenantCredential",
    });
  }

  const credentials = payload as Record<string, unknown>;
  return {
    baseUrl: requireRuntimeString(credentials.baseUrl, "baseUrl", "YUNEXPRESS_OMS"),
    customerNo: requireRuntimeString(credentials.customerNo, "customerNo", "YUNEXPRESS_OMS"),
    apiSecret: requireRuntimeString(credentials.apiSecret, "apiSecret", "YUNEXPRESS_OMS"),
    lang: optionalRuntimeString(credentials.lang, YUNEXPRESS_DEFAULT_LANG),
    liveEnabled: optionalRuntimeBoolean(credentials.liveEnabled, false),
    defaultShippingMethodCode: optionalRuntimeString(
      credentials.defaultShippingMethodCode,
      YUNEXPRESS_DEFAULT_SHIPPING_METHOD_CODE,
    ),
    defaultSourceCode: optionalRuntimeString(
      credentials.defaultSourceCode,
      YUNEXPRESS_DEFAULT_SOURCE_CODE,
    ),
    defaultSizeUnit: optionalRuntimeString(
      credentials.defaultSizeUnit,
      YUNEXPRESS_DEFAULT_SIZE_UNIT,
    ),
    timeoutMs: 15000,
  };
}

function normalizeViettelPostRuntimePayload(
  payload: unknown,
): CarrierRuntimeCredentialPayload {
  if (!isObject(payload)) {
    throw new AppError("CARRIER_ERROR", "Carrier credential payload is invalid.", 503, {
      carrierCode: "VIETTEL_POST",
      credentialSource: "tenantCredential",
    });
  }

  const credentials = payload as Record<string, unknown>;
  return {
    clientId: requireRuntimeString(credentials.clientId, "clientId", "VIETTEL_POST"),
    clientSecret: requireRuntimeString(credentials.clientSecret, "clientSecret", "VIETTEL_POST"),
    authUrl: requireRuntimeString(credentials.authUrl, "authUrl", "VIETTEL_POST"),
    orderUrl: requireRuntimeString(credentials.orderUrl, "orderUrl", "VIETTEL_POST"),
    lineShipId: requireRuntimeString(credentials.lineShipId, "lineShipId", "VIETTEL_POST"),
    shipFromFirstName: requireRuntimeString(credentials.shipFromFirstName, "shipFromFirstName", "VIETTEL_POST"),
    shipFromLastName: requireRuntimeString(credentials.shipFromLastName, "shipFromLastName", "VIETTEL_POST"),
    shipFromPhoneNumber: requireRuntimeString(credentials.shipFromPhoneNumber, "shipFromPhoneNumber", "VIETTEL_POST"),
    shipFromAddress1: requireRuntimeString(credentials.shipFromAddress1, "shipFromAddress1", "VIETTEL_POST"),
    shipFromCountry: requireRuntimeString(credentials.shipFromCountry, "shipFromCountry", "VIETTEL_POST"),
    shipFromState: requireRuntimeString(credentials.shipFromState, "shipFromState", "VIETTEL_POST"),
    shipFromCity: requireRuntimeString(credentials.shipFromCity, "shipFromCity", "VIETTEL_POST"),
    shipFromZipCode: requireRuntimeString(credentials.shipFromZipCode, "shipFromZipCode", "VIETTEL_POST"),
    liveEnabled: optionalRuntimeBoolean(credentials.liveEnabled, false),
  };
}

function requireRuntimeString(value: unknown, field: string, carrierCode: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("CARRIER_ERROR", "Carrier credential payload is invalid.", 503, {
      carrierCode,
      credentialSource: "tenantCredential",
      invalidField: field,
    });
  }

  return value.trim();
}

function optionalRuntimeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalRuntimeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function validateDisplayName(value: unknown) {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "displayName is required.", 400);
  }

  const displayName = value.trim();
  if (!displayName || displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new AppError(
      "VALIDATION_ERROR",
      `displayName must be between 1 and ${MAX_DISPLAY_NAME_LENGTH} characters.`,
      400,
    );
  }

  return displayName;
}

function validateCarrierAccountStatus(
  value: unknown,
): Extract<CarrierAccountStatus, "ACTIVE" | "DISABLED"> {
  if (typeof value !== "string" || !CARRIER_ACCOUNT_STATUSES.includes(value as never)) {
    throw new AppError("VALIDATION_ERROR", "status is invalid.", 400);
  }

  return value as Extract<CarrierAccountStatus, "ACTIVE" | "DISABLED">;
}

function validateCredentialType(value: unknown): CarrierCredentialType {
  if (
    typeof value !== "string" ||
    !Object.values(PrismaCarrierCredentialType).includes(
      value as CarrierCredentialType,
    )
  ) {
    throw new AppError("VALIDATION_ERROR", "credentialType is invalid.", 400);
  }

  return value as CarrierCredentialType;
}

function validateMode(value: unknown): (typeof CARRIER_CREDENTIAL_MODES)[number] {
  if (
    typeof value !== "string" ||
    !CARRIER_CREDENTIAL_MODES.includes(value as never)
  ) {
    throw new AppError("VALIDATION_ERROR", "mode is invalid.", 400);
  }

  return value as (typeof CARRIER_CREDENTIAL_MODES)[number];
}

function validateYunExpressCredentialPayload(
  value: unknown,
): YunExpressOmsCredentialPayload {
  if (!isObject(value)) {
    throw new AppError("VALIDATION_ERROR", "credentials must be an object.", 400);
  }

  const credentials = value as Record<string, unknown>;
  assertAllowedKeys(credentials, [...YUNEXPRESS_CREDENTIAL_KEYS]);

  return {
    customerNo: validateRequiredSecretString(credentials.customerNo, "customerNo"),
    apiSecret: validateRequiredSecretString(credentials.apiSecret, "apiSecret"),
    baseUrl: validateUrl(credentials.baseUrl, "baseUrl"),
    lang: validateOptionalSafeString(
      credentials.lang,
      YUNEXPRESS_DEFAULT_LANG,
      "lang",
    ),
    defaultShippingMethodCode: validateOptionalSafeString(
      credentials.defaultShippingMethodCode,
      YUNEXPRESS_DEFAULT_SHIPPING_METHOD_CODE,
      "defaultShippingMethodCode",
    ),
    defaultSourceCode: validateOptionalSafeString(
      credentials.defaultSourceCode,
      YUNEXPRESS_DEFAULT_SOURCE_CODE,
      "defaultSourceCode",
    ),
    defaultSizeUnit: validateOptionalSafeString(
      credentials.defaultSizeUnit,
      YUNEXPRESS_DEFAULT_SIZE_UNIT,
      "defaultSizeUnit",
    ),
    liveEnabled: validateOptionalBoolean(credentials.liveEnabled, false, "liveEnabled"),
  };
}

function validateViettelPostCredentialPayload(
  value: unknown,
): ViettelPostCredentialPayload {
  if (!isObject(value)) {
    throw new AppError("VALIDATION_ERROR", "credentials must be an object.", 400);
  }

  const credentials = value as Record<string, unknown>;
  assertAllowedKeys(credentials, [...VIETTEL_POST_CREDENTIAL_KEYS]);

  return {
    clientId: validateRequiredSecretString(credentials.clientId, "clientId"),
    clientSecret: validateRequiredSecretString(credentials.clientSecret, "clientSecret"),
    authUrl: validateViettelPostUrl(credentials.authUrl, "authUrl", VIETTEL_POST_AUTH_HOSTS),
    orderUrl: validateViettelPostUrl(credentials.orderUrl, "orderUrl", VIETTEL_POST_ORDER_HOSTS),
    lineShipId: validateRequiredSecretString(credentials.lineShipId, "lineShipId"),
    shipFromFirstName: validateRequiredSecretString(credentials.shipFromFirstName, "shipFromFirstName"),
    shipFromLastName: validateRequiredSecretString(credentials.shipFromLastName, "shipFromLastName"),
    shipFromPhoneNumber: validateRequiredSecretString(credentials.shipFromPhoneNumber, "shipFromPhoneNumber"),
    shipFromAddress1: validateRequiredSecretString(credentials.shipFromAddress1, "shipFromAddress1"),
    shipFromCountry: validateRequiredSecretString(credentials.shipFromCountry, "shipFromCountry"),
    shipFromState: validateRequiredSecretString(credentials.shipFromState, "shipFromState"),
    shipFromCity: validateRequiredSecretString(credentials.shipFromCity, "shipFromCity"),
    shipFromZipCode: validateRequiredSecretString(credentials.shipFromZipCode, "shipFromZipCode"),
    liveEnabled: validateOptionalBoolean(credentials.liveEnabled, false, "liveEnabled"),
  };
}

function validateRequiredSecretString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("VALIDATION_ERROR", `${field} is required.`, 400);
  }

  if (value.trim().length > MAX_SECRET_REF_LENGTH) {
    throw new AppError("VALIDATION_ERROR", `${field} is too long.`, 400);
  }

  return value.trim();
}

function validateViettelPostUrl(value: unknown, field: string, allowedHosts: Set<string>) {
  const url = validateUrl(value, field);
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
    throw new AppError("VALIDATION_ERROR", `${field} must use a documented Viettel Post endpoint.`, 400);
  }
  return url;
}

function validateSecretRef(value: unknown) {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "secretRef is required.", 400);
  }

  const secretRef = value.trim();
  if (!secretRef || secretRef.length > MAX_SECRET_REF_LENGTH) {
    throw new AppError("VALIDATION_ERROR", "secretRef is invalid.", 400);
  }

  return secretRef;
}

function validateKeyPrefix(value: unknown) {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "keyPrefix is required.", 400);
  }

  const keyPrefix = value.trim();
  if (!SAFE_KEY_PREFIX_PATTERN.test(keyPrefix)) {
    throw new AppError("VALIDATION_ERROR", "keyPrefix is invalid.", 400);
  }

  return keyPrefix;
}

function validateUrl(value: unknown, field: string) {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", `${field} is required.`, 400);
  }

  const text = value.trim();
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new AppError("VALIDATION_ERROR", `${field} must be a valid URL.`, 400);
  }
}

function validateOptionalSafeString(
  value: unknown,
  fallback: string,
  field: string,
) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", `${field} is invalid.`, 400);
  }

  const text = value.trim();
  if (
    !text ||
    text.length > MAX_SAFE_STRING_LENGTH ||
    !SAFE_TEXT_PATTERN.test(text)
  ) {
    throw new AppError("VALIDATION_ERROR", `${field} is invalid.`, 400);
  }

  return text;
}

function validateOptionalBoolean(value: unknown, fallback: boolean, field: string) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value !== "boolean") {
    throw new AppError("VALIDATION_ERROR", `${field} must be a boolean.`, 400);
  }

  return value;
}

function assertAllowedKeys(input: Record<string, unknown>, allowedKeys: string[]) {
  const allowed = new Set(allowedKeys);
  const unknownKeys = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknownKeys.length > 0) {
    throw new AppError("VALIDATION_ERROR", "Request contains unsupported fields.", 400);
  }
}

function isObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
