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
