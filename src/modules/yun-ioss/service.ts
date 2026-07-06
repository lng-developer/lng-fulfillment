import type { OrderSourceChannel, TenantRole, TenantYunIossStatus } from "@prisma/client";
import { recordUserAuditLog } from "@/modules/audit";
import { findTenantMembershipForUser } from "@/modules/tenant/repository";
import { AppError } from "@/shared/errors";
import {
  isEuCountryCode,
  normalizeSupportedEuCountryCode,
} from "@/shared/eu-countries";
import {
  getActiveTenantYunIossSettingRecord,
  getTenantYunIossSettingRecord,
  type TenantYunIossSettingRecord,
  upsertTenantYunIossSettingRecord,
} from "./repository";

const IOSS_MANAGE_ROLES: TenantRole[] = ["OWNER", "ADMIN"];
const SAFE_IOSS_PATTERN = /^[A-Z0-9._-]{4,40}$/;
export const DEFAULT_YUN_IOSS_NUMBER = "IOSS261841515582105977183";

export type TenantYunIossSettingSummary = {
  id: string | null;
  tenantId: string;
  iossNumber: string | null;
  status: TenantYunIossStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type TenantYunIossSettingInput = {
  iossNumber: string | null;
  status: TenantYunIossStatus;
};

export type YunIossGuardSetting = Pick<
  TenantYunIossSettingInput,
  "iossNumber" | "status"
> | null;

export async function getTenantYunIossSetting(
  tenantId: string,
  actorUserId: string,
): Promise<TenantYunIossSettingSummary> {
  await assertCanManageYunIoss(tenantId, actorUserId);

  return toTenantYunIossSettingSummary(
    tenantId,
    await getTenantYunIossSettingRecord(tenantId),
  );
}

export async function updateTenantYunIossSetting(
  tenantId: string,
  input: TenantYunIossSettingInput,
  actorUserId: string,
): Promise<TenantYunIossSettingSummary> {
  await assertCanManageYunIoss(tenantId, actorUserId);

  const iossNumber =
    input.status === "ACTIVE"
      ? input.iossNumber ?? DEFAULT_YUN_IOSS_NUMBER
      : input.iossNumber;

  const setting = await upsertTenantYunIossSettingRecord({
    tenantId,
    iossNumber,
    status: input.status,
    actorUserId,
  });

  await recordUserAuditLog({
    tenantId,
    actorUserId,
    action: "TENANT_YUN_IOSS_SETTING_UPDATED",
    resourceType: "TenantYunIossSetting",
    resourceId: setting.id,
    metadata: {
      status: setting.status,
      iossConfigured: Boolean(setting.iossNumber),
    },
  });

  return toTenantYunIossSettingSummary(tenantId, setting);
}

export async function assertTenantYunIossReadyForDestination(input: {
  tenantId: string;
  destinationCountryCode: string | null | undefined;
  sourceChannel: OrderSourceChannel | string | null | undefined;
  iossNumber?: string | null | undefined;
}) {
  if (
    !isYunIossRequiredForDestination({
      destinationCountryCode: input.destinationCountryCode,
      sourceChannel: input.sourceChannel,
    })
  ) {
    return;
  }

  const setting = input.iossNumber
    ? { iossNumber: input.iossNumber, status: "ACTIVE" as const }
    : await getActiveTenantYunIossSettingRecord(input.tenantId);
  assertYunIossReadyForDestination({
    destinationCountryCode: input.destinationCountryCode,
    sourceChannel: input.sourceChannel,
    setting,
  });
}

export function assertYunIossReadyForDestination(input: {
  destinationCountryCode: string | null | undefined;
  sourceChannel: OrderSourceChannel | string | null | undefined;
  setting: YunIossGuardSetting;
}) {
  if (
    !isYunIossRequiredForDestination({
      destinationCountryCode: input.destinationCountryCode,
      sourceChannel: input.sourceChannel,
    })
  ) {
    return;
  }

  const destinationCountryCode = normalizeSupportedEuCountryCode(
    input.destinationCountryCode,
  );

  if (!destinationCountryCode) {
    return;
  }

  if (resolveIossNumber(input.setting)) {
    return;
  }

  throw new AppError(
    "CONFLICT",
    "IOSS is required before creating YunExpress shipments to EU destinations.",
    409,
    {
      reason: "MISSING_IOSS",
      destinationCountryCode,
    },
  );
}

export function isYunIossRequiredForDestination(
  input:
    | {
        destinationCountryCode: string | null | undefined;
        sourceChannel: OrderSourceChannel | string | null | undefined;
      }
    | string
    | null
    | undefined,
) {
  if (typeof input === "string" || input === null || input === undefined) {
    return isEuCountryCode(input);
  }

  return (
    normalizeSourceChannel(input.sourceChannel) === "ETSY" &&
    isEuCountryCode(input.destinationCountryCode)
  );
}

export function resolveYunIossForShipment(input: {
  destinationCountryCode: string | null | undefined;
  sourceChannel: OrderSourceChannel | string | null | undefined;
  setting: YunIossGuardSetting;
}) {
  if (!isYunIossRequiredForDestination(input)) {
    return null;
  }

  return resolveIossNumber(input.setting);
}

export function validateTenantYunIossSettingInput(
  input: unknown,
): TenantYunIossSettingInput {
  if (!isObject(input)) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;
  const status = validateTenantYunIossStatus(body.status);
  const iossNumber = validateIossNumber(body.iossNumber);

  return {
    iossNumber,
    status,
  };
}

function toTenantYunIossSettingSummary(
  tenantId: string,
  setting: TenantYunIossSettingRecord | null,
): TenantYunIossSettingSummary {
  if (!setting) {
    return {
      id: null,
      tenantId,
      iossNumber: DEFAULT_YUN_IOSS_NUMBER,
      status: "ACTIVE",
      createdBy: null,
      updatedBy: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    id: setting.id,
    tenantId: setting.tenantId,
    iossNumber: setting.iossNumber,
    status: setting.status,
    createdBy: setting.createdBy,
    updatedBy: setting.updatedBy,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt,
  };
}

async function assertCanManageYunIoss(tenantId: string, actorUserId: string) {
  const membership = await findTenantMembershipForUser(tenantId, actorUserId);

  if (!membership || membership.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "Tenant access denied.", 403);
  }

  if (!IOSS_MANAGE_ROLES.includes(membership.role)) {
    throw new AppError("FORBIDDEN", "Insufficient tenant role.", 403);
  }
}

function validateTenantYunIossStatus(value: unknown): TenantYunIossStatus {
  if (value === "ACTIVE" || value === "DISABLED") {
    return value;
  }

  throw new AppError("VALIDATION_ERROR", "status is invalid.", 400);
}

function validateIossNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "iossNumber must be a string.", 400);
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;

  if (!SAFE_IOSS_PATTERN.test(normalized)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "iossNumber contains unsupported characters.",
      400,
    );
  }

  return normalized;
}

function resolveIossNumber(setting: YunIossGuardSetting) {
  if (!setting) {
    return DEFAULT_YUN_IOSS_NUMBER;
  }

  if (setting?.status !== "ACTIVE") {
    return null;
  }

  return setting.iossNumber ?? DEFAULT_YUN_IOSS_NUMBER;
}

function normalizeSourceChannel(
  sourceChannel: OrderSourceChannel | string | null | undefined,
) {
  return typeof sourceChannel === "string"
    ? sourceChannel.trim().toUpperCase()
    : "";
}

function isObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
