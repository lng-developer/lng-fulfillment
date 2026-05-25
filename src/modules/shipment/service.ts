import { recordUserAuditLog } from "@/modules/audit";
import {
  getCarrierAdapter,
  hasCarrierAdapter,
  isKnownCarrierCode,
  mapCarrierErrorToAppError,
  normalizeCarrierCode,
  preflightCarrierShipmentCreation,
  resolveCarrierRuntimeCredentials,
  type CarrierNormalizedTrackingStatus,
  type GetCarrierTrackingResult,
  type CreateCarrierShipmentInput,
} from "@/modules/carrier";
import { AppError } from "@/shared/errors";
import {
  countShipments,
  createDraftShipmentRecord,
  findOrderForDraftShipment,
  getShipmentCarrierPreparation,
  getShipmentDetail as getShipmentDetailRecord,
  listShipments as listShipmentRecords,
  updateShipmentExecutionFailed,
  updateShipmentExecutionStarted,
  updateShipmentExecutionSucceeded,
  updateShipmentTrackingSyncResult,
} from "./repository";
import type {
  CreateDraftShipmentInput,
  ExecuteShipmentInput,
  ExecuteShipmentResult,
  PaginationMeta,
  PrepareShipmentCarrierExecutionInput,
  PrepareShipmentCarrierExecutionResult,
  PreflightShipmentExecutionInput,
  ShipmentActor,
  ShipmentDetail,
  ShipmentExecutionPreflightResult,
  ShipmentListItem,
  ShipmentListQuery,
  ShipmentTrackingSyncResult,
} from "./types";

const EXECUTABLE_SHIPMENT_STATUSES = ["DRAFT", "FAILED_CREATE"] as const;

export async function createDraftShipment(
  tenantId: string,
  input: CreateDraftShipmentInput,
  actor: ShipmentActor,
): Promise<ShipmentDetail> {
  const order = await findOrderForDraftShipment(
    tenantId,
    input.orderId,
    input.items.map((item) => item.orderItemId),
  );

  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  const orderItemsById = new Map(
    order.items.map((item) => [item.id, item.quantity]),
  );

  for (const item of input.items) {
    const orderItemQuantity = orderItemsById.get(item.orderItemId);

    if (orderItemQuantity === undefined) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Shipment items must belong to the selected order.",
        400,
      );
    }

    if (item.quantity > orderItemQuantity) {
      throw new AppError(
        "CONFLICT",
        "Shipment item quantity cannot exceed order item quantity.",
        409,
      );
    }
  }

  const shipment = await createDraftShipmentRecord({
    tenantId,
    shipment: input,
    actorType: actor.actorType,
    actorId: actor.actorId,
  });

  if (actor.actorType === "USER" && actor.actorId) {
    await recordUserAuditLog({
      tenantId,
      actorUserId: actor.actorId,
      action: "SHIPMENT_DRAFT_CREATED",
      resourceType: "Shipment",
      resourceId: shipment.id,
      metadata: {
        shipmentId: shipment.id,
        orderId: input.orderId,
        itemCount: input.items.length,
      },
    });
  }

  return shipment;
}

export async function listTenantShipments(
  tenantId: string,
  query: ShipmentListQuery,
): Promise<{ shipments: ShipmentListItem[]; meta: PaginationMeta }> {
  const [shipments, totalItems] = await Promise.all([
    listShipmentRecords(tenantId, query),
    countShipments(tenantId, query),
  ]);

  return {
    shipments,
    meta: {
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
      },
    },
  };
}

export async function getTenantShipmentDetail(
  tenantId: string,
  shipmentId: string,
): Promise<ShipmentDetail> {
  const shipment = await getShipmentDetailRecord(tenantId, shipmentId);

  if (!shipment) {
    throw new AppError("NOT_FOUND", "Shipment not found.", 404);
  }

  return shipment;
}

