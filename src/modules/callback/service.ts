import { createHmac } from "node:crypto";
import {
  listPendingLifecycleOutbox,
  markLifecycleOutboxDelivered,
  markLifecycleOutboxFailed,
  markLifecycleOutboxPending,
} from "./repository";
import type { LifecycleEventEnvelope } from "./types";

export function buildSignedLifecycleDelivery(
  event: LifecycleEventEnvelope,
  secret: string,
  timestampSeconds = Math.floor(Date.now() / 1000),
) {
  const body = JSON.stringify(event);
  return {
    body,
    headers: {
      "content-type": "application/json",
      "x-lng-event-id": event.eventId,
      "x-lng-event-timestamp": String(timestampSeconds),
      "x-lng-signature": `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`,
    },
  };
}

export async function deliverLifecycleEvent(
  event: LifecycleEventEnvelope,
  input: {
    callbackUrl: string;
    secret: string;
    timestampSeconds?: number;
    fetchImpl?: typeof fetch;
  },
) {
  const delivery = buildSignedLifecycleDelivery(
    event,
    input.secret,
    input.timestampSeconds,
  );
  const response = await (input.fetchImpl ?? fetch)(input.callbackUrl, {
    method: "POST",
    headers: delivery.headers,
    body: delivery.body,
  });
  return { delivered: response.ok, statusCode: response.status };
}

const MAX_DELIVERY_ATTEMPTS = 5;

export async function deliverPendingLifecycleEvents(now = new Date()) {
  const callbackUrl = process.env.FULFILLMENT_LIFECYCLE_CALLBACK_URL?.trim();
  const secret = process.env.FULFILLMENT_LIFECYCLE_WEBHOOK_SECRET;
  if (!callbackUrl || !secret) {
    return { enabled: false, attempted: 0, delivered: 0, pending: 0, failed: 0 };
  }

  const records = await listPendingLifecycleOutbox(now, 100);
  const result = { enabled: true, attempted: 0, delivered: 0, pending: 0, failed: 0 };

  for (const record of records) {
    result.attempted += 1;
    const event = parseLifecycleEvent(record.body);
    if (!event) {
      await markLifecycleOutboxFailed({ id: record.id, error: "Invalid lifecycle event body." });
      result.failed += 1;
      continue;
    }

    try {
      const delivery = await deliverLifecycleEvent(event, { callbackUrl, secret });
      if (delivery.delivered) {
        await markLifecycleOutboxDelivered(record.id, delivery.statusCode);
        result.delivered += 1;
        continue;
      }

      if (delivery.statusCode >= 400 && delivery.statusCode < 500 || record.attemptCount + 1 >= MAX_DELIVERY_ATTEMPTS) {
        await markLifecycleOutboxFailed({ id: record.id, statusCode: delivery.statusCode, error: `Callback returned HTTP ${delivery.statusCode}.` });
        result.failed += 1;
      } else {
        await markLifecycleOutboxPending({
          id: record.id,
          statusCode: delivery.statusCode,
          error: `Callback returned HTTP ${delivery.statusCode}.`,
          nextAttemptAt: new Date(now.getTime() + retryDelayMs(record.attemptCount + 1)),
        });
        result.pending += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.name : "Callback delivery failed.";
      if (record.attemptCount + 1 >= MAX_DELIVERY_ATTEMPTS) {
        await markLifecycleOutboxFailed({ id: record.id, error: message });
        result.failed += 1;
      } else {
        await markLifecycleOutboxPending({
          id: record.id,
          error: message,
          nextAttemptAt: new Date(now.getTime() + retryDelayMs(record.attemptCount + 1)),
        });
        result.pending += 1;
      }
    }
  }

  return result;
}

function parseLifecycleEvent(body: string): LifecycleEventEnvelope | null {
  try {
    const event = JSON.parse(body) as LifecycleEventEnvelope;
    return event && typeof event.eventId === "string" && typeof event.eventType === "string" ? event : null;
  } catch {
    return null;
  }
}

function retryDelayMs(attempt: number) {
  return Math.min(60 * 60 * 1000, 60_000 * 2 ** Math.max(0, attempt - 1));
}
