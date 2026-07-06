import {
  normalizeSupportedEuCountryCode,
} from "@/shared/eu-countries";
import { extractSkuCode } from "./sku";
import type {
  AutoShipmentProductDeclaration,
  AutoShipmentResolution,
  AutoShipmentResolutionInput,
} from "./types";

type NormalizedSkuMapping = {
  skuCode: string;
  shippingMethodCode: string;
  eName: string | null;
  cName: string | null;
};

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function normalizeCountryCode(value: string | null) {
  if (!value) return null;

  const normalized = value.trim().toUpperCase();
  if (normalized === "USA" || normalized === "UNITED STATES") return "US";
  if (normalized === "CANADA") return "CA";
  const euCountryCode = normalizeSupportedEuCountryCode(normalized);
  if (euCountryCode) return euCountryCode;
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

function hasProductDeclaration(mapping: {
  eName?: string | null;
  cName?: string | null;
}) {
  return Boolean(mapping.eName?.trim() && mapping.cName?.trim());
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
      {
        skuCode: mapping.skuCode.trim().toUpperCase(),
        shippingMethodCode: mapping.shippingMethodCode.trim().toUpperCase(),
        eName: mapping.eName?.trim() ?? null,
        cName: mapping.cName?.trim() ?? null,
      },
    ]),
  );

  const missingSkuCodes = skuCodes.filter(
    (skuCode) =>
      !destinationCountryCode ||
      !mappingBySkuCode.has(buildMappingKey(skuCode, destinationCountryCode)) ||
      !hasProductDeclaration(
        mappingBySkuCode.get(buildMappingKey(skuCode, destinationCountryCode)) ?? {},
      ),
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
              ?.shippingMethodCode
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
    productDeclarations: buildProductDeclarations(
      skuCodes,
      destinationCountryCode,
      mappingBySkuCode,
    ),
    skuCodes,
    missingSkuCodes: [],
    conflictingMethods: [],
  };
}

function buildProductDeclarations(
  skuCodes: string[],
  destinationCountryCode: string | null,
  mappingBySkuCode: Map<string, NormalizedSkuMapping>,
): AutoShipmentProductDeclaration[] {
  if (!destinationCountryCode) {
    return [];
  }

  return skuCodes.flatMap((skuCode) => {
    const mapping = mappingBySkuCode.get(
      buildMappingKey(skuCode, destinationCountryCode),
    );
    if (!mapping?.eName || !mapping.cName) {
      return [];
    }

    return [
      {
        skuCode: mapping.skuCode,
        eName: mapping.eName,
        cName: mapping.cName,
      },
    ];
  });
}