export async function prepareShipmentCarrierExecution(
  tenantId: string,
  input: PrepareShipmentCarrierExecutionInput,
): Promise<PrepareShipmentCarrierExecutionResult> {
  const shipment = await getTenantShipmentDetail(tenantId, input.shipmentId);
  const normalizedCarrierCode = normalizeCarrierCode(input.carrierCode);

  if (!isKnownCarrierCode(normalizedCarrierCode)) {
    throw new AppError("CARRIER_ERROR", "Carrier is not supported.", 400, {
      carrierCode: normalizedCarrierCode,
    });
  }

  return {
    shipment,
    carrierCode: normalizedCarrierCode,
    carrierAccountId: input.carrierAccountId ?? shipment.carrierAccountId,
    adapterRegistered: hasCarrierAdapter(normalizedCarrierCode),
    nextTask: "V2-032 — Shipment Execution Service",
  };
}

export async function preflightShipmentExecution(
  tenantId: string,
  shipmentId: string,
  input: PreflightShipmentExecutionInput,
): Promise<ShipmentExecutionPreflightResult> {
  const shipment = await getShipmentCarrierPreparation(tenantId, shipmentId);

  if (!shipment) {
    throw new AppError("NOT_FOUND", "Shipment not found.", 404);
  }

  if (!EXECUTABLE_SHIPMENT_STATUSES.includes(shipment.status as never)) {
    throw new AppError(
      "CONFLICT",
      "Shipment cannot be executed from its current status.",
      409,
      {
        shipmentStatus: shipment.status,
        allowedStatuses: [...EXECUTABLE_SHIPMENT_STATUSES],
      },
    );
  }

  if (shipment.items.length === 0) {
    throw new AppError("CONFLICT", "Shipment must have items.", 409);
  }

  const normalizedCarrierCode = normalizeCarrierCode(input.carrierCode);

  if (!isKnownCarrierCode(normalizedCarrierCode)) {
    throw new AppError("CARRIER_ERROR", "Carrier is not supported.", 400, {
      carrierCode: normalizedCarrierCode,
    });
  }

  const carrierInput = buildCreateCarrierShipmentInputFromPreparation(
    tenantId,
    shipment,
    normalizedCarrierCode,
    input.carrierAccountId ?? shipment.carrierAccountId,
  );
  const carrierPreflight = await preflightCarrierShipmentCreation(carrierInput, {
    tenantId,
  });

  return {
    shipmentId: shipment.id,
    shipmentStatus: shipment.status,
    carrierCode: carrierPreflight.carrierCode,
    credentialSource: carrierPreflight.credentialSource,
    credentialConfigured: carrierPreflight.credentialConfigured,
    liveEnabled: carrierPreflight.liveEnabled,
    env: carrierPreflight.env,
    mappingPreview: carrierPreflight.mappingPreview,
    warnings: carrierPreflight.warnings,
  };
}

