export type ShipmentCarrierCode = "YUNEXPRESS_OMS" | "VIETTEL_POST";

const CARRIER_PRESENTATION: Record<ShipmentCarrierCode, {
  name: string;
  liveWarning: string;
  confirmationText: string;
}> = {
  YUNEXPRESS_OMS: {
    name: "YunExpress OMS",
    liveWarning: "You are about to create a REAL shipment in YunExpress OMS.",
    confirmationText: "CREATE YUNEXPRESS SHIPMENT",
  },
  VIETTEL_POST: {
    name: "Viettel Post",
    liveWarning: "You are about to create a REAL shipment in Viettel Post.",
    confirmationText: "CREATE VIETTEL POST SHIPMENT",
  },
};

export function getCarrierPresentation(carrierCode: ShipmentCarrierCode) {
  return CARRIER_PRESENTATION[carrierCode];
}
