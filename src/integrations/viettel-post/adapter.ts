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

type AdapterOptions = { fetchImpl?: typeof fetch };

type ViettelPostConfig = {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  orderUrl: string;
  lineShipId: string;
  shipFromFirstName: string;
  shipFromLastName: string;
  shipFromPhoneNumber: string;
  shipFromAddress1: string;
  shipFromCountry: string;
  shipFromState: string;
  shipFromCity: string;
  shipFromZipCode: string;
  liveEnabled: boolean;
};

export function createViettelPostAdapter(
  options: AdapterOptions = {},
): CarrierAdapter {
  const tokenCache = new Map<string, { token: string; expiresAt: number }>();
  async function assertCanCreateShipment(
    input: CreateCarrierShipmentInput,
    context: CarrierAdapterContext,
  ) {
    const config = getConfig(context);
    if (!config.liveEnabled) {
      throw carrierError("NOT_SUPPORTED", "Viettel Post shipment creation is disabled.", false, 501);
    }

    assertShipmentInput(input);
  }

  return {
    carrierCode: "VIETTEL_POST",
    assertCanCreateShipment,
    async createShipment(input, context) {
      await assertCanCreateShipment(input, context);
      const config = getConfig(context);
      const fetchImpl = options.fetchImpl ?? fetch;
      const token = await requestAccessToken(config, fetchImpl, tokenCache);
      const response = await fetchImpl(`${stripTrailingSlash(config.orderUrl)}/api/partner/order/shipment`, {
        method: "POST",
        headers: new Headers({
          authorization: `Bearer ${token}`,
          accept: "application/json",
          "content-type": "application/json",
        }),
        body: JSON.stringify(mapShipment(input, config)),
      });

      if (!response.ok) {
        throw carrierError("REMOTE_REJECTED", "Viettel Post rejected shipment creation.", false, response.status);
      }

      return normalizeCreateResponse(await readJson(response));
    },
    async getLabel() {
      throw notSupported("Viettel Post label retrieval is not implemented.");
    },
    async getTracking(input, context) {
      if (!input.carrierShipmentId) {
        throw carrierError("VALIDATION_FAILED", "Viettel Post tracking requires a shipment identifier.", false, 400);
      }
      const config = getConfig(context);
      const fetchImpl = options.fetchImpl ?? fetch;
      const token = await requestAccessToken(config, fetchImpl, tokenCache);
      const response = await fetchImpl(
        `${stripTrailingSlash(config.orderUrl)}/api/partner/order/shipment/${encodeURIComponent(input.carrierShipmentId)}`,
        { headers: new Headers({ authorization: `Bearer ${token}`, accept: "application/json" }) },
      );
      if (!response.ok) {
        throw carrierError("REMOTE_REJECTED", "Viettel Post rejected shipment detail lookup.", false, response.status);
      }
      return normalizeTrackingResponse(await readJson(response), input.carrierShipmentId);
    },
    async cancelShipment() {
      throw notSupported("Viettel Post shipment cancellation is not implemented.");
    },
    async updateWeight() {
      throw notSupported("Viettel Post shipment weight update is not implemented.");
    },
    async estimateRate() {
      throw notSupported("Viettel Post rate estimation is not implemented.");
    },
  };
}

function getConfig(context: CarrierAdapterContext): ViettelPostConfig {
  const payload = context.credentials?.payload;
  if (!payload) {
    throw carrierError("AUTHENTICATION_FAILED", "Viettel Post credential is not configured.", false, 503);
  }

  const fields = [
    "clientId", "clientSecret", "authUrl", "orderUrl", "lineShipId",
    "shipFromFirstName", "shipFromLastName", "shipFromPhoneNumber", "shipFromAddress1",
    "shipFromCountry", "shipFromState", "shipFromCity", "shipFromZipCode",
  ] as const;
  const missing = fields.filter((field) => !stringValue(payload[field]));
  if (missing.length > 0) {
    throw carrierError("AUTHENTICATION_FAILED", "Viettel Post credential is incomplete.", false, 503, { missing });
  }

  return {
    clientId: stringValue(payload.clientId)!,
    clientSecret: stringValue(payload.clientSecret)!,
    authUrl: stringValue(payload.authUrl)!,
    orderUrl: stringValue(payload.orderUrl)!,
    lineShipId: stringValue(payload.lineShipId)!,
    shipFromFirstName: stringValue(payload.shipFromFirstName)!,
    shipFromLastName: stringValue(payload.shipFromLastName)!,
    shipFromPhoneNumber: stringValue(payload.shipFromPhoneNumber)!,
    shipFromAddress1: stringValue(payload.shipFromAddress1)!,
    shipFromCountry: stringValue(payload.shipFromCountry)!,
    shipFromState: stringValue(payload.shipFromState)!,
    shipFromCity: stringValue(payload.shipFromCity)!,
    shipFromZipCode: stringValue(payload.shipFromZipCode)!,
    liveEnabled: payload.liveEnabled === true,
  };
}

function assertShipmentInput(input: CreateCarrierShipmentInput) {
  const dimensions = ["weight", "length", "width", "height"] as const;
  const missing: string[] = dimensions.filter((field) => !positiveNumber(input.metadata?.[field]));
  if (!stringValue(input.metadata?.hsCode)) missing.push("hsCode");
  if (!input.recipient?.name || !input.recipient.phone || !input.recipient.line1 || !input.recipient.country) {
    missing.push("recipient");
  }
  if (input.items.some((item) => !positiveNumber(item.weight) || !positiveNumber(item.declaredValue))) {
    missing.push("itemWeightOrDeclaredValue");
  }
  if (missing.length > 0) {
    throw carrierError("VALIDATION_FAILED", "Viettel Post shipment data is incomplete.", false, 400, { missing });
  }
}

