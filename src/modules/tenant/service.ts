import type { MembershipStatus, Prisma, TenantRole } from "@prisma/client";
import { recordUserAuditLog } from "@/modules/audit";
import { AppError } from "@/shared/errors";
import {
  generateTenantApiKey,
  getTenantApiKeyPrefix,
  hashTenantApiKey,
  verifyTenantApiKey as verifyTenantApiKeyHash,
} from "@/shared/security";
import {
  createTenantApiKeyRecord,
  countActiveOwnerMemberships,
  findTenantApiKeyByHash,
  findTenantMemberRecord,
  findTenantMembershipForUser,
  listTenantMemberRecords,
  listTenantApiKeyRecords,
  revokeTenantApiKeyRecord,
  updateTenantMemberRecord,
  updateTenantApiKeyLastUsed,
} from "./repository";
import {
  TENANT_API_KEY_MANAGE_ROLES,
  TENANT_API_KEY_SCOPES,
  TENANT_MEMBER_MANAGE_ROLES,
  type TenantMemberRecord,
  type TenantMemberUpdateInput,
  type TenantApiKeyCreateInput,
  type TenantApiKeyCreateResult,
  type TenantApiKeyRecord,
  type TenantApiKeyScope,
  type TenantApiKeyVerificationResult,
} from "./types";

const MIN_API_KEY_NAME_LENGTH = 1;
const MAX_API_KEY_NAME_LENGTH = 80;
const UPDATEABLE_MEMBERSHIP_STATUSES = ["ACTIVE", "DISABLED"] as const;

export function validateTenantApiKeyCreateInput(
  input: unknown,
): TenantApiKeyCreateInput {
  if (typeof input !== "object" || input === null) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;
  const name = validateName(body.name);
  const scopes = validateScopes(body.scopes);
  const expiresAt = validateExpiresAt(body.expiresAt);

  return {
    name,
    scopes,
    expiresAt,
  };
}

export async function createTenantApiKey(
  tenantId: string,
  input: TenantApiKeyCreateInput,
  actorUserId: string,
): Promise<TenantApiKeyCreateResult> {
  await assertCanManageTenantApiKeys(tenantId, actorUserId);

  const apiKey = generateTenantApiKey();
  const apiKeyRecord = toTenantApiKeyRecord(
    await createTenantApiKeyRecord({
      tenantId,
      name: input.name,
      keyPrefix: getTenantApiKeyPrefix(apiKey),
      keyHash: hashTenantApiKey(apiKey),
      scopes: [...input.scopes],
      expiresAt: input.expiresAt,
    }),
  );

  await recordUserAuditLog({
    tenantId,
    actorUserId,
    action: "API_KEY_CREATED",
    resourceType: "TenantApiKey",
    resourceId: apiKeyRecord.id,
    metadata: buildAuditMetadata(apiKeyRecord),
  });

  return {
    apiKey,
    apiKeyRecord,
  };
}

export async function listTenantApiKeys(
  tenantId: string,
  actorUserId: string,
): Promise<TenantApiKeyRecord[]> {
  await assertCanManageTenantApiKeys(tenantId, actorUserId);

  const records = await listTenantApiKeyRecords(tenantId);
  return records.map(toTenantApiKeyRecord);
}

export async function revokeTenantApiKey(
  tenantId: string,
  apiKeyId: string,
  actorUserId: string,
): Promise<TenantApiKeyRecord> {
  await assertCanManageTenantApiKeys(tenantId, actorUserId);

  const [record] = await revokeTenantApiKeyRecord(tenantId, apiKeyId);
  if (!record) {
    throw new AppError("NOT_FOUND", "API key not found.", 404);
  }

  const apiKeyRecord = toTenantApiKeyRecord(record);
  await recordUserAuditLog({
    tenantId,
    actorUserId,
    action: "API_KEY_REVOKED",
    resourceType: "TenantApiKey",
    resourceId: apiKeyRecord.id,
    metadata: buildAuditMetadata(apiKeyRecord),
  });

  return apiKeyRecord;
}

