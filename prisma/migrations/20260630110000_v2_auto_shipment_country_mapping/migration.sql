ALTER TABLE "SkuShippingMethodMapping"
  ADD COLUMN "destinationCountryCode" TEXT NOT NULL DEFAULT 'US';

ALTER TABLE "SkuShippingMethodMapping"
  ALTER COLUMN "destinationCountryCode" DROP DEFAULT;

DROP INDEX "SkuShippingMethodMapping_tenantId_skuCode_key";

CREATE UNIQUE INDEX "SkuShippingMethodMapping_tenantId_skuCode_destinationCountryCode_key"
  ON "SkuShippingMethodMapping"("tenantId", "skuCode", "destinationCountryCode");

CREATE INDEX "SkuShippingMethodMapping_tenantId_destinationCountryCode_status_idx"
  ON "SkuShippingMethodMapping"("tenantId", "destinationCountryCode", "status");
