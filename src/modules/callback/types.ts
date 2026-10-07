export const LIFECYCLE_EVENT_TYPES = [
  "fulfillment.accepted",
  "shipment.created",
  "shipment.label_ready",
  "tracking.updated",
  "shipment.carrier_handoff_confirmed",
  "shipment.cancelled",
  "shipment.failed",
] as const;

export type LifecycleEventType = (typeof LIFECYCLE_EVENT_TYPES)[number];

export type LifecycleEventEnvelope = {
  eventId: string;
  eventType: LifecycleEventType;
  occurredAt: string;
  tenantReference: string;
  externalOrderId: string;
  fulfillmentOrderId: string;
  shipment?: {
    shipmentId: string;
    carrierCode: "VIETTEL_POST";
    carrierShipmentId: string | null;
    trackingNumber: string | null;
    labelUrl: string | null;
    status: string;
    actualShipAt: string | null;
  };
  failure?: { code: string; message: string };
};
