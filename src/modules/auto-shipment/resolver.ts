import { extractSkuCode } from "./sku";
import type {
  AutoShipmentResolution,
  AutoShipmentResolutionInput,
} from "./types";

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function resolveOrderShippingMethodFromSkuMappings(
  input: AutoShipmentResolutionInput,
): AutoShipmentResolution {
  const skuCodes = uniqueSorted(
    input.items
      .map((item) => extractSkuCode(item.sku))
      .filter((skuCode): skuCode is string => Boolean(skuCode)),
  );

  const mappingBySkuCode = new Map(
    input.mappings.map((mapping) => [
      mapping.skuCode.trim().toUpperCase(),
      mapping.shippingMethodCode.trim().toUpperCase(),
    ]),
  );

  const missingSkuCodes = skuCodes.filter((skuCode) => !mappingBySkuCode.has(skuCode));

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
      .map((skuCode) => mappingBySkuCode.get(skuCode))
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
