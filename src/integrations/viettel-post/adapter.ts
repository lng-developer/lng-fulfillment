import {
  createCarrierError,
  CarrierIntegrationError,
} from "@/modules/carrier/errors";
import { normalizeViettelPostTrackingNumber } from "./tracking";
export { normalizeViettelPostTrackingNumber } from "./tracking";
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
      const url = resolveViettelPostOrderUrl(config.orderUrl, "/api/partner/order/shipment");
      const response = await fetchImpl(url, {
        method: "POST",
        headers: new Headers({
          authorization: `Bearer ${token}`,
          accept: "application/json",
          "content-type": "application/json",
        }),
        body: JSON.stringify(mapShipment(input, config)),
      });

      if (!response.ok) {
        let remoteMessage = "Viettel Post rejected shipment creation.";
        try {
          const errorBody = await readJson(response);
          if (isRecord(errorBody)) {
            const msg =
              stringValue(errorBody.message) ??
              stringValue(errorBody.error_description) ??
              stringValue(errorBody.error);
            if (msg) remoteMessage = `Viettel Post: ${msg}`;
          }
        } catch {
          // ignore parsing error
        }
        throw carrierError("REMOTE_REJECTED", remoteMessage, false, response.status);
      }

      return normalizeCreateResponse(await readJson(response));
    },
    async getLabel() {
      throw notSupported("Viettel Post label retrieval is not implemented.");
    },
    async getTracking(input, context) {
      const shipmentIdentifier = input.carrierShipmentId || input.customerOrderNumber;
      if (!shipmentIdentifier) {
        throw carrierError("VALIDATION_FAILED", "Viettel Post tracking requires a shipment identifier.", false, 400);
      }
      const config = getConfig(context);
      const fetchImpl = options.fetchImpl ?? fetch;
      const token = process.env.VIETTEL_POST_BEARER_TOKEN || await requestAccessToken(config, fetchImpl, tokenCache);

      // Try partner shipment search first
      try {
        const searchUrl = resolveViettelPostOrderUrl(
          config.orderUrl,
          `/api/partner/order/shipment?filter=${encodeURIComponent(shipmentIdentifier)}&skipCount=0&maxResultCount=5`,
        );
        const searchRes = await fetchImpl(searchUrl, {
          headers: new Headers({
            authorization: `Bearer ${token}`,
            accept: "application/json",
          }),
        });
        if (searchRes.ok) {
          const json = await readJson(searchRes);
          const data = isRecord(json) && isRecord(json.data) ? json.data : json;
          const items = isRecord(data) && Array.isArray(data.items) ? data.items : [];
          if (items.length > 0 && isRecord(items[0])) {
            return normalizeSubAgencyTrackingItem(items[0], shipmentIdentifier);
          }
        }
      } catch {
        // Fall back to partner endpoint
      }

      const detailUrl = resolveViettelPostOrderUrl(
        config.orderUrl,
        `/api/partner/order/shipment/${encodeURIComponent(shipmentIdentifier)}`,
      );
      const response = await fetchImpl(detailUrl, {
        headers: new Headers({ authorization: `Bearer ${token}`, accept: "application/json" }),
      });
      if (!response.ok) {
        let remoteMessage = "Viettel Post rejected shipment detail lookup.";
        try {
          const errorBody = await readJson(response);
          if (isRecord(errorBody)) {
            const msg =
              stringValue(errorBody.message) ??
              stringValue(errorBody.error_description) ??
              stringValue(errorBody.error);
            if (msg) remoteMessage = `Viettel Post: ${msg}`;
          }
        } catch {
          // ignore parsing error
        }
        throw carrierError("REMOTE_REJECTED", remoteMessage, false, response.status);
      }
      return normalizeTrackingResponse(await readJson(response), shipmentIdentifier);
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

export function getViettelPostShipmentMissingFields(input: CreateCarrierShipmentInput): string[] {
  const dimensions = ["weight", "length", "width", "height"] as const;
  const missing: string[] = dimensions.filter((field) => !positiveNumber(input.metadata?.[field]));
  if (!input.recipient?.name || !input.recipient.phone || !input.recipient.line1 || !input.recipient.country) {
    missing.push("recipient");
  }
  return missing;
}

function assertShipmentInput(input: CreateCarrierShipmentInput) {
  const missing = getViettelPostShipmentMissingFields(input);
  if (missing.length > 0) {
    throw carrierError("VALIDATION_FAILED", "Viettel Post shipment data is incomplete.", false, 400, { missing });
  }
}

export const US_STATE_CODE_MAP: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
  "puerto rico": "PR",
  guam: "GU",
  "virgin islands": "VI",
  "american samoa": "AS",
  "northern mariana islands": "MP",
  "armed forces americas": "AA",
  "armed forces europe": "AE",
  "armed forces pacific": "AP",
};

