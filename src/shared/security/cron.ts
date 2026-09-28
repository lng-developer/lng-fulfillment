import { timingSafeEqual } from "node:crypto";
import { AppError } from "@/shared/errors";

export function assertCronRequestAuthorized(
  request: Request,
  cronSecret: string | undefined,
): void {
  if (!cronSecret) {
    throw new AppError("INTERNAL_ERROR", "Cron is not configured.", 500);
  }

  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const expected = Buffer.from(cronSecret);
  const actual = Buffer.from(token ?? "");

  if (
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  ) {
    throw new AppError("UNAUTHORIZED", "Invalid cron authorization.", 401);
  }
}
