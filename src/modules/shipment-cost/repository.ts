import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";
import type {
  ShipmentCostListItem,
  ShipmentCostListQuery,
  ShipmentCostSummary,
} from "./types";

export async function upsertShipmentCostEstimate(input: {
  tenantId: string;
  orderId: string;
  shipmentId: string;
  actualWeightKg: number;
  actualLengthCm: number;
  actualWidthCm: number;
  actualHeightCm: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  estimatedWeightKg: number | null;
  estimatedFee: number | null;
  estimatedCurrency: string | null;
  estimatedCountryCode: string | null;
  estimatedShippingMethodCode: string | null;
  estimateSource: string;
}): Promise<ShipmentCostSummary> {
  const row = await prisma.shipmentCost.upsert({
    where: {
      shipmentId: input.shipmentId,
    },
    create: {
      tenantId: input.tenantId,
      orderId: input.orderId,
      shipmentId: input.shipmentId,
      actualWeightKg: input.actualWeightKg,
      actualLengthCm: input.actualLengthCm,
      actualWidthCm: input.actualWidthCm,
      actualHeightCm: input.actualHeightCm,
      volumetricWeightKg: input.volumetricWeightKg,
      chargeableWeightKg: input.chargeableWeightKg,
      estimatedWeightKg: input.estimatedWeightKg,
      estimatedFee: input.estimatedFee,
      estimatedCurrency: input.estimatedCurrency,
      estimatedCountryCode: input.estimatedCountryCode,
      estimatedShippingMethodCode: input.estimatedShippingMethodCode,
      estimateSource: input.estimateSource,
      actualFeeStatus: "PENDING",
    },
    update: {
      actualWeightKg: input.actualWeightKg,
      actualLengthCm: input.actualLengthCm,
      actualWidthCm: input.actualWidthCm,
      actualHeightCm: input.actualHeightCm,
      volumetricWeightKg: input.volumetricWeightKg,
      chargeableWeightKg: input.chargeableWeightKg,
      estimatedWeightKg: input.estimatedWeightKg,
      estimatedFee: input.estimatedFee,
      estimatedCurrency: input.estimatedCurrency,
      estimatedCountryCode: input.estimatedCountryCode,
      estimatedShippingMethodCode: input.estimatedShippingMethodCode,
      estimateSource: input.estimateSource,
      actualFeeStatus: "PENDING",
      actualFetchErrorCode: null,
      actualFetchErrorMessage: null,
    },
    select: shipmentCostSelect,
  });

  return toShipmentCostSummary(row);
}

