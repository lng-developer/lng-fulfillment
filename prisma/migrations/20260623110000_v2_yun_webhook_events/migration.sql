-- YunExpress webhook inbox, fee/tracking dispatch support, and abnormal case intake.
CREATE TYPE "YunWebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'FAILED', 'UNMATCHED');

CREATE TYPE "YunWebhookEventCategory" AS ENUM ('TRACKING', 'FEE', 'ABNORMAL', 'UNKNOWN');

CREATE TABLE "YunWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "eventType" TEXT,
    "eventCategory" "YunWebhookEventCategory" NOT NULL DEFAULT 'UNKNOWN',
    "dataCode" TEXT,
    "waybillNumber" TEXT,
    "trackingNumber" TEXT,
    "customerOrderNumber" TEXT,
    "tenantId" TEXT,
    "shipmentId" TEXT,
    "shipmentCostId" TEXT,
    "status" "YunWebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "timestampHeader" TEXT,
    "signatureHeader" TEXT,
    "rawEncryptedBody" JSONB NOT NULL,
    "decryptedPayload" JSONB,
    "safeMetadata" JSONB,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "YunWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "YunAbnormalCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "shipmentId" TEXT,
    "waybillNumber" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "customerOrderNumber" TEXT,
    "trackingNumber" TEXT,
    "processStatus" INTEGER,
    "problemTitles" JSONB,
    "funcBtnList" JSONB,
    "woInfo" JSONB,
    "operationInfo" JSONB,
    "latestOpCommand" TEXT,
    "processDeadline" TIMESTAMP(3),
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YunAbnormalCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "YunWebhookEvent_eventId_key" ON "YunWebhookEvent"("eventId");
CREATE INDEX "YunWebhookEvent_status_receivedAt_idx" ON "YunWebhookEvent"("status", "receivedAt");
CREATE INDEX "YunWebhookEvent_eventCategory_receivedAt_idx" ON "YunWebhookEvent"("eventCategory", "receivedAt");
CREATE INDEX "YunWebhookEvent_tenantId_receivedAt_idx" ON "YunWebhookEvent"("tenantId", "receivedAt");
CREATE INDEX "YunWebhookEvent_shipmentId_receivedAt_idx" ON "YunWebhookEvent"("shipmentId", "receivedAt");
CREATE INDEX "YunWebhookEvent_waybillNumber_idx" ON "YunWebhookEvent"("waybillNumber");
CREATE INDEX "YunWebhookEvent_trackingNumber_idx" ON "YunWebhookEvent"("trackingNumber");
CREATE INDEX "YunWebhookEvent_customerOrderNumber_idx" ON "YunWebhookEvent"("customerOrderNumber");

CREATE UNIQUE INDEX "YunAbnormalCase_waybillNumber_type_key" ON "YunAbnormalCase"("waybillNumber", "type");
CREATE INDEX "YunAbnormalCase_tenantId_updatedAt_idx" ON "YunAbnormalCase"("tenantId", "updatedAt");
CREATE INDEX "YunAbnormalCase_shipmentId_idx" ON "YunAbnormalCase"("shipmentId");
CREATE INDEX "YunAbnormalCase_trackingNumber_idx" ON "YunAbnormalCase"("trackingNumber");
CREATE INDEX "YunAbnormalCase_customerOrderNumber_idx" ON "YunAbnormalCase"("customerOrderNumber");

ALTER TABLE "YunWebhookEvent" ADD CONSTRAINT "YunWebhookEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "YunWebhookEvent" ADD CONSTRAINT "YunWebhookEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "YunWebhookEvent" ADD CONSTRAINT "YunWebhookEvent_shipmentCostId_fkey" FOREIGN KEY ("shipmentCostId") REFERENCES "ShipmentCost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "YunAbnormalCase" ADD CONSTRAINT "YunAbnormalCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "YunAbnormalCase" ADD CONSTRAINT "YunAbnormalCase_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
