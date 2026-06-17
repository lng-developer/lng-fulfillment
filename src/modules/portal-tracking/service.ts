const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_PORTAL_TRACKING_UPDATE_URL =
  "https://api.lngmerch.co/api/order/update-tracking";
const DEFAULT_PORTAL_ETSY_TRACKING_BASE_URL = "https://api.lngmerch.co";

export type PortalTrackingUpdateInput = {
  orderId: string | null | undefined;
  tracking: string | null | undefined;
  sourceChannel?: string | null | undefined;
};

export type PortalTrackingUpdateResult =
  | { attempted: false; reason: "missing_data" }
  | { attempted: false; reason: "missing_config" }
  | { attempted: true; delivered: true }
  | { attempted: true; delivered: false; status?: number };

export async function sendPortalTrackingUpdate(
  input: PortalTrackingUpdateInput,
): Promise<PortalTrackingUpdateResult> {
  const orderId = input.orderId?.trim();
  const tracking = input.tracking?.trim();

  if (!orderId || !tracking) {
    logPortalTrackingFlow("portalTrackingUpdateSkipped", {
      reason: "missing_data",
      orderIdPresent: Boolean(orderId),
      trackingPresent: Boolean(tracking),
    });
    return { attempted: false, reason: "missing_data" };
  }

  if (isEtsySourceChannel(input.sourceChannel)) {
    return sendPortalEtsyTrackingUpdate({ orderId, tracking });
  }

  return sendPortalAmazonTrackingUpdate({ orderId, tracking });
}

async function sendPortalAmazonTrackingUpdate(input: {
  orderId: string;
  tracking: string;
}): Promise<PortalTrackingUpdateResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const url =
    process.env.PORTAL_TRACKING_UPDATE_URL?.trim() ||
    DEFAULT_PORTAL_TRACKING_UPDATE_URL;

  try {
    logPortalTrackingFlow("portalTrackingUpdateRequest", {
      sourceChannel: "AMAZON",
      url: toSafeUrlSummary(url),
      body: input,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const responseBody = await readSafeResponseBody(response);

    logPortalTrackingFlow("portalTrackingUpdateResponse", {
      status: response.status,
      ok: response.ok,
      body: responseBody,
    });

    return response.ok
      ? { attempted: true, delivered: true }
      : { attempted: true, delivered: false, status: response.status };
  } catch (error) {
    logPortalTrackingFlow("portalTrackingUpdateFailed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });

    return { attempted: true, delivered: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendPortalEtsyTrackingUpdate(input: {
  orderId: string;
  tracking: string;
}): Promise<PortalTrackingUpdateResult> {
  const token = process.env.PORTAL_ETSY_TRACKING_AUTH_TOKEN?.trim();
  if (!token) {
    logPortalTrackingFlow("portalTrackingUpdateSkipped", {
      sourceChannel: "ETSY",
      reason: "missing_config",
      authTokenPresent: false,
    });
    return { attempted: false, reason: "missing_config" };
  }

  const url = buildEtsyTrackingUrl(input.orderId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    logPortalTrackingFlow("portalTrackingUpdateRequest", {
      sourceChannel: "ETSY",
      url: toSafeUrlSummary(url),
      body: { tracking: input.tracking },
      authTokenPresent: true,
    });

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tracking: input.tracking }),
      signal: controller.signal,
    });
    const responseBody = await readSafeResponseBody(response);

    logPortalTrackingFlow("portalTrackingUpdateResponse", {
      sourceChannel: "ETSY",
      status: response.status,
      ok: response.ok,
      body: responseBody,
    });

    return response.ok
      ? { attempted: true, delivered: true }
      : { attempted: true, delivered: false, status: response.status };
  } catch (error) {
    logPortalTrackingFlow("portalTrackingUpdateFailed", {
      sourceChannel: "ETSY",
      errorName: error instanceof Error ? error.name : "unknown",
    });

    return { attempted: true, delivered: false };
  } finally {
    clearTimeout(timeout);
  }
}

function buildEtsyTrackingUrl(orderId: string) {
  const baseUrl =
    process.env.PORTAL_ETSY_TRACKING_BASE_URL?.trim() ||
    DEFAULT_PORTAL_ETSY_TRACKING_BASE_URL;
  return `${baseUrl.replace(/\/+$/, "")}/api/etsy/${encodeURIComponent(
    orderId,
  )}/tracking`;
}

function isEtsySourceChannel(sourceChannel: string | null | undefined) {
  return sourceChannel?.trim().toUpperCase() === "ETSY";
}

async function readSafeResponseBody(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text) {
    return null;
  }

  const limitedText = text.length > 4000 ? `${text.slice(0, 4000)}...[truncated]` : text;

  try {
    return sanitizeForLog(JSON.parse(limitedText));
  } catch {
    return limitedText;
  }
}

function logPortalTrackingFlow(step: string, metadata: Record<string, unknown>) {
  if (process.env.SHIPMENT_TRACKING_FLOW_DEBUG !== "true") {
    return;
  }

  const safeMetadata = sanitizeForLog(metadata);

  console.info("[shipment-tracking-flow]", {
    step,
    ...(isRecord(safeMetadata) ? safeMetadata : {}),
  });
}

function toSafeUrlSummary(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "invalid-url";
  }
}

function sanitizeForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeForLog(entry));
  }

  if (!value || typeof value !== "object") {
    if (typeof value === "string" && value.length > 500) {
      return `${value.slice(0, 500)}...[truncated]`;
    }

    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      isSensitiveLogKey(key) ? "[redacted]" : sanitizeForLog(entry),
    ]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSensitiveLogKey(key: string) {
  return /authorization|cookie|token|secret|password|keyhash|apikey|api_key|credential/i.test(
    key,
  );
}
