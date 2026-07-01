import type {
  AutoShipmentJobStatus,
  Prisma,
  SkuShippingMethodMappingStatus,
} from "@prisma/client";
import { prisma } from "@/shared/db";

export const autoShipmentJobSelect = {
  id: true,
  tenantId: true,
  orderId: true,
  status: true,
  shippingMethodCode: true,
  skuCodes: true,
  missingSkuCodes: true,
  conflictingMethods: true,
  shipmentId: true,
  errorCode: true,
  errorMessage: true,
  attemptCount: true,
  lastAttemptAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AutoShipmentJobSelect;

export const skuShippingMethodMappingSelect = {
  id: true,
  tenantId: true,
  skuCode: true,
  destinationCountryCode: true,
  shippingMethodCode: true,
  eName: true,
  cName: true,
  description: true,
  status: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SkuShippingMethodMappingSelect;

export const shipmentAutomationSettingSelect = {
  id: true,
  tenantId: true,
  autoCreateEnabled: true,
  environment: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TenantShipmentAutomationSettingSelect;

export type AutoShipmentJobRecord = Prisma.AutoShipmentJobGetPayload<{
  select: typeof autoShipmentJobSelect;
}>;

export type SkuShippingMethodMappingRecord =
  Prisma.SkuShippingMethodMappingGetPayload<{
    select: typeof skuShippingMethodMappingSelect;
  }>;

export type ShipmentAutomationSettingRecord =
  Prisma.TenantShipmentAutomationSettingGetPayload<{
    select: typeof shipmentAutomationSettingSelect;
  }>;

export async function getShipmentAutomationSettingRecord(tenantId: string) {
  return prisma.tenantShipmentAutomationSetting.findUnique({
    where: { tenantId },
    select: shipmentAutomationSettingSelect,
  });
}

export async function upsertShipmentAutomationSettingRecord(input: {
  tenantId: string;
  autoCreateEnabled: boolean;
  environment: string;
  actorUserId: string;
}) {
  return prisma.tenantShipmentAutomationSetting.upsert({
    where: { tenantId: input.tenantId },
    create: {
      tenantId: input.tenantId,
      autoCreateEnabled: input.autoCreateEnabled,
      environment: input.environment,
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
    },
    update: {
      autoCreateEnabled: input.autoCreateEnabled,
      environment: input.environment,
      updatedBy: input.actorUserId,
    },
    select: shipmentAutomationSettingSelect,
  });
}

export async function listSkuShippingMethodMappingRecords(tenantId: string) {
  return prisma.skuShippingMethodMapping.findMany({
    where: { tenantId },
    orderBy: [{ skuCode: "asc" }, { destinationCountryCode: "asc" }],
    select: skuShippingMethodMappingSelect,
  });
}

export async function listActiveSkuShippingMethodMappingRecords(
  tenantId: string,
) {
  return prisma.skuShippingMethodMapping.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
    },
    orderBy: [{ skuCode: "asc" }, { destinationCountryCode: "asc" }],
    select: {
      skuCode: true,
      destinationCountryCode: true,
      shippingMethodCode: true,
      eName: true,
      cName: true,
    },
  });
}

export async function createSkuShippingMethodMappingRecord(input: {
  tenantId: string;
  skuCode: string;
  destinationCountryCode: string;
  shippingMethodCode: string;
  eName: string;
  cName: string;
  description: string | null;
  actorUserId: string;
}) {
  return prisma.skuShippingMethodMapping.create({
    data: {
      tenantId: input.tenantId,
      skuCode: input.skuCode,
      destinationCountryCode: input.destinationCountryCode,
      shippingMethodCode: input.shippingMethodCode,
      eName: input.eName,
      cName: input.cName,
      description: input.description,
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
    },
    select: skuShippingMethodMappingSelect,
  });
}

export async function updateSkuShippingMethodMappingRecord(input: {
  tenantId: string;
  mappingId: string;
  shippingMethodCode?: string;
  eName?: string;
  cName?: string;
  description?: string | null;
  status?: SkuShippingMethodMappingStatus;
  actorUserId: string;
}) {
  return prisma.skuShippingMethodMapping.updateManyAndReturn({
    where: {
      id: input.mappingId,
      tenantId: input.tenantId,
    },
    data: {
      ...(input.shippingMethodCode ? { shippingMethodCode: input.shippingMethodCode } : {}),
      ...(input.eName ? { eName: input.eName } : {}),
      ...(input.cName ? { cName: input.cName } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status ? { status: input.status } : {}),
      updatedBy: input.actorUserId,
    },
    select: skuShippingMethodMappingSelect,
  });
}

export async function deleteSkuShippingMethodMappingRecord(
  tenantId: string,
  mappingId: string,
) {
  return prisma.skuShippingMethodMapping.deleteMany({
    where: {
      id: mappingId,
      tenantId,
    },
  });
}

export async function getAutoShipmentOrderContext(
  tenantId: string,
  orderId: string,
) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
    },
    select: {
      id: true,
      externalOrderId: true,
      orderNumber: true,
      status: true,
      recipientName: true,
      recipientPhone: true,
      recipientEmail: true,
      recipientAddress: true,
      destinationCountry: true,
      destinationState: true,
      destinationCity: true,
      destinationPostalCode: true,
      items: {
        select: {
          id: true,
          sku: true,
          name: true,
          title: true,
          quantity: true,
          weight: true,
          declaredValue: true,
          unitPrice: true,
          currency: true,
        },
      },
      shipments: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
}

export async function upsertAutoShipmentJobRecord(input: {
  tenantId: string;
  orderId: string;
  status: AutoShipmentJobStatus;
  shippingMethodCode?: string | null;
  skuCodes?: Prisma.InputJsonValue | null;
  missingSkuCodes?: Prisma.InputJsonValue | null;
  conflictingMethods?: Prisma.InputJsonValue | null;
  shipmentId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  incrementAttempt?: boolean;
}) {
  const now = new Date();

  return prisma.autoShipmentJob.upsert({
    where: {
      tenantId_orderId: {
        tenantId: input.tenantId,
        orderId: input.orderId,
      },
    },
    create: {
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: input.status,
      shippingMethodCode: input.shippingMethodCode ?? null,
      skuCodes: input.skuCodes ?? undefined,
      missingSkuCodes: input.missingSkuCodes ?? undefined,
      conflictingMethods: input.conflictingMethods ?? undefined,
      shipmentId: input.shipmentId ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      attemptCount: input.incrementAttempt ? 1 : 0,
      lastAttemptAt: input.incrementAttempt ? now : null,
    },
    update: {
      status: input.status,
      shippingMethodCode: input.shippingMethodCode ?? null,
      skuCodes: input.skuCodes ?? undefined,
      missingSkuCodes: input.missingSkuCodes ?? undefined,
      conflictingMethods: input.conflictingMethods ?? undefined,
      shipmentId: input.shipmentId ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      ...(input.incrementAttempt
        ? {
            attemptCount: {
              increment: 1,
            },
            lastAttemptAt: now,
          }
        : {}),
    },
    select: autoShipmentJobSelect,
  });
}
