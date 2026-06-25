import { AppError } from "@/shared/errors";
import { decryptYunWebhookPayload, verifyYunWebhookSignature } from "./crypto";
import {
  classifyYunWebhookEvent,
  extractYunWebhookMeta,
} from "./extractor";
import { buildYunWebhookDecryptedDebugLog } from "./debug";
import { handleYunAbnormalWebhook } from "./handlers/abnormal";
import { handleYunFeeWebhook } from "./handlers/fee";
import { handleYunTrackingWebhook } from "./handlers/tracking";
import {
  createReceivedYunWebhookEvent,
  getSafeErrorMessage,
  markYunWebhookEventStatus,
} from "./repository";
import type {
  ReceiveYunWebhookInput,
  YunWebhookDispatchContext,
  YunWebhookDispatchResult,
  YunWebhookReceiveResult,
} from "./types";

export async function receiveYunWebhookEvent(
  input: ReceiveYunWebhookInput,
): Promise<YunWebhookReceiveResult> {
  const ack = parseAckChallenge(input.rawBody);
  if (ack) {
    return {
      eventId: null,
      status: "ACK",
      category: "UNKNOWN",
      ack,
    };
  }

  if (process.env.YUN_WEBHOOK_ENABLED === "false") {
    throw new AppError("FORBIDDEN", "YunExpress webhook is disabled.", 403);
  }

  const encryptKey = process.env.YUN_WEBHOOK_ENCRYPT_KEY?.trim();
  if (!encryptKey) {
    throw new AppError(
      "INTEGRATION_ERROR",
      "YunExpress webhook encryption key is not configured.",
      503,
    );
  }

  if (!input.timestamp || !input.signature) {
    throw new AppError("VALIDATION_ERROR", "YunExpress webhook headers are missing.", 400);
  }

  const signatureValid = verifyYunWebhookSignature({
    timestamp: input.timestamp,
    encryptKey,
    rawBody: input.rawBody,
    receivedSignature: input.signature,
  });

  if (!signatureValid) {
    throw new AppError("UNAUTHORIZED", "YunExpress webhook signature is invalid.", 401);
  }

  const encryptedBody = parseEncryptedBody(input.rawBody);
  const decryptedText = decryptYunWebhookPayload(encryptedBody.encrypt, encryptKey);
  const payload = parseDecryptedPayload(decryptedText);
  console.log("[yun-webhook:decrypted]", buildYunWebhookDecryptedDebugLog(payload));
  const encryptedAck = parseAckChallengePayload(payload);
  if (encryptedAck) {
    return {
      eventId: null,
      status: "ACK",
      category: "UNKNOWN",
      ack: encryptedAck,
    };
  }

  const meta = extractYunWebhookMeta(payload);
  const category = classifyYunWebhookEvent(payload, meta);
  const createdEvent = await createReceivedYunWebhookEvent({
    meta,
    category,
    rawEncryptedBody: encryptedBody,
    decryptedPayload: payload,
    timestampHeader: input.timestamp,
    signatureHeader: input.signature,
  });

  if (createdEvent.duplicate) {
    return {
      eventId: createdEvent.eventId,
      status: "DUPLICATE",
      category,
    };
  }

  try {
    const dispatchResult = await dispatchYunWebhookEvent({
      eventId: createdEvent.id,
      meta,
      payload,
    }, category);

    await markYunWebhookEventStatus({
      id: createdEvent.id,
      status: dispatchResult.status,
      tenantId: dispatchResult.shipment?.tenantId ?? null,
      shipmentId: dispatchResult.shipment?.id ?? null,
      shipmentCostId: dispatchResult.shipmentCost?.id ?? null,
      safeMetadata: dispatchResult.safeMetadata ?? null,
    });

    return {
      eventId: createdEvent.eventId,
      status: dispatchResult.status,
      category,
    };
  } catch (error) {
    await markYunWebhookEventStatus({
      id: createdEvent.id,
      status: "FAILED",
      errorMessage: getSafeErrorMessage(error),
    });
    throw error;
  }
}

export async function dispatchYunWebhookEvent(
  context: YunWebhookDispatchContext,
  category: "TRACKING" | "FEE" | "ABNORMAL" | "UNKNOWN",
): Promise<YunWebhookDispatchResult> {
  if (category === "TRACKING") {
    return handleYunTrackingWebhook(context);
  }

  if (category === "FEE") {
    return handleYunFeeWebhook(context);
  }

  if (category === "ABNORMAL") {
    return handleYunAbnormalWebhook(context);
  }

  return {
    status: "UNMATCHED",
    shipment: null,
    safeMetadata: { reason: "unknown_event_category" },
  };
}

function parseEncryptedBody(rawBody: string): { encrypt: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new AppError("VALIDATION_ERROR", "YunExpress webhook body must be valid JSON.", 400);
  }

  if (!isRecord(parsed) || typeof parsed.encrypt !== "string" || !parsed.encrypt) {
    throw new AppError("VALIDATION_ERROR", "YunExpress webhook body is missing encrypt.", 400);
  }

  return { encrypt: parsed.encrypt };
}

function parseAckChallenge(rawBody: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }

  return parseAckChallengePayload(parsed);
}

function parseAckChallengePayload(parsed: unknown) {
  if (!isRecord(parsed)) {
    return null;
  }

  const ack = parsed.ACK ?? parsed.ack;

  if (typeof ack === "string") {
    return ack ? ack : null;
  }

  if (typeof ack === "number" || typeof ack === "boolean") {
    return String(ack);
  }

  return null;
}

function parseDecryptedPayload(decryptedText: string): unknown {
  try {
    return JSON.parse(decryptedText);
  } catch {
    throw new AppError(
      "VALIDATION_ERROR",
      "YunExpress webhook decrypted payload must be valid JSON.",
      400,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
