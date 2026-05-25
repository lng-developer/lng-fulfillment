-- AlterTable
ALTER TABLE "Order" ADD COLUMN "sourceAccount" TEXT;
ALTER TABLE "Order" ADD COLUMN "shopName" TEXT;
ALTER TABLE "Order" ADD COLUMN "marketplace" TEXT;
ALTER TABLE "Order" ADD COLUMN "externalStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN "purchaseAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "destinationState" TEXT;
ALTER TABLE "Order" ADD COLUMN "destinationCity" TEXT;
ALTER TABLE "Order" ADD COLUMN "destinationPostalCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingService" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingType" TEXT;
ALTER TABLE "Order" ADD COLUMN "currency" TEXT;
ALTER TABLE "Order" ADD COLUMN "orderTotal" DECIMAL(65,30);
ALTER TABLE "Order" ADD COLUMN "metadata" JSONB;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "title" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "asin" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "listingId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "productType" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variant" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "unitPrice" DECIMAL(65,30);
ALTER TABLE "OrderItem" ADD COLUMN "currency" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "customizationUrl" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "customizationData" JSONB;
ALTER TABLE "OrderItem" ADD COLUMN "snapshotImageUrl" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "fulfillmentFile" JSONB;
ALTER TABLE "OrderItem" ADD COLUMN "listingSnapshot" JSONB;
ALTER TABLE "OrderItem" ADD COLUMN "costCenterSnapshot" JSONB;
ALTER TABLE "OrderItem" ADD COLUMN "productionStatus" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "scaleStatus" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "qcNote" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE INDEX "Order_tenantId_shopName_idx" ON "Order"("tenantId", "shopName");

-- CreateIndex
CREATE INDEX "Order_tenantId_marketplace_idx" ON "Order"("tenantId", "marketplace");

-- CreateIndex
CREATE INDEX "Order_tenantId_purchaseAt_idx" ON "Order"("tenantId", "purchaseAt");

-- CreateIndex
CREATE INDEX "Order_tenantId_destinationCountry_idx" ON "Order"("tenantId", "destinationCountry");

-- CreateIndex
CREATE INDEX "OrderItem_tenantId_sku_idx" ON "OrderItem"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "OrderItem_tenantId_asin_idx" ON "OrderItem"("tenantId", "asin");

-- CreateIndex
CREATE INDEX "OrderItem_tenantId_listingId_idx" ON "OrderItem"("tenantId", "listingId");
