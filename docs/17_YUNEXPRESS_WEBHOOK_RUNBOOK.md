# YunExpress Webhook Runbook

This runbook explains how to manually register and operate YunExpress/Yuntu webhooks for Fulfillment Platform v2.

## Safety Rules

- Do not paste `YUN_WEBHOOK_ENCRYPT_KEY`, carrier credentials, API keys, cookies, session tokens, DB URLs, raw encrypted payloads, or decrypted payloads into tickets, docs, logs, or chat.
- Do not configure production YunExpress webhooks to local, preview, or disposable tunnel URLs.
- Do not use this webhook flow to create, cancel, or mutate YunExpress shipments manually. The receiver only accepts pushed events and dispatches internal updates.

## Required Env

Configure these server-side variables in the target deployment:

```text
YUN_WEBHOOK_ENABLED=true
YUN_WEBHOOK_ENCRYPT_KEY=<yuntu-encryption-policy-key>
APP_URL=https://<fulfillment-platform-domain>
```

`YUN_WEBHOOK_ENCRYPT_KEY` must match the encryption policy key configured in Yuntu/YunExpress Console. The platform uses it to verify the request signature and decrypt the encrypted payload. The key must stay in the deployment secret manager or local `.env`; never commit it.

## Manual Registration

1. Open Fulfillment Platform as `PLATFORM_ADMIN` or `PLATFORM_SUPPORT`.
2. Go to `/platform/yun-webhooks`.
3. Copy the Webhook URL from the setup panel.
4. In Yuntu/YunExpress Console, register that URL as the webhook request address.
5. Configure the same encryption policy key as `YUN_WEBHOOK_ENCRYPT_KEY`.
6. Enable event pushes for tracking, fee, and abnormal events if the console offers per-event toggles.
7. Send a test event from Yuntu/YunExpress if available.
8. Return to `/platform/yun-webhooks` and confirm the event appears in the inbox.

Expected receiver URL shape:

```text
https://<fulfillment-platform-domain>/api/webhooks/yunexpress/events
```

The same path supports `GET` as a lightweight public health check:

```json
{
  "success": true,
  "message": "YunExpress webhook endpoint is alive"
}
```

Expected headers:

```text
X-Openapi-Request-Timestamp
X-Openapi-Signature
```

Expected body shape:

```json
{
  "encrypt": "BASE64_ENCRYPTED_PAYLOAD"
}
```

During subscription activation, Yuntu may first send a plain JSON challenge:

```json
{
  "ACK": "challenge-value"
}
```

The receiver echoes the exact `ACK` value as `text/plain` within the same
request. This activation request is not stored in the webhook inbox and does
not require encrypted event payload processing. `ACK` may be sent as a string
or number; the receiver returns the string form of the value.

If Encryption Strategy is enabled, Yuntu may instead send the activation
challenge inside the encrypted payload:

```json
{
  "encrypt": "BASE64_ENCRYPTED_ACK_PAYLOAD"
}
```

In that case the receiver verifies the signature, decrypts the payload, then
echoes the decrypted top-level `ACK` value as `text/plain`. Encrypted ACK
requests are also not stored in the webhook inbox and are not dispatched as
events.

## Event Review

Use `/platform/yun-webhooks` to review received events.

Recommended filters:

- `Needs attention`: events with `FAILED` or `UNMATCHED` status.
- `Tracking`: tracking events that may update shipment tracking and source-aware Portal callbacks.
- `Fee`: fee events that may update shipment cost actual fee fields.
- `Abnormal`: abnormal case events stored for operator review.

The detail panel shows sanitized metadata and sanitized decrypted payload. It must not be used as a raw payload export.

## Reprocess

Only `PLATFORM_ADMIN` can reprocess events.

Reprocess is allowed only for:

- `FAILED`
- `UNMATCHED`

Reprocess does not call YunExpress create/cancel APIs. It only reruns internal dispatch from the already stored decrypted payload.

## Troubleshooting

- `invalid signature`: confirm `YUN_WEBHOOK_ENCRYPT_KEY` matches the Yuntu/YunExpress encryption policy key and that the request body is not modified by any proxy.
- `invalid request`: confirm the body is JSON and has the `encrypt` field.
- `disabled`: confirm `YUN_WEBHOOK_ENABLED` is not set to `false`.
- Event is `UNMATCHED`: the platform could not match it to an existing shipment/order/cost from safe identifiers. Review waybill, tracking, and customer order fields.
- Event is `FAILED`: open detail, review safe error/message, fix matching or data issue if needed, then reprocess.