export async function executeShipment(
  tenantId: string,
  shipmentId: string,
  input: ExecuteShipmentInput,
  actor: ShipmentActor,
): Promise<ExecuteShipmentResult> {
  const shipment = await getTenantShipmentDetail(tenantId, shipmentId);

  if (!EXECUTABLE_SHIPMENT_STATUSES.includes(shipment.status as never)) {
    throw new AppError(
      "CONFLICT",
      "Shipment cannot be executed from its current status.",
      409,
      {
        shipmentStatus: shipment.status,
        allowedStatuses: [...EXECUTABLE_SHIPMENT_STATUSES],
      },
    );
  }

  const prepared = await prepareShipmentCarrierExecution(tenantId, {
    shipmentId,
    carrierCode: input.carrierCode,
    carrierAccountId: input.carrierAccountId,
  });

  if (!prepared.adapterRegistered) {
    throw new AppError(
      "CARRIER_ERROR",
      "Carrier adapter is not implemented.",
      501,
      {
        carrierCode: prepared.carrierCode,
        retryable: false,
      },
    );
  }

  const adapter = getCarrierAdapter(prepared.carrierCode);
  const runtimeCredentials = await resolveCarrierRuntimeCredentials(
    tenantId,
    prepared.carrierCode,
    prepared.carrierAccountId,
  );
  const resolvedCarrierAccountId =
    runtimeCredentials.carrierAccountId ?? prepared.carrierAccountId;
  const carrierInput = {
    ...buildCreateCarrierShipmentInput(tenantId, prepared),
    carrierAccountId: resolvedCarrierAccountId,
  };
  const carrierContext = {
    tenantId,
    credentials: runtimeCredentials,
  };

  try {
    await adapter.assertCanCreateShipment?.(carrierInput, carrierContext);
  } catch (error) {
    throw mapCarrierErrorToAppError(error);
  }

  await updateShipmentExecutionStarted({
    tenantId,
    shipmentId,
    carrierCode: prepared.carrierCode,
    carrierAccountId: resolvedCarrierAccountId,
    actorType: actor.actorType,
    actorId: actor.actorId,
  });

  try {
    const result = await adapter.createShipment(carrierInput, carrierContext);
    const successStatus = result.labelUrl
      ? "LABEL_READY"
      : result.trackingNumber
        ? "TRACKING_PENDING"
        : "CREATED";
    const updatedShipment = await updateShipmentExecutionSucceeded({
      tenantId,
      shipmentId,
      status: successStatus,
      carrierShipmentId: result.carrierShipmentId,
      trackingNumber: result.trackingNumber ?? null,
      labelUrl: result.labelUrl ?? null,
      metadata: result.metadata?.safe
        ? { carrier: result.metadata.safe }
        : undefined,
      actorType: actor.actorType,
      actorId: actor.actorId,
    });

    if (actor.actorType === "USER" && actor.actorId) {
      await recordUserAuditLog({
        tenantId,
        actorUserId: actor.actorId,
        action: "SHIPMENT_EXECUTED",
        resourceType: "Shipment",
        resourceId: shipmentId,
        metadata: {
          shipmentId,
          carrierCode: prepared.carrierCode,
          carrierShipmentId: result.carrierShipmentId,
          trackingNumber: result.trackingNumber ?? null,
        },
      });
    }

    return {
      shipment: updatedShipment,
      carrierCode: prepared.carrierCode,
      carrierAccountId: resolvedCarrierAccountId,
    };
  } catch (error) {
    const appError = mapCarrierErrorToAppError(error);

    await updateShipmentExecutionFailed({
      tenantId,
      shipmentId,
      metadata: {
        carrier: {
          carrierCode: prepared.carrierCode,
          errorCode: appError.code,
          retryable:
            typeof appError.details === "object" &&
            appError.details !== null &&
            "retryable" in appError.details
              ? Boolean(appError.details.retryable)
              : false,
        },
      },
      actorType: actor.actorType,
      actorId: actor.actorId,
    });

    if (actor.actorType === "USER" && actor.actorId) {
      await recordUserAuditLog({
        tenantId,
        actorUserId: actor.actorId,
        action: "SHIPMENT_EXECUTION_FAILED",
        resourceType: "Shipment",
        resourceId: shipmentId,
        metadata: {
          shipmentId,
          carrierCode: prepared.carrierCode,
          errorCode: appError.code,
        },
      });
    }

    throw appError;
  }
}

