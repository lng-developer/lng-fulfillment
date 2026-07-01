export type ShipmentFailureSummary = {
  carrierCode: string | null;
  code: string | null;
  message: string;
  remarks: string[];
};

export function buildShipmentFailureSummary(
  metadata: unknown,
): ShipmentFailureSummary | null {
  const carrier = readRecord(readRecord(metadata)?.carrier);
  if (!carrier) {
    return null;
  }

  const safeMetadata = readRecord(carrier.safeMetadata) ?? carrier;
  const remarks = readStringArray(safeMetadata.itemRemarks);
  const message =
    remarks[0] ??
    readString(safeMetadata.message) ??
    readString(carrier.message) ??
    readString(carrier.errorMessage);

  if (!message) {
    return null;
  }

  return {
    carrierCode: readString(carrier.carrierCode),
    code: readString(safeMetadata.code) ?? readString(carrier.errorCode),
    message,
    remarks,
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => readString(item) !== null)
    : [];
}
