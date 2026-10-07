CREATE TYPE "LifecycleEventOutboxStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

CREATE TABLE "LifecycleEventOutbox" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "shipmentId" TEXT,
  "eventType" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "LifecycleEventOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAttemptAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "lastStatusCode" INTEGER,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LifecycleEventOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LifecycleEventOutbox_eventId_key" ON "LifecycleEventOutbox"("eventId");
CREATE INDEX "LifecycleEventOutbox_status_nextAttemptAt_idx" ON "LifecycleEventOutbox"("status", "nextAttemptAt");
CREATE INDEX "LifecycleEventOutbox_tenantId_createdAt_idx" ON "LifecycleEventOutbox"("tenantId", "createdAt");
CREATE INDEX "LifecycleEventOutbox_orderId_createdAt_idx" ON "LifecycleEventOutbox"("orderId", "createdAt");
CREATE INDEX "LifecycleEventOutbox_shipmentId_createdAt_idx" ON "LifecycleEventOutbox"("shipmentId", "createdAt");

ALTER TABLE "LifecycleEventOutbox" ADD CONSTRAINT "LifecycleEventOutbox_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LifecycleEventOutbox" ADD CONSTRAINT "LifecycleEventOutbox_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LifecycleEventOutbox" ADD CONSTRAINT "LifecycleEventOutbox_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