export async function syncShipmentTracking(
  tenantId: string,
  shipmentId: string,
  actor: ShipmentActor,
): Promise<ShipmentTrackingSyncResult> {
  const shipment = await getTenantShipmentDetail(tenantId, shipmentId);

  if (!shipment.carrierCode) {
    throw new AppError("CONFLICT", "Shipment does not have a carrier.", 409);
  }

  const normalizedCarrierCode = normalizeCarrierCode(shipment.carrierCode);
  if (!isKnownCarrierCode(normalizedCarrierCode)) {
    throw new AppError("CARRIER_ERROR", "Carrier is not supported.", 400, {
      carrierCode: normalizedCarrierCode,
    });
  }

  const customerOrderNumber = shipment.orderNumber ?? shipment.externalOrderId;
  if (
    !shipment.carrierShipmentId &&
    !shipment.trackingNumber &&
    !customerOrderNumber
  ) {
    throw new AppError(
      "CONFLICT",
      "Shipment does not have a tracking lookup key.",
      409,
    );
  }

  try {
    const adapter = getCarrierAdapter(normalizedCarrierCode);
    const runtimeCredentials = await resolveCarrierRuntimeCredentials(
      tenantId,
      normalizedCarrierCode,
      shipment.carrierAccountId,
    );
    const tracking = await adapter.getTracking(
      {
        tenantId,
        shipmentId,
        carrierCode: normalizedCarrierCode,
        carrierShipmentId: shipment.carrierShipmentId,
        trackingNumber: shipment.trackingNumber,
        customerOrderNumber,
      },
      {
        tenantId,
        credentials: runtimeCredentials,
      },
    );

    const statusDecision = chooseTrackingShipmentStatus(
      shipment.status,
      tracking.status ?? null,
    );
    const nextTrackingNumber =
      !shipment.trackingNumber && tracking.trackingNumber
        ? tracking.trackingNumber
        : undefined;
    const nextCarrierShipmentId =
      !shipment.carrierShipmentId && tracking.carrierShipmentId
        ? tracking.carrierShipmentId
        : undefined;

    const updatedShipment = await updateShipmentTrackingSyncResult({
      tenantId,
      shipmentId,
      status: statusDecision.nextStatus,
      trackingNumber: nextTrackingNumber,
      carrierShipmentId: nextCarrierShipmentId,
      statusChanged: statusDecision.nextStatus !== shipment.status,
      statusNote: statusDecision.note,
      actorType: actor.actorType,
      actorId: actor.actorId,
    });

    if (actor.actorType === "USER" && actor.actorId) {
      await recordUserAuditLog({
        tenantId,
        actorUserId: actor.actorId,
        action: "SHIPMENT_TRACKING_SYNCED",
        resourceType: "Shipment",
        resourceId: shipmentId,
        metadata: {
          shipmentId,
          carrierCode: normalizedCarrierCode,
          previousStatus: shipment.status,
          nextStatus: updatedShipment.status,
          trackingNumberPresent: Boolean(updatedShipment.trackingNumber),
          eventsCount: tracking.events.length,
        },
      });
    }

    return buildShipmentTrackingSyncResult(updatedShipment, tracking);
  } catch (error) {
    const appError =
      error instanceof AppError ? error : mapCarrierErrorToAppError(error);

    if (actor.actorType === "USER" && actor.actorId) {
      await recordUserAuditLog({
        tenantId,
        actorUserId: actor.actorId,
        action: "SHIPMENT_TRACKING_SYNC_FAILED",
        resourceType: "Shipment",
        resourceId: shipmentId,
        metadata: {
          shipmentId,
          carrierCode: normalizedCarrierCode,
          previousStatus: shipment.status,
          nextStatus: shipment.status,
          trackingNumberPresent: Boolean(shipment.trackingNumber),
          eventsCount: 0,
          errorCode: appError.code,
        },
      });
    }

    throw appError;
  }
}

function buildCreateCarrierShipmentInput(
  tenantId: string,
  prepared: PrepareShipmentCarrierExecutionResult,
): CreateCarrierShipmentInput {
  return {
    tenantId,
    shipmentId: prepared.shipment.id,
    orderId: prepared.shipment.orderId,
    externalOrderId: prepared.shipment.externalOrderId,
    orderNumber: prepared.shipment.orderNumber,
    carrierCode: prepared.carrierCode,
    carrierAccountId: prepared.carrierAccountId,
    items: prepared.shipment.items.map((item) => ({
      shipmentItemId: item.id,
      orderItemId: item.orderItemId,
      externalItemId: item.externalItemId,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
    })),
    metadata: {
      source: "shipment_execution_service",
    },
  };
}

