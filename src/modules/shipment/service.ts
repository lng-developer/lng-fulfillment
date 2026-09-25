import type { Prisma } from "@prisma/client";
import { recordUserAuditLog } from "@/modules/audit";
import {
  deriveActualShipEvent,
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
import { sendPortalTrackingUpdate } from "@/modules/portal-tracking";
import { shouldSendPortalTrackingUpdate } from "./portal-tracking-resync";
import { calculateShipmentCostEstimate } from "@/modules/shipment-cost/estimate";
import { upsertShipmentCostEstimate } from "@/modules/shipment-cost/repository";
import { assertTenantYunIossReadyForDestination } from "@/modules/yun-ioss";
import { AppError } from "@/shared/errors";
import { createSafeTimingLogger } from "@/shared/timing";
import {
  countShipments,
  cancelDirectYunShipmentRecords,
  createDirectShipmentFailureRecord,
  createDirectShipmentSuccessRecords,
  createDraftShipmentRecord,
  findOrderForDraftShipment,
  getDirectCancelYunPreparation,
  getDirectShipOrderPreparation,
  getLatestShipmentForOrder,
  getOrderCostContext,
  getOrderWorkflowState,
  getShipmentCarrierPreparation,
  getShipmentDetail as getShipmentDetailRecord,
  findYunWebhookShipment,
  listTrackingSyncCandidates,
  listShipments as listShipmentRecords,
  resetCancelledOrderRecords,
  savePortalTrackingSyncState,
  updateOrderWorkflowStatus,
  updateShipmentExecutionFailed,
  updateShipmentExecutionStarted,
  updateShipmentExecutionSucceeded,
  updateShipmentTrackingSyncResult,
} from "./repository";
import type {
  CreateDraftShipmentInput,
  ExecuteShipmentInput,
  ExecuteShipmentResult,
  CancelOrderYunResult,
  ConfirmOrderShippedInput,
  ConfirmOrderShippedResult,
  PaginationMeta,
  PrepareShipmentCarrierExecutionInput,
  PrepareShipmentCarrierExecutionResult,
  PreflightShipmentExecutionInput,
  ResetCancelledOrderResult,
  ShipmentActor,
  ShipmentDetail,
  ShipmentExecutionPreflightResult,
  ShipmentListItem,
  ShipmentListQuery,
  ShipmentTrackingSyncResult,
  ShipmentYunEnvironment,
  ShipParcelOverride,
  ShipOrderInput,
  ShipOrderResult,
  ShipOrdersBatchInput,
  ShipOrdersBatchResult,
} from "./types";
import {
  TRACKING_SYNC_BATCH_LIMIT,
  classifyTrackingSyncBatchResult,
} from "./tracking-sync-batch";

const EXECUTABLE_SHIPMENT_STATUSES = ["DRAFT", "FAILED_CREATE"] as const;
const DIRECT_SHIP_ORDER_STATUSES = ["FULFILLED", "READY_TO_SHIP"] as const;
const SHIPPED_CANCEL_WINDOW_MS = 30 * 60 * 1000;
const YUN_TEST_BASE_URL = "http://omsapi.uat.yunexpress.com/";
const YUN_LIVE_BASE_URL = "http://oms.api.yunexpress.com/";

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

export async function shipOrderWithYun(
  tenantId: string,
  input: ShipOrderInput,
  actor: ShipmentActor,
): Promise<ShipOrderResult> {
  const timing = createSafeTimingLogger("shipOrderWithYun", {
    orderId: input.orderId,
  });
  const order = await getDirectShipOrderPreparation(tenantId, input.orderId);
  timing("orderLoaded", {
    found: Boolean(order),
    itemCount: order?.items.length ?? 0,
  });

  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  if (!DIRECT_SHIP_ORDER_STATUSES.includes(order.status as never)) {
    throw new AppError(
      "CONFLICT",
      "Order cannot be shipped from its current status.",
      409,
      {
        orderStatus: order.status,
        allowedStatuses: [...DIRECT_SHIP_ORDER_STATUSES],
      },
    );
  }

  if (!order.items.length) {
    throw new AppError("CONFLICT", "Order must have items.", 409);
  }

  await assertTenantYunIossReadyForDestination({
    tenantId,
    destinationCountryCode: resolveDirectOrderDestinationCountry(order, input.options),
    sourceChannel: order.sourceChannel,
    iossNumber: input.options?.iossNumber,
  });
  timing("iossGuardPassed");

  const adapter = getCarrierAdapter("YUNEXPRESS_OMS");
  const runtimeCredentials = applyYunEnvironmentOverride(
    await resolveCarrierRuntimeCredentials(tenantId, "YUNEXPRESS_OMS", null),
    input.environment,
  );
  timing("credentialsResolved", {
    credentialSource: runtimeCredentials.source,
  });

  const carrierInput = buildCreateCarrierShipmentInputFromDirectOrder(
    tenantId,
    order,
    "YUNEXPRESS_OMS",
    runtimeCredentials.carrierAccountId ?? null,
    input.options,
  );
  timing("carrierInputBuilt", {
    itemCount: carrierInput.items.length,
  });

  let carrierResult;
  try {
    carrierResult = await adapter.createShipment(carrierInput, {
      tenantId,
      credentials: runtimeCredentials,
    });
    timing("carrierCreateCompleted", {
      trackingPresent: Boolean(carrierResult.trackingNumber),
      labelPresent: Boolean(carrierResult.labelUrl),
    });
    logShipmentTrackingFlow("carrierCreateResult", {
      carrierCode: carrierResult.carrierCode,
      carrierShipmentId: carrierResult.carrierShipmentId,
      trackingNumber: carrierResult.trackingNumber ?? null,
      labelUrlPresent: Boolean(carrierResult.labelUrl),
      safeMetadata: carrierResult.metadata?.safe ?? null,
    });
  } catch (error) {
    const appError = mapCarrierErrorToAppError(error);
    await createDirectShipmentFailureRecord({
      tenantId,
      orderId: order.id,
      items: order.items.map((item) => ({
        orderItemId: item.id,
        quantity: item.quantity,
      })),
      carrierCode: "YUNEXPRESS_OMS",
      carrierAccountId: runtimeCredentials.carrierAccountId ?? null,
      metadata: buildCarrierFailureMetadata(
        "YUNEXPRESS_OMS",
        appError,
        input.environment,
      ),
      actorType: actor.actorType,
      actorId: actor.actorId,
    });

    if (actor.actorType === "USER" && actor.actorId) {
      await recordUserAuditLog({
        tenantId,
        actorUserId: actor.actorId,
        action: "SHIPMENT_EXECUTION_FAILED",
        resourceType: "Order",
        resourceId: order.id,
        metadata: {
          orderId: order.id,
          carrierCode: "YUNEXPRESS_OMS",
          errorCode: appError.code,
        },
      });
    }

    throw appError;
  }

  const successStatus = carrierResult.trackingNumber
    ? carrierResult.labelUrl
      ? "LABEL_READY"
      : "TRACKING_PENDING"
    : "TRACKING_PENDING";
  const shipment = await createDirectShipmentSuccessRecords({
    tenantId,
    orderId: order.id,
    items: order.items.map((item) => ({
      orderItemId: item.id,
      quantity: item.quantity,
    })),
    status: successStatus,
    carrierCode: carrierResult.carrierCode,
    carrierAccountId: runtimeCredentials.carrierAccountId ?? null,
    carrierShipmentId: carrierResult.carrierShipmentId,
    trackingNumber: carrierResult.trackingNumber ?? null,
    labelUrl: carrierResult.labelUrl ?? null,
    metadata: carrierResult.metadata?.safe
      ? {
          carrier: {
            ...carrierResult.metadata.safe,
            environmentMode: input.environment,
          },
        }
      : undefined,
    actorType: actor.actorType,
    actorId: actor.actorId,
  });
  timing("directShipmentRecordsCreated", {
    shipmentStatus: shipment.status,
    trackingPresent: Boolean(shipment.trackingNumber),
    labelPresent: Boolean(shipment.labelUrl),
  });
  logShipmentTrackingFlow("shipmentPersisted", {
    orderId: order.id,
    externalOrderId: order.externalOrderId,
    shipmentId: shipment.id,
    shipmentStatus: shipment.status,
    carrierShipmentId: shipment.carrierShipmentId,
    trackingNumber: shipment.trackingNumber,
    labelUrlPresent: Boolean(shipment.labelUrl),
    orderStatus: "IN_PROCESSING",
  });

  const portalTrackingSync = await sendPortalTrackingUpdate({
    orderId: order.externalOrderId,
    tracking: shipment.trackingNumber,
    fulfillment: "LNG Group",
    sourceChannel: order.sourceChannel,
  });
  if (portalTrackingSync.attempted) {
    await savePortalTrackingSyncState({
      tenantId,
      shipmentId: shipment.id,
      result: portalTrackingSync,
    });
  }
  timing("portalTrackingSyncCompleted", {
    attempted: portalTrackingSync.attempted,
    delivered:
      portalTrackingSync.attempted === true
        ? portalTrackingSync.delivered
        : false,
  });
  logShipmentTrackingFlow("portalTrackingSyncResult", portalTrackingSync);

  if (actor.actorType === "USER" && actor.actorId) {
    await recordUserAuditLog({
      tenantId,
      actorUserId: actor.actorId,
      action: "SHIPMENT_EXECUTED",
      resourceType: "Shipment",
      resourceId: shipment.id,
      metadata: {
        shipmentId: shipment.id,
        carrierCode: carrierResult.carrierCode,
        carrierShipmentId: carrierResult.carrierShipmentId,
        trackingNumber: carrierResult.trackingNumber ?? null,
      },
    });
    timing("auditRecorded", { action: "SHIPMENT_EXECUTED" });
  }

  return {
    shipment,
    carrierCode: "YUNEXPRESS_OMS",
    carrierAccountId: runtimeCredentials.carrierAccountId ?? null,
    orderId: order.id,
    orderStatus: "IN_PROCESSING",
    environment: input.environment,
  };
}

export async function shipOrdersBatchWithYun(
  tenantId: string,
  input: ShipOrdersBatchInput,
  actor: ShipmentActor,
): Promise<ShipOrdersBatchResult> {
  const results: ShipOrdersBatchResult["results"] = [];

  for (const orderId of input.orderIds) {
    try {
      const result = await shipOrderWithYun(
        tenantId,
        {
          orderId,
          environment: input.environment,
          options: input.optionsByOrderId?.[orderId],
        },
        actor,
      );
      results.push({
        orderId,
        success: true,
        shipment: result.shipment,
      });
    } catch (error) {
      const appError =
        error instanceof AppError ? error : mapCarrierErrorToAppError(error);
      results.push({
        orderId,
        success: false,
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details,
        },
      });
    }
  }

  return { results };
}

