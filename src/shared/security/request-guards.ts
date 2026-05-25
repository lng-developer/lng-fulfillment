import { createHash } from "node:crypto";
import { AppError } from "@/shared/errors";

type RateLimitState = {
  count: number;
  resetAt: number;
};

export type RateLimitPolicy = {
  key: string;
  limit: number;
  windowMs: number;
};

const rateLimitStore = new Map<string, RateLimitState>();
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 60_000;

export const RATE_LIMIT_POLICIES = {
  loginIp: { limit: 30, windowMs: 60_000 },
  loginEmail: { limit: 8, windowMs: 15 * 60_000 },
  portalIp: { limit: 120, windowMs: 60_000 },
  portalTenantApiKey: { limit: 300, windowMs: 60_000 },
  dashboardMutation: { limit: 120, windowMs: 60_000 },
  expensiveRead: { limit: 60, windowMs: 60_000 },
} as const;

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();
  const ip =
    firstForwardedIp ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim();

  return ip || "unknown";
}

export function buildRateLimitKey(
  namespace: string,
  ...parts: Array<string | number | null | undefined>
): string {
  const rawKey = [namespace, ...parts.map((part) => part ?? "none")].join(":");
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

export function rateLimitOrThrow(policy: RateLimitPolicy): void {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const current = rateLimitStore.get(policy.key);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(policy.key, {
      count: 1,
      resetAt: now + policy.windowMs,
    });
    return;
  }

  if (current.count >= policy.limit) {
    throw new AppError(
      "RATE_LIMITED",
      "Too many requests. Please try again later.",
      429,
    );
  }

  current.count += 1;
}

export function assertSameOriginRequest(request: Request): void {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.size === 0) {
    throw new AppError(
      "FORBIDDEN",
      "Same-origin request validation is not configured.",
      403,
    );
  }

  const requestOrigin =
    parseOrigin(request.headers.get("origin")) ??
    parseOrigin(request.headers.get("referer"));

  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
    throw new AppError("FORBIDDEN", "Same-origin request required.", 403);
  }
}

function cleanupRateLimitStore(now: number) {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  addOrigin(origins, process.env.APP_URL);
  addOrigin(origins, process.env.NEXT_PUBLIC_APP_URL);

  if (isLocalLikeEnvironment(process.env.APP_ENV)) {
    for (const port of ["3000", "3001", "3002", "3003"]) {
      origins.add(`http://localhost:${port}`);
      origins.add(`http://127.0.0.1:${port}`);
    }
  }

  return origins;
}

function addOrigin(origins: Set<string>, value: string | undefined) {
  const origin = parseOrigin(value);
  if (origin) {
    origins.add(origin);
  }
}

function parseOrigin(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isLocalLikeEnvironment(appEnv: string | undefined) {
  return appEnv === "local" || appEnv === "test" || appEnv === "development";
}
