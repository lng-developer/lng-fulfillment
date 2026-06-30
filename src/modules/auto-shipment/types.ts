export type AutoShipmentResolutionStatus =
  | "RESOLVED"
  | "MISSING_SKU_MAPPING"
  | "METHOD_CONFLICT";

export interface AutoShipmentSkuItem {
  sku: string | null;
}

export interface AutoShipmentSkuMapping {
  skuCode: string;
  destinationCountryCode: string;
  shippingMethodCode: string;
}

export interface AutoShipmentResolutionInput {
  destinationCountryCode: string | null;
  items: AutoShipmentSkuItem[];
  mappings: AutoShipmentSkuMapping[];
}

export interface AutoShipmentResolution {
  status: AutoShipmentResolutionStatus;
  shippingMethodCode?: string;
  skuCodes: string[];
  missingSkuCodes: string[];
  conflictingMethods: string[];
}
