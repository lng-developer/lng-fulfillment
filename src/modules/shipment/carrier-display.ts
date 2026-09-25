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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
