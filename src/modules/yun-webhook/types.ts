import type {
  YunWebhookEventCategory,
  YunWebhookEventStatus,
} from "@prisma/client";
import type { ShipmentCostSummary } from "@/modules/shipment-cost/types";
import type { ShipmentDetail } from "@/modules/shipment";
import type { YunWebhookMeta } from "./extractor";

export type ReceiveYunWebhookInput = {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
};

export type YunWebhookRecordInput = {
  meta: YunWebhookMeta;
  category: YunWebhookEventCategory;
  rawEncryptedBody: unknown;
  decryptedPayload: unknown;
  timestampHeader: string | null;
  signatureHeader: string | null;
};

export type YunWebhookDispatchContext = {
  eventId: string;
  meta: YunWebhookMeta;
  payload: unknown;
};

export type YunWebhookDispatchResult =
  | {
      status: "PROCESSED";
      shipment: ShipmentDetail | null;
      shipmentCost?: ShipmentCostSummary | null;
      safeMetadata?: Record<string, unknown>;
    }
  | {
      status: "UNMATCHED";
      shipment: ShipmentDetail | null;
      shipmentCost?: ShipmentCostSummary | null;
      safeMetadata?: Record<string, unknown>;
    };

export type YunWebhookReceiveResult = {
  eventId: string | null;
  status: YunWebhookEventStatus | "DUPLICATE" | "ACK";
  category: YunWebhookEventCategory;
  ack?: string;
};
