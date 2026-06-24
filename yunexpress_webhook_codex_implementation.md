# YunExpress / Yuntu OpenAPI Webhook Implementation Guide for Codex

> Mục tiêu: tài liệu này hướng dẫn Codex/backend developer triển khai webhook receiver cho YunExpress/Yuntu OpenAPI một cách chính xác: nhận event push, verify signature, decrypt payload, lưu log, xử lý abnormal/tracking event, và trả về `success`.

---

## 1. Context kỹ thuật

YunExpress/Yuntu OpenAPI hỗ trợ cơ chế **event subscription / webhook push**.

Sau khi cấu hình:

- `Request Address`
- `Encrypt Key`
- Subscribe interface/event cần nhận

Yuntu sẽ push encrypted event về server của mình.

Webhook body thường có dạng:

```json
{
  "encrypt": "BASE64_ENCRYPTED_PAYLOAD"
}
```

Webhook headers quan trọng:

```http
X-Openapi-Request-Timestamp: 1651049235123
X-Openapi-Signature: <sha256-signature>
```

Server phải xử lý xong và trả về plain text:

```text
success
```

Không trả JSON `{ "success": true }` trừ khi YunExpress xác nhận chấp nhận JSON.

---

## 2. Cấu hình trên YunExpress/Yuntu Console

### 2.1. Request Address

Vào Yuntu/OpenAPI Console:

```text
Development Configuration → Event Management
```

Cấu hình request address dạng HTTPS public:

```http
https://api.yourdomain.com/api/webhooks/yunexpress/events
```

Lưu ý:

- Không dùng `localhost` trực tiếp.
- Mỗi user chỉ cấu hình được **một request address**.
- Tất cả subscribed events sẽ push về cùng endpoint này.
- Backend phải tự dispatch theo `event_type`, `data_code`, hoặc payload sau decrypt.

### 2.2. Encrypt Key

Vào:

```text
Development Configuration → Event Management → Encryption Policy
```

Lấy/cấu hình:

```text
encrypt_key
```

`encrypt_key` dùng cho 2 việc:

1. Verify webhook signature.
2. Decrypt encrypted event payload.

### 2.3. Subscribe event/interface

Subscribe các event cần nhận, ví dụ:

- Abnormal order event.
- Tracking event.
- Notification/self-pickup event.

Với abnormal order, data dimension thường là:

```text
waybill_number + type
```

---

## 3. Quy trình xử lý webhook

Backend phải làm đúng thứ tự:

```text
1. Receive raw body
2. Read X-Openapi-Request-Timestamp
3. Read X-Openapi-Signature
4. Verify signature = sha256(timestamp + encrypt_key + raw_body)
5. Parse raw body JSON
6. Read body.encrypt
7. Decrypt encrypt payload using AES-256-CBC
8. Parse decrypted JSON event
9. Deduplicate by event_id if available
10. Dispatch event by event_type/data_code/business fields
11. Save raw + decrypted payload
12. Return plain text: success
```

---

## 4. Signature verification

### 4.1. Formula

Yuntu docs specify:

```text
signature = sha256(timestamp + encrypt_key + raw_body)
```

Where:

| Part | Source |
|---|---|
| `timestamp` | Header `X-Openapi-Request-Timestamp` |
| `encrypt_key` | Yuntu Console Encryption Policy |
| `raw_body` | Original request body bytes/string |

### 4.2. Critical rule

Do **not** use:

```js
JSON.stringify(req.body)
```

after Express JSON parser.

Use the **original raw body** exactly as received.

If raw body changes by whitespace, escaping, or key order, signature verification can fail.

---

## 5. Decryption algorithm

Yuntu encrypted event uses AES-CBC logic.

Algorithm:

```text
1. Base64 decode encrypt string
2. First 16 bytes = IV
3. Remaining bytes = ciphertext
4. AES key = SHA256(encrypt_key)
5. Decrypt using AES-256-CBC
6. Remove PKCS#7 padding
7. Convert decrypted bytes to UTF-8 string
8. JSON.parse(decryptedText)
```

---

## 6. Node.js / Express implementation

### 6.1. Install dependencies

```bash
npm install express dotenv
```

No extra crypto package is required because Node.js has built-in `crypto`.

### 6.2. Environment variables

Create `.env`:

```env
PORT=3000
YUN_WEBHOOK_ENCRYPT_KEY=your_encrypt_key_here
```

Never commit `.env` or `YUN_WEBHOOK_ENCRYPT_KEY` to Git.

