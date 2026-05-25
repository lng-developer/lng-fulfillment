import { AppError } from "@/shared/errors";
import {
  generateSessionToken,
  hashSessionToken,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  SESSION_TTL_SECONDS,
  verifyPassword,
} from "@/shared/security";
import {
  createSession,
  deleteSessionByTokenHash,
  findSessionContextByTokenHash,
  findUserByEmail,
  getUserTenantMemberships,
  updateSessionLastUsed,
} from "./repository";
import type {
  AuthResponseData,
  LoginResult,
  SafeUser,
  TenantMembershipSummary,
} from "./types";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";
const SESSION_LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000;

type LoginInput = {
  email: string;
  password: string;
};

export function validateLoginInput(input: unknown): LoginInput {
  if (typeof input !== "object" || input === null) {
    throw new AppError("VALIDATION_ERROR", "Request body must be an object.", 400);
  }

  const body = input as Record<string, unknown>;
  const email = body.email;
  const password = body.password;

  if (typeof email !== "string" || email.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "Email is required.", 400);
  }

  if (typeof password !== "string" || password.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Password is required.", 400);
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Password length must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
      400,
    );
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new AppError("VALIDATION_ERROR", "Email must be valid.", 400);
  }

  return {
    email: normalizedEmail,
    password,
  };
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<LoginResult> {
  const normalizedEmail = normalizeEmail(email);
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw invalidCredentials();
  }

  if (user.status === "DISABLED") {
    throw new AppError("FORBIDDEN", "User account is disabled.", 403);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw invalidCredentials();
  }

  const sessionToken = generateSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await createSession(user.id, tokenHash, expiresAt);

  return {
    sessionToken,
    expiresAt,
    ...(await buildAuthResponseData(toSafeUser(user))),
  };
}

export async function getCurrentSession(
  rawToken: string | undefined,
): Promise<AuthResponseData> {
  if (!rawToken) {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const tokenHash = hashSessionToken(rawToken);
  const session = await findSessionContextByTokenHash(tokenHash);

  if (!session) {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await deleteSessionByTokenHash(tokenHash);
    throw new AppError("UNAUTHORIZED", "Session expired.", 401);
  }

  if (session.user.status === "DISABLED") {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }

  if (shouldUpdateSessionLastUsed(session.lastUsedAt)) {
    await updateSessionLastUsed(tokenHash);
  }

  return {
    user: toSafeUser(session.user),
    tenants: session.user.memberships.map(
      (membership): TenantMembershipSummary => ({
        tenantId: membership.tenantId,
        tenantName: membership.tenant.name,
        tenantSlug: membership.tenant.slug,
        role: membership.role,
        membershipStatus: membership.status,
      }),
    ),
  };
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) {
    return;
  }

  await deleteSessionByTokenHash(hashSessionToken(rawToken));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function invalidCredentials() {
  return new AppError("UNAUTHORIZED", INVALID_CREDENTIALS_MESSAGE, 401);
}

function shouldUpdateSessionLastUsed(lastUsedAt: Date | null) {
  if (!lastUsedAt) {
    return true;
  }

  return Date.now() - lastUsedAt.getTime() >= SESSION_LAST_USED_WRITE_INTERVAL_MS;
}

function toSafeUser(user: {
  id: string;
  email: string;
  name: string | null;
  status: SafeUser["status"];
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
  };
}

async function buildAuthResponseData(user: SafeUser): Promise<AuthResponseData> {
  return {
    user,
    tenants: await getTenantMembershipsForUser(user.id),
  };
}

export async function getTenantMembershipsForUser(
  userId: string,
): Promise<TenantMembershipSummary[]> {
  const memberships = await getUserTenantMemberships(userId);

  return memberships.map(
    (membership): TenantMembershipSummary => ({
      tenantId: membership.tenantId,
      tenantName: membership.tenant.name,
      tenantSlug: membership.tenant.slug,
      role: membership.role,
      membershipStatus: membership.status,
    }),
  );
}
