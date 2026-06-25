export function buildYunWebhookDebugLog(
  url: string,
  headers: Headers,
  rawBody: string,
) {
  return {
    url,
    headers: sanitizeHeaders(headers),
    body: sanitizeBody(rawBody),
  };
}

export function buildYunWebhookDecryptedDebugLog(payload: unknown) {
  if (!isRecord(payload)) {
    return {
      isObject: false,
      topLevelKeys: [],
      nestedDataKeys: [],
      ackPresent: false,
      dataCode: null,
      eventCode: null,
      waybillPresent: false,
      trackingPresent: false,
      customerOrderPresent: false,
    };
  }

  const nestedData = isRecord(payload.data) ? payload.data : null;

  return {
    isObject: true,
    topLevelKeys: Object.keys(payload),
    nestedDataKeys: nestedData ? Object.keys(nestedData) : [],
    ackPresent: hasOwnValue(payload, ["ACK", "ack"]),
    dataCode: getSafeString(payload, ["data_code", "dataCode", "DataCode"]) ??
      (nestedData ? getSafeString(nestedData, ["data_code", "dataCode", "DataCode"]) : null),
    eventCode: getSafeString(payload, ["event_code", "eventCode", "EventCode"]) ??
      (nestedData ? getSafeString(nestedData, ["event_code", "eventCode", "EventCode"]) : null),
    waybillPresent: hasAnyKeyDeep(payload, [
      "WayBillNumber",
      "waybillNumber",
      "waybill_number",
    ]),
    trackingPresent: hasAnyKeyDeep(payload, [
      "TrackingNumber",
      "trackingNumber",
      "tracking_number",
    ]),
    customerOrderPresent: hasAnyKeyDeep(payload, [
      "CustomerOrderNumber",
      "customerOrderNumber",
      "customer_order_number",
    ]),
  };
}

function sanitizeHeaders(headers: Headers) {
  return Object.fromEntries(
    Array.from(headers.entries()).map(([key, value]) => [
      key,
      sanitizeHeaderValue(key, value),
    ]),
  );
}

function sanitizeHeaderValue(key: string, value: string) {
  const normalizedKey = key.toLowerCase();
  if (
    normalizedKey === "forwarded" ||
    normalizedKey === "x-vercel-proxy-signature" ||
    normalizedKey === "x-vercel-sc-headers" ||
    normalizedKey.includes("authorization") ||
    normalizedKey.includes("cookie") ||
    normalizedKey.includes("token") ||
    normalizedKey.includes("secret") ||
    normalizedKey.includes("key")
  ) {
    return "[REDACTED]";
  }

  if (normalizedKey === "x-openapi-signature") {
    return maskValue(value);
  }

  return value;
}

function hasOwnValue(source: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => {
    const value = source[key];
    return value !== undefined && value !== null && value !== "";
  });
}

function getSafeString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value) {
      return value;
    }
  }

  return null;
}

function hasAnyKeyDeep(value: unknown, keys: string[]): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => hasAnyKeyDeep(entry, keys));
  }

  if (!isRecord(value)) {
    return false;
  }

  if (keys.some((key) => value[key] !== undefined && value[key] !== null && value[key] !== "")) {
    return true;
  }

  return Object.values(value).some((entry) => hasAnyKeyDeep(entry, keys));
}

function sanitizeBody(rawBody: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return "[NON_JSON_BODY]";
  }

  if (!isRecord(parsed)) {
    return "[NON_OBJECT_JSON_BODY]";
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [
      key,
      sanitizeBodyValue(key, value),
    ]),
  );
}

function sanitizeBodyValue(key: string, value: unknown) {
  const normalizedKey = key.toLowerCase();
  if (
    normalizedKey.includes("encrypt") ||
    normalizedKey.includes("authorization") ||
    normalizedKey.includes("cookie") ||
    normalizedKey.includes("token") ||
    normalizedKey.includes("secret") ||
    normalizedKey.includes("password") ||
    normalizedKey.includes("key")
  ) {
    return "[REDACTED]";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return `[ARRAY length=${value.length}]`;
  }

  if (isRecord(value)) {
    return `{OBJECT keys=${Object.keys(value).join(",")}}`;
  }

  return "[UNSUPPORTED_VALUE]";
}

function maskValue(value: string) {
  if (value.length <= 16) return value;
  return `${value.slice(0, 6)}...${value.slice(-8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
