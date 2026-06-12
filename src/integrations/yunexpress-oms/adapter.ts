import {
  createCarrierError,
  CarrierIntegrationError,
} from "@/modules/carrier/errors";
import type {
  CarrierAdapter,
  CarrierAdapterContext,
  CreateCarrierShipmentInput,
  CreateCarrierShipmentResult,
} from "@/modules/carrier/types";
import {
  getYunExpressOmsConfig,
  validateYunExpressLiveConfig,
  type YunExpressOmsConfig,
} from "./config";
import { createYunExpressOmsAuthorizationHeader } from "./auth";
import { createSafeTimingLogger } from "@/shared/timing";
import {
  callYunExpressCreateOrderLabel,
  callYunExpressDeleteOrder,
  callYunExpressGetCarrier,
  callYunExpressGetOrder,
  callYunExpressGetTrackingNumber,
  callYunExpressGetTrackInfo,
  callYunExpressPrintLabel,
} from "./client";
import { mapCreateShipmentToYunExpressPayload } from "./mapping";
import {
  isExistingOrderCreateOrderLabelResponse,
  mergeCarrierProvider,
  normalizeCreateOrderLabelResponse,
  normalizeDeleteOrderResponse,
  normalizeExistingOrderRecoveryResult,
  normalizeGetCarrierResponse,
  normalizeGetTrackingNumberResponse,
  normalizeTrackInfoResponse,
} from "./normalize";
import type {
  YunExpressCreateOrderLabelResponse,
  YunExpressGetOrderResponse,
  YunExpressGetTrackingNumberResponse,
  YunExpressOrderItem,
  YunExpressPrintLabelResponse,
} from "./types";

type AdapterOptions = {
  config?: YunExpressOmsConfig;
  fetchImpl?: typeof fetch;
};

const TRACKING_POLL_ATTEMPTS = 2;
const TRACKING_POLL_DELAY_MS = 5000;

