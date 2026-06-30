import { extractSkuCode } from "./sku";
import type {
  AutoShipmentResolution,
  AutoShipmentResolutionInput,
} from "./types";

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function normalizeCountryCode(value: string | null) {
  if (!value) return null;

  const normalized = value.trim().toUpperCase();
  if (normalized === "USA" || normalized === "UNITED STATES") return "US";
  if (normalized === "CANADA") return "CA";
  if (
    normalized === "UK" ||
    normalized === "UNITED KINGDOM" ||
    normalized === "GREAT BRITAIN" ||
    normalized === "ENGLAND"
  ) {
    return "GB";
  }

  return normalized.length === 2 ? normalized : null;
}

function buildMappingKey(skuCode: string, countryCode: string) {
  return `${skuCode.trim().toUpperCase()}::${countryCode.trim().toUpperCase()}`;
}

export function resolveOrderShippingMethodFromSkuMappings(
  input: AutoShipmentResolutionInput,
): AutoShipmentResolution {
  const destinationCountryCode = normalizeCountryCode(input.destinationCountryCode);
  const skuCodes = uniqueSorted(
    input.items
      .map((item) => extractSkuCode(item.sku))
      .filter((skuCode): skuCode is string => Boolean(skuCode)),
  );

  const mappingBySkuCode = new Map(
    input.mappings.map((mapping) => [
      buildMappingKey(mapping.skuCode, mapping.destinationCountryCode),
      mapping.shippingMethodCode.trim().toUpperCase(),
    ]),
  );

  const missingSkuCodes = skuCodes.filter(
    (skuCode) =>
      !destinationCountryCode ||
      !mappingBySkuCode.has(buildMappingKey(skuCode, destinationCountryCode)),
  );

  if (missingSkuCodes.length > 0) {
    return {
      status: "MISSING_SKU_MAPPING",
      skuCodes,
      missingSkuCodes,
      conflictingMethods: [],
    };
  }

  const resolvedMethods = uniqueSorted(
    skuCodes
      .map((skuCode) =>
        destinationCountryCode
          ? mappingBySkuCode.get(buildMappingKey(skuCode, destinationCountryCode))
          : null,
      )
      .filter((shippingMethodCode): shippingMethodCode is string =>
        Boolean(shippingMethodCode),
      ),
  );

  if (resolvedMethods.length !== 1) {
    return {
      status: "METHOD_CONFLICT",
      skuCodes,
      missingSkuCodes: [],
      conflictingMethods: resolvedMethods,
    };
  }

  return {
    status: "RESOLVED",
    shippingMethodCode: resolvedMethods[0],
    skuCodes,
    missingSkuCodes: [],
    conflictingMethods: [],
  };
}
