import type {
  MembershipStatus,
  PlatformAdminRole,
  Prisma,
  TenantRole,
  TenantStatus,
  TenantType,
} from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { sanitizeAuditMetadata, recordUserAuditLog } from "@/modules/audit";
import { AppError } from "@/shared/errors";
import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/shared/security";
import {
  canAccessPlatform,
  canUsePlatformAdmin,
  countPlatformAuditLogRecords,
  countPlatformTenantRecords,
  countTenantOwners,
  createPlatformMemberRecord,
  createTenantWithOwner,
  findPlatformAdminForUser,
  findPlatformMemberRecord,
  findPlatformTenantRecord,
  listPlatformAuditLogRecords,
  listPlatformMemberRecords,
  listPlatformTenantRecords,
  updatePlatformMemberRecord,
  updatePlatformTenantRecord,
} from "./repository";
import type {
  PlatformAdminContext,
  PlatformAuditLogListQuery,
  PlatformAuditLogRecord,
  PlatformMemberCreateInput,
  PlatformMemberRecord,
  PlatformMemberUpdateInput,
  PlatformPaginatedResult,
  PlatformTenantCreateInput,
  PlatformTenantDetail,
  PlatformTenantListQuery,
  PlatformTenantSummary,
  PlatformTenantUpdateInput,
} from "./types";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const MAX_NAME_LENGTH = 120;
const MAX_SLUG_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;
const MAX_FILTER_LENGTH = 100;
const TENANT_TYPES = ["INTERNAL", "CLIENT", "PARTNER"] as const;
const TENANT_STATUSES = ["ACTIVE", "DISABLED"] as const;
const TENANT_ROLES = ["OWNER", "ADMIN", "OPERATOR", "VIEWER"] as const;
const MEMBER_STATUSES = ["ACTIVE", "DISABLED"] as const;
const ACTOR_TYPES = ["USER", "API_KEY", "SYSTEM"] as const;
const PLATFORM_AUDIT_ACTIONS = [
  "PLATFORM_TENANT_CREATED",
  "PLATFORM_TENANT_UPDATED",
  "PLATFORM_TENANT_MEMBER_ADDED",
  "PLATFORM_TENANT_MEMBER_UPDATED",
  "PLATFORM_ACCESS_DENIED",
  "PLATFORM_MUTATION_DENIED",
] as const;

export async function requirePlatformAdminContext(
  user: { id: string; email: string; name: string | null },
): Promise<PlatformAdminContext> {
  const record = await findPlatformAdminForUser(user.id);

  if (!record || !canUsePlatformAdmin(record)) {
    throw new AppError("FORBIDDEN", "Platform admin access required.", 403);
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: record.role,
  };
}

export async function requirePlatformAccessContext(
  user: { id: string; email: string; name: string | null },
): Promise<PlatformAdminContext> {
  const record = await findPlatformAdminForUser(user.id);

  if (!record || !canAccessPlatform(record)) {
    throw new AppError("FORBIDDEN", "Platform access required.", 403);
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: record.role,
  };
}

export async function recordPlatformDeniedTelemetry(input: {
  actorUserId: string;
  actorPlatformRole?: PlatformAdminRole;
  event: "PLATFORM_ACCESS_DENIED" | "PLATFORM_MUTATION_DENIED";
  method: string;
  routeGroup: string;
  reasonCode: string;
}) {
  try {
    await recordUserAuditLog({
      actorUserId: input.actorUserId,
      action: input.event,
      resourceType:
        input.event === "PLATFORM_MUTATION_DENIED"
          ? "PlatformMutation"
          : "PlatformAccess",
      resourceId: input.routeGroup,
      metadata: {
        routeGroup: input.routeGroup,
        method: input.method,
        reasonCode: input.reasonCode,
        ...(input.actorPlatformRole
          ? { actorPlatformRole: input.actorPlatformRole }
          : {}),
        result: "denied",
      },
    });
  } catch {
    // Denied-access telemetry must never change request behavior.
  }
}