export async function verifyTenantApiKeyForRequest(
  rawKey: string,
): Promise<TenantApiKeyVerificationResult | null> {
  const keyHash = hashTenantApiKey(rawKey);
  const record = await findTenantApiKeyByHash(keyHash);

  if (!record || !verifyTenantApiKeyHash(rawKey, record.keyHash)) {
    return null;
  }

  if (record.status !== "ACTIVE") {
    return null;
  }

  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  await updateTenantApiKeyLastUsed(record.id);

  return {
    tenantId: record.tenantId,
    apiKeyId: record.id,
    scopes: normalizeScopes(record.scopes),
  };
}

export function validateTenantMemberUpdateInput(
  input: unknown,
): TenantMemberUpdateInput {
  if (typeof input !== "object" || input === null) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;
  const update: TenantMemberUpdateInput = {};

  if (body.role !== undefined) {
    if (!isTenantRole(body.role)) {
      throw new AppError("VALIDATION_ERROR", "role is invalid.", 400);
    }

    update.role = body.role;
  }

  const statusValue = body.membershipStatus ?? body.status;
  if (statusValue !== undefined) {
    if (!isUpdateableMembershipStatus(statusValue)) {
      throw new AppError("VALIDATION_ERROR", "membershipStatus is invalid.", 400);
    }

    update.membershipStatus = statusValue;
  }

  if (update.role === undefined && update.membershipStatus === undefined) {
    throw new AppError(
      "VALIDATION_ERROR",
      "role or membershipStatus is required.",
      400,
    );
  }

  return update;
}

export async function listTenantMembers(
  tenantId: string,
  actorUserId: string,
): Promise<TenantMemberRecord[]> {
  await assertCanManageTenantMembers(tenantId, actorUserId);

  return (await listTenantMemberRecords(tenantId)).map(toTenantMemberRecord);
}

export async function updateTenantMember(
  tenantId: string,
  membershipId: string,
  input: TenantMemberUpdateInput,
  actorUserId: string,
): Promise<TenantMemberRecord> {
  await assertCanManageTenantMembers(tenantId, actorUserId);

  const current = await findTenantMemberRecord(tenantId, membershipId);
  if (!current) {
    throw new AppError("NOT_FOUND", "Tenant member not found.", 404);
  }

  const nextRole = input.role ?? current.role;
  const nextStatus = input.membershipStatus ?? current.status;
  const roleChanged = nextRole !== current.role;
  const statusChanged = nextStatus !== current.status;

  if (!roleChanged && !statusChanged) {
    return toTenantMemberRecord(current);
  }

  await assertOwnerUpdateIsSafe({
    tenantId,
    actorUserId,
    targetUserId: current.userId,
    currentRole: current.role,
    currentStatus: current.status,
    nextRole,
    nextStatus,
  });

  const updated = await updateTenantMemberRecord({
    tenantId,
    membershipId,
    role: nextRole,
    status: nextStatus,
  });

  if (!updated) {
    throw new AppError("NOT_FOUND", "Tenant member not found.", 404);
  }

  const member = toTenantMemberRecord(updated);
  const auditMetadata = {
    membershipId,
    targetUserId: current.userId,
  };

  if (roleChanged) {
    await recordUserAuditLog({
      tenantId,
      actorUserId,
      action: "MEMBER_ROLE_UPDATED",
      resourceType: "TenantMembership",
      resourceId: membershipId,
      metadata: {
        ...auditMetadata,
        previousRole: current.role,
        nextRole,
      },
    });
  }

  if (statusChanged) {
    await recordUserAuditLog({
      tenantId,
      actorUserId,
      action: "MEMBER_STATUS_UPDATED",
      resourceType: "TenantMembership",
      resourceId: membershipId,
      metadata: {
        ...auditMetadata,
        previousStatus: current.status,
        nextStatus,
      },
    });
  }

  return member;
}

async function assertCanManageTenantApiKeys(
  tenantId: string,
  actorUserId: string,
) {
  const membership = await findTenantMembershipForUser(tenantId, actorUserId);

  if (!membership || membership.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "Tenant access denied.", 403);
  }

  if (!canManageTenantApiKeys(membership.role)) {
    throw new AppError("FORBIDDEN", "Insufficient tenant role.", 403);
  }
}

function canManageTenantApiKeys(role: TenantRole) {
  return TENANT_API_KEY_MANAGE_ROLES.includes(role);
}

