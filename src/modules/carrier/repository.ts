import type {
  CarrierCredentialType,
  MembershipStatus,
  Prisma,
  TenantRole,
} from "@prisma/client";
import { CarrierAccountStatus, CarrierCredentialStatus } from "@prisma/client";

import { prisma } from "@/shared/db";

const carrierCredentialSafeSelect = {
  id: true,
  credentialType: true,
  keyPrefix: true,
  status: true,
  encryptionVersion: true,
  keyVersion: true,
  lastValidatedAt: true,
  rotatedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CarrierCredentialSelect;

const carrierAccountSafeSelect = {
  id: true,
  carrierCode: true,
  displayName: true,
  status: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  credentials: {
    where: { status: CarrierCredentialStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: carrierCredentialSafeSelect,
  },
} satisfies Prisma.CarrierAccountSelect;

export async function listCarrierAccountRecords(tenantId: string) {
  return prisma.carrierAccount.findMany({
    where: { tenantId },
    orderBy: [{ carrierCode: "asc" }, { isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function listCarrierAccountSummaryRecords(tenantId: string) {
  return prisma.carrierAccount.findMany({
    where: { tenantId },
    orderBy: [{ carrierCode: "asc" }, { isDefault: "desc" }, { createdAt: "asc" }],
    select: carrierAccountSafeSelect,
  });
}

export async function findCarrierAccountRecord(
  tenantId: string,
  carrierAccountId: string,
) {
  return prisma.carrierAccount.findFirst({
    where: {
      id: carrierAccountId,
      tenantId,
    },
  });
}

export async function findCarrierAccountSummaryRecord(
  tenantId: string,
  carrierAccountId: string,
) {
  return prisma.carrierAccount.findFirst({
    where: {
      id: carrierAccountId,
      tenantId,
    },
    select: carrierAccountSafeSelect,
  });
}

export async function findDefaultCarrierAccountRecord(
  tenantId: string,
  carrierCode: string,
) {
  return prisma.carrierAccount.findFirst({
    where: {
      tenantId,
      carrierCode,
      status: CarrierAccountStatus.ACTIVE,
      isDefault: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function findCarrierCredentialRecord(
  tenantId: string,
  carrierAccountId: string,
) {
  return prisma.carrierCredential.findFirst({
    where: {
      tenantId,
      carrierAccountId,
      status: CarrierCredentialStatus.ACTIVE,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function findCarrierMembershipForUser(
  tenantId: string,
  userId: string,
) {
  return prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
    select: {
      role: true,
      status: true,
    },
  });
}

export async function createCarrierAccountRecord(input: {
  tenantId: string;
  carrierCode: string;
  displayName: string;
  status: CarrierAccountStatus;
  isDefault: boolean;
  actorUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault && input.status === "ACTIVE") {
      await tx.carrierAccount.updateMany({
        where: {
          tenantId: input.tenantId,
          carrierCode: input.carrierCode,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return tx.carrierAccount.create({
      data: {
        tenantId: input.tenantId,
        carrierCode: input.carrierCode,
        displayName: input.displayName,
        status: input.status,
        isDefault: input.status === "ACTIVE" ? input.isDefault : false,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
      },
      select: carrierAccountSafeSelect,
    });
  });
}

export async function updateCarrierAccountRecord(input: {
  tenantId: string;
  carrierAccountId: string;
  carrierCode: string;
  displayName?: string;
  status?: CarrierAccountStatus;
  isDefault?: boolean;
  actorUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault === true && input.status !== "DISABLED") {
      await tx.carrierAccount.updateMany({
        where: {
          tenantId: input.tenantId,
          carrierCode: input.carrierCode,
          isDefault: true,
          id: { not: input.carrierAccountId },
        },
        data: { isDefault: false },
      });
    }

    const result = await tx.carrierAccount.updateMany({
      where: {
        tenantId: input.tenantId,
        id: input.carrierAccountId,
      },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.isDefault !== undefined
          ? { isDefault: input.status === "DISABLED" ? false : input.isDefault }
          : input.status === "DISABLED"
            ? { isDefault: false }
            : {}),
        updatedBy: input.actorUserId,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return tx.carrierAccount.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.carrierAccountId,
      },
      select: carrierAccountSafeSelect,
    });
  });
}

export async function createCarrierCredentialRecord(input: {
  tenantId: string;
  carrierAccountId: string;
  credentialType: CarrierCredentialType;
  secretRef?: string;
  encryptedPayload?: Prisma.InputJsonValue;
  keyPrefix: string;
  encryptionVersion?: string;
  keyVersion?: string;
  expiresAt?: Date | null;
  actorUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const rotated = await tx.carrierCredential.updateMany({
      where: {
        tenantId: input.tenantId,
        carrierAccountId: input.carrierAccountId,
        status: CarrierCredentialStatus.ACTIVE,
      },
      data: {
        status: CarrierCredentialStatus.ROTATED,
        rotatedAt: new Date(),
        updatedBy: input.actorUserId,
      },
    });

    const credential = await tx.carrierCredential.create({
      data: {
        tenantId: input.tenantId,
        carrierAccountId: input.carrierAccountId,
        credentialType: input.credentialType,
        secretRef: input.secretRef,
        encryptedPayload: input.encryptedPayload,
        keyPrefix: input.keyPrefix,
        status: CarrierCredentialStatus.ACTIVE,
        encryptionVersion: input.encryptionVersion,
        keyVersion: input.keyVersion,
        expiresAt: input.expiresAt,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
      },
      select: carrierCredentialSafeSelect,
    });

    return {
      credential,
      rotatedCount: rotated.count,
    };
  });
}

export async function disableCarrierCredentialRecord(input: {
  tenantId: string;
  carrierAccountId: string;
  credentialId: string;
  actorUserId: string;
}) {
  const result = await prisma.carrierCredential.updateMany({
    where: {
      tenantId: input.tenantId,
      carrierAccountId: input.carrierAccountId,
      id: input.credentialId,
    },
    data: {
      status: CarrierCredentialStatus.DISABLED,
      updatedBy: input.actorUserId,
    },
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.carrierCredential.findFirst({
    where: {
      tenantId: input.tenantId,
      carrierAccountId: input.carrierAccountId,
      id: input.credentialId,
    },
    select: carrierCredentialSafeSelect,
  });
}

export type CarrierMembershipRecord = {
  role: TenantRole;
  status: MembershipStatus;
};
