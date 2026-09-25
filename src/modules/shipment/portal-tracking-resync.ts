export function shouldSendPortalTrackingUpdate(input: {
  trackingNumber: string | null;
  hadTrackingNumber: boolean;
  carrierName: string | null | undefined;
  actualShipAt: Date | null;
}) {
  return Boolean(
    input.trackingNumber &&
      (!input.hadTrackingNumber || input.carrierName || input.actualShipAt),
  );
}
