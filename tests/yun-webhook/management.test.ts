import assert from "node:assert/strict";
import {
  canReprocessYunWebhookStatus,
  getYunWebhookSetupStatus,
  maskYunWebhookSignature,
  sanitizeYunWebhookPayloadForDisplay,
  validateYunWebhookEventListQuery,
} from "@/modules/yun-webhook";

function testListQueryValidation() {
  const query = validateYunWebhookEventListQuery(
    new URLSearchParams({
      page: "2",
      pageSize: "50",
      status: "FAILED",
      eventCategory: "TRACKING",
      attention: "true",
      search: "YT123",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-02T00:00:00.000Z",
    }),
  );

  assert.equal(query.page, 2);
  assert.equal(query.pageSize, 50);
  assert.equal(query.status, "FAILED");
  assert.equal(query.eventCategory, "TRACKING");
  assert.equal(query.attention, true);
  assert.equal(query.search, "YT123");
  assert.equal(query.from?.toISOString(), "2026-06-01T00:00:00.000Z");
  assert.equal(query.to?.toISOString(), "2026-06-02T00:00:00.000Z");
}

function testSetupStatusDoesNotExposeSecrets() {
  const originalAppUrl = process.env.APP_URL;
  const originalEnabled = process.env.YUN_WEBHOOK_ENABLED;
  const originalKey = process.env.YUN_WEBHOOK_ENCRYPT_KEY;

  process.env.APP_URL = "https://ff.example.test";
  process.env.YUN_WEBHOOK_ENABLED = "true";
  process.env.YUN_WEBHOOK_ENCRYPT_KEY = "super-secret-test-key";

  const status = getYunWebhookSetupStatus("https://fallback.example.test");

  assert.equal(status.webhookUrl, "https://ff.example.test/api/webhooks/yunexpress/events");
  assert.equal(status.receiverPath, "/api/webhooks/yunexpress/events");
  assert.equal(status.enabled, true);
  assert.equal(status.encryptionKeyConfigured, true);
  assert.equal(status.registrationMode, "manual");
  assert.deepEqual(status.requiredHeaders, [
    "X-Openapi-Request-Timestamp",
    "X-Openapi-Signature",
  ]);
  assert.equal(JSON.stringify(status).includes("super-secret-test-key"), false);

  process.env.APP_URL = originalAppUrl;
  process.env.YUN_WEBHOOK_ENABLED = originalEnabled;
  process.env.YUN_WEBHOOK_ENCRYPT_KEY = originalKey;
}

function testDisplaySanitization() {
  const sanitized = sanitizeYunWebhookPayloadForDisplay({
    TrackingNumber: "YT123",
    Authorization: "Bearer should-not-render",
    nested: {
      apiSecret: "secret-value",
      value: "safe",
    },
    rawPayload: {
      token: "hidden",
    },
  });

  assert.ok(sanitized);
  assert.equal(sanitized.TrackingNumber, "YT123");
  assert.equal(sanitized.Authorization, "[REDACTED]");
  assert.deepEqual(sanitized.nested, {
    apiSecret: "[REDACTED]",
    value: "safe",
  });
  assert.deepEqual(sanitized.rawPayload, "[REDACTED]");
}

function testSignatureMasking() {
  assert.equal(maskYunWebhookSignature(null), null);
  assert.equal(maskYunWebhookSignature("short"), "short");
  assert.equal(
    maskYunWebhookSignature("1234567890abcdef1234567890abcdef"),
    "123456...90abcdef",
  );
}

function testReprocessEligibility() {
  assert.equal(canReprocessYunWebhookStatus("FAILED"), true);
  assert.equal(canReprocessYunWebhookStatus("UNMATCHED"), true);
  assert.equal(canReprocessYunWebhookStatus("PROCESSED"), false);
  assert.equal(canReprocessYunWebhookStatus("DUPLICATE"), false);
  assert.equal(canReprocessYunWebhookStatus("RECEIVED"), false);
}

testListQueryValidation();
testSetupStatusDoesNotExposeSecrets();
testDisplaySanitization();
testSignatureMasking();
testReprocessEligibility();

console.log("yun webhook management tests passed");