export async function confirmOrderShipped(
  tenantId: string,
  orderId: string,
  actor: ShipmentActor,
  input: ConfirmOrderShippedInput,
): Promise<ConfirmOrderShippedResult> {
  const shipment = await getLatestShipmentForOrder(tenantId, orderId);

  if (!shipment) {
    throw new AppError("NOT_FOUND", "Shipment not found.", 404);
  }

  if (!shipment.labelUrl) {
    throw new AppError("CONFLICT", "Shipment label is not available.", 409);
  }

  const costContext = await getOrderCostContext(tenantId, orderId);
  const estimate = calculateShipmentCostEstimate({
    actualWeightKg: input.actualPackage.weightKg,
    lengthCm: input.actualPackage.lengthCm,
    widthCm: input.actualPackage.widthCm,
    heightCm: input.actualPackage.heightCm,
    countryCode: costContext?.destinationCountry,
    shippingMethodCode:
      readShipmentMetadataString(shipment.metadata, "shippingMethodCode") ??
      costContext?.shippingService,
  });
  const shipmentCost = await upsertShipmentCostEstimate({
    tenantId,
    orderId,
    shipmentId: shipment.id,
    actualWeightKg: estimate.actualWeightKg,
    actualLengthCm: estimate.lengthCm,
    actualWidthCm: estimate.widthCm,
    actualHeightCm: estimate.heightCm,
    volumetricWeightKg: estimate.volumetricWeightKg,
    chargeableWeightKg: estimate.chargeableWeightKg,
    estimatedWeightKg: estimate.estimatedWeightKg,
    estimatedFee: estimate.estimatedFee,
    estimatedCurrency: estimate.estimatedCurrency,
    estimatedCountryCode: estimate.estimatedCountryCode,
    estimatedShippingMethodCode: estimate.estimatedShippingMethodCode,
    estimateSource: estimate.estimateSource,
  });

  await updateOrderWorkflowStatus({
    tenantId,
    orderId,
    status: "SHIPPED",
    note: "Shipment confirmed and label opened.",
    actorType: actor.actorType,
    actorId: actor.actorId,
  });

  return {
    orderId,
    orderStatus: "SHIPPED",
    labelUrl: shipment.labelUrl,
    shipment,
    shipmentCost,
  };
}

