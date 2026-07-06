ALTER TABLE "SkuShippingMethodMapping"
ADD COLUMN "hsCode" TEXT,
ADD COLUMN "currencyCode" TEXT,
ADD COLUMN "invoicePart" TEXT,
ADD COLUMN "invoiceUsage" TEXT,
ADD COLUMN "tariffPrepay" INTEGER;