export function createYunExpressOmsAdapter(
  options: AdapterOptions = {},
): CarrierAdapter {
  function getConfig(context?: CarrierAdapterContext): YunExpressOmsConfig {
    const runtimePayload = context?.credentials?.payload;

    if (runtimePayload) {
      const envFallback = options.config ?? getYunExpressOmsConfig();
      return {
        baseUrl:
          typeof runtimePayload.baseUrl === "string"
            ? runtimePayload.baseUrl
            : envFallback.baseUrl,
        customerNo:
          typeof runtimePayload.customerNo === "string"
            ? runtimePayload.customerNo
            : envFallback.customerNo,
        apiSecret:
          typeof runtimePayload.apiSecret === "string"
            ? runtimePayload.apiSecret
            : envFallback.apiSecret,
        lang:
          typeof runtimePayload.lang === "string"
            ? runtimePayload.lang
            : envFallback.lang,
        liveEnabled:
          typeof runtimePayload.liveEnabled === "boolean"
            ? runtimePayload.liveEnabled
            : envFallback.liveEnabled,
        defaultShippingMethodCode:
          typeof runtimePayload.defaultShippingMethodCode === "string"
            ? runtimePayload.defaultShippingMethodCode
            : envFallback.defaultShippingMethodCode,
        defaultSourceCode:
          typeof runtimePayload.defaultSourceCode === "string"
            ? runtimePayload.defaultSourceCode
            : envFallback.defaultSourceCode,
        defaultSizeUnit:
          typeof runtimePayload.defaultSizeUnit === "string"
            ? runtimePayload.defaultSizeUnit
            : envFallback.defaultSizeUnit,
        timeoutMs:
          typeof runtimePayload.timeoutMs === "number"
            ? runtimePayload.timeoutMs
            : envFallback.timeoutMs,
      };
    }

    return options.config ?? getYunExpressOmsConfig();
  }

  async function assertCanCreateShipment(
    input: CreateCarrierShipmentInput,
    context: CarrierAdapterContext,
  ) {
    void input;
    const config = getConfig(context);

    if (!config.liveEnabled) {
      throw new CarrierIntegrationError(
        createCarrierError({
          carrierCode: "YUNEXPRESS_OMS",
          reason: "NOT_SUPPORTED",
          message: "YunExpress OMS live shipment creation is disabled.",
          retryable: false,
          statusCode: 501,
          safeMetadata: {
            liveEnabled: false,
            credentialSource: context.credentials?.source ?? "envFallback",
          },
        }),
      );
    }

    const missing = validateYunExpressLiveConfig(config);
    if (missing.length > 0) {
      throw new CarrierIntegrationError(
        createCarrierError({
          carrierCode: "YUNEXPRESS_OMS",
          reason: "AUTHENTICATION_FAILED",
          message: "YunExpress OMS configuration is incomplete.",
          retryable: false,
          statusCode: 503,
          safeMetadata: {
            missing,
          },
        }),
      );
    }
  }

  return {
    carrierCode: "YUNEXPRESS_OMS",
    assertCanCreateShipment,
    async createShipment(
      input: CreateCarrierShipmentInput,
      context: CarrierAdapterContext,
    ) {
      const timing = createSafeTimingLogger("yunExpressOmsAdapter.createShipment", {
        carrierCode: "YUNEXPRESS_OMS",
      });
      await assertCanCreateShipment(input, context);
      timing("asserted");

      const config = getConfig(context);
      const missing = validateYunExpressLiveConfig(config);
      timing("configResolved", {
        missingCount: missing.length,
      });
      if (missing.length > 0 || !config.baseUrl || !config.customerNo || !config.apiSecret) {
        throw new CarrierIntegrationError(
          createCarrierError({
            carrierCode: "YUNEXPRESS_OMS",
            reason: "AUTHENTICATION_FAILED",
            message: "YunExpress OMS configuration is incomplete.",
            retryable: false,
            statusCode: 503,
            safeMetadata: {
              missing,
            },
          }),
        );
      }

      const payload = mapCreateShipmentToYunExpressPayload(input, config);
      timing("payloadMapped", {
        parcelCount: payload.Parcels.length,
      });
      const authorizationHeader = createYunExpressOmsAuthorizationHeader({
        customerNo: config.customerNo,
        apiSecret: config.apiSecret,
      });
      timing("authorizationPrepared");
      const response = await callYunExpressCreateOrderLabel({
        config: {
          ...config,
          baseUrl: config.baseUrl,
          customerNo: config.customerNo,
          apiSecret: config.apiSecret,
        },
        authorizationHeader,
        payload: [payload],
        fetchImpl: options.fetchImpl,
      });
      logSafeCreateOrderLabelResponse(response);
      timing("clientReturned");

      const normalized = isExistingOrderCreateOrderLabelResponse(response)
        ? await recoverExistingYunOrder({
            config: {
              ...config,
              baseUrl: config.baseUrl,
              customerNo: config.customerNo,
              apiSecret: config.apiSecret,
            },
            response,
            customerOrderNumber: payload.CustomerOrderNumber,
            authorizationHeader,
            fetchImpl: options.fetchImpl,
            timing,
          })
        : normalizeCreateOrderLabelResponse(response);
      const normalizedWithTracking = await enrichCreateResultWithTrackingNumber({
        config: {
          ...config,
          baseUrl: config.baseUrl,
          customerNo: config.customerNo,
          apiSecret: config.apiSecret,
        },
        result: normalized,
        customerOrderNumber: payload.CustomerOrderNumber,
        authorizationHeader,
        fetchImpl: options.fetchImpl,
      });
      logSafeCarrierCreateResult(normalizedWithTracking);
      timing("responseNormalized", {
        trackingPresent: Boolean(normalizedWithTracking.trackingNumber),
        labelPresent: Boolean(normalized.labelUrl),
      });
      return normalizedWithTracking;
    },
    async getLabel() {
      throw new CarrierIntegrationError(
        notSupported("YunExpress OMS get label is not implemented."),
      );
    },
    async getTracking(input, context) {
      const config = getConfig(context);
      if (!config.baseUrl) {
        throw new CarrierIntegrationError(
          createCarrierError({
            carrierCode: "YUNEXPRESS_OMS",
            reason: "AUTHENTICATION_FAILED",
            message: "YunExpress OMS tracking configuration is incomplete.",
            retryable: false,
            statusCode: 503,
            safeMetadata: {
              missing: ["YUN_OMS_BASE_URL"],
              credentialSource: context.credentials?.source ?? "envFallback",
            },
          }),
        );
      }

      let carrierShipmentId = input.carrierShipmentId ?? null;
      let trackingNumber = input.trackingNumber ?? null;
      let orderNumber = carrierShipmentId ?? trackingNumber ?? null;
      let trackingNumberStatus:
        | ReturnType<typeof normalizeGetTrackingNumberResponse>
        | undefined;

      if (!trackingNumber && input.customerOrderNumber) {
        const authorizationHeader =
          config.customerNo && config.apiSecret
            ? createYunExpressOmsAuthorizationHeader({
                customerNo: config.customerNo,
                apiSecret: config.apiSecret,
              })
            : undefined;
        const trackingNumberResponse = await callYunExpressGetTrackingNumber({
          config: {
            baseUrl: config.baseUrl,
            lang: config.lang,
            timeoutMs: config.timeoutMs,
          },
          customerOrderNumber: input.customerOrderNumber,
          authorizationHeader,
          fetchImpl: options.fetchImpl,
        });
        trackingNumberStatus = normalizeGetTrackingNumberResponse(
          trackingNumberResponse,
        );
        carrierShipmentId = trackingNumberStatus.carrierShipmentId ?? carrierShipmentId;
        trackingNumber = trackingNumberStatus.trackingNumber ?? trackingNumber;
        orderNumber = carrierShipmentId ?? trackingNumber ?? null;

        if (!trackingNumber) {
          try {
            const getOrderResponse = await callYunExpressGetOrder({
              config: {
                baseUrl: config.baseUrl,
                lang: config.lang,
                timeoutMs: config.timeoutMs,
              },
              orderNumber: input.customerOrderNumber,
              authorizationHeader,
              fetchImpl: options.fetchImpl,
            });
            logSafeGetOrderResponse(getOrderResponse);
            carrierShipmentId =
              carrierShipmentId ??
              safeString(getOrderResponse.Item?.WayBillNumber) ??
              safeString(getOrderResponse.Item?.OrderNumber);
            trackingNumber =
              safeString(getOrderResponse.Item?.TrackingNumber) ?? trackingNumber;
            orderNumber = carrierShipmentId ?? trackingNumber ?? null;
          } catch {
            trackingNumberStatus = {
              ...trackingNumberStatus,
              safeMetadata: {
                ...(trackingNumberStatus?.safeMetadata ?? {}),
                getOrderTrackingLookupFailed: true,
              },
            } as typeof trackingNumberStatus;
          }
        }
      }

      if (!orderNumber) {
        if (trackingNumberStatus) {
          return {
            carrierCode: "YUNEXPRESS_OMS",
            carrierShipmentId,
            trackingNumber,
            status: trackingNumberStatus.status,
            packageState: null,
            trackingStatus: null,
            provider: null,
            events: [],
            latestEvent: null,
            errors: trackingNumberStatus.errors,
            metadata: {
              safe: trackingNumberStatus.safeMetadata,
            },
          };
        }

        throw new CarrierIntegrationError(
          createCarrierError({
            carrierCode: "YUNEXPRESS_OMS",
            reason: "VALIDATION_FAILED",
            message: "Tracking lookup requires a waybill, tracking number, or customer order number.",
            retryable: false,
            statusCode: 400,
          }),
        );
      }

      const trackInfoResponse = await callYunExpressGetTrackInfo({
        config: {
          baseUrl: config.baseUrl,
          lang: config.lang,
          timeoutMs: config.timeoutMs,
        },
        orderNumber,
        allInfo: true,
        fetchImpl: options.fetchImpl,
      });
      let tracking = normalizeTrackInfoResponse(trackInfoResponse, {
        carrierShipmentId,
        trackingNumber,
      });

      try {
        const carrierResponse = await callYunExpressGetCarrier({
          config: {
            baseUrl: config.baseUrl,
            lang: config.lang,
            timeoutMs: config.timeoutMs,
          },
          orderNumbers: [orderNumber],
          fetchImpl: options.fetchImpl,
        });
        tracking = mergeCarrierProvider(
          tracking,
          normalizeGetCarrierResponse(carrierResponse),
        );
      } catch {
        tracking = {
          ...tracking,
          metadata: {
            safe: {
              ...(tracking.metadata?.safe ?? {}),
              carrierProviderLookupFailed: true,
            },
          },
        };
      }

      if (trackingNumberStatus) {
        tracking = {
          ...tracking,
          errors: [
            ...(tracking.errors ?? []),
            ...(trackingNumberStatus.errors ?? []),
          ],
          metadata: {
            safe: {
              ...(tracking.metadata?.safe ?? {}),
              ...trackingNumberStatus.safeMetadata,
            },
          },
        };
      }

      return tracking;
    },
    async cancelShipment(input, context) {
      const timing = createSafeTimingLogger("yunExpressOmsAdapter.cancelShipment", {
        carrierCode: "YUNEXPRESS_OMS",
      });
      const config = getConfig(context);
      const missing = validateYunExpressLiveConfig(config);
      timing("configResolved", {
        missingCount: missing.length,
      });
      if (missing.length > 0 || !config.baseUrl || !config.customerNo || !config.apiSecret) {
        throw new CarrierIntegrationError(
          createCarrierError({
            carrierCode: "YUNEXPRESS_OMS",
            reason: "AUTHENTICATION_FAILED",
            message: "YunExpress OMS cancel configuration is incomplete.",
            retryable: false,
            statusCode: 503,
            safeMetadata: {
              missing,
              credentialSource: context.credentials?.source ?? "envFallback",
            },
          }),
        );
      }

      const authorizationHeader = createYunExpressOmsAuthorizationHeader({
        customerNo: config.customerNo,
        apiSecret: config.apiSecret,
      });
      timing("authorizationPrepared");
      const response = await callYunExpressDeleteOrder({
        config: {
          baseUrl: config.baseUrl,
          customerNo: config.customerNo,
          apiSecret: config.apiSecret,
          lang: config.lang,
          timeoutMs: config.timeoutMs,
        },
        authorizationHeader,
        orderNumber: input.carrierShipmentId,
        orderType: 1,
        fetchImpl: options.fetchImpl,
      });
      timing("clientReturned");

      const normalized = normalizeDeleteOrderResponse(response);
      timing("responseNormalized", {
        carrierShipmentIdPresent: Boolean(normalized.carrierShipmentId),
      });
      return normalized;
    },
    async updateWeight() {
      throw new CarrierIntegrationError(
        notSupported("YunExpress OMS update weight is not implemented."),
      );
    },
    async estimateRate() {
      throw new CarrierIntegrationError(
        notSupported("YunExpress OMS rate estimate is not implemented."),
      );
    },
  };
}

