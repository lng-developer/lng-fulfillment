import { prisma } from "@/shared/db";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      status: true,
    },
  });
}

export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
    },
  });
}

export async function createSession(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  return prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
    select: {
      id: true,
      expiresAt: true,
    },
  });
}

export async function findSessionByTokenHash(tokenHash: string) {
  return prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}

export async function findSessionContextByTokenHash(tokenHash: string) {
  return prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      expiresAt: true,
      lastUsedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          memberships: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              tenantId: true,
              role: true,
              status: true,
              tenant: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function deleteSessionByTokenHash(tokenHash: string) {
  await prisma.session.deleteMany({
    where: { tokenHash },
  });
}

export async function updateSessionLastUsed(tokenHash: string) {
  await prisma.session.updateMany({
    where: { tokenHash },
    data: { lastUsedAt: new Date() },
  });
}

export async function getUserTenantMemberships(userId: string) {
  return prisma.tenantMembership.findMany({
    where: { userId },
    select: {
      tenantId: true,
      role: true,
      status: true,
      tenant: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}
