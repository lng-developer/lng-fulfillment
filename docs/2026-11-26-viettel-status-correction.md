# Viettel Post shipment status correction

- Manual VP creation keeps the order IN_PROCESSING. Package dimensions must not implicitly confirm warehouse dispatch.
- The server rejects VP ship confirmation without carrier handoff evidence and an IN_TRANSIT/DELIVERED shipment.
- Creation timestamps are not handoff timestamps. Bulk tracking and inbound VP updates preserve the mapped carrier status; error status 4 maps to EXCEPTION.
- Inbound updates only update the matching non-cancelled VP shipment. They do not publish marketplace tracking without handoff evidence.
- Orders show a carrier-error warning when the latest shipment is EXCEPTION.
- Current configured VN-US routing rejects non-US destinations before carrier creation. AU routing remains unsupported in this integration until a valid ACC2 quote can be obtained; this does not assert that VP does not offer AU service.

Validation: adapter tests (destination guard, error mapping, creation date), mocked repository checks (tenant scope, cancellation guard, no fabricated handoff), lint and typecheck. No shipment creation/cancellation during verification.

ACC2 rate lookup for AU returned conflicting state validation: QLD rejected for length, QL rejected with suggested state QLD. This requires VP clarification before configuring an AU route. Quotes used a 100g probe, not a change to the existing order.

Existing order 4242332325 requires a scoped, audited correction after deployment: preserve EPK2280946365 and its label; verify latest VP status/account; change the local shipment to EXCEPTION and remove the handoff timestamp only if it has no carrier-event evidence. Do not resend until the original shipment is reconciled and the AU route is confirmed. Existing data has not been changed by this patch.