export async function listPlatformTenants(
  query: PlatformTenantListQuery,
): Promise<PlatformPaginatedResult<PlatformTenantSummary>> {
  const [records, totalItems] = await Promise.all([
    listPlatformTenantRecords(query),
    countPlatformTenantRecords(query),
  ]);

  const ownersCounts = await Promise.all(
    records.map((record) => countTenantOwners(record.id)),
  );

  return {
    data: records.map((record, index) =>
      toTenantSummary(record, ownersCounts[index] ?? 0),
    ),
    pagination: buildPagination(query.page, query.pageSize, totalItems),
  };
}

export async function getPlatformTenantDetail(
  tenantId: string,
): Promise<PlatformTenantDetail> {
  const record = await findPlatformTenantRecord(tenantId);
  if (!record) {
    throw new AppError("NOT_FOUND", "Tenant not found.", 404);
  }

  return toTenantDetail(record, await countTenantOwners(record.id));
}

export async function createPlatformTenant(
  input: PlatformTenantCreateInput,
  actor: PlatformAdminContext,
): Promise<PlatformTenantDetail> {
  const passwordHash = input.ownerPassword
    ? await hashPassword(input.ownerPassword)
    : undefined;
  const result = await createTenantWithOwner({
    name: input.name,
    slug: input.slug,
    type: input.type,
    status: input.status,
    ownerEmail: input.ownerEmail,
    ownerName: input.ownerName ?? null,
    ownerPasswordHash: passwordHash,
  }).catch((error: unknown) => {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "CONFLICT",
        "Tenant slug or owner membership already exists.",
        409,
      );
    }

    throw error;
  });

  if (!result.tenant) {
    if (result.reason === "OWNER_PASSWORD_REQUIRED") {
      throw new AppError(
        "VALIDATION_ERROR",
        "ownerPassword is required when ownerEmail does not belong to an existing user.",
        400,
      );
    }

    throw new AppError("INTERNAL_ERROR", "Tenant could not be created.", 500);
  }

  await recordUserAuditLog({
    tenantId: result.tenant.id,
    actorUserId: actor.userId,
    action: "PLATFORM_TENANT_CREATED",
    resourceType: "Tenant",
    resourceId: result.tenant.id,
    metadata: {
      targetTenantId: result.tenant.id,
      targetTenantSlug: result.tenant.slug,
      actorPlatformRole: actor.role,
      result: "created",
    },
  });

  return toTenantDetail(result.tenant, 1);
}

export async function updatePlatformTenant(
  tenantId: string,
  input: PlatformTenantUpdateInput,
  actor: PlatformAdminContext,
): Promise<PlatformTenantDetail> {
  const current = await findPlatformTenantRecord(tenantId);
  if (!current) {
    throw new AppError("NOT_FOUND", "Tenant not found.", 404);
  }

  const updated = await updatePlatformTenantRecord({
    tenantId,
    ...input,
  });

  await recordUserAuditLog({
    tenantId,
    actorUserId: actor.userId,
    action: "PLATFORM_TENANT_UPDATED",
    resourceType: "Tenant",
    resourceId: tenantId,
    metadata: {
      targetTenantId: tenantId,
      targetTenantSlug: updated.slug,
      previousStatus: current.status,
      nextStatus: updated.status,
      previousType: current.type,
      nextType: updated.type,
      actorPlatformRole: actor.role,
      result: "updated",
    },
  });

  return toTenantDetail(updated, await countTenantOwners(updated.id));
}

export async function listPlatformTenantMembers(
  tenantId: string,
): Promise<PlatformMemberRecord[]> {
  await assertTenantExists(tenantId);
  return (await listPlatformMemberRecords(tenantId)).map(toMemberRecord);
}

