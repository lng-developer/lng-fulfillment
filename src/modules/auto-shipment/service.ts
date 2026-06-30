import type {
  AutoShipmentJobStatus,
  SkuShippingMethodMappingStatus,
  TenantRole,
} from "@prisma/client";
import { recordUserAuditLog } from "@/modules/audit";
import { shipOrderWithYun } from "@/modules/shipment";
import type { ShipmentYunEnvironment } from "@/modules/shipment";
import { findTenantMembershipForUser } from "@/modules/tenant/repository";
import { AppError } from "@/shared/errors";
import { resolveOrderShippingMethodFromSkuMappings } from "./resolver";
import type { AutoShipmentResolution } from "./types";
import {
  createSkuShippingMethodMappingRecord,
  deleteSkuShippingMethodMappingRecord,
  getAutoShipmentOrderContext,
  getShipmentAutomationSettingRecord,
  listActiveSkuShippingMethodMappingRecords,
  listSkuShippingMethodMappingRecords,
  type AutoShipmentJobRecord,
  type ShipmentAutomationSettingRecord,
  type SkuShippingMethodMappingRecord,
  updateSkuShippingMethodMappingRecord,
  upsertAutoShipmentJobRecord,
  upsertShipmentAutomationSettingRecord,
} from "./repository";

const AUTOMATION_MANAGE_ROLES: TenantRole[] = ["OWNER", "ADMIN"];
const MAX_DESCRIPTION_LENGTH = 240;
const SAFE_SKU_CODE_PATTERN = /^[A-Z0-9_./+]{1,40}$/;
const SAFE_SHIPPING_METHOD_PATTERN = /^[A-Z0-9-]{2,40}$/;
const ACTIVE_SHIPMENT_SKIP_STATUSES = new Set([
  "CREATING",
  "CREATED",
  "LABEL_READY",
  "TRACKING_PENDING",
  "IN_TRANSIT",
  "DELIVERED",
  "EXCEPTION",
]);