---

## 7. Complete Express server example

Create file:

```text
src/server.js
```

Or adapt into your existing Express backend.

```js
require("dotenv").config();

const express = require("express");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;
const YUN_WEBHOOK_ENCRYPT_KEY = process.env.YUN_WEBHOOK_ENCRYPT_KEY;

if (!YUN_WEBHOOK_ENCRYPT_KEY) {
  throw new Error("Missing YUN_WEBHOOK_ENCRYPT_KEY in .env");
}

function safeEqualHex(a, b) {
  if (!a || !b) return false;

  let aBuffer;
  let bBuffer;

  try {
    aBuffer = Buffer.from(a.toLowerCase(), "hex");
    bBuffer = Buffer.from(b.toLowerCase(), "hex");
  } catch (_error) {
    return false;
  }

  if (aBuffer.length !== bBuffer.length) return false;

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function verifyYunSignature({ timestamp, encryptKey, rawBodyBuffer, receivedSignature }) {
  const expectedSignature = crypto
    .createHash("sha256")
    .update(
      Buffer.concat([
        Buffer.from(`${timestamp}${encryptKey}`, "utf8"),
        rawBodyBuffer,
      ])
    )
    .digest("hex");

  return {
    valid: safeEqualHex(expectedSignature, receivedSignature),
    expectedSignature,
  };
}

function removePkcs7Padding(buffer) {
  if (!buffer.length) return buffer;

  const paddingLength = buffer[buffer.length - 1];

  if (paddingLength < 1 || paddingLength > 16) {
    return buffer;
  }

  return buffer.subarray(0, buffer.length - paddingLength);
}

function decryptYunEvent(encryptText, encryptKey) {
  const encryptedBuffer = Buffer.from(encryptText, "base64");

  if (encryptedBuffer.length <= 16) {
    throw new Error("Encrypted payload is too short");
  }

  const iv = encryptedBuffer.subarray(0, 16);
  const ciphertext = encryptedBuffer.subarray(16);

  const aesKey = crypto
    .createHash("sha256")
    .update(encryptKey, "utf8")
    .digest();

  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);

  // YunExpress sample Java uses AES/CBC/NOPADDING and manually unpads.
  decipher.setAutoPadding(false);

  const decryptedBuffer = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return removePkcs7Padding(decryptedBuffer).toString("utf8");
}

function extractEventMeta(event) {
  const header = event?.header || {};

  return {
    eventId: header.event_id || event.event_id || null,
    eventType: header.event_type || event.event_type || null,
    createTime: header.create_time || event.create_time || null,
    appId: header.app_id || event.app_id || null,
    tenantKey: header.tenant_key || event.tenant_key || null,
    dataCode: event.data_code || event.dataCode || null,
    waybillNumber: event.waybill_number || event.waybillNumber || null,
    customerOrderNumber: event.customer_order_number || event.customerOrderNumber || null,
    type: event.type || null,
  };
}

// Replace this in-memory set with a database unique index in production.
const processedEventIds = new Set();

async function saveWebhookEventLog({ meta, rawHeaders, rawEncryptedBody, decryptedPayload, status, errorMessage }) {
  // TODO: Implement database insert.
  // Recommended collection/table: YunWebhookEvent.
  console.log("[YUN_WEBHOOK] save log:", {
    meta,
    status,
    errorMessage,
  });
}

async function processYunEvent(event) {
  const meta = extractEventMeta(event);

  console.log("[YUN_WEBHOOK] event meta:", meta);

  if (meta.eventId) {
    if (processedEventIds.has(meta.eventId)) {
      console.log("[YUN_WEBHOOK] duplicate event ignored:", meta.eventId);
      return { duplicate: true, meta };
    }

    processedEventIds.add(meta.eventId);
  }

  // Dispatch examples:
  // 1. Abnormal order event:
  //    Upsert by waybill_number + type.
  // 2. Tracking event:
  //    Append tracking timeline.
  // 3. Notification event:
  //    Save notification and mark for operator review.

  if (meta.dataCode === "WOSPushData" || event.func_btn_list || event.wo_info) {
    await handleAbnormalOrderEvent(event, meta);
  } else {
    console.log("[YUN_WEBHOOK] unhandled event type, stored only");
  }

  return { duplicate: false, meta };
}

async function handleAbnormalOrderEvent(event, meta) {
  // TODO: Implement DB upsert.
  // Unique key: waybillNumber + type.
  // Important fields:
  // - func_btn_list
  // - wo_info
  // - operation_info
  // - process_status
  // - problem_title
  // - latest_op_command
  console.log("[YUN_WEBHOOK] abnormal event detected", {
    waybillNumber: meta.waybillNumber,
    type: meta.type,
  });
}

app.post(
  "/api/webhooks/yunexpress/events",
  express.raw({ type: "*/*", limit: "2mb" }),
  async (req, res) => {
    const receivedAt = new Date();

    try {
      console.log("[YUN_WEBHOOK] request received");

      const timestamp = req.header("X-Openapi-Request-Timestamp");
      const receivedSignature = req.header("X-Openapi-Signature");

      if (!timestamp || !receivedSignature) {
        console.error("[YUN_WEBHOOK] missing signature headers");
        return res.status(400).send("missing headers");
      }

      const rawBodyBuffer = req.body;
      const rawBodyString = rawBodyBuffer.toString("utf8");

      const { valid, expectedSignature } = verifyYunSignature({
        timestamp,
        encryptKey: YUN_WEBHOOK_ENCRYPT_KEY,
        rawBodyBuffer,
        receivedSignature,
      });

      console.log("[YUN_WEBHOOK] timestamp:", timestamp);
      console.log("[YUN_WEBHOOK] received signature:", receivedSignature);
      console.log("[YUN_WEBHOOK] expected signature:", expectedSignature);
      console.log("[YUN_WEBHOOK] signature valid:", valid);

      if (!valid) {
        await saveWebhookEventLog({
          meta: {},
          rawHeaders: req.headers,
          rawEncryptedBody: rawBodyString,
          decryptedPayload: null,
          status: "failed",
          errorMessage: "invalid signature",
          receivedAt,
        });

        return res.status(401).send("invalid signature");
      }

      const parsedBody = JSON.parse(rawBodyString);

      if (!parsedBody.encrypt) {
        return res.status(400).send("missing encrypt");
      }

      const decryptedText = decryptYunEvent(parsedBody.encrypt, YUN_WEBHOOK_ENCRYPT_KEY);
      console.log("[YUN_WEBHOOK] decrypted text:", decryptedText);

      const event = JSON.parse(decryptedText);
      const processResult = await processYunEvent(event);

      await saveWebhookEventLog({
        meta: processResult.meta,
        rawHeaders: req.headers,
        rawEncryptedBody: parsedBody,
        decryptedPayload: event,
        status: processResult.duplicate ? "duplicate" : "processed",
        errorMessage: null,
        receivedAt,
      });

      return res.status(200).send("success");
    } catch (error) {
      console.error("[YUN_WEBHOOK] error:", error);

      // Important: returning non-success may cause YunExpress retry.
      // During development, 500 is useful. In production, consider storing error and returning success for non-critical parsing/processing errors after signature/decrypt pass.
      return res.status(500).send("error");
    }
  }
);

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.listen(PORT, () => {
  console.log(`YunExpress webhook server listening on port ${PORT}`);
});
```

