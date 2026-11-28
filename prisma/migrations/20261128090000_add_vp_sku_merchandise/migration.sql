CREATE TABLE "SkuViettelMerchandiseMapping" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "skuCode" TEXT NOT NULL,
  "destinationCountryCode" TEXT NOT NULL,
  "declarationName" TEXT NOT NULL,
  "merchandiseCode" TEXT NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SkuViettelMerchandiseMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vp_sku_merchandise_tenant_sku_country_key"
ON "SkuViettelMerchandiseMapping"("tenantId", "skuCode", "destinationCountryCode");
ALTER TABLE "SkuViettelMerchandiseMapping" ADD CONSTRAINT "SkuViettelMerchandiseMapping_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
