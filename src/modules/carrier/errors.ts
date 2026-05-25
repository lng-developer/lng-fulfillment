import { AppError } from "@/shared/errors";
import type { CarrierError, CarrierErrorReason } from "./types";

const RETRYABLE_REASONS: CarrierErrorReason[] = [
  "RATE_LIMITED",
  "TEMPORARY_UNAVAILABLE",
  "REMOTE_TIMEOUT",
];

export class CarrierIntegrationError extends Error {
  constructor(public readonly carrierError: CarrierError) {
    super(carrierError.message);
    this.name = "CarrierIntegrationError";
  }
}

export function createCarrierError(input: {
  carrierCode: string;
  reason: CarrierErrorReason;
  message: string;
  retryable?: boolean;
  statusCode?: number;
  safeMetadata?: CarrierError["safeMetadata"];
  rawResponse?: unknown;
}): CarrierError {
  return {
    carrierCode: input.carrierCode,
    reason: input.reason,
    message: input.message,
    retryable: input.retryable ?? RETRYABLE_REASONS.includes(input.reason),
    statusCode: input.statusCode,
    safeMetadata: input.safeMetadata,
    rawResponse: input.rawResponse,
  };
}

export function mapCarrierErrorToAppError(error: unknown): AppError {
  if (error instanceof CarrierIntegrationError) {
    return carrierErrorToAppError(error.carrierError);
  }

  if (isCarrierError(error)) {
    return carrierErrorToAppError(error);
  }

  return new AppError("CARRIER_ERROR", "Carrier action failed.", 502);
}

function carrierErrorToAppError(error: CarrierError): AppError {
  return new AppError(
    "CARRIER_ERROR",
    error.message || "Carrier action failed.",
    error.statusCode ?? (error.retryable ? 503 : 502),
    {
      carrierCode: error.carrierCode,
      reason: error.reason,
      retryable: error.retryable,
      safeMetadata: error.safeMetadata,
    },
  );
}

function isCarrierError(value: unknown): value is CarrierError {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<CarrierError>;
  return (
    typeof candidate.carrierCode === "string" &&
    typeof candidate.reason === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.retryable === "boolean"
  );
}