---

## 8. Express integration warning

If your app already uses:

```js
app.use(express.json());
```

make sure the webhook route is registered **before** `express.json()` or use a route-specific raw parser.

Correct order:

```js
app.post(
  "/api/webhooks/yunexpress/events",
  express.raw({ type: "*/*" }),
  yunWebhookHandler
);

app.use(express.json());
```

If `express.json()` parses the body first, raw body may be lost and signature verification can fail.

---

## 9. Nginx production config example

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    location /api/webhooks/yunexpress/events {
        proxy_pass http://127.0.0.1:3000/api/webhooks/yunexpress/events;

        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 30s;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
    }
}
```

---

## 10. Local testing with ngrok

Run backend:

```bash
node src/server.js
```

Open tunnel:

```bash
ngrok http 3000
```

Use generated URL:

```http
https://abc123.ngrok-free.app/api/webhooks/yunexpress/events
```

Set this URL as Request Address in Yuntu Console.

---

## 11. Database schema recommendation

### 11.1. YunWebhookEvent

```js
{
  eventId: { type: String, index: true, unique: true, sparse: true },
  eventType: String,
  dataCode: String,
  appId: String,
  tenantKey: String,

  waybillNumber: String,
  customerOrderNumber: String,
  type: Number,

  rawHeaders: Object,
  rawEncryptedBody: Object,
  decryptedPayload: Object,

  signature: String,
  timestamp: String,

  status: {
    type: String,
    enum: ["received", "processed", "failed", "duplicate"],
    default: "received",
  },

  errorMessage: String,

  receivedAt: Date,
  processedAt: Date,
}
```

### 11.2. YunAbnormalCase

```js
{
  waybillNumber: { type: String, required: true },
  type: { type: Number, required: true },

  customerCode: String,
  customerOrderNumber: String,
  trackingNumber: String,
  countryCode: String,
  productCode: String,

  processStatus: Number,
  problemTitles: [String],

  funcBtnList: Array,
  woInfo: Array,
  operationInfo: Array,
  returnInfo: Object,

  latestOpCommand: String,
  processDeadline: Date,

  rawPayload: Object,

  createdAt: Date,
  updatedAt: Date,
}
```

Recommended unique index:

```js
{ waybillNumber: 1, type: 1 }
```

---

## 12. Abnormal order action mapping

Only show/call actions available in `func_btn_list`.

| `op_type_key` | Meaning | API |
|---:|---|---|
| `5` | Release / Pass | `POST /v1/issue/release` |
| `2` | Return | `POST /v1/issue/handle` with `handle_type = 2` |
| `1` | Discard | `POST /v1/issue/handle` with `handle_type = 1` |
| `3` | Destroy | `POST /v1/issue/handle` with `handle_type = 3` |
| `4` | Revoke | `POST /v1/issue/handle` with `handle_type = 4` |
| `6` | Exchange order | `POST /v1/issue/change-waybill-number` |
| `9` | Value-added services | `POST /v1/issue/warehouse-process` |
| `11` | Return supplement | `POST /v1/issue/return-supply` |
| `12` | Mark as read | `POST /v1/issue/read` |

Business rule:

```text
Do not allow operators to issue an instruction that is not present in func_btn_list.
```

---

## 13. Production checklist

```text
[ ] Public HTTPS endpoint exists
[ ] Request Address configured in Yuntu Console
[ ] Encrypt Key configured and stored in backend secret manager
[ ] Correct event/interface subscribed
[ ] Webhook route uses raw body parser
[ ] Signature verification passes
[ ] Decryption passes
[ ] Decrypted payload is parsed successfully
[ ] Server returns plain text success
[ ] Yuntu Console shows push success / HTTP 200
[ ] Event logs are stored in DB
[ ] Duplicate events are ignored by event_id
[ ] Abnormal cases are upserted by waybill_number + type
[ ] Errors are logged and alerted
[ ] Processing is idempotent
[ ] Timeout is short, ideally below 5 seconds for webhook processing
```

---

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No request reaches server | Request Address wrong, server not public, HTTPS/firewall/Nginx issue | Test endpoint with curl/Postman, check Nginx and DNS |
| Missing headers | Yuntu did not send expected signed event or endpoint hit by non-Yuntu caller | Reject with 400 and verify console config |
| Signature fails | Raw body lost, wrong encrypt_key, body modified by parser/proxy | Use `express.raw`, verify encrypt_key, log raw body |
| Decrypt fails | Wrong encrypt_key, wrong AES mode, wrong padding | Use AES-256-CBC, key SHA256(encrypt_key), first 16 bytes IV |
| Yuntu shows push failed | Did not return plain `success`, server timeout, non-200 response | Return `res.status(200).send("success")` |
| Same event processed multiple times | Yuntu retry or duplicate push | Deduplicate by `event_id` |
| Cannot map abnormal action | Not using `func_btn_list` | Store and render actions from `func_btn_list` |

---

## 15. Minimal webhook success criteria

Webhook is considered correctly connected when all are true:

```text
1. Server receives POST request from Yuntu
2. Headers include X-Openapi-Request-Timestamp and X-Openapi-Signature
3. Body contains encrypt
4. Signature verification returns true
5. Decrypt returns valid JSON
6. Event is stored/processed
7. Server returns exactly success
8. Yuntu Console shows push success / HTTP 200
```

---

## 16. Recommended implementation plan for Codex

Implement in this order:

```text
Step 1: Add config env YUN_WEBHOOK_ENCRYPT_KEY
Step 2: Add route POST /api/webhooks/yunexpress/events with express.raw
Step 3: Implement verifyYunSignature
Step 4: Implement decryptYunEvent
Step 5: Log decrypted payload
Step 6: Return success
Step 7: Create YunWebhookEvent DB model
Step 8: Deduplicate by event_id
Step 9: Create YunAbnormalCase DB model
Step 10: Upsert abnormal event by waybill_number + type
Step 11: Add business dispatch for tracking/abnormal events
Step 12: Add tests for signature/decrypt with sample payload if available
```

