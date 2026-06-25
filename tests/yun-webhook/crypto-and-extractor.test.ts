import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  decryptYunWebhookPayload,
  verifyYunWebhookSignature,
} from "@/modules/yun-webhook/crypto";
import { receiveYunWebhookEvent } from "@/modules/yun-webhook/service";
import { GET as getYunWebhookHealth } from "@/app/api/webhooks/yunexpress/events/route";
import {
  classifyYunWebhookEvent,
  extractYunWebhookMeta,
} from "@/modules/yun-webhook/extractor";

const encryptKey = "test-yun-webhook-encrypt-key";
const decryptedPayload = {
  header: {
    event_id: "evt_123",
    event_type: "tracking_update",
    create_time: "2026-06-23T09:00:00Z",
  },
  data_code: "TRACKING_PUSH",
  WayBillNumber: "YT123456789",
  TrackingNumber: "TRK123456789",
  CustomerOrderNumber: "ORDER-123",
};
const rawBody = JSON.stringify({
  encrypt: encryptForTest(JSON.stringify(decryptedPayload), encryptKey),
});
const timestamp = "1710000000000";
const signature = crypto
  .createHash("sha256")
  .update(`${timestamp}${encryptKey}${rawBody}`, "utf8")
  .digest("hex");

assert.equal(
  verifyYunWebhookSignature({
    timestamp,
    encryptKey,
    rawBody,
    receivedSignature: signature,
  }),
  true,
);

assert.equal(
  verifyYunWebhookSignature({
    timestamp,
    encryptKey,
    rawBody: `${rawBody} `,
    receivedSignature: signature,
  }),
  false,
);

assert.deepEqual(
  JSON.parse(decryptYunWebhookPayload(JSON.parse(rawBody).encrypt, encryptKey)),
  decryptedPayload,
);

const meta = extractYunWebhookMeta(decryptedPayload);
assert.deepEqual(meta, {
  eventId: "evt_123",
  eventType: "tracking_update",
  dataCode: "TRACKING_PUSH",
  waybillNumber: "YT123456789",
  trackingNumber: "TRK123456789",
  customerOrderNumber: "ORDER-123",
  type: null,
});
assert.equal(classifyYunWebhookEvent(decryptedPayload, meta), "TRACKING");

const feeMeta = extractYunWebhookMeta({
  dataCode: "FEE_DETAIL_PUSH",
  WayBillNumber: "YT987",
  TotalFee: 12345,
});
assert.equal(
  classifyYunWebhookEvent({ dataCode: "FEE_DETAIL_PUSH", TotalFee: 12345 }, feeMeta),
  "FEE",
);

const abnormalMeta = extractYunWebhookMeta({
  data_code: "WOSPushData",
  waybill_number: "YT999",
  type: 2,
  func_btn_list: [{ op_type_key: 5 }],
});
assert.equal(
  classifyYunWebhookEvent(
    { data_code: "WOSPushData", func_btn_list: [{ op_type_key: 5 }] },
    abnormalMeta,
  ),
  "ABNORMAL",
);

void main();

async function main() {
  const previousWebhookEnabled = process.env.YUN_WEBHOOK_ENABLED;

  const healthResponse = await getYunWebhookHealth();
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), {
    success: true,
    message: "YunExpress webhook endpoint is alive",
  });

  const ackResult = await receiveYunWebhookEvent({
    rawBody: JSON.stringify({ ACK: "yun-subscription-check-123" }),
    timestamp: null,
    signature: null,
  });
  assert.deepEqual(ackResult, {
    eventId: null,
    status: "ACK",
    category: "UNKNOWN",
    ack: "yun-subscription-check-123",
  });

  process.env.YUN_WEBHOOK_ENABLED = "false";
  const numericAckResult = await receiveYunWebhookEvent({
    rawBody: JSON.stringify({ ACK: 1234567890 }),
    timestamp: null,
    signature: null,
  });
  assert.deepEqual(numericAckResult, {
    eventId: null,
    status: "ACK",
    category: "UNKNOWN",
    ack: "1234567890",
  });
  if (previousWebhookEnabled === undefined) {
    delete process.env.YUN_WEBHOOK_ENABLED;
  } else {
    process.env.YUN_WEBHOOK_ENABLED = previousWebhookEnabled;
  }

  console.log("yun webhook crypto/extractor tests passed");
}

function encryptForTest(text: string, key: string) {
  const iv = Buffer.from("1234567890abcdef", "utf8");
  const aesKey = crypto.createHash("sha256").update(key, "utf8").digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);
  cipher.setAutoPadding(false);

  const plain = Buffer.from(text, "utf8");
  const paddingLength = 16 - (plain.length % 16 || 16);
  const padded = Buffer.concat([
    plain,
    Buffer.alloc(paddingLength === 0 ? 16 : paddingLength, paddingLength || 16),
  ]);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString("base64");
}