async function recoverExistingYunOrder(input: {
  config: YunExpressOmsConfig & {
    baseUrl: string;
    customerNo: string;
    apiSecret: string;
  };
  response: YunExpressCreateOrderLabelResponse;
  customerOrderNumber: string;
  authorizationHeader: string;
  fetchImpl?: typeof fetch;
  timing: ReturnType<typeof createSafeTimingLogger>;
}) {
  input.timing("existingOrderRecoveryStarted");
  const getOrderResponse = await callYunExpressGetOrder({
    config: {
      baseUrl: input.config.baseUrl,
      lang: input.config.lang,
      timeoutMs: input.config.timeoutMs,
    },
    orderNumber: input.customerOrderNumber,
    authorizationHeader: input.authorizationHeader,
    fetchImpl: input.fetchImpl,
  });
  input.timing("existingOrderLookupCompleted", {
    found: Boolean(getOrderResponse.Item),
  });

  const labelLookupNumber = getLabelLookupNumber(
    getOrderResponse.Item ?? null,
    input.customerOrderNumber,
  );
  const printLabelResponse = labelLookupNumber
    ? await printExistingYunLabelSafely({
        config: input.config,
        orderNumber: labelLookupNumber,
        authorizationHeader: input.authorizationHeader,
        fetchImpl: input.fetchImpl,
        timing: input.timing,
      })
    : null;

  const normalized = normalizeExistingOrderRecoveryResult({
    createOrderLabelResponse: input.response,
    getOrderResponse,
    printLabelResponse,
  });
  input.timing("existingOrderRecovered", {
    trackingPresent: Boolean(normalized.trackingNumber),
    labelPresent: Boolean(normalized.labelUrl),
  });

  return normalized;
}

