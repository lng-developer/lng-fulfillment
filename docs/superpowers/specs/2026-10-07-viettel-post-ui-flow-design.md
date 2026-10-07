# Viettel Post shipment UI flow

## Goal

Let an Owner, Admin, or Operator create a Viettel Post shipment from an existing
Fulfillment order without exposing carrier credentials or accidentally using the
legacy YunExpress-only shipment form.

## Scope

The existing order shipping entry point will create or open a draft shipment.
The shipment detail flow will then select the carrier and execute it:

1. The operator selects `VIETTEL_POST` or `YUNEXPRESS_OMS` for the draft.
2. For Viettel Post, the UI collects only operational data that is not already
   present on the order: weight, dimensions, HS code, and declared item value.
3. Preflight validates the selected carrier, tenant-scoped encrypted credential,
   live-enabled state, and required shipment data without making a carrier call.
4. A live Viettel Post action requires the explicit text
   `CREATE VIETTEL POST SHIPMENT` before execution.
5. The existing generic shipment execution endpoint persists carrier shipment
   id, tracking number, and label URL; existing tracking sync continues to send
   lifecycle updates to LNG.

## Carrier credentials

Carrier credentials remain tenant-scoped encrypted records managed in Settings.
The order and shipment UI may show whether a credential is configured, but must
never read, display, log, or transmit its secret fields to the browser.

## Batch behavior

The existing `Ship selected` batch flow remains YunExpress-only. Batch Viettel
Post creation is deliberately out of scope until a single live VP shipment has
been verified with production credentials, carrier response, and label handling.

## Changes

- Replace YunExpress-specific labels and hard-coded carrier selections in the
  draft/preflight/execute UI with the selected carrier.
- Add a VP preflight mapper which checks local data and credential status only.
- Reuse the registered VP adapter for execution; do not add a second VP API
  client or put credentials in environment variables for the user flow.
- Keep the legacy YunExpress modal isolated or route it to the generic draft
  flow so it cannot submit a VP-selected order to YunExpress.

## Errors and safety

- Missing VP data, missing credential, or disabled live mode blocks execution
  with a safe actionable message.
- The live confirmation identifies Viettel Post and says that carrier charges
  may apply.
- Idempotent shipment execution and audit events remain the server source of
  truth; a duplicate click must not create a second carrier order.

## Verification

- Unit tests: VP preflight accepts complete local data and rejects each missing
  required field without calling the VP network.
- UI tests: the carrier selection changes the confirmation copy and never
  exposes credential values.
- Focused shipment tests plus typecheck must pass. Production validation uses
  one explicitly selected order only after production credentials are provisioned.
