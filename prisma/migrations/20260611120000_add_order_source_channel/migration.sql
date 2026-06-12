CREATE TYPE "OrderSourceChannel" AS ENUM ('AMAZON', 'ETSY', 'MANUAL', 'UNKNOWN');

ALTER TABLE "Order"
ADD COLUMN "sourceChannel" "OrderSourceChannel";

UPDATE "Order"
SET "sourceChannel" = CASE
  WHEN "externalOrderId" ~ '^[0-9]{3}-[0-9]{7}-[0-9]{7}(-.*)?$'
    THEN 'AMAZON'::"OrderSourceChannel"
  ELSE 'UNKNOWN'::"OrderSourceChannel"
END
WHERE "sourceChannel" IS NULL;

CREATE INDEX "Order_tenantId_sourceChannel_idx" ON "Order"("tenantId", "sourceChannel");