async function printExistingYunLabelSafely(input: {
  config: YunExpressOmsConfig & { baseUrl: string };
  orderNumber: string;
  authorizationHeader: string;
  fetchImpl?: typeof fetch;
  timing: ReturnType<typeof createSafeTimingLogger>;
}): Promise<YunExpressPrintLabelResponse | null> {
  try {
    const response = await callYunExpressPrintLabel({
      config: {
        baseUrl: input.config.baseUrl,
        lang: input.config.lang,
        timeoutMs: input.config.timeoutMs,
      },
      orderNumbers: [input.orderNumber],
      authorizationHeader: input.authorizationHeader,
      fetchImpl: input.fetchImpl,
    });
    input.timing("existingLabelLookupCompleted", {
      labelPresent: Boolean(response.Item?.[0]?.Url),
    });
    return response;
  } catch (error) {
    input.timing("existingLabelLookupFailed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return null;
  }
}

function getLabelLookupNumber(
  item: YunExpressOrderItem | null,
  fallback: string,
) {
  return (
    safeString(item?.WayBillNumber) ??
    safeString(item?.TrackingNumber) ??
    safeString(item?.OrderNumber) ??
    safeString(item?.CustomerOrderNumber) ??
    fallback
  );
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function logSafeCreateOrderLabelResponse(
  response: YunExpressCreateOrderLabelResponse,
) {
  if (!isShipmentTrackingFlowDebugEnabled()) {
    return;
  }

  console.info("[yun-create-order-label-response]", {
    Code: response.Code ?? null,
    Message: response.Message ?? null,
    Item: (response.Item ?? []).map((item) => ({
      CustomerOrderNumber: item.CustomerOrderNumber ?? null,
      Success: item.Success ?? null,
      TrackType: item.TrackType ?? null,
      Remark: item.Remark ?? null,
      WayBillNumber: item.WayBillNumber ?? null,
      TrackingNumber: item.TrackingNumber ?? null,
      Label: item.Label
        ? {
            LabelType: item.Label.LabelType ?? null,
            UrlPresent: Boolean(item.Label.Url),
            LabelStringPresent: Boolean(item.Label.LabelString),
            OrderInfos: (item.Label.OrderInfos ?? []).map((orderInfo) => ({
              CustomerOrderNumber: orderInfo.CustomerOrderNumber ?? null,
              Code: orderInfo.Code ?? null,
              Error: orderInfo.Error ?? null,
            })),
          }
        : null,
    })),
  });
}

function logSafeGetTrackingNumberResponse(
  response: YunExpressGetTrackingNumberResponse,
) {
  if (!isShipmentTrackingFlowDebugEnabled()) {
    return;
  }

  console.info("[yun-get-tracking-number-response]", {
    Code: response.Code ?? null,
    Message: response.Message ?? null,
    Items: (response.Items ?? []).map((item) => ({
      CustomerOrderNumber: item.CustomerOrderNumber ?? null,
      WayBillNumber: item.WayBillNumber ?? null,
      TrackingNumber: item.TrackingNumber ?? null,
      Status: item.Status ?? null,
      Remark: item.Remark ?? null,
      ChildTrackingCount: Array.isArray(item.ChildTrackings)
        ? item.ChildTrackings.length
        : null,
    })),
  });
}

function logSafeGetOrderResponse(response: YunExpressGetOrderResponse) {
  if (!isShipmentTrackingFlowDebugEnabled()) {
    return;
  }

  console.info("[yun-get-order-response]", {
    Code: response.Code ?? null,
    Message: response.Message ?? null,
    Item: response.Item
      ? {
          OrderNumber: response.Item.OrderNumber ?? null,
          CustomerOrderNumber: response.Item.CustomerOrderNumber ?? null,
          WayBillNumber: response.Item.WayBillNumber ?? null,
          TrackingNumber: response.Item.TrackingNumber ?? null,
          Status: response.Item.Status ?? null,
        }
      : null,
  });
}

function logSafeCarrierCreateResult(result: CreateCarrierShipmentResult) {
  if (!isShipmentTrackingFlowDebugEnabled()) {
    return;
  }

  console.info("[yun-create-shipment-normalized-result]", {
    carrierCode: result.carrierCode,
    carrierShipmentId: result.carrierShipmentId,
    trackingNumber: result.trackingNumber ?? null,
    labelUrlPresent: Boolean(result.labelUrl),
    safeMetadata: result.metadata?.safe ?? null,
  });
}

function isShipmentTrackingFlowDebugEnabled() {
  return (
    process.env.SHIPMENT_TRACKING_FLOW_DEBUG === "true" ||
    process.env.YUN_OMS_DEBUG_CREATE_ORDER_LABEL_RESPONSE === "true"
  );
}

async function enrichCreateResultWithTrackingNumber(input: {
  config: YunExpressOmsConfig & {
    baseUrl: string;
    customerNo: string;
    apiSecret: string;
  };
  result: CreateCarrierShipmentResult;
  customerOrderNumber: string;
  authorizationHeader: string;
  fetchImpl?: typeof fetch;
}): Promise<CreateCarrierShipmentResult> {
  if (input.result.trackingNumber) {
    return input.result;
  }

  let result = input.result;

  for (let attempt = 1; attempt <= TRACKING_POLL_ATTEMPTS; attempt += 1) {
    await sleep(TRACKING_POLL_DELAY_MS);

    result = await lookupTrackingNumberAfterCreate({
      ...input,
      result,
      attempt,
    });

    if (result.trackingNumber) {
      return result;
    }

    result = await lookupOrderTrackingAfterCreate({
      ...input,
      result,
      attempt,
    });

    if (result.trackingNumber) {
      return result;
    }
  }

  return {
    ...result,
    metadata: {
      ...result.metadata,
      safe: {
        ...(result.metadata?.safe ?? {}),
        trackingPendingAfterPoll: true,
        trackingPollAttempts: TRACKING_POLL_ATTEMPTS,
      },
    },
  };
}

async function lookupTrackingNumberAfterCreate(input: {
  config: YunExpressOmsConfig & { baseUrl: string };
  result: CreateCarrierShipmentResult;
  customerOrderNumber: string;
  authorizationHeader: string;
  fetchImpl?: typeof fetch;
  attempt: number;
}): Promise<CreateCarrierShipmentResult> {
  try {
    const response = await callYunExpressGetTrackingNumber({
      config: {
        baseUrl: input.config.baseUrl,
        lang: input.config.lang,
        timeoutMs: input.config.timeoutMs,
      },
      customerOrderNumber: input.customerOrderNumber,
      authorizationHeader: input.authorizationHeader,
      fetchImpl: input.fetchImpl,
    });
    logSafeGetTrackingNumberResponse(response);
    const trackingNumberStatus = normalizeGetTrackingNumberResponse(response);

    return {
      ...input.result,
      carrierShipmentId:
        input.result.carrierShipmentId ||
        trackingNumberStatus.carrierShipmentId ||
        "",
      trackingNumber: trackingNumberStatus.trackingNumber ?? null,
      metadata: {
        ...input.result.metadata,
        safe: {
          ...(input.result.metadata?.safe ?? {}),
          trackingNumberLookupAttempted: true,
          trackingNumberLookupAttempt: input.attempt,
          trackingNumberLookupStatus:
            trackingNumberStatus.safeMetadata.trackingNumberStatus ?? null,
          trackingNumberLookupRemark:
            trackingNumberStatus.safeMetadata.trackingNumberRemark ?? null,
        },
      },
    };
  } catch {
    return {
      ...input.result,
      metadata: {
        ...input.result.metadata,
        safe: {
          ...(input.result.metadata?.safe ?? {}),
          trackingNumberLookupAttempted: true,
          trackingNumberLookupAttempt: input.attempt,
          trackingNumberLookupFailed: true,
        },
      },
    };
  }
}

async function lookupOrderTrackingAfterCreate(input: {
  config: YunExpressOmsConfig & { baseUrl: string };
  result: CreateCarrierShipmentResult;
  customerOrderNumber: string;
  authorizationHeader: string;
  fetchImpl?: typeof fetch;
  attempt: number;
}): Promise<CreateCarrierShipmentResult> {
  try {
    const response = await callYunExpressGetOrder({
      config: {
        baseUrl: input.config.baseUrl,
        lang: input.config.lang,
        timeoutMs: input.config.timeoutMs,
      },
      orderNumber: input.customerOrderNumber,
      authorizationHeader: input.authorizationHeader,
      fetchImpl: input.fetchImpl,
    });
    logSafeGetOrderResponse(response);

    const item = response.Item ?? null;
    const trackingNumber = safeString(item?.TrackingNumber);
    const carrierShipmentId =
      input.result.carrierShipmentId ||
      safeString(item?.WayBillNumber) ||
      safeString(item?.OrderNumber) ||
      "";

    return {
      ...input.result,
      carrierShipmentId,
      trackingNumber,
      metadata: {
        ...input.result.metadata,
        safe: {
          ...(input.result.metadata?.safe ?? {}),
          getOrderTrackingLookupAttempted: true,
          getOrderTrackingLookupAttempt: input.attempt,
          getOrderTrackingLookupFound: Boolean(trackingNumber),
          getOrderCode: response.Code ?? null,
          getOrderMessage: response.Message ?? null,
          getOrderStatus: safeScalarString(item?.Status),
        },
      },
    };
  } catch {
    return {
      ...input.result,
      metadata: {
        ...input.result.metadata,
        safe: {
          ...(input.result.metadata?.safe ?? {}),
          getOrderTrackingLookupAttempted: true,
          getOrderTrackingLookupAttempt: input.attempt,
          getOrderTrackingLookupFailed: true,
        },
      },
    };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeScalarString(value: unknown) {
  if (typeof value === "string") {
    return safeString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function notSupported(message: string) {
  return createCarrierError({
    carrierCode: "YUNEXPRESS_OMS",
    reason: "NOT_SUPPORTED",
    message,
    retryable: false,
    statusCode: 501,
  });
}
