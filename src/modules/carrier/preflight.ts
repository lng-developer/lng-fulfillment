import {
  getYunExpressOmsConfig,
  validateYunExpressLiveConfig,
} from "@/integrations/yunexpress-oms/config";
import { mapCreateShipmentToYunExpressPayload } from "@/integrations/yunexpress-oms/mapping";
import { AppError } from "@/shared/errors";
import { getCarrierCredentialRuntimeStatus } from "./service";
import {
  hasCarrierAdapter,
  isKnownCarrierCode,
  normalizeCarrierCode,
} from "./registry";
import type {
  CarrierAdapterContext,
  CarrierCode,
  CarrierShipmentPreflightResult,
  CreateCarrierShipmentInput,
} from "./types";

export async function preflightCarrierShipmentCreation(
  input: CreateCarrierShipmentInput,
  context: CarrierAdapterContext,
): Promise<CarrierShipmentPreflightResult> {
  const carrierCode = normalizeCarrierCode(input.carrierCode);

  if (!isKnownCarrierCode(carrierCode)) {
    throw new AppError("CARRIER_ERROR", "Carrier is not supported.", 400, {
      carrierCode,
    });
  }

  if (!hasCarrierAdapter(carrierCode)) {
    throw new AppError("CARRIER_ERROR", "Carrier adapter is not implemented.", 501, {
      carrierCode,
      retryable: false,
    });
  }

  if (carrierCode !== "YUNEXPRESS_OMS") {
    throw new AppError("CARRIER_ERROR", "Carrier preflight is not supported.", 501, {
      carrierCode,
      retryable: false,
    });
  }

  return preflightYunExpressOms(input, carrierCode, context);
}

async function preflightYunExpressOms(
  input: CreateCarrierShipmentInput,
  carrierCode: CarrierCode,
  context: CarrierAdapterContext,
): Promise<CarrierShipmentPreflightResult> {
  const credentialStatus = await getCarrierCredentialRuntimeStatus(
    context.tenantId,
    carrierCode,
    input.carrierAccountId,
  );
  const runtimePayload = credentialStatus.runtimeCredentials?.payload;
  const envConfig = getYunExpressOmsConfig();
  const config = runtimePayload
    ? {
        baseUrl:
          typeof runtimePayload.baseUrl === "string"
            ? runtimePayload.baseUrl
            : envConfig.baseUrl,
        customerNo:
          typeof runtimePayload.customerNo === "string"
            ? runtimePayload.customerNo
            : envConfig.customerNo,
        apiSecret:
          typeof runtimePayload.apiSecret === "string"
            ? runtimePayload.apiSecret
            : envConfig.apiSecret,
        lang:
          typeof runtimePayload.lang === "string" ? runtimePayload.lang : envConfig.lang,
        liveEnabled:
          typeof runtimePayload.liveEnabled === "boolean"
            ? runtimePayload.liveEnabled
            : envConfig.liveEnabled,
        defaultShippingMethodCode:
          typeof runtimePayload.defaultShippingMethodCode === "string"
            ? runtimePayload.defaultShippingMethodCode
            : envConfig.defaultShippingMethodCode,
        defaultSourceCode:
          typeof runtimePayload.defaultSourceCode === "string"
            ? runtimePayload.defaultSourceCode
            : envConfig.defaultSourceCode,
        defaultSizeUnit:
          typeof runtimePayload.defaultSizeUnit === "string"
            ? runtimePayload.defaultSizeUnit
            : envConfig.defaultSizeUnit,
        timeoutMs:
          typeof runtimePayload.timeoutMs === "number"
            ? runtimePayload.timeoutMs
            : envConfig.timeoutMs,
      }
    : envConfig;
  const payload = mapCreateShipmentToYunExpressPayload(input, config);
  const missingEnv = validateYunExpressLiveConfig(config);
  const warnings: string[] = [...credentialStatus.warnings];

  if (!config.liveEnabled) {
    warnings.push("Live YunExpress OMS shipment creation is disabled.");
  }

  if (!credentialStatus.credentialConfigured) {
    for (const envName of missingEnv) {
      warnings.push(`${envName} is missing.`);
    }
  }

  if (!payload.Receiver.CountryCode) {
    warnings.push("Receiver country is missing.");
  }

  if (payload.Parcels.some((parcel) => parcel.UnitWeight <= 0)) {
    warnings.push("One or more parcel weights are using carrier mapping defaults.");
  }

  return {
    carrierCode,
    credentialSource: credentialStatus.credentialSource,
    credentialConfigured: credentialStatus.credentialConfigured,
    liveEnabled: config.liveEnabled,
    env: {
      baseUrlPresent: Boolean(config.baseUrl),
      customerNoPresent: Boolean(config.customerNo),
      apiSecretPresent: Boolean(config.apiSecret),
      defaultShippingMethodCode: config.defaultShippingMethodCode,
    },
    mappingPreview: {
      customerOrderNumber: payload.CustomerOrderNumber,
      shippingMethodCode: payload.ShippingMethodCode,
      receiver: {
        country: payload.Receiver.CountryCode ?? null,
        state: payload.Receiver.State ?? null,
        city: payload.Receiver.City ?? null,
        postalCode: payload.Receiver.Zip ?? null,
      },
      package: {
        weight: payload.Weight,
        length: payload.Length,
        width: payload.Width,
        height: payload.Height,
        packageCount: payload.PackageCount,
      },
      parcels: payload.Parcels.map((parcel) => ({
        sku: parcel.SKU ?? null,
        eName: parcel.EName,
        cName: parcel.CName,
        quantity: parcel.Quantity,
        unitWeight: parcel.UnitWeight,
        unitPrice: parcel.UnitPrice,
      })),
      sourceCode: payload.SourceCode,
    },
    warnings,
  };
}