export function normalizeStateCode(
  state: string | null | undefined,
  countryCode?: string,
): string | undefined {
  if (!state) return undefined;
  const trimmed = state.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length === 2) return trimmed.toUpperCase();

  const normalizedCountry = countryCode?.trim().toUpperCase();
  if (
    !normalizedCountry ||
    normalizedCountry === "US" ||
    normalizedCountry === "USA" ||
    normalizedCountry === "UNITED STATES"
  ) {
    const matched = US_STATE_CODE_MAP[trimmed.toLowerCase()];
    if (matched) return matched;
  }

  return trimmed.slice(0, 2).toUpperCase();
}

export function normalizeCountryCode(country: string | null | undefined): string {
  if (!country) return "US";
  const trimmed = country.trim().toUpperCase();
  if (trimmed === "UNITED STATES" || trimmed === "USA") return "US";
  if (trimmed === "VIETNAM" || trimmed === "VIET NAM") return "VN";
  return trimmed.slice(0, 2);
}

export function resolveViettelPostAuthUrl(authUrl: string): string {
  const stripped = stripTrailingSlash(authUrl);
  if (stripped.endsWith("/connect/token")) {
    return stripped;
  }
  return `${stripped}/connect/token`;
}

export function resolveViettelPostOrderUrl(orderUrl: string, endpoint: string): string {
  const stripped = stripTrailingSlash(orderUrl);
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (stripped.endsWith("/gateway")) {
    return `${stripped}${cleanEndpoint}`;
  }
  if (stripped.includes("api-global.viettelpost.vn")) {
    return `${stripped}/gateway${cleanEndpoint}`;
  }
  return `${stripped}${cleanEndpoint}`;
}

