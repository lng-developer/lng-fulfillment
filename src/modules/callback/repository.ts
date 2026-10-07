import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";
import type { LifecycleEventEnvelope, LifecycleEventType } from "./types";

type TransactionClient = Prisma.TransactionClient;

export function buildLifecycleOutboxRecord(input: {
  eventId?: string;
  eventType: LifecycleEventType;
  tenantId: string;
  orderId: string;
  shipmentId?: string | null;
  externalOrderId: string;
  shipment?: LifecycleEventEnvelope["shipment"];
  failure?: LifecycleEventEnvelope["failure"];
}) {
  const eventId = input.eventId ?? randomUUID();
  const event: LifecycleEventEnvelope = {
    eventId,
    eventType: input.eventType,
    occurredAt: new Date().toISOString(),
    tenantReference: input.tenantId,
    externalOrderId: input.externalOrderId,
    fulfillmentOrderId: input.orderId,
    ...(input.shipment ? { shipment: input.shipment } : {}),
    ...(input.failure ? { failure: input.failure } : {}),
  };

  return { eventId, body: JSON.stringify(event) };
}

export async function createLifecycleOutboxInTransaction(
  tx: TransactionClient,
  input: Parameters<typeof buildLifecycleOutboxRecord>[0],
) {
  const record = buildLifecycleOutboxRecord(input);
  return tx.lifecycleEventOutbox.create({
    data: {
      eventId: record.eventId,
      tenantId: input.tenantId,
      orderId: input.orderId,
      shipmentId: input.shipmentId ?? null,
      eventType: input.eventType,
      body: record.body,
    },
  });
}

export async function listPendingLifecycleOutbox(now: Date, take: number) {
  return prisma.lifecycleEventOutbox.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now } },
    orderBy: { nextAttemptAt: "asc" },
    take,
  });
}

export async function markLifecycleOutboxDelivered(id: string, statusCode: number) {
  return prisma.lifecycleEventOutbox.update({
    where: { id },
    data: {
      status: "DELIVERED",
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
      deliveredAt: new Date(),
      lastStatusCode: statusCode,
      lastError: null,
    },
  });
}

export async function markLifecycleOutboxPending(input: {
  id: string;
  statusCode?: number;
  error: string;
  nextAttemptAt: Date;
}) {
  return prisma.lifecycleEventOutbox.update({
    where: { id: input.id },
    data: {
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
      lastStatusCode: input.statusCode ?? null,
      lastError: input.error,
      nextAttemptAt: input.nextAttemptAt,
    },
  });
}

export async function markLifecycleOutboxFailed(input: {
  id: string;
  statusCode?: number;
  error: string;
}) {
  return prisma.lifecycleEventOutbox.update({
    where: { id: input.id },
    data: {
      status: "FAILED",
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
      lastStatusCode: input.statusCode ?? null,
      lastError: input.error,
    },
  });
}
