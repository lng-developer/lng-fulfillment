import { PrismaClient } from "@prisma/client";
import { loadPlatformTestEnv } from "./env";
import { PLATFORM_SUPPORT_EMAIL_PREFIX } from "./test-data";
import { readPlatformRegressionState } from "./test-state";

export default async function globalTeardown() {
  loadPlatformTestEnv();

  const prisma = new PrismaClient();
  try {
    const state = readPlatformRegressionState();
    const testStartedAt = state.testStartedAt
      ? new Date(state.testStartedAt)
      : new Date(Date.now() - 60 * 60 * 1000);

    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          {
            resourceId: {
              startsWith: state.auditMarker,
            },
          },
          {
            action: "PLATFORM_MUTATION_DENIED",
            actorUser: {
              email: state.supportEmail,
            },
            createdAt: {
              gte: testStartedAt,
            },
          },
          {
            action: "PLATFORM_ACCESS_DENIED",
            resourceType: "PlatformAccess",
            resourceId: "platform.tenants",
            actorUser: {
              email: "operator@example.com",
            },
            createdAt: {
              gte: testStartedAt,
            },
          },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: state.supportEmail },
          { email: { startsWith: PLATFORM_SUPPORT_EMAIL_PREFIX } },
        ],
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