export async function listShipmentCosts(
  tenantId: string,
  query: ShipmentCostListQuery,
): Promise<ShipmentCostListItem[]> {
  const rows = await prisma.shipmentCost.findMany({
    where: buildShipmentCostWhere(tenantId, query),
    orderBy: {
      createdAt: "desc",
    },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    select: {
      ...shipmentCostSelect,
      order: {
        select: {
          orderNumber: true,
          externalOrderId: true,
          sourceChannel: true,
        },
      },
      shipment: {
        select: {
          carrierShipmentId: true,
          trackingNumber: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    ...toShipmentCostSummary(row),
    orderNumber: row.order.orderNumber,
    externalOrderId: row.order.externalOrderId,
    sourceChannel: row.order.sourceChannel,
    carrierShipmentId: row.shipment.carrierShipmentId,
    trackingNumber: row.shipment.trackingNumber,
  }));
}

export async function countShipmentCosts(
  tenantId: string,
  query: ShipmentCostListQuery,
) {
  return prisma.shipmentCost.count({
    where: buildShipmentCostWhere(tenantId, query),
  });
}

export async function getShipmentCostWithCarrierIds(input: {
  tenantId: string;
  shipmentId: string;
}) {
  return prisma.shipmentCost.findFirst({
    where: {
      tenantId: input.tenantId,
      shipmentId: input.shipmentId,
    },
    select: {
      ...shipmentCostSelect,
      shipment: {
        select: {
          carrierShipmentId: true,
          trackingNumber: true,
          carrierCode: true,
        },
      },
    },
  });
}

export async function markShipmentCostActualFeeAvailable(input: {
  tenantId: string;
  shipmentId: string;
  actualGrossWeight: number | null;
  actualChargeWeight: number | null;
  actualFreight: number | null;
  actualFuelSurcharge: number | null;
  actualRegistrationFee: number | null;
  actualProcessingFee: number | null;
  actualOtherFee: number | null;
  actualTotalFee: number | null;
  actualOccurrenceTime: Date | null;
}): Promise<ShipmentCostSummary> {
  const row = await prisma.shipmentCost.update({
    where: {
      shipmentId: input.shipmentId,
      tenantId: input.tenantId,
    },
    data: {
      actualFeeStatus: "AVAILABLE",
      actualGrossWeight: input.actualGrossWeight,
      actualChargeWeight: input.actualChargeWeight,
      actualFreight: input.actualFreight,
      actualFuelSurcharge: input.actualFuelSurcharge,
      actualRegistrationFee: input.actualRegistrationFee,
      actualProcessingFee: input.actualProcessingFee,
      actualOtherFee: input.actualOtherFee,
      actualTotalFee: input.actualTotalFee,
      actualOccurrenceTime: input.actualOccurrenceTime,
      actualFetchedAt: new Date(),
      actualFetchErrorCode: null,
      actualFetchErrorMessage: null,
    },
    select: shipmentCostSelect,
  });

  return toShipmentCostSummary(row);
}

export async function markShipmentCostActualFeeFailed(input: {
  tenantId: string;
  shipmentId: string;
  code: string;
  message: string;
}): Promise<ShipmentCostSummary> {
  const row = await prisma.shipmentCost.update({
    where: {
      shipmentId: input.shipmentId,
      tenantId: input.tenantId,
    },
    data: {
      actualFeeStatus: "FAILED",
      actualFetchedAt: new Date(),
      actualFetchErrorCode: input.code,
      actualFetchErrorMessage: input.message,
    },
    select: shipmentCostSelect,
  });

  return toShipmentCostSummary(row);
}

export const shipmentCostSelect = {
  id: true,
  tenantId: true,
  orderId: true,
  shipmentId: true,
  actualWeightKg: true,
  actualLengthCm: true,
  actualWidthCm: true,
  actualHeightCm: true,
  volumetricWeightKg: true,
  chargeableWeightKg: true,
  estimatedWeightKg: true,
  estimatedFee: true,
  estimatedCurrency: true,
  estimatedCountryCode: true,
  estimatedShippingMethodCode: true,
  estimateSource: true,
  actualFeeStatus: true,
  actualGrossWeight: true,
  actualChargeWeight: true,
  actualFreight: true,
  actualFuelSurcharge: true,
  actualRegistrationFee: true,
  actualProcessingFee: true,
  actualOtherFee: true,
  actualTotalFee: true,
  actualOccurrenceTime: true,
  actualFetchedAt: true,
  actualFetchErrorCode: true,
  actualFetchErrorMessage: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ShipmentCostSelect;

function buildShipmentCostWhere(
  tenantId: string,
  query: ShipmentCostListQuery,
): Prisma.ShipmentCostWhereInput {
  return {
    tenantId,
    ...(query.status ? { actualFeeStatus: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            {
              order: {
                orderNumber: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            },
            {
              order: {
                externalOrderId: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            },
            {
              shipment: {
                trackingNumber: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            },
            {
              shipment: {
                carrierShipmentId: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };
}

export function toShipmentCostSummary(
  row: Prisma.ShipmentCostGetPayload<{ select: typeof shipmentCostSelect }>,
): ShipmentCostSummary {
  return {
    id: row.id,
    shipmentId: row.shipmentId,
    orderId: row.orderId,
    actualWeightKg: row.actualWeightKg.toString(),
    actualLengthCm: row.actualLengthCm.toString(),
    actualWidthCm: row.actualWidthCm.toString(),
    actualHeightCm: row.actualHeightCm.toString(),
    volumetricWeightKg: row.volumetricWeightKg.toString(),
    chargeableWeightKg: row.chargeableWeightKg.toString(),
    estimatedWeightKg: row.estimatedWeightKg?.toString() ?? null,
    estimatedFee: row.estimatedFee?.toString() ?? null,
    estimatedCurrency: row.estimatedCurrency,
    estimatedCountryCode: row.estimatedCountryCode,
    estimatedShippingMethodCode: row.estimatedShippingMethodCode,
    estimateSource: row.estimateSource,
    actualFeeStatus: row.actualFeeStatus,
    actualGrossWeight: row.actualGrossWeight?.toString() ?? null,
    actualChargeWeight: row.actualChargeWeight?.toString() ?? null,
    actualFreight: row.actualFreight?.toString() ?? null,
    actualFuelSurcharge: row.actualFuelSurcharge?.toString() ?? null,
    actualRegistrationFee: row.actualRegistrationFee?.toString() ?? null,
    actualProcessingFee: row.actualProcessingFee?.toString() ?? null,
    actualOtherFee: row.actualOtherFee?.toString() ?? null,
    actualTotalFee: row.actualTotalFee?.toString() ?? null,
    actualOccurrenceTime: row.actualOccurrenceTime,
    actualFetchedAt: row.actualFetchedAt,
    actualFetchErrorCode: row.actualFetchErrorCode,
    actualFetchErrorMessage: row.actualFetchErrorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
