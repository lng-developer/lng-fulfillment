import type { Prisma } from "@prisma/client";

export type PortalTrackingSyncState = "SYNCED" | "FAILED";

export function getPortalTrackingSyncState(
  metadata: unknown,
): PortalTrackingSyncState | null {
  if (!isRecord(metadata) || !isRecord(metadata.portalTrackingSync)) {
    return null;
  }

  const state = metadata.portalTrackingSync.state;
  return state === "SYNCED" || state === "FAILED" ? state : null;
}

export function withPortalTrackingSyncState(
  metadata: unknown,
  result: { attempted: true; delivered: boolean; status?: number },
): Prisma.InputJsonValue {
  return {
    ...(isRecord(metadata) ? metadata : {}),
    portalTrackingSync: {
      state: result.delivered ? "SYNCED" : "FAILED",
      checkedAt: new Date().toISOString(),
      ...(result.status === undefined ? {} : { status: result.status }),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
