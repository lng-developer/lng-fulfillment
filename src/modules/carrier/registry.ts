import { AppError } from "@/shared/errors";
import { CARRIER_CODES, type CarrierAdapter, type CarrierCode } from "./types";

const carrierAdapters = new Map<string, CarrierAdapter>();

export function normalizeCarrierCode(carrierCode: string): string {
  return carrierCode.trim().toUpperCase();
}

export function isKnownCarrierCode(carrierCode: string): carrierCode is CarrierCode {
  return CARRIER_CODES.includes(normalizeCarrierCode(carrierCode) as CarrierCode);
}

export function registerCarrierAdapter(adapter: CarrierAdapter): void {
  const carrierCode = normalizeCarrierCode(adapter.carrierCode);

  if (!isKnownCarrierCode(carrierCode)) {
    throw new AppError("CARRIER_ERROR", "Carrier is not supported.", 400, {
      carrierCode,
    });
  }

  carrierAdapters.set(carrierCode, {
    ...adapter,
    carrierCode,
  });
}

export function getCarrierAdapter(carrierCode: string): CarrierAdapter {
  const normalizedCarrierCode = normalizeCarrierCode(carrierCode);

  if (!isKnownCarrierCode(normalizedCarrierCode)) {
    throw new AppError("CARRIER_ERROR", "Carrier is not supported.", 400, {
      carrierCode: normalizedCarrierCode,
    });
  }

  const adapter = carrierAdapters.get(normalizedCarrierCode);
  if (!adapter) {
    throw new AppError("CARRIER_ERROR", "Carrier adapter is not implemented.", 501, {
      carrierCode: normalizedCarrierCode,
    });
  }

  return adapter;
}

export function hasCarrierAdapter(carrierCode: string): boolean {
  return carrierAdapters.has(normalizeCarrierCode(carrierCode));
}

export function listKnownCarrierCodes(): CarrierCode[] {
  return [...CARRIER_CODES];
}

export function listRegisteredCarrierCodes(): string[] {
  return [...carrierAdapters.keys()];
}
