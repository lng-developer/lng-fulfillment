import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/shared/security";
import {
  printSafeDbSummary,
  requirePlatformTestEnv,
} from "./env";
import { PLATFORM_SUPPORT_EMAIL_PREFIX } from "./test-data";
import {
  createPlatformRegressionState,
  writePlatformRegressionState,
} from "./test-state";

export default async function globalSetup() {
  const targets = requirePlatformTestEnv();
  printSafeDbSummary(targets);

  const prisma = new PrismaClient();
  try {
    const state = createPlatformRegressionState();
    const password = process.env.DEV_TEST_PASSWORD;
    if (!password) {
      throw new Error("BLOCKED: DEV_TEST_PASSWORD is missing.");
    }

    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: PLATFORM_SUPPORT_EMAIL_PREFIX,
        },
      },
    });

    const user = await prisma.user.upsert({
      where: { email: state.supportEmail },
      create: {
        email: state.supportEmail,
        name: "Platform Support Browser Test",
        passwordHash: await hashPassword(password),
        status: "ACTIVE",
      },
      update: {
        name: "Platform Support Browser Test",
        passwordHash: await hashPassword(password),
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    await prisma.platformAdmin.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        role: "PLATFORM_SUPPORT",
        status: "ACTIVE",
      },
      update: {
        role: "PLATFORM_SUPPORT",
        status: "ACTIVE",
      },
    });

    const [adminUser, operatorUser, tenant] = await Promise.all([
      prisma.user.findUnique({
        where: { email: "admin@example.com" },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { email: "operator@example.com" },
        select: { id: true },
      }),
      prisma.tenant.findUnique({
        where: { slug: "internal-test" },
        select: { id: true, slug: true },
      }),
    ]);

    if (!adminUser || !operatorUser || !tenant) {
      throw new Error("BLOCKED: seeded platform runtime users or tenant are missing.");
    }

    state.auditTenantId = tenant.id;
    writePlatformRegressionState(state);

    await prisma.auditLog.deleteMany({
      where: {
        resourceId: {
          startsWith: state.auditMarker,
        },
      },
    });

    const now = Date.now();
    const longSafeNote = Array.from({ length: 20 }, (_, index) => `runtime-note-${index}`)
      .join(" ");

    await prisma.auditLog.createMany({
      data: [
        {
          tenantId: tenant.id,
          actorUserId: adminUser.id,
          actorType: "USER",
          action: "PLATFORM_TENANT_CREATED",
          resourceType: "Tenant",
          resourceId: `${state.auditMarker}-tenant-created`,
          metadata: {
            marker: state.auditMarker,
            targetTenantId: tenant.id,
            targetTenantSlug: tenant.slug,
            actorPlatformRole: "PLATFORM_ADMIN",
            result: "created",
            longSafeNote,
          },
          createdAt: new Date(now - 1_000),
        },
        {
          tenantId: tenant.id,
          actorUserId: adminUser.id,
          actorType: "USER",
          action: "PLATFORM_TENANT_UPDATED",
          resourceType: "Tenant",
          resourceId: `${state.auditMarker}-tenant-updated`,
          metadata: {
            marker: state.auditMarker,
            targetTenantId: tenant.id,
            previousStatus: "ACTIVE",
            nextStatus: "ACTIVE",
            actorPlatformRole: "PLATFORM_ADMIN",
            result: "updated",
          },
          createdAt: new Date(now - 2_000),
        },
        {
          tenantId: tenant.id,
          actorUserId: adminUser.id,
          actorType: "USER",
          action: "PLATFORM_TENANT_MEMBER_ADDED",
          resourceType: "TenantMembership",
          resourceId: `${state.auditMarker}-member-added`,
          metadata: {
            marker: state.auditMarker,
            targetTenantId: tenant.id,
            targetMembershipId: `${state.auditMarker}-membership`,
            targetUserId: `${state.auditMarker}-user`,
            nextRole: "VIEWER",
            nextStatus: "ACTIVE",
            actorPlatformRole: "PLATFORM_ADMIN",
            result: "added",
          },
          createdAt: new Date(now - 3_000),
        },
        {
          tenantId: tenant.id,
          actorUserId: adminUser.id,
          actorType: "USER",
          action: "PLATFORM_TENANT_MEMBER_UPDATED",
          resourceType: "TenantMembership",
          resourceId: `${state.auditMarker}-member-updated`,
          metadata: {
            marker: state.auditMarker,
            targetTenantId: tenant.id,
            previousRole: "VIEWER",
            nextRole: "OPERATOR",
            previousStatus: "ACTIVE",
            nextStatus: "ACTIVE",
            actorPlatformRole: "PLATFORM_ADMIN",
            result: "updated",
          },
          createdAt: new Date(now - 4_000),
        },
        {
          actorUserId: operatorUser.id,
          actorType: "USER",
          action: "PLATFORM_ACCESS_DENIED",
          resourceType: "PlatformAccess",
          resourceId: `${state.auditMarker}-access-denied`,
          metadata: {
            marker: state.auditMarker,
            routeGroup: "platform.tenants",
            method: "GET",
            reasonCode: "PLATFORM_ACCESS_REQUIRED",
            result: "denied",
          },
          createdAt: new Date(now - 5_000),
        },
        {
          actorUserId: user.id,
          actorType: "USER",
          action: "PLATFORM_MUTATION_DENIED",
          resourceType: "PlatformMutation",
          resourceId: `${state.auditMarker}-mutation-denied`,
          metadata: {
            marker: state.auditMarker,
            routeGroup: "platform.tenants",
            method: "POST",
            reasonCode: "PLATFORM_ADMIN_REQUIRED",
            actorPlatformRole: "PLATFORM_SUPPORT",
            result: "denied",
          },
          createdAt: new Date(now - 6_000),
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
}
