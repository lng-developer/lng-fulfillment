import { prisma } from "@/shared/db";
import type { VpSkuMapping } from "@/shared/vp-declarations";
export async function listMappingPage(
  tenantId: string,
  search: string,
  country: string,
  page: number,
) {
  const where = {
    tenantId,
    ...(country ? { destinationCountryCode: country } : {}),
    ...(search
      ? {
          OR: [
            { skuCode: { contains: search, mode: "insensitive" as const } },
            {
              declarationName: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            { merchandiseCode: { contains: search } },
          ],
        }
      : {}),
  };
  const [mappings, total] = await Promise.all([
    prisma.skuViettelMerchandiseMapping.findMany({
      where,
      orderBy: [{ skuCode: "asc" }, { destinationCountryCode: "asc" }, { mappingType: "asc" }],
      skip: (page - 1) * 20,
      take: 20,
      select: {
        mappingType: true,
        skuCode: true,
        destinationCountryCode: true,
        declarationName: true,
        merchandiseCode: true,
      },
    }),
    prisma.skuViettelMerchandiseMapping.count({ where }),
  ]);
  return { mappings, total, page, pageSize: 20 };
}
export function createMapping(
  tenantId: string,
  actorId: string,
  mapping: VpSkuMapping,
) {
  return prisma.skuViettelMerchandiseMapping.create({
    data: { ...mapping, tenantId, createdBy: actorId, updatedBy: actorId },
    select: {
      mappingType: true,
      skuCode: true,
      destinationCountryCode: true,
      declarationName: true,
      merchandiseCode: true,
    },
  });
}
export function deleteMapping(
  tenantId: string,
  skuCode: string,
  destinationCountryCode: string,
  mappingType: "SKU" | "GROUP" = "SKU",
) {
  return prisma.skuViettelMerchandiseMapping.deleteMany({
    where: { tenantId, mappingType, skuCode, destinationCountryCode },
  });
}
export function findMappings(
  tenantId: string,
  destinationCountryCode: string,
  skus: string[],
  groups: string[] = [],
) {
  return prisma.skuViettelMerchandiseMapping.findMany({
    where: {
      tenantId,
      destinationCountryCode,
      OR: [
        { mappingType: "SKU", skuCode: { in: skus } },
        { mappingType: "GROUP", skuCode: { in: groups } },
      ],
    },
    select: {
      mappingType: true,
      skuCode: true,
      destinationCountryCode: true,
      declarationName: true,
      merchandiseCode: true,
    },
  });
}
export function saveMapping(
  tenantId: string,
  actorId: string,
  mapping: VpSkuMapping,
) {
  return prisma.skuViettelMerchandiseMapping.upsert({
    where: {
      tenantId_mappingType_skuCode_destinationCountryCode: {
        tenantId,
        mappingType: mapping.mappingType ?? "SKU",
        skuCode: mapping.skuCode,
        destinationCountryCode: mapping.destinationCountryCode,
      },
    },
    create: { ...mapping, tenantId, createdBy: actorId, updatedBy: actorId },
    update: {
      declarationName: mapping.declarationName,
      merchandiseCode: mapping.merchandiseCode,
      updatedBy: actorId,
    },
    select: {
      mappingType: true,
      skuCode: true,
      destinationCountryCode: true,
      declarationName: true,
      merchandiseCode: true,
    },
  });
}
