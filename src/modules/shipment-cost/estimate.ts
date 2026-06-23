import { YUN_RATE_TABLE } from "./rate-table";

const VOLUMETRIC_DIVISOR = 7000;

export type ShipmentCostEstimateInput = {
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  countryCode?: string | null;
  shippingMethodCode?: string | null;
};

export type ShipmentCostEstimate = {
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  estimatedWeightKg: number | null;
  estimatedFee: number | null;
  estimatedCurrency: string | null;
  estimatedCountryCode: string | null;
  estimatedShippingMethodCode: string | null;
  estimateSource: string;
  volumetricBracketWarning: {
    actualWeightKg: number;
    volumetricWeightKg: number;
    actualWeightBracketKg: number;
    chargeableWeightBracketKg: number;
    bracketIncreaseKg: number;
    estimatedPotentialSaving: number;
    estimatedCurrency: string;
  } | null;
};

export function calculateShipmentCostEstimate(
  input: ShipmentCostEstimateInput,
): ShipmentCostEstimate {
  assertPositiveNumber(input.actualWeightKg, "actualWeightKg");
  assertPositiveNumber(input.lengthCm, "lengthCm");
  assertPositiveNumber(input.widthCm, "widthCm");
  assertPositiveNumber(input.heightCm, "heightCm");

  const actualWeightKg = roundKg(input.actualWeightKg);
  const volumetricWeightKg = roundKg(
    (input.lengthCm * input.widthCm * input.heightCm) / VOLUMETRIC_DIVISOR,
  );
  const chargeableWeightKg = roundKg(
    Math.max(actualWeightKg, volumetricWeightKg),
  );
  const rate = lookupYunRate({
    countryCode: input.countryCode,
    shippingMethodCode: input.shippingMethodCode,
    chargeableWeightKg,
  });
  const actualWeightRate = lookupYunRate({
    countryCode: input.countryCode,
    shippingMethodCode: input.shippingMethodCode,
    chargeableWeightKg: actualWeightKg,
  });
  const volumetricBracketWarning =
    volumetricWeightKg > actualWeightKg &&
    actualWeightRate &&
    rate &&
    rate.weightKg > actualWeightRate.weightKg
      ? {
          actualWeightKg,
          volumetricWeightKg,
          actualWeightBracketKg: actualWeightRate.weightKg,
          chargeableWeightBracketKg: rate.weightKg,
          bracketIncreaseKg: roundKg(rate.weightKg - actualWeightRate.weightKg),
          estimatedPotentialSaving: Math.max(0, rate.fee - actualWeightRate.fee),
          estimatedCurrency: rate.currency,
        }
      : null;

  return {
    actualWeightKg,
    lengthCm: roundDimension(input.lengthCm),
    widthCm: roundDimension(input.widthCm),
    heightCm: roundDimension(input.heightCm),
    volumetricWeightKg,
    chargeableWeightKg,
    estimatedWeightKg: rate?.weightKg ?? null,
    estimatedFee: rate?.fee ?? null,
    estimatedCurrency: rate?.currency ?? null,
    estimatedCountryCode: rate?.countryCode ?? normalizeCountryCode(input.countryCode),
    estimatedShippingMethodCode:
      rate?.shippingMethodCode ?? normalizeShippingMethod(input.shippingMethodCode),
    estimateSource: "yun-us-vnd-2026-06-22",
    volumetricBracketWarning,
  };
}

export function lookupYunRate(input: {
  countryCode?: string | null;
  shippingMethodCode?: string | null;
  chargeableWeightKg: number;
}) {
  assertPositiveNumber(input.chargeableWeightKg, "chargeableWeightKg");

  const countryCode = normalizeCountryCode(input.countryCode);
  const shippingMethodCode = normalizeShippingMethod(input.shippingMethodCode);

  const exactMethodRate = YUN_RATE_TABLE.find(
    (row) =>
      row.countryCode === countryCode &&
      row.shippingMethodCode === shippingMethodCode &&
      row.weightKg + Number.EPSILON >= input.chargeableWeightKg,
  );

  if (exactMethodRate) {
    return exactMethodRate;
  }

  return (
    YUN_RATE_TABLE.find(
      (row) =>
        row.countryCode === countryCode &&
        row.weightKg + Number.EPSILON >= input.chargeableWeightKg,
    ) ?? null
  );
}

function normalizeCountryCode(value: string | null | undefined) {
  const normalized = (value || "US").trim().toUpperCase();
  if (
    normalized === "USA" ||
    normalized === "UNITED STATES" ||
    normalized.startsWith("US-UNITED STATES")
  ) {
    return "US";
  }

  return normalized;
}

function normalizeShippingMethod(value: string | null | undefined) {
  return (value || "VN-YTYCPREC").trim().toUpperCase();
}

function roundKg(value: number) {
  return Math.round(value * 1000) / 1000;
}

function roundDimension(value: number) {
  return Math.round(value * 100) / 100;
}

function assertPositiveNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive number.`);
  }
}
