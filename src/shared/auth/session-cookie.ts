import { SESSION_TTL_SECONDS } from "@/shared/security";

export const SESSION_COOKIE_NAME = "lng_fp_session";

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
};

export function getSessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
