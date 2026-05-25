-- CreateEnum
CREATE TYPE "CarrierAccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "CarrierCredentialStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ROTATED');

-- CreateEnum
CREATE TYPE "CarrierCredentialType" AS ENUM ('YUNEXPRESS_OMS', 'API_KEY', 'BASIC_AUTH', 'OAUTH', 'OTHER');

-- CreateTable
CREATE TABLE "CarrierAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "carrierCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "CarrierAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "carrierAccountId" TEXT NOT NULL,
    "credentialType" "CarrierCredentialType" NOT NULL,
    "secretRef" TEXT,
    "encryptedPayload" JSONB,
    "keyPrefix" TEXT,
    "status" "CarrierCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "encryptionVersion" TEXT,
    "keyVersion" TEXT,
    "lastValidatedAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarrierAccount_tenantId_carrierCode_idx" ON "CarrierAccount"("tenantId", "carrierCode");

-- CreateIndex
CREATE INDEX "CarrierAccount_tenantId_carrierCode_isDefault_idx" ON "CarrierAccount"("tenantId", "carrierCode", "isDefault");

-- CreateIndex
CREATE INDEX "CarrierAccount_tenantId_status_idx" ON "CarrierAccount"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CarrierCredential_tenantId_carrierAccountId_idx" ON "CarrierCredential"("tenantId", "carrierAccountId");

-- CreateIndex
CREATE INDEX "CarrierCredential_tenantId_status_idx" ON "CarrierCredential"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CarrierCredential_tenantId_credentialType_idx" ON "CarrierCredential"("tenantId", "credentialType");

-- AddForeignKey
ALTER TABLE "CarrierAccount" ADD CONSTRAINT "CarrierAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierCredential" ADD CONSTRAINT "CarrierCredential_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierCredential" ADD CONSTRAINT "CarrierCredential_carrierAccountId_fkey" FOREIGN KEY ("carrierAccountId") REFERENCES "CarrierAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
