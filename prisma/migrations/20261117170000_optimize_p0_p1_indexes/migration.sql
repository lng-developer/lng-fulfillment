-- CreateIndex
CREATE INDEX "AuditLog_tenantId_resourceType_resourceId_idx" ON "AuditLog"("tenantId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "Order_tenantId_orderNumber_idx" ON "Order"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "Order_tenantId_status_receivedAt_idx" ON "Order"("tenantId", "status", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "Shipment_tenantId_trackingNumber_idx" ON "Shipment"("tenantId", "trackingNumber");

-- CreateIndex
CREATE INDEX "Shipment_tenantId_carrierShipmentId_idx" ON "Shipment"("tenantId", "carrierShipmentId");

-- CreateIndex
CREATE INDEX "Shipment_tenantId_updatedAt_idx" ON "Shipment"("tenantId", "updatedAt");

-- CreateIndex
CREATE INDEX "Shipment_tenantId_carrierCode_status_idx" ON "Shipment"("tenantId", "carrierCode", "status");

-- CreateIndex
CREATE INDEX "AutoShipmentJob_tenantId_status_createdAt_idx" ON "AutoShipmentJob"("tenantId", "status", "createdAt");
