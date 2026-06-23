-- CreateEnum
CREATE TYPE "ShipmentActualFeeStatus" AS ENUM ('PENDING', 'AVAILABLE', 'FAILED');

-- CreateTable
CREATE TABLE "ShipmentCost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "actualWeightKg" DECIMAL(65,30) NOT NULL,
    "actualLengthCm" DECIMAL(65,30) NOT NULL,
    "actualWidthCm" DECIMAL(65,30) NOT NULL,
    "actualHeightCm" DECIMAL(65,30) NOT NULL,
    "volumetricWeightKg" DECIMAL(65,30) NOT NULL,
    "chargeableWeightKg" DECIMAL(65,30) NOT NULL,
    "estimatedWeightKg" DECIMAL(65,30),
    "estimatedFee" DECIMAL(65,30),
    "estimatedCurrency" TEXT,
    "estimatedCountryCode" TEXT,
    "estimatedShippingMethodCode" TEXT,
    "estimateSource" TEXT NOT NULL,
    "actualFeeStatus" "ShipmentActualFeeStatus" NOT NULL DEFAULT 'PENDING',
    "actualGrossWeight" DECIMAL(65,30),
    "actualChargeWeight" DECIMAL(65,30),
    "actualFreight" DECIMAL(65,30),
    "actualFuelSurcharge" DECIMAL(65,30),
    "actualRegistrationFee" DECIMAL(65,30),
    "actualProcessingFee" DECIMAL(65,30),
    "actualOtherFee" DECIMAL(65,30),
    "actualTotalFee" DECIMAL(65,30),
    "actualOccurrenceTime" TIMESTAMP(3),
    "actualFetchedAt" TIMESTAMP(3),
    "actualFetchErrorCode" TEXT,
    "actualFetchErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentCost_shipmentId_key" ON "ShipmentCost"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentCost_tenantId_orderId_idx" ON "ShipmentCost"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "ShipmentCost_tenantId_actualFeeStatus_idx" ON "ShipmentCost"("tenantId", "actualFeeStatus");

-- CreateIndex
CREATE INDEX "ShipmentCost_tenantId_createdAt_idx" ON "ShipmentCost"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "ShipmentCost" ADD CONSTRAINT "ShipmentCost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentCost" ADD CONSTRAINT "ShipmentCost_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentCost" ADD CONSTRAINT "ShipmentCost_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