export async function createPlatformTenantMember(
  tenantId: string,
  input: PlatformMemberCreateInput,
  actor: PlatformAdminContext,
): Promise<PlatformMemberRecord> {
  await assertTenantExists(tenantId);
  const passwordHash = input.password ? await hashPassword(input.password) : undefined;
  const result = await createPlatformMemberRecord({
    tenantId,
    email: input.email,
    name: input.name ?? null,
    passwordHash,
    role: input.role,
    status: input.membershipStatus,
  }).catch((error: unknown) => {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "CONFLICT",
        "User membership already exists for this tenant.",
        409,
      );
    }

    throw error;
  });

  if (!result.member) {
    if (result.reason === "TENANT_NOT_FOUND") {
      throw new AppError("NOT_FOUND", "Tenant not found.", 404);
    }

    if (result.reason === "PASSWORD_REQUIRED") {
      throw new AppError(
        "VALIDATION_ERROR",
        "password is required when email does not belong to an existing user.",
        400,
      );
    }

    throw new AppError("INTERNAL_ERROR", "Member could not be created.", 500);
  }

  await recordUserAuditLog({
    tenantId,
    actorUserId: actor.userId,
    action: "PLATFORM_TENANT_MEMBER_ADDED",
    resourceType: "TenantMembership",
    resourceId: result.member.id,
    metadata: {
      targetTenantId: tenantId,
      targetMembershipId: result.member.id,
      targetUserId: result.member.userId,
      nextRole: result.member.role,
      nextStatus: result.member.status,
      actorPlatformRole: actor.role,
      result: "added",
    },
  });

  return toMemberRecord(result.member);
}

export async function updatePlatformTenantMember(
  tenantId: string,
  membershipId: string,
  input: PlatformMemberUpdateInput,
  actor: PlatformAdminContext,
): Promise<PlatformMemberRecord> {
  const current = await findPlatformMemberRecord(tenantId, membershipId);
  if (!current) {
    throw new AppError("NOT_FOUND", "Tenant member not found.", 404);
  }

  const nextRole = input.role ?? current.role;
  const nextStatus = input.membershipStatus ?? current.status;

  await assertOwnerUpdateIsSafe({
    tenantId,
    currentRole: current.role,
    currentStatus: current.status,
    nextRole,
    nextStatus,
  });

  const updated = await updatePlatformMemberRecord({
    tenantId,
    membershipId,
    role: nextRole,
    status: nextStatus,
  });

  if (!updated) {
    throw new AppError("NOT_FOUND", "Tenant member not found.", 404);
  }

  await recordUserAuditLog({
    tenantId,
    actorUserId: actor.userId,
    action: "PLATFORM_TENANT_MEMBER_UPDATED",
    resourceType: "TenantMembership",
    resourceId: membershipId,
    metadata: {
      targetTenantId: tenantId,
      targetMembershipId: membershipId,
      targetUserId: current.userId,
      previousRole: current.role,
      nextRole,
      previousStatus: current.status,
      nextStatus,
      actorPlatformRole: actor.role,
      result: "updated",
    },
  });

  return toMemberRecord(updated);
}

export async function listPlatformAuditLogs(
  query: PlatformAuditLogListQuery,
): Promise<PlatformPaginatedResult<PlatformAuditLogRecord>> {
  const [records, totalItems] = await Promise.all([
    listPlatformAuditLogRecords(query),
    countPlatformAuditLogRecords(query),
  ]);

  return {
    data: records.map((record) => ({
      id: record.id,
      tenantId: record.tenantId,
      tenantName: record.tenant?.name ?? null,
      tenantSlug: record.tenant?.slug ?? null,
      actorType: record.actorType,
      actorUserId: record.actorUserId,
      actorEmail: record.actorUser?.email ?? null,
      action: record.action,
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      metadata: sanitizeAuditMetadata(record.metadata) as Record<string, unknown> | null,
      createdAt: record.createdAt,
    })),
    pagination: buildPagination(query.page, query.pageSize, totalItems),
  };
}

export function validatePlatformTenantListQuery(
  searchParams: URLSearchParams,
): PlatformTenantListQuery {
  return {
    page: parsePositiveInteger(searchParams.get("page"), "page", 1),
    pageSize: parsePageSize(searchParams.get("pageSize")),
    search: parseOptionalFilter(searchParams.get("search"), "search"),
    status: parseOptionalTenantStatus(searchParams.get("status")),
  };
}

