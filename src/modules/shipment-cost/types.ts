import type { ShipmentActualFeeStatus } from "@prisma/client";

export type ActualPackageInput = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type ShipmentCostSummary = {
  id: string;
  shipmentId: string;
  orderId: string;
  actualWeightKg: string;
  actualLengthCm: string;
  actualWidthCm: string;
  actualHeightCm: string;
  volumetricWeightKg: string;
  chargeableWeightKg: string;
  estimatedWeightKg: string | null;
  estimatedFee: string | null;
  estimatedCurrency: string | null;
  estimatedCountryCode: string | null;
  estimatedShippingMethodCode: string | null;
  estimateSource: string;
  actualFeeStatus: ShipmentActualFeeStatus;
  actualGrossWeight: string | null;
  actualChargeWeight: string | null;
  actualFreight: string | null;
  actualFuelSurcharge: string | null;
  actualRegistrationFee: string | null;
  actualProcessingFee: string | null;
  actualOtherFee: string | null;
  actualTotalFee: string | null;
  actualOccurrenceTime: Date | null;
  actualFetchedAt: Date | null;
  actualFetchErrorCode: string | null;
  actualFetchErrorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShipmentCostListQuery = {
  page: number;
  pageSize: number;
  status?: ShipmentActualFeeStatus;
  search?: string;
};

export type ShipmentCostListItem = ShipmentCostSummary & {
  orderNumber: string | null;
  externalOrderId: string;
  sourceChannel: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
};
