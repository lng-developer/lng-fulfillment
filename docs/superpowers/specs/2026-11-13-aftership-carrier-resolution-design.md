# AfterShip carrier resolution

## Intent

When a Viettel Post shipment gains a tracking number, Fulfillment resolves its
last-mile carrier with AfterShip so Portal receives an Amazon-usable carrier.

## Scope

- Fulfillment owns the AfterShip call and persists the resolved carrier code.
- Portal keeps consuming `carrierCode` from its existing Fulfillment order
  status endpoint; it gains no AfterShip dependency.
- The resolver runs from the existing tracking sync flow for shipments with a
  tracking number and `carrierCode` `VIETTEL_POST`.
- `AFTERSHIP_API_KEY` is a server-only runtime secret. It is never persisted,
  returned, logged, or added to source control.

## Behaviour

1. The existing tracking sync obtains the tracking number from Viettel Post.
2. If AfterShip's first detected courier is `usps`, update the shipment's
   `carrierCode` to `USPS` before the Portal callback or Portal polling reads it.
3. If the key is absent, detection fails, or the preferred courier is not
   `usps`, keep `VIETTEL_POST`; tracking sync still succeeds.
4. Do not create AfterShip tracking records, add a schema/migration, or
   overwrite a non-Viettel carrier.

## Approaches considered

- Portal-side resolution: smaller initial diff, but makes Portal own a
  Fulfillment/carrier concern. Rejected.
- Fulfillment-side resolution: keeps the existing tracking owner and Portal
  contract intact. Chosen.
- New generic resolver persistence model: useful later, but needs schema and
  retry design beyond this scope. Rejected.

## Verification

- Unit test: USPS first candidate changes the carrier code.
- Unit test: missing key, failed request, or another courier keeps the original
  carrier and does not break tracking sync.
- Run affected tests, typecheck, lint, and build. No live carrier calls in tests.
