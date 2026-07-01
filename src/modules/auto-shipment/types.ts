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
  eName?: string | null;
  cName?: string | null;
}

export interface AutoShipmentResolutionInput {
  destinationCountryCode: string | null;
  items: AutoShipmentSkuItem[];
  mappings: AutoShipmentSkuMapping[];
}

export interface AutoShipmentResolution {
  status: AutoShipmentResolutionStatus;
  shippingMethodCode?: string;
  productDeclarations?: AutoShipmentProductDeclaration[];
  skuCodes: string[];
  missingSkuCodes: string[];
  conflictingMethods: string[];
}

export interface AutoShipmentProductDeclaration {
  skuCode: string;
  eName: string;
  cName: string;
}
