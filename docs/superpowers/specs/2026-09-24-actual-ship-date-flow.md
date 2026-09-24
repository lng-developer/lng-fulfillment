# Actual Ship Date Flow

## Goal

Confirm Amazon MFN shipments only after a carrier event proves the package was handed off. The submitted ship date must be derived from that event, never entered arbitrarily or inferred from tracking creation.

## Source of truth

LNG Fulfillment consumes YunExpress tracking events. It derives `actualShipAt` from the earliest qualifying event:

- qualifying: normalized `IN_TRANSIT`, or a provider event explicitly classified as pickup/accepted;
- not qualifying: `TRACKING_PENDING`, `Shipment information received`, and label-created events.

The first qualifying timestamp is immutable once stored. Its event code, message, location, provider timezone, and source are stored as evidence.

## Data contract

Fulfillment persists `actualShipAt` and its evidence on `Shipment`. Its callback to legacy LNG sends:

```json
{
  "orderId": "...",
  "tracking": "...",
  "carrier": "...",
  "fulfillment": "LNG Group",
  "actualShipAt": "2026-09-18T20:20:23-05:00",
  "shipEvidence": { "eventCode": "...", "message": "...", "source": "carrier_event" }
}
```

Legacy LNG persists the fields on every relevant `items.tracking_info` record. Existing callbacks without `actualShipAt` remain supported but cannot produce Amazon-upload candidates.

## Amazon candidate and submission

An order item is eligible only when it has an order item ID, positive quantity, tracking number, carrier, and `actualShipAt`. LNG converts the timestamp to `America/Los_Angeles` and uses that calendar date as the ConfirmShipment `ship-date`.

The review UI displays the derived date and evidence. It does not accept a free-form replacement date. Each submission is idempotent by order item and tracking; an ambiguous post-upload timeout becomes `unknown` and cannot be automatically resent.

The Extension remains responsible only for Seller Central browser authentication and submitting the reviewed TSV. A successful HTTP request is `submitted`; it becomes `completed` only after Amazon's feed result is known.

## Initial backfill

After deployment, a read-only tracking sync runs for eligible LNG Group shipments. For `114-8657036-8948248`, the observed carrier pickup on 2026-09-18 qualifies; its Amazon ship date is 2026-09-18 after Los Angeles conversion.

No Amazon upload is initiated by the backfill. It only makes eligible rows available for review.

## Verification

- Unit tests cover qualifying and non-qualifying event classification plus timezone conversion.
- Contract tests cover Fulfillment callback and legacy persistence.
- One manual review verifies the initial order appears with derived date and evidence.
- One explicitly reviewed Amazon submission verifies task, submitted result, and final processing result.