async function requestAccessToken(
  config: ViettelPostConfig,
  fetchImpl: typeof fetch,
  tokenCache: Map<string, { token: string; expiresAt: number }>,
) {
  const tokenUrl = resolveViettelPostAuthUrl(config.authUrl);
  const cacheKey = `${tokenUrl}\u0000${config.clientId}\u0000${config.clientSecret}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const response = await fetchImpl(tokenUrl, {
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
    let errorDetail = "Viettel Post authentication failed.";
    if (isRecord(body)) {
      const desc = stringValue(body.error_description) ?? stringValue(body.message) ?? stringValue(body.error);
      if (desc) errorDetail = `Viettel Post auth failed: ${desc}`;
    }
    throw carrierError("AUTHENTICATION_FAILED", errorDetail, false, response.status || 502);
  }
  const expiresIn = isRecord(body) && typeof body.expires_in === "number" ? body.expires_in : 300;
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + Math.max(1, expiresIn - 30) * 1000,
  });
  return token;
}

export function mapShipment(input: CreateCarrierShipmentInput, config: ViettelPostConfig) {
  const recipient = input.recipient!;
  const rawRecipientName = (recipient.name ?? "Customer").trim();
  const nameParts = rawRecipientName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "Customer";
  // Viettel Post requires non-empty ShipTo.LastName. If customer has a single name (e.g. "ruby"), duplicate firstName as lastName.
  const lastName = nameParts.slice(1).join(" ").trim() || firstName;
  const recipientCountry = normalizeCountryCode(recipient.country);
  const recipientState = normalizeStateCode(recipient.state, recipientCountry);
  const orderRef = stringValue(input.externalOrderId) ?? stringValue(input.orderId);
  const orderId = (input.externalOrderId ?? input.orderId ?? "").slice(0, 30);
  const hsCode = stringValue(input.metadata?.hsCode) || "6109100004";

  return {
    lineCode: config.lineShipId,
    lineShipId: config.lineShipId,
    orderId: orderId || undefined,
    orderReferenceId: orderRef,
    hsCode,
    parcel: {
      weight: Math.round(Number(input.metadata!.weight) * 1000),
      length: Number(input.metadata!.length),
      width: Number(input.metadata!.width),
      height: Number(input.metadata!.height),
      weightUnit: 2,
      lengthUnit: 1,
      labelDate: new Date().toISOString(),
      labelFormat: 0,
      invoiceNumber: orderId || orderRef,
    },
    lineItems: input.items.map((item) => {
      let price = item.declaredValue && item.declaredValue > 0 ? item.declaredValue : 1.0;
      // Safeguard: if price is in cents (e.g. 2785 cents = $27.85), convert to dollars
      if (price > 100) {
        price = Math.round((price / 100) * 100) / 100;
      }
      return {
        name: item.name ?? item.sku ?? item.orderItemId,
        sku: item.sku ?? item.externalItemId ?? item.orderItemId,
        quantity: item.quantity,
        price,
        currency: "USD",
        countryOfOrigin: "VN",
      };
    }),
    shipFrom: {
      firstName: config.shipFromFirstName || "Kho",
      lastName: config.shipFromLastName || "Fulfillment",
      company: "Metawoods",
      phoneNumber: config.shipFromPhoneNumber || "0988888888",
      address1: config.shipFromAddress1 || "Kho Viettel Post",
      country: normalizeCountryCode(config.shipFromCountry) || "VN",
      ward: "Quang Trung",
      district: "Hà Đông",
      state: config.shipFromState || "Hà Nội",
      city: config.shipFromCity || "Hà Nội",
      zipCode: config.shipFromZipCode || "100000",
      isBusinessAddress: true,
    },
    shipTo: {
      firstName,
      lastName,
      company: (recipient as { company?: string }).company || rawRecipientName || "Customer",
      phoneNumber: recipient.phone || "0988888888",
      email: recipient.email,
      address1: recipient.line1 || "Street Address",
      address2: recipient.line2 || "",
      country: recipientCountry || "US",
      state: recipientState || "CA",
      city: recipient.city || "City",
      zipCode: recipient.postalCode || "00000",
      useRawAddress: true,
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
  const vtpOrderNumber = stringValue(shipment.vtpOrderNumber);
  const shipmentCode = stringValue(shipment.shipmentCode);

  return {
    carrierCode: "VIETTEL_POST",
    carrierShipmentId,
    trackingNumber: normalizeViettelPostTrackingNumber(stringValue(shipment.trackingNumber)) ?? undefined,
    labelUrl: stringValue(shipment.labelUrl) ?? stringValue(shipment.labelUrlVTP),
    ...(vtpOrderNumber || shipmentCode
      ? {
          metadata: {
            safe: {
              ...(vtpOrderNumber ? { vtpOrderNumber } : {}),
              ...(shipmentCode ? { shipmentCode } : {}),
            },
          },
        }
      : {}),
  };
}

function normalizeTrackingResponse(body: unknown, fallbackShipmentId: string) {
  const data = isRecord(body) && isRecord(body.data) ? body.data : body;
  const shipment = isRecord(data) ? data : {};
  const status = typeof shipment.status === "number" ? shipment.status : null;
  const vtpOrderNumber = stringValue(shipment.vtpOrderNumber);
  const shipmentCode = stringValue(shipment.shipmentCode);
  const labelUrl = stringValue(shipment.labelUrl) ?? stringValue(shipment.labelUrlVTP);
  const rawEvents = Array.isArray(shipment.activitiesTimeline) ? shipment.activitiesTimeline : [];
  const events = rawEvents
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const checkpoint = stringValue(item.activity) ?? stringValue(item.code) ?? "Checkpoint";
      return {
        eventStatus: checkpoint,
        eventTime: item.dateCreate ? new Date(String(item.dateCreate)) : new Date(),
        checkpoint,
        location: stringValue(item.location) ?? undefined,
      };
    })
    .filter((e) => !isNaN(e.eventTime.getTime()));

  return {
    carrierCode: "VIETTEL_POST",
    carrierShipmentId: stringValue(shipment.id) ?? fallbackShipmentId,
    trackingNumber: normalizeViettelPostTrackingNumber(stringValue(shipment.trackingNumber)) ?? undefined,
    labelUrl,
    status: normalizeTrackingStatus(status),
    packageState: status,
    trackingStatus: status,
    events,
    latestEvent: events[events.length - 1] ?? null,
    metadata: {
      safe: {
        shipmentStatus: status ?? "unknown",
        ...(vtpOrderNumber ? { vtpOrderNumber } : {}),
        ...(shipmentCode ? { shipmentCode } : {}),
        ...(labelUrl ? { labelUrl } : {}),
      },
    },
  };
}

function normalizeSubAgencyTrackingItem(item: Record<string, unknown>, fallbackId: string) {
  const status = typeof item.status === "number" ? item.status : null;
  const vtpOrderNumber = stringValue(item.vtpOrderNumber) ?? stringValue(item.shipmentCode);
  const shipmentCode = stringValue(item.shipmentCode);
  const rawTracking = stringValue(item.trackingCode) ?? stringValue(item.trackingNumber);
  const trackingNumber = normalizeViettelPostTrackingNumber(rawTracking) ?? undefined;
  const labelUrl = stringValue(item.labelUrl) ?? stringValue(item.labelUrlVTP);

  return {
    carrierCode: "VIETTEL_POST" as const,
    carrierShipmentId: stringValue(item.id) ?? vtpOrderNumber ?? fallbackId,
    trackingNumber,
    labelUrl,
    status: normalizeTrackingStatus(status),
    packageState: status,
    trackingStatus: status,
    events: [],
    latestEvent: null,
    metadata: {
      safe: {
        shipmentStatus: status ?? "unknown",
        ...(vtpOrderNumber ? { vtpOrderNumber } : {}),
        ...(shipmentCode ? { shipmentCode } : {}),
        ...(labelUrl ? { labelUrl } : {}),
      },
    },
  };
}

function normalizeTrackingStatus(status: number | null) {
  switch (status) {
    case 0:
    case 1:
    case 8:
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
    case 6:
    case 7:
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