async function assertCanManageTenantMembers(
  tenantId: string,
  actorUserId: string,
) {
  const membership = await findTenantMembershipForUser(tenantId, actorUserId);

  if (!membership || membership.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "Tenant access denied.", 403);
  }

  if (!TENANT_MEMBER_MANAGE_ROLES.includes(membership.role)) {
    throw new AppError("FORBIDDEN", "Insufficient tenant role.", 403);
  }
}

async function assertOwnerUpdateIsSafe(input: {
  tenantId: string;
  actorUserId: string;
  targetUserId: string;
  currentRole: TenantRole;
  currentStatus: MembershipStatus;
  nextRole: TenantRole;
  nextStatus: MembershipStatus;
}) {
  const removesActiveOwner =
    input.currentRole === "OWNER" &&
    input.currentStatus === "ACTIVE" &&
    (input.nextRole !== "OWNER" || input.nextStatus !== "ACTIVE");

  if (!removesActiveOwner) {
    return;
  }

  if (input.targetUserId === input.actorUserId) {
    throw new AppError(
      "CONFLICT",
      "You cannot remove your own owner access.",
      409,
    );
  }

  const activeOwnerCount = await countActiveOwnerMemberships(input.tenantId);
  if (activeOwnerCount <= 1) {
    throw new AppError(
      "CONFLICT",
      "Tenant must keep at least one active owner.",
      409,
    );
  }
}

function validateName(value: unknown) {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "API key name is required.", 400);
  }

  const name = value.trim();
  if (
    name.length < MIN_API_KEY_NAME_LENGTH ||
    name.length > MAX_API_KEY_NAME_LENGTH
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      `API key name must be between ${MIN_API_KEY_NAME_LENGTH} and ${MAX_API_KEY_NAME_LENGTH} characters.`,
      400,
    );
  }

  return name;
}

function validateScopes(value: unknown): TenantApiKeyScope[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError("VALIDATION_ERROR", "API key scopes are required.", 400);
  }

  const scopes = [...new Set(value)];
  if (!scopes.every(isTenantApiKeyScope)) {
    throw new AppError("VALIDATION_ERROR", "API key scopes are invalid.", 400);
  }

  return scopes;
}

function validateExpiresAt(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "expiresAt must be a date string or null.", 400);
  }

  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new AppError("VALIDATION_ERROR", "expiresAt must be a future date.", 400);
  }

  return expiresAt;
}

function isTenantApiKeyScope(value: unknown): value is TenantApiKeyScope {
  return (
    typeof value === "string" &&
    TENANT_API_KEY_SCOPES.includes(value as TenantApiKeyScope)
  );
}

function isTenantRole(value: unknown): value is TenantRole {
  return (
    typeof value === "string" &&
    ["OWNER", "ADMIN", "OPERATOR", "VIEWER"].includes(value)
  );
}

function isUpdateableMembershipStatus(
  value: unknown,
): value is (typeof UPDATEABLE_MEMBERSHIP_STATUSES)[number] {
  return (
    typeof value === "string" &&
    UPDATEABLE_MEMBERSHIP_STATUSES.includes(
      value as (typeof UPDATEABLE_MEMBERSHIP_STATUSES)[number],
    )
  );
}

function toTenantApiKeyRecord(record: {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: Prisma.JsonValue;
  status: TenantApiKeyRecord["status"];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): TenantApiKeyRecord {
  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    scopes: normalizeScopes(record.scopes),
    status: record.status,
    expiresAt: record.expiresAt,
    lastUsedAt: record.lastUsedAt,
    revokedAt: record.revokedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizeScopes(value: Prisma.JsonValue): TenantApiKeyScope[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isTenantApiKeyScope);
}

function buildAuditMetadata(
  record: TenantApiKeyRecord,
): Prisma.InputJsonObject {
  return {
    keyId: record.id,
    keyName: record.name,
    keyPrefix: record.keyPrefix,
    scopes: record.scopes,
  };
}

function toTenantMemberRecord(record: {
  id: string;
  userId: string;
  role: TenantRole;
  status: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    status: TenantMemberRecord["userStatus"];
  };
}): TenantMemberRecord {
  return {
    membershipId: record.id,
    userId: record.user.id,
    email: record.user.email,
    name: record.user.name,
    userStatus: record.user.status,
    role: record.role,
    membershipStatus: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
