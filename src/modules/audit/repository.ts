import type { AuditActorType, Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";

const auditLogSafeSelect = {
  id: true,
  actorType: true,
  actorUserId: true,
  action: true,
  resourceType: true,
  resourceId: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect;

export type CreateAuditLogInput = {
  tenantId?: string;
  actorUserId?: string;
  actorType: AuditActorType;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
};

export async function createAuditLog(input: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorType: input.actorType,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
    },
    select: {
      id: true,
      createdAt: true,
    },
  });
}

export type ListAuditLogRecordsQuery = {
  page: number;
  pageSize: number;
  action?: string;
  actorType?: AuditActorType;
  resourceType?: string;
  from?: Date;
  to?: Date;
  sortOrder: "asc" | "desc";
};

export async function listAuditLogRecords(
  tenantId: string,
  query: ListAuditLogRecordsQuery,
) {
  return prisma.auditLog.findMany({
    where: buildAuditLogWhere(tenantId, query),
    orderBy: { createdAt: query.sortOrder },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    select: auditLogSafeSelect,
  });
}

export async function countAuditLogRecords(
  tenantId: string,
  query: ListAuditLogRecordsQuery,
) {
  return prisma.auditLog.count({
    where: buildAuditLogWhere(tenantId, query),
  });
}

function buildAuditLogWhere(
  tenantId: string,
  query: ListAuditLogRecordsQuery,
): Prisma.AuditLogWhereInput {
  return {
    tenantId,
    ...(query.action ? { action: query.action } : {}),
    ...(query.actorType ? { actorType: query.actorType } : {}),
    ...(query.resourceType ? { resourceType: query.resourceType } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };
}