export type ShipmentAutomationSettingSummary = {
  id: string | null;
  tenantId: string;
  autoCreateEnabled: boolean;
  environment: ShipmentYunEnvironment;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type SkuShippingMethodMappingSummary = {
  id: string;
  skuCode: string;
  shippingMethodCode: string;
  description: string | null;
  status: SkuShippingMethodMappingStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type AutoShipmentJobSummary = {
  id: string;
  orderId: string;
  status: AutoShipmentJobStatus;
  shippingMethodCode: string | null;
  skuCodes: unknown;
  missingSkuCodes: unknown;
  conflictingMethods: unknown;
  shipmentId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  attemptCount: number;
  lastAttemptAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShipmentAutomationConfig = {
  setting: ShipmentAutomationSettingSummary;
  mappings: SkuShippingMethodMappingSummary[];
};

export type ShipmentAutomationSettingInput = {
  autoCreateEnabled: boolean;
  environment: ShipmentYunEnvironment;
};

export type SkuShippingMethodMappingCreateInput = {
  skuCode: string;
  shippingMethodCode: string;
  description: string | null;
};

export type SkuShippingMethodMappingUpdateInput = {
  shippingMethodCode?: string;
  description?: string | null;
  status?: SkuShippingMethodMappingStatus;
};

export type AutoShipmentProcessResult = {
  status: AutoShipmentJobStatus;
  job: AutoShipmentJobSummary;
  resolution?: AutoShipmentResolution;
};

export async function getShipmentAutomationConfig(
  tenantId: string,
  actorUserId: string,
): Promise<ShipmentAutomationConfig> {
  await assertCanManageShipmentAutomation(tenantId, actorUserId);

  const [setting, mappings] = await Promise.all([
    getShipmentAutomationSettingRecord(tenantId),
    listSkuShippingMethodMappingRecords(tenantId),
  ]);

  return {
    setting: toSettingSummary(tenantId, setting),
    mappings: mappings.map(toMappingSummary),
  };
}

export async function updateShipmentAutomationSetting(
  tenantId: string,
  input: ShipmentAutomationSettingInput,
  actorUserId: string,
): Promise<ShipmentAutomationSettingSummary> {
  await assertCanManageShipmentAutomation(tenantId, actorUserId);

  const setting = await upsertShipmentAutomationSettingRecord({
    tenantId,
    autoCreateEnabled: input.autoCreateEnabled,
    environment: input.environment,
    actorUserId,
  });

  await recordUserAuditLog({
    tenantId,
    actorUserId,
    action: "SHIPMENT_AUTOMATION_SETTING_UPDATED",
    resourceType: "TenantShipmentAutomationSetting",
    resourceId: setting.id,
    metadata: {
      autoCreateEnabled: setting.autoCreateEnabled,
      environment: setting.environment,
    },
  });

  return toSettingSummary(tenantId, setting);
}

export async function createSkuShippingMethodMapping(
  tenantId: string,
  input: SkuShippingMethodMappingCreateInput,
  actorUserId: string,
): Promise<SkuShippingMethodMappingSummary> {
  await assertCanManageShipmentAutomation(tenantId, actorUserId);

  try {
    const mapping = await createSkuShippingMethodMappingRecord({
      tenantId,
      skuCode: input.skuCode,
      shippingMethodCode: input.shippingMethodCode,
      description: input.description,
      actorUserId,
    });

    await recordUserAuditLog({
      tenantId,
      actorUserId,
      action: "SKU_SHIPPING_METHOD_MAPPING_CREATED",
      resourceType: "SkuShippingMethodMapping",
      resourceId: mapping.id,
      metadata: {
        skuCode: mapping.skuCode,
        shippingMethodCode: mapping.shippingMethodCode,
        status: mapping.status,
      },
    });

    return toMappingSummary(mapping);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "CONFLICT",
        "SKU shipping method mapping already exists.",
        409,
      );
    }

    throw error;
  }
}

export async function updateSkuShippingMethodMapping(
  tenantId: string,
  mappingId: string,
  input: SkuShippingMethodMappingUpdateInput,
  actorUserId: string,
): Promise<SkuShippingMethodMappingSummary> {
  await assertCanManageShipmentAutomation(tenantId, actorUserId);

  const [mapping] = await updateSkuShippingMethodMappingRecord({
    tenantId,
    mappingId,
    shippingMethodCode: input.shippingMethodCode,
    description: input.description,
    status: input.status,
    actorUserId,
  });

  if (!mapping) {
    throw new AppError("NOT_FOUND", "SKU shipping method mapping not found.", 404);
  }

  await recordUserAuditLog({
    tenantId,
    actorUserId,
    action: "SKU_SHIPPING_METHOD_MAPPING_UPDATED",
    resourceType: "SkuShippingMethodMapping",
    resourceId: mapping.id,
    metadata: {
      skuCode: mapping.skuCode,
      shippingMethodCode: mapping.shippingMethodCode,
      status: mapping.status,
    },
  });

  return toMappingSummary(mapping);
}

export async function deleteSkuShippingMethodMapping(
  tenantId: string,
  mappingId: string,
  actorUserId: string,
) {
  await assertCanManageShipmentAutomation(tenantId, actorUserId);

  const result = await deleteSkuShippingMethodMappingRecord(tenantId, mappingId);
  if (result.count === 0) {
    throw new AppError("NOT_FOUND", "SKU shipping method mapping not found.", 404);
  }

  await recordUserAuditLog({
    tenantId,
    actorUserId,
    action: "SKU_SHIPPING_METHOD_MAPPING_DELETED",
    resourceType: "SkuShippingMethodMapping",
    resourceId: mappingId,
    metadata: {
      mappingId,
      result: "deleted",
    },
  });

  return { deleted: true };
}

export async function processAutoShipmentForOrder(input: {
  tenantId: string;
  orderId: string;
  actorId?: string;
}): Promise<AutoShipmentProcessResult> {
  const setting = await getShipmentAutomationSettingRecord(input.tenantId);

  if (!setting?.autoCreateEnabled) {
    const job = await writeAutoShipmentJob({
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: "SKIPPED_DISABLED",
    });

    return { status: "SKIPPED_DISABLED", job };
  }

  const order = await getAutoShipmentOrderContext(input.tenantId, input.orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  if (order.shipments.some((shipment) => ACTIVE_SHIPMENT_SKIP_STATUSES.has(shipment.status))) {
    const job = await writeAutoShipmentJob({
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: "SKIPPED_EXISTING_SHIPMENT",
    });

    return { status: "SKIPPED_EXISTING_SHIPMENT", job };
  }

  const mappings = await listActiveSkuShippingMethodMappingRecords(input.tenantId);
  const resolution = resolveOrderShippingMethodFromSkuMappings({
    items: order.items,
    mappings,
  });

  if (resolution.status !== "RESOLVED" || !resolution.shippingMethodCode) {
    const jobStatus =
      resolution.status === "MISSING_SKU_MAPPING"
        ? "MISSING_SKU_MAPPING"
        : "METHOD_CONFLICT";
    const job = await writeAutoShipmentJob({
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: jobStatus,
      skuCodes: resolution.skuCodes,
      missingSkuCodes: resolution.missingSkuCodes,
      conflictingMethods: resolution.conflictingMethods,
    });

    return { status: jobStatus, job, resolution };
  }

  await writeAutoShipmentJob({
    tenantId: input.tenantId,
    orderId: input.orderId,
    status: "PROCESSING",
    shippingMethodCode: resolution.shippingMethodCode,
    skuCodes: resolution.skuCodes,
    incrementAttempt: true,
  });

  try {
    const result = await shipOrderWithYun(
      input.tenantId,
      {
        orderId: input.orderId,
        environment: normalizeShipmentEnvironment(setting.environment),
        options: {
          shippingMethodCode: resolution.shippingMethodCode,
        },
      },
      {
        actorType: "SYSTEM",
        actorId: input.actorId,
      },
    );

    const job = await writeAutoShipmentJob({
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: "SUCCEEDED",
      shippingMethodCode: resolution.shippingMethodCode,
      skuCodes: resolution.skuCodes,
      shipmentId: result.shipment.id,
    });

    return { status: "SUCCEEDED", job, resolution };
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError("INTERNAL_ERROR", "Auto shipment failed.", 500);
    const job = await writeAutoShipmentJob({
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: "FAILED",
      shippingMethodCode: resolution.shippingMethodCode,
      skuCodes: resolution.skuCodes,
      errorCode: appError.code,
      errorMessage: truncateSafeMessage(appError.message),
    });

    return { status: "FAILED", job, resolution };
  }
}

export function validateShipmentAutomationSettingInput(
  input: unknown,
): ShipmentAutomationSettingInput {
  if (!isObject(input)) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;

  return {
    autoCreateEnabled: validateBoolean(body.autoCreateEnabled, "autoCreateEnabled"),
    environment: validateShipmentEnvironment(body.environment),
  };
}

export function validateSkuShippingMethodMappingCreateInput(
  input: unknown,
): SkuShippingMethodMappingCreateInput {
  if (!isObject(input)) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;

  return {
    skuCode: validateSkuCode(body.skuCode),
    shippingMethodCode: validateShippingMethodCode(body.shippingMethodCode),
    description: validateDescription(body.description),
  };
}

export function validateSkuShippingMethodMappingUpdateInput(
  input: unknown,
): SkuShippingMethodMappingUpdateInput {
  if (!isObject(input)) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;
  const update: SkuShippingMethodMappingUpdateInput = {};

  if (body.shippingMethodCode !== undefined) {
    update.shippingMethodCode = validateShippingMethodCode(body.shippingMethodCode);
  }

  if (body.description !== undefined) {
    update.description = validateDescription(body.description);
  }

  if (body.status !== undefined) {
    update.status = validateMappingStatus(body.status);
  }

  if (
    update.shippingMethodCode === undefined &&
    update.description === undefined &&
    update.status === undefined
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "shippingMethodCode, description, or status is required.",
      400,
    );
  }

  return update;
}

async function assertCanManageShipmentAutomation(
  tenantId: string,
  actorUserId: string,
) {
  const membership = await findTenantMembershipForUser(tenantId, actorUserId);

  if (!membership || membership.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "Tenant access denied.", 403);
  }

  if (!AUTOMATION_MANAGE_ROLES.includes(membership.role)) {
    throw new AppError("FORBIDDEN", "Insufficient tenant role.", 403);
  }
}

