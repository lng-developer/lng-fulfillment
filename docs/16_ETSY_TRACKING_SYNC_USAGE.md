# Etsy Tracking Sync Usage

This document explains how to manually sync existing Etsy shipment tracking
numbers from Fulfillment Platform v2 back to the Portal.

## Purpose

Use this script when Etsy orders already have `trackingNumber` stored in
Fulfillment Platform, but Portal has not received the tracking update yet.

The script:

- Reads Etsy orders from the Fulfillment Platform database.
- Selects only orders with `sourceChannel = ETSY`.
- Uses the latest shipment that has a non-empty `trackingNumber`.
- Sends tracking to Portal through the existing `sendPortalTrackingUpdate`
  service.
- Does not call YunExpress.
- Does not create shipments.
- Does not update Fulfillment Platform database records.

## Command

```bash
npm run sync:etsy-tracking -- --dry-run
```

Dry-run is the default mode. It only prints candidates and does not call Portal.

## Common Usage

Preview the first 100 eligible Etsy orders:

```bash
npm run sync:etsy-tracking -- --dry-run
```

Preview one order:

```bash
npm run sync:etsy-tracking -- --orderId=4088505825 --dry-run
```

Sync one order to Portal:

```bash
npm run sync:etsy-tracking -- --orderId=4088505825 --execute
```

Sync up to 100 eligible Etsy orders:

```bash
npm run sync:etsy-tracking -- --execute
```

Sync all eligible Etsy orders:

```bash
npm run sync:etsy-tracking -- --all --execute
```

Restrict to one tenant:

```bash
npm run sync:etsy-tracking -- --tenantId=<tenant-id> --dry-run
npm run sync:etsy-tracking -- --tenantId=<tenant-id> --execute
```

## Options

- `--dry-run`: preview only. Default.
- `--execute`: call Portal tracking update endpoint.
- `--all`: process every eligible Etsy order instead of the default limit.
- `--limit=<number>`: limit scanned order rows. Default is `100`.
- `--tenantId=<id>`: restrict to one tenant.
- `--orderId=<id>`: restrict to one Etsy order number or external order id.
- `--help`: print usage help.

## Selection Rules

An order is eligible when:

- `sourceChannel` is `ETSY`.
- It has at least one shipment with a non-empty `trackingNumber`.

The script sends:

- `orderId`: `order.orderNumber` if present, otherwise `order.externalOrderId`.
- `tracking`: latest shipment `trackingNumber`.
- `sourceChannel`: `ETSY`.

## Safety Checklist

Before running `--execute`:

- Run a dry-run first.
- Prefer testing one order with `--orderId`.
- Verify the DB target is the intended environment.
- Verify `PORTAL_ETSY_TRACKING_BASE_URL` if you need a non-default Portal base URL.
- Do not print or commit secrets.
- Do not run against production unless the operation is approved.

## Notes

The Portal Etsy tracking endpoint is currently unauthenticated. The script does
not send `Authorization`, cookies, API keys, or carrier credentials.

Failures for one order do not stop the rest of the batch. The final summary
prints delivered, failed, and skipped counts.
