import {
  createCarrierError,
  CarrierIntegrationError,
} from "@/modules/carrier/errors";
import type {
  CarrierAdapter,
  CarrierAdapterContext,
  CreateCarrierShipmentInput,
} from "@/modules/carrier/types";
import {
  getYunExpressOmsConfig,
  validateYunExpressLiveConfig,
  type YunExpressOmsConfig,
} from "./config";
import { createYunExpressOmsAuthorizationHeader } from "./auth";
import {
  callYunExpressCreateOrderLabel,
  callYunExpressGetCarrier,
  callYunExpressGetTrackingNumber,
  callYunExpressGetTrackInfo,
} from "./client";
import { mapCreateShipmentToYunExpressPayload } from "./mapping";
import {
  mergeCarrierProvider,
  normalizeCreateOrderLabelResponse,
  normalizeGetCarrierResponse,
  normalizeGetTrackingNumberResponse,
  normalizeTrackInfoResponse,
} from "./normalize";

type AdapterOptions = {
  config?: YunExpressOmsConfig;
  fetchImpl?: typeof fetch;
};

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
      await assertCanCreateShipment(input, context);

      const config = getConfig(context);
      const missing = validateYunExpressLiveConfig(config);
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
      const response = await callYunExpressCreateOrderLabel({
        config: {
          ...config,
          baseUrl: config.baseUrl,
          customerNo: config.customerNo,
          apiSecret: config.apiSecret,
        },
        authorizationHeader: createYunExpressOmsAuthorizationHeader({
          customerNo: config.customerNo,
          apiSecret: config.apiSecret,
        }),
        payload: [payload],
        fetchImpl: options.fetchImpl,
      });

      return normalizeCreateOrderLabelResponse(response);
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

      if (!orderNumber && input.customerOrderNumber) {
        const trackingNumberResponse = await callYunExpressGetTrackingNumber({
          config: {
            baseUrl: config.baseUrl,
            lang: config.lang,
            timeoutMs: config.timeoutMs,
          },
          customerOrderNumber: input.customerOrderNumber,
          fetchImpl: options.fetchImpl,
        });
        trackingNumberStatus = normalizeGetTrackingNumberResponse(
          trackingNumberResponse,
        );
        carrierShipmentId = trackingNumberStatus.carrierShipmentId ?? carrierShipmentId;
        trackingNumber = trackingNumberStatus.trackingNumber ?? trackingNumber;
        orderNumber = carrierShipmentId ?? trackingNumber ?? null;
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
    async cancelShipment() {
      throw new CarrierIntegrationError(
        notSupported("YunExpress OMS cancel shipment is not implemented."),
      );
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

function notSupported(message: string) {
  return createCarrierError({
    carrierCode: "YUNEXPRESS_OMS",
    reason: "NOT_SUPPORTED",
    message,
    retryable: false,
    statusCode: 501,
  });
}
