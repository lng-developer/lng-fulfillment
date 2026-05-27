-- Add platform-level admin roles for cross-tenant SaaS administration.

CREATE TYPE "PlatformAdminRole" AS ENUM ('PLATFORM_ADMIN', 'PLATFORM_SUPPORT');

CREATE TYPE "PlatformAdminStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlatformAdminRole" NOT NULL,
    "status" "PlatformAdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformAdmin_userId_key" ON "PlatformAdmin"("userId");

CREATE INDEX "PlatformAdmin_role_status_idx" ON "PlatformAdmin"("role", "status");

ALTER TABLE "PlatformAdmin" ADD CONSTRAINT "PlatformAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
