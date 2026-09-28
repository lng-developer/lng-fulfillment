import assert from "node:assert/strict";
import { assertCronRequestAuthorized } from "@/shared/security/cron";
import { AppError } from "@/shared/errors";

const cronSecret = "test-cron-secret";

assert.doesNotThrow(() =>
  assertCronRequestAuthorized(
    new Request("https://fulfillment.example.test/api/cron/tracking", {
      headers: { authorization: `Bearer ${cronSecret}` },
    }),
    cronSecret,
  ),
);

assert.throws(
  () =>
    assertCronRequestAuthorized(
      new Request("https://fulfillment.example.test/api/cron/tracking", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
      cronSecret,
    ),
  (error) => error instanceof AppError && error.code === "UNAUTHORIZED",
);

assert.throws(
  () =>
    assertCronRequestAuthorized(
      new Request("https://fulfillment.example.test/api/cron/tracking"),
      "",
    ),
  (error) => error instanceof AppError && error.code === "INTERNAL_ERROR",
);

console.log("cron authorization tests passed");
