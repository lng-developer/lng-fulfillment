# Reset an order for resubmission

Approved scope: verify cancellation with the old carrier account, retain shipment identifiers and history, stop pending automation, return the order to FULFILLED, and use the existing Ship dialog to select the new account. No schema change or automatic resubmission.

- Verify every existing external shipment through its carrier adapter. Legacy shipments require an explicit old account; never silently use the default. Only confirmed CANCELLED authorizes reset, not a cancellation-request event.
- Persist cancellation, order transition, automation stop, and audit atomically. Reject concurrent state changes and PROCESSING automation. Preserve tracking, labels, carrier account and actual ship evidence as historical data.
- Prevent tracking sync from resurrecting archived shipments or attaching their tracking to a replacement.
- Test verification failure, identity mismatch, tenant scope, historical data preservation and concurrency. Use mocked carrier responses only.