async function writeAutoShipmentJob(input: {
  tenantId: string;
  orderId: string;
  status: AutoShipmentJobStatus;
  shippingMethodCode?: string | null;
  skuCodes?: string[];
  missingSkuCodes?: string[];
  conflictingMethods?: string[];
  shipmentId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  incrementAttempt?: boolean;
}) {
  return toJobSummary(
    await upsertAutoShipmentJobRecord({
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: input.status,
      shippingMethodCode: input.shippingMethodCode ?? null,
      skuCodes: input.skuCodes ?? null,
      missingSkuCodes: input.missingSkuCodes ?? null,
      conflictingMethods: input.conflictingMethods ?? null,
      shipmentId: input.shipmentId ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      incrementAttempt: input.incrementAttempt,
    }),
  );
}

function toSettingSummary(
  tenantId: string,
  setting: ShipmentAutomationSettingRecord | null,
): ShipmentAutomationSettingSummary {
  if (!setting) {
    return {
      id: null,
      tenantId,
      autoCreateEnabled: false,
      environment: "live",
      createdBy: null,
      updatedBy: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    id: setting.id,
    tenantId: setting.tenantId,
    autoCreateEnabled: setting.autoCreateEnabled,
    environment: normalizeShipmentEnvironment(setting.environment),
    createdBy: setting.createdBy,
    updatedBy: setting.updatedBy,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt,
  };
}

function toMappingSummary(
  mapping: SkuShippingMethodMappingRecord,
): SkuShippingMethodMappingSummary {
  return {
    id: mapping.id,
    skuCode: mapping.skuCode,
    shippingMethodCode: mapping.shippingMethodCode,
    description: mapping.description,
    status: mapping.status,
    createdAt: mapping.createdAt,
    updatedAt: mapping.updatedAt,
  };
}

function toJobSummary(record: AutoShipmentJobRecord): AutoShipmentJobSummary {
  return {
    id: record.id,
    orderId: record.orderId,
    status: record.status,
    shippingMethodCode: record.shippingMethodCode,
    skuCodes: record.skuCodes,
    missingSkuCodes: record.missingSkuCodes,
    conflictingMethods: record.conflictingMethods,
    shipmentId: record.shipmentId,
    errorCode: record.errorCode,
    errorMessage: record.errorMessage,
    attemptCount: record.attemptCount,
    lastAttemptAt: record.lastAttemptAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function validateShipmentEnvironment(value: unknown): ShipmentYunEnvironment {
  if (value === undefined || value === null || value === "") {
    return "live";
  }

  if (value === "test" || value === "live") {
    return value;
  }

  throw new AppError("VALIDATION_ERROR", "environment must be test or live.", 400);
}

function normalizeShipmentEnvironment(value: string): ShipmentYunEnvironment {
  return value === "test" ? "test" : "live";
}

function validateSkuCode(value: unknown) {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "skuCode is required.", 400);
  }

  const skuCode = value.trim().toUpperCase();
  if (!SAFE_SKU_CODE_PATTERN.test(skuCode)) {
    throw new AppError("VALIDATION_ERROR", "skuCode is invalid.", 400);
  }

  return skuCode;
}

function validateShippingMethodCode(value: unknown) {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "shippingMethodCode is required.", 400);
  }

  const shippingMethodCode = value.trim().toUpperCase();
  if (!SAFE_SHIPPING_METHOD_PATTERN.test(shippingMethodCode)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "shippingMethodCode is invalid.",
      400,
    );
  }

  return shippingMethodCode;
}

function validateMappingStatus(value: unknown): SkuShippingMethodMappingStatus {
  if (value === "ACTIVE" || value === "DISABLED") {
    return value;
  }

  throw new AppError("VALIDATION_ERROR", "status is invalid.", 400);
}

function validateDescription(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "description must be a string.", 400);
  }

  const description = value.trim();
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new AppError(
      "VALIDATION_ERROR",
      `description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`,
      400,
    );
  }

  return description || null;
}

function validateBoolean(value: unknown, field: string) {
  if (typeof value !== "boolean") {
    throw new AppError("VALIDATION_ERROR", `${field} must be a boolean.`, 400);
  }

  return value;
}

function truncateSafeMessage(message: string) {
  return message.length > 240 ? `${message.slice(0, 237)}...` : message;
}

function isObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