function chooseTrackingShipmentStatus(
  currentStatus: ShipmentDetail["status"],
  carrierStatus: CarrierNormalizedTrackingStatus | null,
): { nextStatus: ShipmentDetail["status"]; note: string } {
  if (!carrierStatus) {
    return {
      nextStatus: currentStatus,
      note: "Shipment tracking synced.",
    };
  }

  if (carrierStatus === "TRACKING_PENDING") {
    return {
      nextStatus: ["CREATED", "LABEL_READY", "TRACKING_PENDING"].includes(
        currentStatus,
      )
        ? "TRACKING_PENDING"
        : currentStatus,
      note: "Shipment tracking pending.",
    };
  }

  if (carrierStatus === "IN_TRANSIT") {
    return {
      nextStatus: ["DELIVERED", "CANCELLED"].includes(currentStatus)
        ? currentStatus
        : "IN_TRANSIT",
      note: "Shipment tracking synced: in transit.",
    };
  }

  if (carrierStatus === "DELIVERED") {
    return {
      nextStatus: "DELIVERED",
      note: "Shipment tracking synced: delivered.",
    };
  }

  if (carrierStatus === "EXCEPTION") {
    return {
      nextStatus: ["DELIVERED", "CANCELLED"].includes(currentStatus)
        ? currentStatus
        : "EXCEPTION",
      note: "Shipment tracking synced: exception.",
    };
  }

  if (carrierStatus === "CANCELLED") {
    return {
      nextStatus: currentStatus === "DELIVERED" ? currentStatus : "CANCELLED",
      note: "Shipment tracking synced: cancelled.",
    };
  }

  if (carrierStatus === "RETURNED") {
    return {
      nextStatus: ["DELIVERED", "CANCELLED"].includes(currentStatus)
        ? currentStatus
        : "EXCEPTION",
      note: "Shipment tracking synced: returned.",
    };
  }

  if (carrierStatus === "UNKNOWN") {
    return {
      nextStatus: ["CREATED", "TRACKING_PENDING"].includes(currentStatus)
        ? "TRACKING_PENDING"
        : currentStatus,
      note: "Shipment tracking synced: status unknown.",
    };
  }

  return {
    nextStatus: currentStatus,
    note: "Shipment tracking synced.",
  };
}

function buildShipmentTrackingSyncResult(
  shipment: ShipmentDetail,
  tracking: GetCarrierTrackingResult,
): ShipmentTrackingSyncResult {
  return {
    shipment: {
      id: shipment.id,
      status: shipment.status,
      carrierCode: shipment.carrierCode,
      carrierShipmentId: shipment.carrierShipmentId,
      trackingNumber: shipment.trackingNumber,
      updatedAt: shipment.updatedAt,
    },
    tracking: {
      status: tracking.status ?? null,
      latestEvent: tracking.latestEvent
        ? {
            eventTime: tracking.latestEvent.eventTime,
            message: tracking.latestEvent.message ?? null,
            location: tracking.latestEvent.location ?? null,
          }
        : null,
      eventsCount: tracking.events.length,
    },
  };
}

function buildCreateCarrierShipmentInputFromPreparation(
  tenantId: string,
  shipment: NonNullable<Awaited<ReturnType<typeof getShipmentCarrierPreparation>>>,
  carrierCode: string,
  carrierAccountId: string | null,
): CreateCarrierShipmentInput {
  return {
    tenantId,
    shipmentId: shipment.id,
    orderId: shipment.orderId,
    externalOrderId: shipment.order.externalOrderId,
    orderNumber: shipment.order.orderNumber,
    carrierCode,
    carrierAccountId,
    recipient: {
      name: shipment.order.recipientName ?? undefined,
      phone: shipment.order.recipientPhone ?? undefined,
      email: shipment.order.recipientEmail ?? undefined,
      line1: jsonString(shipment.order.recipientAddress, "line1"),
      line2: jsonString(shipment.order.recipientAddress, "line2"),
      city: jsonString(shipment.order.recipientAddress, "city"),
      state: jsonString(shipment.order.recipientAddress, "state"),
      postalCode: jsonString(shipment.order.recipientAddress, "postalCode"),
      country:
        jsonString(shipment.order.recipientAddress, "country") ??
        shipment.order.destinationCountry ??
        undefined,
    },
    destinationCountry: shipment.order.destinationCountry,
    items: shipment.items.map((item) => ({
      shipmentItemId: item.id,
      orderItemId: item.orderItemId,
      externalItemId: item.orderItem.externalItemId,
      sku: item.orderItem.sku,
      name: item.orderItem.name,
      quantity: item.quantity,
      weight: decimalToNumber(item.orderItem.weight),
      declaredValue: decimalToNumber(item.orderItem.declaredValue),
    })),
    metadata: {
      source: "shipment_preflight",
    },
  };
}

function jsonString(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim() ? field.trim() : undefined;
}

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    const numberValue = value.toNumber();
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