export function validatePlatformTenantCreateInput(
  input: unknown,
): PlatformTenantCreateInput {
  const body = requireObject(input);
  const ownerPassword = parseOptionalPassword(body.ownerPassword, "ownerPassword");

  return {
    name: parseName(body.name),
    slug: parseSlug(body.slug),
    type: parseTenantType(body.type, "CLIENT"),
    status: parseTenantStatus(body.status, "ACTIVE"),
    ownerEmail: parseEmail(body.ownerEmail, "ownerEmail"),
    ownerName: parseOptionalString(body.ownerName, "ownerName", MAX_NAME_LENGTH),
    ...(ownerPassword ? { ownerPassword } : {}),
  };
}

export function validatePlatformTenantUpdateInput(
  input: unknown,
): PlatformTenantUpdateInput {
  const body = requireObject(input);
  const update: PlatformTenantUpdateInput = {};

  if (body.name !== undefined) update.name = parseName(body.name);
  if (body.status !== undefined) update.status = parseTenantStatus(body.status);
  if (body.type !== undefined) update.type = parseTenantType(body.type);

  if (!Object.keys(update).length) {
    throw new AppError(
      "VALIDATION_ERROR",
      "At least one tenant field is required.",
      400,
    );
  }

  return update;
}

export function validatePlatformMemberCreateInput(
  input: unknown,
): PlatformMemberCreateInput {
  const body = requireObject(input);
  const password = parseOptionalPassword(body.password, "password");

  return {
    email: parseEmail(body.email, "email"),
    name: parseOptionalString(body.name, "name", MAX_NAME_LENGTH),
    role: parseTenantRole(body.role, "VIEWER"),
    membershipStatus: parseMembershipStatus(body.membershipStatus, "ACTIVE"),
    ...(password ? { password } : {}),
  };
}

export function validatePlatformMemberUpdateInput(
  input: unknown,
): PlatformMemberUpdateInput {
  const body = requireObject(input);
  const update: PlatformMemberUpdateInput = {};

  if (body.role !== undefined) update.role = parseTenantRole(body.role);
  const statusValue = body.membershipStatus ?? body.status;
  if (statusValue !== undefined) {
    update.membershipStatus = parseMembershipStatus(statusValue);
  }

  if (!Object.keys(update).length) {
    throw new AppError(
      "VALIDATION_ERROR",
      "role or membershipStatus is required.",
      400,
    );
  }

  return update;
}

export function validatePlatformAuditLogListQuery(
  searchParams: URLSearchParams,
): PlatformAuditLogListQuery {
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new AppError("VALIDATION_ERROR", "sortOrder must be asc or desc.", 400);
  }

  const action = parseOptionalFilter(searchParams.get("action"), "action");

  return {
    page: parsePositiveInteger(searchParams.get("page"), "page", 1),
    pageSize: parsePageSize(searchParams.get("pageSize")),
    tenantId: parseOptionalFilter(searchParams.get("tenantId"), "tenantId"),
    action,
    actions: action ? undefined : parseOptionalPlatformAuditActions(searchParams),
    actorType: parseActorType(searchParams.get("actorType")),
    resourceType: parseOptionalFilter(searchParams.get("resourceType"), "resourceType"),
    from: parseOptionalDate(searchParams.get("from"), "from"),
    to: parseOptionalDate(searchParams.get("to"), "to"),
    sortOrder,
  };
}