export async function cancelOrderYunShipment(
  tenantId: string,
  orderId: string,
  actor: ShipmentActor,
): Promise<CancelOrderYunResult> {
  const timing = createSafeTimingLogger("cancelOrderYunShipment", {
    orderId,
  });
  const preparation = await getDirectCancelYunPreparation(tenantId, orderId);
  timing("cancelPreparationLoaded", {
    found: Boolean(preparation),
    orderStatus: preparation?.status ?? null,
    shipmentStatus: preparation?.shipment?.status ?? null,
    carrierCode: preparation?.shipment?.carrierCode ?? null,
  });

  if (!preparation) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  assertOrderCanBeCancelled(preparation);
  const shipment = preparation.shipment;

  if (!shipment) {
    throw new AppError("NOT_FOUND", "Shipment not found.", 404);
  }

  if (!shipment.carrierCode || shipment.carrierCode !== "YUNEXPRESS_OMS") {
    throw new AppError("CONFLICT", "Shipment is not a YunExpress shipment.", 409);
  }

  if (!shipment.carrierShipmentId) {
    throw new AppError("CONFLICT", "Shipment does not have a YunExpress waybill.", 409);
  }

  if (shipment.status === "CANCELLED") {
    throw new AppError("CONFLICT", "Shipment is already cancelled.", 409);
  }

  const environment = readShipmentEnvironment(shipment.metadata);
  const adapter = getCarrierAdapter("YUNEXPRESS_OMS");
  const runtimeCredentials = applyYunEnvironmentOverride(
    await resolveCarrierRuntimeCredentials(
      tenantId,
      "YUNEXPRESS_OMS",
      shipment.carrierAccountId,
    ),
    environment,
  );
  timing("credentialsResolved", {
    credentialSource: runtimeCredentials.source,
    environmentMode: environment,
  });

  let carrierResult;
  try {
    carrierResult = await adapter.cancelShipment(
      {
        tenantId,
        shipmentId: shipment.id,
        carrierCode: "YUNEXPRESS_OMS",
        carrierShipmentId: shipment.carrierShipmentId,
        reason: "Cancelled from fulfillment platform.",
      },
      {
        tenantId,
        credentials: runtimeCredentials,
      },
    );
    timing("carrierCancelCompleted");
  } catch (error) {
    throw mapCarrierErrorToAppError(error);
  }

  const updatedShipment = await cancelDirectYunShipmentRecords({
    tenantId,
    orderId,
    shipmentId: shipment.id,
    metadata: {
      carrier: {
        ...(carrierResult.metadata?.safe ?? {}),
        environmentMode: environment,
        cancelled: true,
      },
    },
    actorType: actor.actorType,
    actorId: actor.actorId,
  });
  timing("directCancelRecordsUpdated", {
    shipmentStatus: updatedShipment.status,
  });

  return {
    orderId,
    orderStatus: "CANCELLED",
    shipment: updatedShipment,
  };
}

