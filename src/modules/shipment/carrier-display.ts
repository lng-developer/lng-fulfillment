import type { Prisma } from "@prisma/client";

export function getFinalMileCarrier(metadata: unknown): string | null {
  if (!isRecord(metadata) || !isRecord(metadata.carrier)) {
    return null;
  }

  const value = metadata.carrier.finalMileCarrier;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function withFinalMileCarrier(
  metadata: unknown,
  carrierName: string,
): Prisma.InputJsonValue {
  return {
    ...(isRecord(metadata) ? metadata : {}),
    carrier: {
      ...(isRecord(metadata) && isRecord(metadata.carrier) ? metadata.carrier : {}),
      finalMileCarrier: carrierName.trim(),
    },
  };
}

export function withCarrierSafeMetadata(
  metadata: unknown,
  carrierMetadata: Record<string, unknown>,
): Prisma.InputJsonValue {
  const base = isRecord(metadata) ? (metadata as Record<string, Prisma.InputJsonValue>) : {};
  const carrier = isRecord(base.carrier) ? (base.carrier as Record<string, Prisma.InputJsonValue>) : {};
  return {
    ...base,
    carrier: {
      ...carrier,
      ...carrierMetadata,
    },
  } as unknown as Prisma.InputJsonValue;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
