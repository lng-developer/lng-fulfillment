import type { MembershipStatus, TenantRole } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";

const tenantApiKeySafeSelect = {
  id: true,
  name: true,
  keyPrefix: true,
  scopes: true,
  status: true,
  expiresAt: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TenantApiKeySelect;

const tenantMemberSafeSelect = {
  id: true,
  userId: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
    },
  },
} satisfies Prisma.TenantMembershipSelect;

export async function findTenantMembershipForUser(
  tenantId: string,
  userId: string,
) {
  return prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
    select: {
      role: true,
      status: true,
    },
  });
}

export async function createTenantApiKeyRecord(input: {
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt: Date | null;
}) {
  return prisma.tenantApiKey.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      keyPrefix: input.keyPrefix,
      keyHash: input.keyHash,
      scopes: input.scopes,
      expiresAt: input.expiresAt,
    },
    select: tenantApiKeySafeSelect,
  });
}

export async function listTenantApiKeyRecords(tenantId: string) {
  return prisma.tenantApiKey.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: tenantApiKeySafeSelect,
  });
}

export async function revokeTenantApiKeyRecord(
  tenantId: string,
  apiKeyId: string,
) {
  return prisma.tenantApiKey.updateManyAndReturn({
    where: {
      id: apiKeyId,
      tenantId,
      status: "ACTIVE",
    },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
    select: tenantApiKeySafeSelect,
  });
}

export async function findTenantApiKeyByHash(keyHash: string) {
  return prisma.tenantApiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      tenantId: true,
      keyHash: true,
      scopes: true,
      status: true,
      expiresAt: true,
    },
  });
}

export async function updateTenantApiKeyLastUsed(apiKeyId: string) {
  await prisma.tenantApiKey.update({
    where: { id: apiKeyId },
    data: { lastUsedAt: new Date() },
    select: { id: true },
  });
}

export async function listTenantMemberRecords(tenantId: string) {
  return prisma.tenantMembership.findMany({
    where: { tenantId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: tenantMemberSafeSelect,
  });
}

export async function findTenantMemberRecord(
  tenantId: string,
  membershipId: string,
) {
  return prisma.tenantMembership.findFirst({
    where: {
      id: membershipId,
      tenantId,
    },
    select: tenantMemberSafeSelect,
  });
}

export async function countActiveOwnerMemberships(tenantId: string) {
  return prisma.tenantMembership.count({
    where: {
      tenantId,
      role: "OWNER",
      status: "ACTIVE",
    },
  });
}

export async function countTenantMemberships(tenantId: string) {
  return prisma.tenantMembership.count({
    where: { tenantId },
  });
}

export async function createTenantMemberRecord(input: {
  tenantId: string;
  email: string;
  name: string | null;
  passwordHash?: string;
  role: Exclude<TenantRole, "OWNER">;
  status: Extract<MembershipStatus, "ACTIVE" | "DISABLED">;
}) {
  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (!existingUser && !input.passwordHash) {
      return { member: null, reason: "PASSWORD_REQUIRED" as const };
    }

    const memberCount = await tx.tenantMembership.count({
      where: { tenantId: input.tenantId },
    });
    if (memberCount >= 10) {
      return { member: null, reason: "TENANT_MEMBER_LIMIT_REACHED" as const };
    }

    const user =
      existingUser ??
      (await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash: input.passwordHash as string,
          status: "ACTIVE",
        },
        select: { id: true },
      }));

    const member = await tx.tenantMembership.create({
      data: {
        tenantId: input.tenantId,
        userId: user.id,
        role: input.role,
        status: input.status,
        acceptedAt: input.status === "ACTIVE" ? new Date() : null,
      },
      select: tenantMemberSafeSelect,
    });

    return { member, reason: null };
  });
}

export async function updateTenantMemberRecord(input: {
  tenantId: string;
  membershipId: string;
  role: TenantRole;
  status: MembershipStatus;
}) {
  const result = await prisma.tenantMembership.updateMany({
    where: {
      id: input.membershipId,
      tenantId: input.tenantId,
    },
    data: {
      role: input.role,
      status: input.status,
    },
  });

  if (result.count === 0) {
    return null;
  }

  return findTenantMemberRecord(input.tenantId, input.membershipId);
}