export async function resetCancelledOrder(
  tenantId: string,
  orderId: string,
  actor: ShipmentActor,
): Promise<ResetCancelledOrderResult> {
  const timing = createSafeTimingLogger("resetCancelledOrder", {
    orderId,
  });
  const result = await resetCancelledOrderRecords({
    tenantId,
    orderId,
    actorType: actor.actorType,
    actorId: actor.actorId,
  });
  timing("resetRecordsUpdated", {
    success: Boolean(result),
    shipmentCleared: Boolean(result?.shipment),
  });

  if (!result) {
    const orderState = await getOrderWorkflowState(tenantId, orderId);

    if (!orderState) {
      throw new AppError("NOT_FOUND", "Order not found.", 404);
    }

    throw new AppError(
      "CONFLICT",
      "Only cancelled orders can be reset.",
      409,
      {
        orderStatus: orderState.status,
        allowedStatuses: ["CANCELLED"],
      },
    );
  }

  if (actor.actorType === "USER" && actor.actorId) {
    await recordUserAuditLog({
      tenantId,
      actorUserId: actor.actorId,
      action: "ORDER_RESET_AFTER_CANCEL",
      resourceType: "Order",
      resourceId: orderId,
      metadata: {
        orderId,
        previousStatus: "CANCELLED",
        nextStatus: "FULFILLED",
      },
    });
    timing("auditRecorded", { action: "ORDER_RESET_AFTER_CANCEL" });
  }

  return {
    orderId,
    orderStatus: result.order.status,
    shipment: result.shipment ?? undefined,
  };
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
  const timing = createSafeTimingLogger("executeShipment", {
    shipmentId,
    carrierCode: input.carrierCode,
    environmentMode: input.environment ?? null,
  });
  const shipment = await getTenantShipmentDetail(tenantId, shipmentId);
  timing("shipmentLoaded", { shipmentStatus: shipment.status });

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
  timing("carrierPrepared", {
    carrierCode: prepared.carrierCode,
    adapterRegistered: prepared.adapterRegistered,
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
  const runtimeCredentials = applyYunEnvironmentOverride(
    await resolveCarrierRuntimeCredentials(
      tenantId,
      prepared.carrierCode,
      prepared.carrierAccountId,
    ),
    input.environment,
  );
  timing("credentialsResolved", {
    credentialSource: runtimeCredentials.source,
  });
  const resolvedCarrierAccountId =
    runtimeCredentials.carrierAccountId ?? prepared.carrierAccountId;
  const carrierPreparation = await getShipmentCarrierPreparation(tenantId, shipmentId);
  timing("carrierPreparationLoaded", { found: Boolean(carrierPreparation) });
  if (!carrierPreparation) {
    throw new AppError("NOT_FOUND", "Shipment not found.", 404);
  }
  const carrierInput = {
    ...buildCreateCarrierShipmentInputFromPreparation(
      tenantId,
      carrierPreparation,
      prepared.carrierCode,
      resolvedCarrierAccountId,
      input.options,
    ),
    carrierAccountId: resolvedCarrierAccountId,
  };
  const carrierContext = {
    tenantId,
    credentials: runtimeCredentials,
  };

  try {
    await adapter.assertCanCreateShipment?.(carrierInput, carrierContext);
    timing("carrierCreateAsserted");
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
  timing("shipmentMarkedCreating");

  try {
    const result = await adapter.createShipment(carrierInput, carrierContext);
    timing("carrierCreateCompleted", {
      trackingPresent: Boolean(result.trackingNumber),
      labelPresent: Boolean(result.labelUrl),
    });
    const successStatus = result.trackingNumber
      ? result.labelUrl
        ? "LABEL_READY"
        : "TRACKING_PENDING"
      : "TRACKING_PENDING";
    const updatedShipment = await updateShipmentExecutionSucceeded({
      tenantId,
      shipmentId,
      status: successStatus,
      carrierShipmentId: result.carrierShipmentId,
      trackingNumber: result.trackingNumber ?? null,
      labelUrl: result.labelUrl ?? null,
      metadata: result.metadata?.safe
        ? {
            carrier: {
              ...result.metadata.safe,
              ...(input.environment
                ? { environmentMode: input.environment }
                : {}),
            },
          }
        : undefined,
      actorType: actor.actorType,
      actorId: actor.actorId,
    });
    timing("shipmentExecutionSucceeded", {
      shipmentStatus: updatedShipment.status,
      trackingPresent: Boolean(updatedShipment.trackingNumber),
      labelPresent: Boolean(updatedShipment.labelUrl),
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
      timing("auditRecorded", { action: "SHIPMENT_EXECUTED" });
    }

    return {
      shipment: updatedShipment,
      carrierCode: prepared.carrierCode,
      carrierAccountId: resolvedCarrierAccountId,
    };
  } catch (error) {
    const appError = mapCarrierErrorToAppError(error);
    timing("carrierCreateFailed", {
      errorCode: appError.code,
      status: appError.status,
    });

    await updateShipmentExecutionFailed({
      tenantId,
      shipmentId,
      metadata: {
        carrier: buildCarrierFailureMetadata(prepared.carrierCode, appError)
          .carrier,
      },
      actorType: actor.actorType,
      actorId: actor.actorId,
    });
    timing("shipmentExecutionFailed");

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
      timing("auditRecorded", { action: "SHIPMENT_EXECUTION_FAILED" });
    }

    throw appError;
  }
}

function buildCarrierFailureMetadata(
  carrierCode: string,
  appError: AppError,
  environmentMode?: string,
): Prisma.InputJsonObject {
  const details = asRecord(appError.details);
  const safeMetadata = asRecord(details?.safeMetadata);

  return {
    carrier: {
      carrierCode,
      errorCode: appError.code,
      message: appError.message,
      retryable:
        typeof details?.retryable === "boolean" ? details.retryable : false,
      ...(safeMetadata ? { safeMetadata: toJsonObject(safeMetadata) } : {}),
      ...(environmentMode ? { environmentMode } : {}),
    },
  };
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
    const actualShipEvent = shipment.actualShipAt
      ? null
      : deriveActualShipEvent(tracking.events);

    const updatedShipment = await updateShipmentTrackingSyncResult({
      tenantId,
      shipmentId,
      status: statusDecision.nextStatus,
      trackingNumber: nextTrackingNumber,
      carrierShipmentId: nextCarrierShipmentId,
      carrierName: tracking.provider?.carrierName,
      actualShipAt: actualShipEvent?.eventTime,
      actualShipEvidence: actualShipEvent
        ? {
            ...actualShipEvent,
            eventTime: actualShipEvent.eventTime.toISOString(),
          }
        : undefined,
      statusChanged: statusDecision.nextStatus !== shipment.status,
      statusNote: statusDecision.note,
      actorType: actor.actorType,
      actorId: actor.actorId,
    });

    // Re-send when the carrier lookup resolves a name so legacy orders that
    // already received their tracking can backfill the missing carrier.
    if (
      shouldSendPortalTrackingUpdate({
        trackingNumber: updatedShipment.trackingNumber,
        hadTrackingNumber: Boolean(shipment.trackingNumber),
        carrierName: tracking.provider?.carrierName,
        actualShipAt: updatedShipment.actualShipAt,
      })
    ) {
      const portalTrackingSync = await sendPortalTrackingUpdate({
        orderId: shipment.externalOrderId,
        tracking: updatedShipment.trackingNumber,
        carrier: tracking.provider?.carrierName,
        fulfillment: "LNG Group",
        sourceChannel: shipment.sourceChannel,
        actualShipAt: updatedShipment.actualShipAt,
        shipEvidence: toPortalShipEvidence(updatedShipment.actualShipEvidence),
      });
      if (portalTrackingSync.attempted) {
        await savePortalTrackingSyncState({
          tenantId,
          shipmentId,
          result: portalTrackingSync,
        });
      }
      logShipmentTrackingFlow("portalTrackingSyncResult", portalTrackingSync);
    }

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

export async function syncTrackingBatch(
  tenantId: string,
  actor: ShipmentActor,
) {
  const candidates = await listTrackingSyncCandidates(
    tenantId,
    TRACKING_SYNC_BATCH_LIMIT,
  );
  const results: Array<{
    shipmentId: string;
    outcome: "synced" | "no_actual_ship_event" | "failed";
    errorCode?: string;
  }> = [];

  for (const candidate of candidates) {
    try {
      const result = await syncShipmentTracking(tenantId, candidate.id, actor);
      results.push({
        shipmentId: candidate.id,
        outcome: classifyTrackingSyncBatchResult(result.shipment),
      });
    } catch (error) {
      results.push({
        shipmentId: candidate.id,
        outcome: "failed",
        errorCode: error instanceof AppError ? error.code : "CARRIER_ERROR",
      });
    }
  }

  return {
    attempted: candidates.length,
    synced: results.filter((result) => result.outcome === "synced").length,
    noActualShipEvent: results.filter(
      (result) => result.outcome === "no_actual_ship_event",
    ).length,
    failed: results.filter((result) => result.outcome === "failed").length,
    results,
  };
}

export async function resolveYunWebhookShipment(input: {
  waybillNumber?: string | null;
  trackingNumber?: string | null;
  customerOrderNumber?: string | null;
}) {
  return findYunWebhookShipment(input);
}

export async function applyYunWebhookTrackingUpdate(input: {
  shipment: ShipmentDetail;
  carrierStatus: CarrierNormalizedTrackingStatus | null;
  trackingNumber?: string | null;
  carrierShipmentId?: string | null;
  actualShipAt?: Date;
  actualShipEvidence?: Prisma.InputJsonValue;
}) {
  const nextTrackingNumber =
    !input.shipment.trackingNumber && input.trackingNumber
      ? input.trackingNumber
      : undefined;
  const nextCarrierShipmentId =
    !input.shipment.carrierShipmentId && input.carrierShipmentId
      ? input.carrierShipmentId
      : undefined;
  const statusDecision = chooseTrackingShipmentStatus(
    input.shipment.status,
    input.carrierStatus,
  );
  const actualShipAt = input.shipment.actualShipAt ? undefined : input.actualShipAt;

  const updatedShipment = await updateShipmentTrackingSyncResult({
    tenantId: input.shipment.tenantId,
    shipmentId: input.shipment.id,
    status: statusDecision.nextStatus,
    trackingNumber: nextTrackingNumber,
    carrierShipmentId: nextCarrierShipmentId,
    actualShipAt,
    actualShipEvidence: actualShipAt ? input.actualShipEvidence : undefined,
    statusChanged: statusDecision.nextStatus !== input.shipment.status,
    statusNote: statusDecision.note,
    actorType: "SYSTEM",
    actorId: "yun-webhook",
  });

  let portalTrackingSync = null;
  if (
    (!input.shipment.trackingNumber && updatedShipment.trackingNumber) ||
    actualShipAt
  ) {
    portalTrackingSync = await sendPortalTrackingUpdate({
      orderId: input.shipment.externalOrderId,
      tracking: updatedShipment.trackingNumber,
      fulfillment: "LNG Group",
      sourceChannel: input.shipment.sourceChannel,
      actualShipAt: updatedShipment.actualShipAt,
      shipEvidence: toPortalShipEvidence(updatedShipment.actualShipEvidence),
    });
  }

  return {
    shipment: updatedShipment,
    portalTrackingSync,
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

function logShipmentTrackingFlow(step: string, metadata: Record<string, unknown>) {
  if (process.env.SHIPMENT_TRACKING_FLOW_DEBUG !== "true") {
    return;
  }

  console.info("[shipment-tracking-flow]", {
    step,
    ...metadata,
  });
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
      actualShipAt: shipment.actualShipAt,
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

function toPortalShipEvidence(value: ShipmentDetail["actualShipEvidence"]) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : undefined;
}

function assertOrderCanBeCancelled(orderState: {
  status: string;
  statusHistory: Array<{ createdAt: Date }>;
}) {
  if (orderState.status === "IN_PROCESSING") {
    return;
  }

  if (orderState.status !== "SHIPPED") {
    throw new AppError(
      "CONFLICT",
      "Order cannot be cancelled from its current status.",
      409,
      {
        orderStatus: orderState.status,
        allowedStatuses: ["IN_PROCESSING", "SHIPPED"],
      },
    );
  }

  const shippedAt = orderState.statusHistory[0]?.createdAt;
  const windowExpiresAt = shippedAt
    ? new Date(shippedAt.getTime() + SHIPPED_CANCEL_WINDOW_MS)
    : null;

  if (!shippedAt || Date.now() > shippedAt.getTime() + SHIPPED_CANCEL_WINDOW_MS) {
    throw new AppError(
      "CONFLICT",
      "Shipped orders can only be cancelled within 30 minutes after confirmation.",
      409,
      {
        orderStatus: orderState.status,
        cancelWindowMinutes: 30,
        shippedAt: shippedAt?.toISOString() ?? null,
        cancelWindowExpiresAt: windowExpiresAt?.toISOString() ?? null,
      },
    );
  }
}

function buildCreateCarrierShipmentInputFromPreparation(
  tenantId: string,
  shipment: NonNullable<Awaited<ReturnType<typeof getShipmentCarrierPreparation>>>,
  carrierCode: string,
  carrierAccountId: string | null,
  options?: ExecuteShipmentInput["options"],
): CreateCarrierShipmentInput {
  const parcelOverrideByOrderItemId = new Map(
    options?.parcels
      ?.filter((parcel) => parcel.orderItemId)
      .map((parcel) => [parcel.orderItemId as string, parcel]) ?? [],
  );
  const parcelOverrideBySku = new Map(
    options?.parcels
      ?.filter((parcel) => parcel.sku)
      .map((parcel) => [parcel.sku as string, parcel]) ?? [],
  );

  return {
    tenantId,
    shipmentId: shipment.id,
    orderId: shipment.orderId,
    externalOrderId: shipment.order.externalOrderId,
    orderNumber: shipment.order.orderNumber,
    carrierCode,
    carrierAccountId,
    recipient: {
      name: buildReceiverNameOverride(options, shipment.order.recipientName),
      phone: options?.receiverPhone ?? shipment.order.recipientPhone ?? undefined,
      email: options?.receiverEmail ?? shipment.order.recipientEmail ?? undefined,
      line1:
        options?.receiverStreet ?? jsonString(shipment.order.recipientAddress, "line1"),
      line2: jsonString(shipment.order.recipientAddress, "line2"),
      city: options?.receiverCity ?? jsonString(shipment.order.recipientAddress, "city"),
      state: options?.receiverState ?? jsonString(shipment.order.recipientAddress, "state"),
      postalCode:
        options?.receiverZip ?? jsonString(shipment.order.recipientAddress, "postalCode"),
      country:
        options?.receiverCountryCode ??
        jsonString(shipment.order.recipientAddress, "country") ??
        shipment.order.destinationCountry ??
        undefined,
    },
    destinationCountry: shipment.order.destinationCountry,
    items: shipment.items.map((item) => ({
      ...buildCarrierShipmentItemInput(
        item,
        parcelOverrideByOrderItemId.get(item.orderItemId) ??
          (item.orderItem.sku
            ? parcelOverrideBySku.get(item.orderItem.sku)
            : undefined),
      ),
    })),
    metadata: {
      source: "shipment_execution_service",
      ...(options?.shippingMethodCode
        ? { shippingMethodCode: options.shippingMethodCode }
        : {}),
      ...(options?.sourceCode ? { sourceCode: options.sourceCode } : {}),
      ...(options?.receiverCompany
        ? { receiverCompany: options.receiverCompany }
        : {}),
      ...(options?.weight !== undefined ? { weight: options.weight } : {}),
      ...(options?.length !== undefined ? { length: options.length } : {}),
      ...(options?.width !== undefined ? { width: options.width } : {}),
      ...(options?.height !== undefined ? { height: options.height } : {}),
      ...(options?.sizeUnits ? { sizeUnits: options.sizeUnits } : {}),
      ...(options?.packageCount !== undefined
        ? { packageCount: options.packageCount }
        : {}),
      ...(options?.applicationType !== undefined
        ? { applicationType: options.applicationType }
        : {}),
      ...(options?.returnOption !== undefined
        ? { returnOption: options.returnOption }
        : {}),
      ...(options?.tariffPrepay !== undefined
        ? { tariffPrepay: options.tariffPrepay }
        : {}),
      ...(options?.insuranceOption !== undefined
        ? { insuranceOption: options.insuranceOption }
        : {}),
      ...(options?.iossNumber ? { iossNumber: options.iossNumber } : {}),
    },
  };
}

function buildCreateCarrierShipmentInputFromDirectOrder(
  tenantId: string,
  order: NonNullable<Awaited<ReturnType<typeof getDirectShipOrderPreparation>>>,
  carrierCode: string,
  carrierAccountId: string | null,
  options?: ExecuteShipmentInput["options"],
): CreateCarrierShipmentInput {
  const parcelOverrideByOrderItemId = new Map(
    options?.parcels
      ?.filter((parcel) => parcel.orderItemId)
      .map((parcel) => [parcel.orderItemId as string, parcel]) ?? [],
  );
  const parcelOverrideBySku = new Map(
    options?.parcels
      ?.filter((parcel) => parcel.sku)
      .map((parcel) => [parcel.sku as string, parcel]) ?? [],
  );

  return {
    tenantId,
    shipmentId: order.id,
    orderId: order.id,
    externalOrderId: order.externalOrderId,
    orderNumber: order.orderNumber,
    carrierCode,
    carrierAccountId,
    recipient: {
      name: buildReceiverNameOverride(options, order.recipientName),
      phone: options?.receiverPhone ?? order.recipientPhone ?? undefined,
      email: options?.receiverEmail ?? order.recipientEmail ?? undefined,
      line1: options?.receiverStreet ?? jsonString(order.recipientAddress, "line1"),
      line2: jsonString(order.recipientAddress, "line2"),
      city: options?.receiverCity ?? jsonString(order.recipientAddress, "city"),
      state: options?.receiverState ?? jsonString(order.recipientAddress, "state"),
      postalCode: options?.receiverZip ?? jsonString(order.recipientAddress, "postalCode"),
      country:
        options?.receiverCountryCode ??
        jsonString(order.recipientAddress, "country") ??
        order.destinationCountry ??
        undefined,
    },
    destinationCountry: order.destinationCountry,
    items: order.items.map((item) =>
      buildCarrierShipmentItemInputFromOrderItem(
        item,
        parcelOverrideByOrderItemId.get(item.id) ??
          (item.sku ? parcelOverrideBySku.get(item.sku) : undefined),
      ),
    ),
    metadata: {
      source: "direct_order_ship",
      ...(options?.shippingMethodCode
        ? { shippingMethodCode: options.shippingMethodCode }
        : {}),
      ...(options?.sourceCode ? { sourceCode: options.sourceCode } : {}),
      ...(options?.receiverCompany
        ? { receiverCompany: options.receiverCompany }
        : {}),
      ...(options?.weight !== undefined ? { weight: options.weight } : {}),
      ...(options?.length !== undefined ? { length: options.length } : {}),
      ...(options?.width !== undefined ? { width: options.width } : {}),
      ...(options?.height !== undefined ? { height: options.height } : {}),
      ...(options?.sizeUnits ? { sizeUnits: options.sizeUnits } : {}),
      ...(options?.packageCount !== undefined
        ? { packageCount: options.packageCount }
        : {}),
      ...(options?.applicationType !== undefined
        ? { applicationType: options.applicationType }
        : {}),
      ...(options?.returnOption !== undefined
        ? { returnOption: options.returnOption }
        : {}),
      ...(options?.tariffPrepay !== undefined
        ? { tariffPrepay: options.tariffPrepay }
        : {}),
      ...(options?.insuranceOption !== undefined
        ? { insuranceOption: options.insuranceOption }
        : {}),
      ...(options?.iossNumber ? { iossNumber: options.iossNumber } : {}),
    },
  };
}

function resolveDirectOrderDestinationCountry(
  order: NonNullable<Awaited<ReturnType<typeof getDirectShipOrderPreparation>>>,
  options?: ExecuteShipmentInput["options"],
) {
  return (
    options?.receiverCountryCode ??
    jsonString(order.recipientAddress, "country") ??
    order.destinationCountry ??
    null
  );
}

function buildCarrierShipmentItemInput(
  item: NonNullable<
    Awaited<ReturnType<typeof getShipmentCarrierPreparation>>
  >["items"][number],
  override: ShipParcelOverride | undefined,
) {
  return {
    shipmentItemId: item.id,
    orderItemId: item.orderItemId,
    externalItemId: item.orderItem.externalItemId,
    sku: item.orderItem.sku,
    name: item.orderItem.title ?? item.orderItem.name,
    quantity: item.quantity,
    weight: override?.unitWeight ?? decimalToNumber(item.orderItem.weight),
    declaredValue:
      override?.unitPrice ?? decimalToNumber(item.orderItem.declaredValue),
    eName: override?.eName,
    cName: override?.cName,
    currencyCode: override?.currencyCode,
    invoicePart: override?.invoicePart,
    invoiceUsage: override?.invoiceUsage,
    remark: override?.remark,
  };
}

function buildCarrierShipmentItemInputFromOrderItem(
  item: NonNullable<
    Awaited<ReturnType<typeof getDirectShipOrderPreparation>>
  >["items"][number],
  override: ShipParcelOverride | undefined,
) {
  return {
    shipmentItemId: item.id,
    orderItemId: item.id,
    externalItemId: item.externalItemId,
    sku: item.sku,
    name: item.title ?? item.name,
    quantity: item.quantity,
    weight: override?.unitWeight ?? decimalToNumber(item.weight),
    declaredValue: override?.unitPrice ?? decimalToNumber(item.declaredValue),
    eName: override?.eName,
    cName: override?.cName,
    currencyCode: override?.currencyCode,
    invoicePart: override?.invoicePart,
    invoiceUsage: override?.invoiceUsage,
    remark: override?.remark,
  };
}

function jsonString(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim() ? field.trim() : undefined;
}

function readShipmentMetadataString(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim() ? field.trim() : undefined;
}

function buildReceiverNameOverride(
  options: ExecuteShipmentInput["options"] | undefined,
  fallbackName: string | null,
) {
  const overrideName = [options?.receiverFirstName, options?.receiverLastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return overrideName || fallbackName || undefined;
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

function applyYunEnvironmentOverride<T extends { payload: Record<string, unknown> }>(
  credentials: T,
  environment?: ShipmentYunEnvironment,
): T {
  if (!environment) {
    return credentials;
  }

  return {
    ...credentials,
    payload: {
      ...credentials.payload,
      baseUrl: environment === "live" ? YUN_LIVE_BASE_URL : YUN_TEST_BASE_URL,
      liveEnabled: true,
    },
  };
}

function readShipmentEnvironment(value: unknown): ShipmentYunEnvironment {
  const carrier =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>).carrier
      : undefined;
  const environment =
    typeof carrier === "object" && carrier !== null && !Array.isArray(carrier)
      ? (carrier as Record<string, unknown>).environmentMode
      : undefined;

  return environment === "live" ? "live" : "test";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}
