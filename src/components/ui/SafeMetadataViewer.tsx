import { cn } from "@/lib/utils";

const SENSITIVE_KEY_PARTS = [
  "secret",
  "password",
  "token",
  "apikey",
  "api_key",
  "auth",
  "cookie",
  "rawpayload",
  "rawresponse",
  "encryptedpayload",
  "keyhash",
  "customerno",
  "apisecret",
  "credential",
  "authorization",
];

const MAX_STRING_LENGTH = 140;
const MAX_OBJECT_ENTRIES = 30;
const MAX_ARRAY_ITEMS = 20;

export function SafeMetadataViewer({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3 font-mono text-xs text-[var(--text-secondary)]">
      <MetadataObject value={redactValue(data) as Record<string, unknown>} />
    </div>
  );
}

function MetadataObject({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value);
  const visibleEntries = entries.slice(0, MAX_OBJECT_ENTRIES);
  const hiddenCount = entries.length - visibleEntries.length;

  if (!entries.length) {
    return <span className="text-[var(--text-muted)]">{"{}"}</span>;
  }

  return (
    <details open>
      <summary className="cursor-pointer select-none text-[var(--text-muted)]">
        {`{${entries.length} keys}`}
      </summary>
      <div className="ml-4 grid gap-1">
        {visibleEntries.map(([key, entryValue]) => (
          <div className="grid grid-cols-[minmax(120px,220px)_1fr] gap-3" key={key}>
            <span className="break-all text-[var(--text-muted)]">{`"${key}"`}</span>
            <MetadataValue value={entryValue} />
          </div>
        ))}
        {hiddenCount > 0 ? (
          <div className="italic text-[var(--text-muted)]">
            {hiddenCount} more keys hidden
          </div>
        ) : null}
      </div>
      <div className="text-[var(--text-muted)]">{"}"}</div>
    </details>
  );
}

function MetadataArray({ value }: { value: unknown[] }) {
  const visibleItems = value.slice(0, MAX_ARRAY_ITEMS);
  const hiddenCount = value.length - visibleItems.length;

  if (!value.length) {
    return <span className="text-[var(--text-muted)]">[]</span>;
  }

  return (
    <details>
      <summary className="cursor-pointer select-none text-[var(--text-muted)]">
        [{value.length}]
      </summary>
      <div className="ml-4 grid gap-1">
        {visibleItems.map((entryValue, index) => (
          <div className="grid grid-cols-[40px_1fr] gap-3" key={index}>
            <span className="text-[var(--text-muted)]">{index}</span>
            <MetadataValue value={entryValue} />
          </div>
        ))}
        {hiddenCount > 0 ? (
          <div className="italic text-[var(--text-muted)]">
            {hiddenCount} more items hidden
          </div>
        ) : null}
      </div>
    </details>
  );
}

function MetadataValue({ value }: { value: unknown }) {
  if (value === "[REDACTED]") {
    return <span className="italic text-[var(--text-muted)]">{`"[REDACTED]"`}</span>;
  }

  if (Array.isArray(value)) {
    return <MetadataArray value={value} />;
  }

  if (isPlainObject(value)) {
    return <MetadataObject value={value} />;
  }

  return (
    <span
      className={cn(
        "break-all",
        value === null ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]",
      )}
    >
      {formatPrimitive(value)}
    </span>
  );
}

function redactValue(value: unknown, key?: string): unknown {
  if (key && isSensitiveKey(key)) {
    return "[REDACTED]";
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      redactValue(entryValue, entryKey),
    ]),
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSensitiveKey(key: string) {
  const lower = key.toLowerCase();
  const compact = lower.replace(/[^a-z0-9]/g, "");

  return SENSITIVE_KEY_PARTS.some((part) => {
    const normalizedPart = part.replace(/[^a-z0-9]/g, "");
    return lower.includes(part) || compact.includes(normalizedPart);
  });
}

function formatPrimitive(value: unknown) {
  if (typeof value === "string") {
    return `"${truncateString(value)}"`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  return String(value);
}

function truncateString(value: string) {
  if (value.length <= MAX_STRING_LENGTH) return value;
  return `${value.slice(0, MAX_STRING_LENGTH)}...`;
}
