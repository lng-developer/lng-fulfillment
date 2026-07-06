import type { Prisma, TenantYunIossStatus } from "@prisma/client";
import { prisma } from "@/shared/db";

export const tenantYunIossSettingSelect = {
  id: true,
  tenantId: true,
  iossNumber: true,
  status: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TenantYunIossSettingSelect;

export type TenantYunIossSettingRecord =
  Prisma.TenantYunIossSettingGetPayload<{
    select: typeof tenantYunIossSettingSelect;
  }>;

export async function getTenantYunIossSettingRecord(tenantId: string) {
  return prisma.tenantYunIossSetting.findUnique({
    where: { tenantId },
    select: tenantYunIossSettingSelect,
  });
}

export async function getActiveTenantYunIossSettingRecord(tenantId: string) {
  return prisma.tenantYunIossSetting.findFirst({
    where: {
      tenantId,
      status: "ACTIVE",
      iossNumber: {
        not: null,
      },
    },
    select: tenantYunIossSettingSelect,
  });
}

export async function upsertTenantYunIossSettingRecord(input: {
  tenantId: string;
  iossNumber: string | null;
  status: TenantYunIossStatus;
  actorUserId: string;
}) {
  return prisma.tenantYunIossSetting.upsert({
    where: { tenantId: input.tenantId },
    create: {
      tenantId: input.tenantId,
      iossNumber: input.iossNumber,
      status: input.status,
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
    },
    update: {
      iossNumber: input.iossNumber,
      status: input.status,
      updatedBy: input.actorUserId,
    },
    select: tenantYunIossSettingSelect,
  });
}
