# Commercial phases and billing

The public application configuration lives in `frontend/src/config/billing.js`.
Change `BILLING_CONFIG.currentPhase` to `beta`, `launch_offer`, or `paid` and edit
the dates and prices in that same object. Dates accept ISO 8601 strings or `null`.

The server keeps a private security mirror in `private.commercial_config`. When a
phase changes, update that singleton row at the same time so new-user eligibility
is assigned securely. Browser clients have no write permission on this table or
on `public.subscriptions`.

## Current behavior

- `beta`: essential manual tools are free; premium and automatic tools are locked.
- `launch_offer`: eligible beta users can be shown Pro at EUR 4.99 for month one,
  then EUR 19.99/month. Eligibility is stored but checkout remains disabled.
- `paid`: Essential is EUR 9.99/month and Pro is EUR 19.99/month.

No payment is currently simulated. `/api/billing/checkout` returns HTTP 503 until
Stripe is implemented. A trusted Stripe webhook must be the only writer for plan,
status, offer usage, renewal date, and cancellation state.

## Stripe TODO

1. Create monthly Essential and Pro prices in Stripe.
2. Create a first-month promotion for eligible beta users.
3. Implement Checkout Session creation after validating the authenticated user.
4. Implement and verify signed webhook events for subscription lifecycle changes.
5. Implement Stripe Customer Portal for plan changes and cancellation.
6. Add idempotency and persist Stripe customer/subscription IDs.
7. Add integration tests for checkout, failed payment, renewal, upgrade, downgrade,
   cancellation, and offer reuse prevention.

Server-only environment variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_ESSENTIAL_PRICE_ID`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_PRO_LAUNCH_COUPON_ID`

Never expose these variables through `REACT_APP_*`.