async function requestAccessToken(
  config: ViettelPostConfig,
  fetchImpl: typeof fetch,
  tokenCache: Map<string, { token: string; expiresAt: number }>,
) {
  const cacheKey = `${config.authUrl}\u0000${config.clientId}\u0000${config.clientSecret}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const response = await fetchImpl(config.authUrl, {
    method: "POST",
    headers: new Headers({ accept: "application/json", "content-type": "application/x-www-form-urlencoded" }),
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });
  const body = await readJson(response);
  const token = isRecord(body) ? stringValue(body.access_token) : undefined;
  if (!response.ok || !token) {
    throw carrierError("AUTHENTICATION_FAILED", "Viettel Post authentication failed.", false, response.status || 502);
  }
  const expiresIn = isRecord(body) && typeof body.expires_in === "number" ? body.expires_in : 300;
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + Math.max(1, expiresIn - 30) * 1000,
  });
  return token;
}

function mapShipment(input: CreateCarrierShipmentInput, config: ViettelPostConfig) {
  const recipient = input.recipient!;
  const [firstName, ...lastNameParts] = recipient.name!.trim().split(/\s+/);
  return {
    lineShipId: config.lineShipId,
    parcel: {
      weight: Math.round(Number(input.metadata!.weight) * 1000),
      length: Number(input.metadata!.length),
      width: Number(input.metadata!.width),
      height: Number(input.metadata!.height),
      weightUnit: 2,
      lengthUnit: 1,
      labelDate: new Date().toISOString(),
      labelFormat: 0,
      invoiceNumber: input.externalOrderId,
    },
    orderReferenceId: input.externalOrderId,
    hsCode: stringValue(input.metadata!.hsCode),
    lineItems: input.items.map((item) => ({
      name: item.name ?? item.sku ?? item.orderItemId,
      sku: item.sku ?? item.externalItemId ?? item.orderItemId,
      quantity: item.quantity,
      price: item.declaredValue,
      countryOfOrigin: "VN",
    })),
    shipFrom: {
      firstName: config.shipFromFirstName,
      lastName: config.shipFromLastName,
      phoneNumber: config.shipFromPhoneNumber,
      address1: config.shipFromAddress1,
      country: config.shipFromCountry,
      state: config.shipFromState,
      city: config.shipFromCity,
      zipCode: config.shipFromZipCode,
      isBusinessAddress: true,
    },
    shipTo: {
      firstName,
      lastName: lastNameParts.join(" ") || undefined,
      phoneNumber: recipient.phone,
      email: recipient.email,
      address1: recipient.line1,
      address2: recipient.line2,
      country: recipient.country,
      state: recipient.state,
      city: recipient.city,
      zipCode: recipient.postalCode,
      isBusinessAddress: true,
    },
  };
}

function normalizeCreateResponse(body: unknown): CreateCarrierShipmentResult {
  const data = isRecord(body) && isRecord(body.data) ? body.data : body;
  const shipment = isRecord(data) ? data : {};
  const carrierShipmentId = stringValue(shipment.shipmentId) ?? stringValue(shipment.id) ?? stringValue(shipment.trackingNumber);
  if (!carrierShipmentId) {
    throw carrierError("REMOTE_REJECTED", "Viettel Post returned no shipment identifier.", false, 502);
  }
  return {
    carrierCode: "VIETTEL_POST",
    carrierShipmentId,
    trackingNumber: stringValue(shipment.trackingNumber),
    labelUrl: stringValue(shipment.labelUrl),
  };
}

function normalizeTrackingResponse(body: unknown, fallbackShipmentId: string) {
  const data = isRecord(body) && isRecord(body.data) ? body.data : body;
  const shipment = isRecord(data) ? data : {};
  const status = typeof shipment.status === "number" ? shipment.status : null;
  return {
    carrierCode: "VIETTEL_POST",
    carrierShipmentId: stringValue(shipment.id) ?? fallbackShipmentId,
    trackingNumber: stringValue(shipment.trackingNumber),
    status: normalizeTrackingStatus(status),
    packageState: status,
    trackingStatus: status,
    events: [],
    latestEvent: null,
    metadata: { safe: { shipmentStatus: status ?? "unknown" } },
  };
}

function normalizeTrackingStatus(status: number | null) {
  switch (status) {
    case 0:
    case 1:
    case 9:
    case 10:
      return "TRACKING_PENDING" as const;
    case 2:
      return "IN_TRANSIT" as const;
    case 3:
      return "DELIVERED" as const;
    case 4:
      return "EXCEPTION" as const;
    case 5:
      return "CANCELLED" as const;
    case 11:
      return "RETURNED" as const;
    default:
      return "UNKNOWN" as const;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return null; }
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function positiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripTrailingSlash(value: string) { return value.replace(/\/+$/, ""); }

function carrierError(reason: Parameters<typeof createCarrierError>[0]["reason"], message: string, retryable: boolean, statusCode: number, safeMetadata?: Record<string, string[]>) {
  return new CarrierIntegrationError(createCarrierError({ carrierCode: "VIETTEL_POST", reason, message, retryable, statusCode, safeMetadata }));
}

function notSupported(message: string) {
  return carrierError("NOT_SUPPORTED", message, false, 501);
}