function toTenantSummary(
  record: {
    id: string;
    name: string;
    slug: string;
    type: TenantType;
    status: TenantStatus;
    createdAt: Date;
    updatedAt: Date;
    _count: { memberships: number };
  },
  ownersCount: number,
): PlatformTenantSummary {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    type: record.type,
    status: record.status,
    membersCount: record._count.memberships,
    ownersCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toTenantDetail(
  record: {
    id: string;
    name: string;
    slug: string;
    type: TenantType;
    status: TenantStatus;
    createdAt: Date;
    updatedAt: Date;
    _count: {
      memberships: number;
      apiKeys: number;
      orders: number;
      shipments: number;
      carrierAccounts: number;
    };
  },
  ownersCount: number,
): PlatformTenantDetail {
  return {
    ...toTenantSummary(record, ownersCount),
    apiKeysCount: record._count.apiKeys,
    ordersCount: record._count.orders,
    shipmentsCount: record._count.shipments,
    carrierAccountsCount: record._count.carrierAccounts,
  };
}

function toMemberRecord(record: {
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
    status: PlatformMemberRecord["userStatus"];
  };
}): PlatformMemberRecord {
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

async function assertTenantExists(tenantId: string) {
  const tenant = await findPlatformTenantRecord(tenantId);
  if (!tenant) {
    throw new AppError("NOT_FOUND", "Tenant not found.", 404);
  }
}

async function assertOwnerUpdateIsSafe(input: {
  tenantId: string;
  currentRole: TenantRole;
  currentStatus: MembershipStatus;
  nextRole: TenantRole;
  nextStatus: MembershipStatus;
}) {
  const removesActiveOwner =
    input.currentRole === "OWNER" &&
    input.currentStatus === "ACTIVE" &&
    (input.nextRole !== "OWNER" || input.nextStatus !== "ACTIVE");

  if (!removesActiveOwner) return;

  const ownersCount = await countTenantOwners(input.tenantId);
  if (ownersCount <= 1) {
    throw new AppError(
      "CONFLICT",
      "Tenant must keep at least one active owner.",
      409,
    );
  }
}

function buildPagination(page: number, pageSize: number, totalItems: number) {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };
}

function requireObject(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  return input as Record<string, unknown>;
}

function parsePositiveInteger(
  value: string | null,
  label: string,
  fallback: number,
) {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label} must be a positive integer.`,
      400,
    );
  }

  return parsed;
}

function parsePageSize(value: string | null) {
  const pageSize = parsePositiveInteger(value, "pageSize", DEFAULT_PAGE_SIZE);
  if (pageSize > MAX_PAGE_SIZE) {
    throw new AppError(
      "VALIDATION_ERROR",
      `pageSize must be less than or equal to ${MAX_PAGE_SIZE}.`,
      400,
    );
  }

  return pageSize;
}

function parseOptionalFilter(value: string | null, label: string) {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  if (trimmed.length > MAX_FILTER_LENGTH) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label} must be ${MAX_FILTER_LENGTH} characters or less.`,
      400,
    );
  }

  return trimmed;
}

function parseName(value: unknown) {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "name is required.", 400);
  }

  const name = value.trim();
  if (!name || name.length > MAX_NAME_LENGTH) {
    throw new AppError(
      "VALIDATION_ERROR",
      `name must be between 1 and ${MAX_NAME_LENGTH} characters.`,
      400,
    );
  }

  return name;
}

function parseSlug(value: unknown) {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "slug is required.", 400);
  }

  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(slug) || slug.length > MAX_SLUG_LENGTH) {
    throw new AppError(
      "VALIDATION_ERROR",
      "slug must be lowercase letters, numbers, and dashes.",
      400,
    );
  }

  return slug;
}

function parseEmail(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", `${label} is required.`, 400);
  }

  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > MAX_EMAIL_LENGTH) {
    throw new AppError("VALIDATION_ERROR", `${label} must be valid.`, 400);
  }

  return email;
}

function parseOptionalString(
  value: unknown,
  label: string,
  maxLength: number,
) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", `${label} must be a string.`, 400);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label} must be ${maxLength} characters or less.`,
      400,
    );
  }

  return trimmed || undefined;
}

function parseOptionalPassword(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", `${label} must be a string.`, 400);
  }

  if (value.length < MIN_PASSWORD_LENGTH || value.length > MAX_PASSWORD_LENGTH) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label} length must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
      400,
    );
  }

  return value;
}

