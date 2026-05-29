import type {
  MembershipStatus,
  PlatformAdminRole,
  Prisma,
  TenantRole,
  TenantStatus,
  TenantType,
} from "@prisma/client";
import { prisma } from "@/shared/db";

const tenantSummaryInclude = {
  _count: {
    select: {
      memberships: true,
      apiKeys: true,
      orders: true,
      shipments: true,
      carrierAccounts: true,
    },
  },
} satisfies Prisma.TenantInclude;

const memberSafeSelect = {
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

export async function findPlatformAdminForUser(userId: string) {
  return prisma.platformAdmin.findUnique({
    where: { userId },
    select: {
      role: true,
      status: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}

export async function listPlatformTenantRecords(input: {
  page: number;
  pageSize: number;
  search?: string;
  status?: TenantStatus;
}) {
  return prisma.tenant.findMany({
    where: buildTenantWhere(input),
    include: tenantSummaryInclude,
    orderBy: { createdAt: "desc" },
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
  });
}

export async function countPlatformTenantRecords(input: {
  search?: string;
  status?: TenantStatus;
}) {
  return prisma.tenant.count({
    where: buildTenantWhere(input),
  });
}

export async function findPlatformTenantRecord(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    include: tenantSummaryInclude,
  });
}

export async function countTenantOwners(tenantId: string) {
  return prisma.tenantMembership.count({
    where: {
      tenantId,
      role: "OWNER",
      status: "ACTIVE",
    },
  });
}

export async function createTenantWithOwner(input: {
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
  ownerEmail: string;
  ownerName: string | null;
  ownerPasswordHash?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { email: input.ownerEmail },
      select: { id: true },
    });

    if (!existingUser && !input.ownerPasswordHash) {
      return { tenant: null, reason: "OWNER_PASSWORD_REQUIRED" as const };
    }

    const user =
      existingUser ??
      (await tx.user.create({
        data: {
          email: input.ownerEmail,
          name: input.ownerName,
          passwordHash: input.ownerPasswordHash as string,
          status: "ACTIVE",
        },
        select: { id: true },
      }));

    const tenant = await tx.tenant.create({
      data: {
        name: input.name,
        slug: input.slug,
        type: input.type,
        status: input.status,
        memberships: {
          create: {
            userId: user.id,
            role: "OWNER",
            status: "ACTIVE",
            acceptedAt: new Date(),
          },
        },
      },
      include: tenantSummaryInclude,
    });

    return { tenant, reason: null };
  });
}

export async function updatePlatformTenantRecord(input: {
  tenantId: string;
  name?: string;
  status?: TenantStatus;
  type?: TenantType;
}) {
  return prisma.tenant.update({
    where: { id: input.tenantId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
    },
    include: tenantSummaryInclude,
  });
}

export async function listPlatformMemberRecords(tenantId: string) {
  return prisma.tenantMembership.findMany({
    where: { tenantId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: memberSafeSelect,
  });
}

export async function findPlatformMemberRecord(
  tenantId: string,
  membershipId: string,
) {
  return prisma.tenantMembership.findFirst({
    where: {
      id: membershipId,
      tenantId,
    },
    select: memberSafeSelect,
  });
}

export async function createPlatformMemberRecord(input: {
  tenantId: string;
  email: string;
  name: string | null;
  passwordHash?: string;
  role: TenantRole;
  status: MembershipStatus;
}) {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: input.tenantId },
      select: { id: true },
    });

    if (!tenant) {
      return { member: null, reason: "TENANT_NOT_FOUND" as const };
    }

    const existingUser = await tx.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (!existingUser && !input.passwordHash) {
      return { member: null, reason: "PASSWORD_REQUIRED" as const };
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
      select: memberSafeSelect,
    });

    return { member, reason: null };
  });
}

export async function updatePlatformMemberRecord(input: {
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

  return findPlatformMemberRecord(input.tenantId, input.membershipId);
}

export async function listPlatformAuditLogRecords(input: {
  page: number;
  pageSize: number;
  tenantId?: string;
  action?: string;
  actions?: string[];
  actorType?: "USER" | "API_KEY" | "SYSTEM";
  resourceType?: string;
  from?: Date;
  to?: Date;
  sortOrder: "asc" | "desc";
}) {
  return prisma.auditLog.findMany({
    where: buildAuditWhere(input),
    orderBy: { createdAt: input.sortOrder },
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
    select: {
      id: true,
      tenantId: true,
      actorType: true,
      actorUserId: true,
      action: true,
      resourceType: true,
      resourceId: true,
      metadata: true,
      createdAt: true,
      tenant: {
        select: {
          name: true,
          slug: true,
        },
      },
      actorUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function countPlatformAuditLogRecords(input: {
  tenantId?: string;
  action?: string;
  actions?: string[];
  actorType?: "USER" | "API_KEY" | "SYSTEM";
  resourceType?: string;
  from?: Date;
  to?: Date;
}) {
  return prisma.auditLog.count({
    where: buildAuditWhere(input),
  });
}

function buildTenantWhere(input: {
  search?: string;
  status?: TenantStatus;
}): Prisma.TenantWhereInput {
  return {
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { slug: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function buildAuditWhere(input: {
  tenantId?: string;
  action?: string;
  actions?: string[];
  actorType?: "USER" | "API_KEY" | "SYSTEM";
  resourceType?: string;
  from?: Date;
  to?: Date;
}): Prisma.AuditLogWhereInput {
  return {
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(input.action
      ? { action: input.action }
      : input.actions?.length
        ? { action: { in: input.actions } }
        : {}),
    ...(input.actorType ? { actorType: input.actorType } : {}),
    ...(input.resourceType ? { resourceType: input.resourceType } : {}),
    ...(input.from || input.to
      ? {
          createdAt: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : {}),
  };
}

export function canUsePlatformAdmin(record: {
  role: PlatformAdminRole;
  status: string;
}) {
  return record.status === "ACTIVE" && record.role === "PLATFORM_ADMIN";
}

export function canAccessPlatform(record: {
  role: PlatformAdminRole;
  status: string;
}) {
  return (
    record.status === "ACTIVE" &&
    (record.role === "PLATFORM_ADMIN" || record.role === "PLATFORM_SUPPORT")
  );
}
