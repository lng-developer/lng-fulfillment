CREATE TYPE "VpMappingType" AS ENUM ('SKU', 'GROUP');
ALTER TABLE "SkuViettelMerchandiseMapping" ADD COLUMN "mappingType" "VpMappingType" NOT NULL DEFAULT 'SKU';
DROP INDEX "vp_sku_merchandise_tenant_sku_country_key";
CREATE UNIQUE INDEX "vp_merchandise_tenant_type_key_country_key"
ON "SkuViettelMerchandiseMapping"("tenantId", "mappingType", "skuCode", "destinationCountryCode");
