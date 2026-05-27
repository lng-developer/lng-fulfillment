import { PrismaClient } from "@prisma/client";
import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../src/shared/security";

const prisma = new PrismaClient();

const ROLE_TEST_USERS = [
  {
    email: "admin@example.com",
    name: "Admin Test",
    role: "OWNER",
    passwordEnv: "DEV_ADMIN_PASSWORD",
  },
  {
    email: "tenant-admin@example.com",
    name: "Tenant Admin Test",
    role: "ADMIN",
    passwordEnv: "DEV_TEST_PASSWORD",
  },
  {
    email: "operator@example.com",
    name: "Operator Test",
    role: "OPERATOR",
    passwordEnv: "DEV_TEST_PASSWORD",
  },
  {
    email: "viewer@example.com",
    name: "Viewer Test",
    role: "VIEWER",
    passwordEnv: "DEV_TEST_PASSWORD",
  },
] as const;

async function main() {
  const passwordConfig = resolveSeedPasswords();

  const tenant = await prisma.tenant.upsert({
    where: { slug: "internal-test" },
    create: {
      name: "Internal Test Tenant",
      slug: "internal-test",
      type: "INTERNAL",
      status: "ACTIVE",
    },
    update: {
      name: "Internal Test Tenant",
      type: "INTERNAL",
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const seededUsers: Array<{ email: string; role: string }> = [];

  for (const seedUser of ROLE_TEST_USERS) {
    const password =
      seedUser.passwordEnv === "DEV_ADMIN_PASSWORD"
        ? passwordConfig.adminPassword
        : passwordConfig.testPassword;

    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      create: {
        email: seedUser.email,
        name: seedUser.name,
        status: "ACTIVE",
        passwordHash: await hashPassword(password),
      },
      update: {
        name: seedUser.name,
        status: "ACTIVE",
        passwordHash: await hashPassword(password),
      },
      select: { id: true, email: true },
    });

    if (seedUser.email === "admin@example.com") {
      await prisma.platformAdmin.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          role: "PLATFORM_ADMIN",
          status: "ACTIVE",
        },
        update: {
          role: "PLATFORM_ADMIN",
          status: "ACTIVE",
        },
      });
    }

    await prisma.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        role: seedUser.role,
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
      update: {
        role: seedUser.role,
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });

    seededUsers.push({
      email: user.email,
      role: seedUser.role,
    });
  }

  console.log(
    JSON.stringify({
      tenantSlug: "internal-test",
      seededUsers,
      platformAdminEmail: "admin@example.com",
      tenantApiKeyCreated: false,
    }),
  );
}

function resolveSeedPasswords() {
  const adminPassword = getValidSeedPassword("DEV_ADMIN_PASSWORD");
  const testPassword = isValidSeedPassword(process.env.DEV_TEST_PASSWORD)
    ? process.env.DEV_TEST_PASSWORD
    : adminPassword;

  return {
    adminPassword,
    testPassword,
  };
}

function getValidSeedPassword(name: "DEV_ADMIN_PASSWORD") {
  const value = process.env[name];
  if (!isValidSeedPassword(value)) {
    throw new Error(
      `${name} must be configured for development seed and must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
    );
  }

  return value;
}

function isValidSeedPassword(value: string | undefined): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_PASSWORD_LENGTH &&
    value.length <= MAX_PASSWORD_LENGTH
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