function parseTenantType(value: unknown, fallback?: TenantType): TenantType {
  if (value === undefined || value === null || value === "") {
    if (fallback) return fallback;
    throw new AppError("VALIDATION_ERROR", "type is required.", 400);
  }

  if (typeof value === "string" && TENANT_TYPES.includes(value as TenantType)) {
    return value as TenantType;
  }

  throw new AppError("VALIDATION_ERROR", "type is invalid.", 400);
}

function parseTenantStatus(value: unknown, fallback?: TenantStatus): TenantStatus {
  if (value === undefined || value === null || value === "") {
    if (fallback) return fallback;
    throw new AppError("VALIDATION_ERROR", "status is required.", 400);
  }

  if (
    typeof value === "string" &&
    TENANT_STATUSES.includes(value as TenantStatus)
  ) {
    return value as TenantStatus;
  }

  throw new AppError("VALIDATION_ERROR", "status is invalid.", 400);
}

function parseOptionalTenantStatus(value: string | null) {
  if (!value?.trim()) return undefined;
  return parseTenantStatus(value);
}

function parseTenantRole(value: unknown, fallback?: TenantRole): TenantRole {
  if (value === undefined || value === null || value === "") {
    if (fallback) return fallback;
    throw new AppError("VALIDATION_ERROR", "role is required.", 400);
  }

  if (typeof value === "string" && TENANT_ROLES.includes(value as TenantRole)) {
    return value as TenantRole;
  }

  throw new AppError("VALIDATION_ERROR", "role is invalid.", 400);
}

function parseMembershipStatus(
  value: unknown,
  fallback?: Extract<MembershipStatus, "ACTIVE" | "DISABLED">,
): Extract<MembershipStatus, "ACTIVE" | "DISABLED"> {
  if (value === undefined || value === null || value === "") {
    if (fallback) return fallback;
    throw new AppError("VALIDATION_ERROR", "membershipStatus is required.", 400);
  }

  if (
    typeof value === "string" &&
    MEMBER_STATUSES.includes(
      value as Extract<MembershipStatus, "ACTIVE" | "DISABLED">,
    )
  ) {
    return value as Extract<MembershipStatus, "ACTIVE" | "DISABLED">;
  }

  throw new AppError("VALIDATION_ERROR", "membershipStatus is invalid.", 400);
}

function parseActorType(value: string | null) {
  if (!value?.trim()) return undefined;
  if (ACTOR_TYPES.includes(value as (typeof ACTOR_TYPES)[number])) {
    return value as (typeof ACTOR_TYPES)[number];
  }

  throw new AppError("VALIDATION_ERROR", "actorType is invalid.", 400);
}

function parseOptionalPlatformAuditActions(searchParams: URLSearchParams) {
  const values = [
    ...searchParams.getAll("actions").flatMap((value) => value.split(",")),
    ...searchParams.getAll("action[]"),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  if (!values.length) return undefined;

  const uniqueValues = [...new Set(values)];
  if (uniqueValues.length > PLATFORM_AUDIT_ACTIONS.length) {
    throw new AppError(
      "VALIDATION_ERROR",
      `actions must include ${PLATFORM_AUDIT_ACTIONS.length} values or less.`,
      400,
    );
  }

  const allowedActions = new Set<string>(PLATFORM_AUDIT_ACTIONS);
  const invalidAction = uniqueValues.find((value) => !allowedActions.has(value));
  if (invalidAction) {
    throw new AppError("VALIDATION_ERROR", "actions contains an invalid value.", 400);
  }

  return uniqueValues;
}

function parseOptionalDate(value: string | null, label: string) {
  if (!value?.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${label} must be a valid ISO date.`,
      400,
    );
  }

  return date;
}

export function isPlatformAdminRole(value: unknown): value is PlatformAdminRole {
  return value === "PLATFORM_ADMIN" || value === "PLATFORM_SUPPORT";
}

export function toSafeJsonMetadata(value: unknown): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Prisma.InputJsonObject;
}

function isUniqueConstraintError(error: unknown) {
  return (
    (error instanceof PrismaClientKnownRequestError && error.code === "P2002") ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002")
  );
}
