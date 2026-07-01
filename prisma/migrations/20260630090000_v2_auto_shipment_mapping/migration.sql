-- CreateEnum
CREATE TYPE "SkuShippingMethodMappingStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "AutoShipmentJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'SKIPPED_DISABLED', 'MISSING_SKU_MAPPING', 'METHOD_CONFLICT', 'SKIPPED_EXISTING_SHIPMENT');

-- CreateTable
CREATE TABLE "TenantShipmentAutomationSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "autoCreateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "environment" TEXT NOT NULL DEFAULT 'live',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantShipmentAutomationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkuShippingMethodMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "skuCode" TEXT NOT NULL,
    "shippingMethodCode" TEXT NOT NULL,
    "description" TEXT,
    "status" "SkuShippingMethodMappingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkuShippingMethodMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoShipmentJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "AutoShipmentJobStatus" NOT NULL,
    "shippingMethodCode" TEXT,
    "skuCodes" JSONB,
    "missingSkuCodes" JSONB,
    "conflictingMethods" JSONB,
    "shipmentId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoShipmentJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantShipmentAutomationSetting_tenantId_key" ON "TenantShipmentAutomationSetting"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SkuShippingMethodMapping_tenantId_skuCode_key" ON "SkuShippingMethodMapping"("tenantId", "skuCode");

-- CreateIndex
CREATE INDEX "SkuShippingMethodMapping_tenantId_status_idx" ON "SkuShippingMethodMapping"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AutoShipmentJob_shipmentId_key" ON "AutoShipmentJob"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoShipmentJob_orderId_key" ON "AutoShipmentJob"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoShipmentJob_tenantId_orderId_key" ON "AutoShipmentJob"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "AutoShipmentJob_tenantId_status_idx" ON "AutoShipmentJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AutoShipmentJob_tenantId_createdAt_idx" ON "AutoShipmentJob"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "TenantShipmentAutomationSetting" ADD CONSTRAINT "TenantShipmentAutomationSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuShippingMethodMapping" ADD CONSTRAINT "SkuShippingMethodMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoShipmentJob" ADD CONSTRAINT "AutoShipmentJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoShipmentJob" ADD CONSTRAINT "AutoShipmentJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoShipmentJob" ADD CONSTRAINT "AutoShipmentJob_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
