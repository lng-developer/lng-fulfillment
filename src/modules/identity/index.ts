export const USER_STATUSES = ["ACTIVE", "DISABLED"] as const;

export type UserStatusValue = (typeof USER_STATUSES)[number];

export {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
  safeCompare,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  SESSION_TTL_SECONDS,
} from "@/shared/security";

export {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  type SessionCookieOptions,
} from "@/shared/auth";

export {
  changePassword,
  loginWithEmailPassword,
  getCurrentSession,
  getCurrentTenantAccessSession,
  getTenantMembershipsForUser,
  logout,
  validateChangePasswordInput,
  validateLoginInput,
} from "./service";

export type {
  AuthResponseData,
  LoginResult,
  SafeUser,
  TenantMembershipSummary,
} from "./types";
