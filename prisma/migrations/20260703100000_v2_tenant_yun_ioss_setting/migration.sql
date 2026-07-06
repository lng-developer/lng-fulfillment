ALTER TABLE "SkuShippingMethodMapping"
DROP COLUMN IF EXISTS "hsCode",
DROP COLUMN IF EXISTS "currencyCode",
DROP COLUMN IF EXISTS "invoicePart",
DROP COLUMN IF EXISTS "invoiceUsage",
DROP COLUMN IF EXISTS "tariffPrepay";

CREATE TYPE "TenantYunIossStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "TenantYunIossSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "iossNumber" TEXT,
    "status" "TenantYunIossStatus" NOT NULL DEFAULT 'DISABLED',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantYunIossSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantYunIossSetting_tenantId_key" ON "TenantYunIossSetting"("tenantId");
CREATE INDEX "TenantYunIossSetting_tenantId_status_idx" ON "TenantYunIossSetting"("tenantId", "status");

ALTER TABLE "TenantYunIossSetting"
ADD CONSTRAINT "TenantYunIossSetting_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
