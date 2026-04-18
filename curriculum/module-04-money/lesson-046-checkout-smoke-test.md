---
number: 46
commit: 26a8f45e7ab48480e1126636f9739f2a5ffadb22
slug: checkout-smoke-test
title: Smoke-test the full Stripe Checkout flow
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 7
previous: 45
next: 47
estimatedMinutes: 15
filesTouched: []
---

## Context

The checkout endpoint (lesson 045) is code-complete. Before we build the `/checkout/success` page (047) or the webhook receiver (048), we exercise the endpoint manually — confirm Stripe accepts the session, confirm our DB captures the Stripe session id, confirm the redirect lands on Stripe's hosted Checkout. A 15-minute smoke test now saves hours of webhook-handler debugging later, because the webhook won't fire at all unless the session creates successfully.

This lesson produces no new code. It's a verification protocol paired with a reading of the Stripe dashboard's logs.

## The command

Run the full local stack:

```bash
# Terminal 1: Docker Postgres
docker compose up -d --wait

# Terminal 2: Dev server
pnpm db:reset && pnpm db:seed && pnpm dev
```

(Swap `sk_test_...` placeholder in `.env.local` for your real Stripe test-mode secret key before this step — without real keys, Stripe returns 401 and the smoke test stops at the redirect.)

In a browser, navigate to `http://localhost:5173/pricing`. Three product cards render. Click **Start checkout** on the Lifetime card.

Expected sequence:

1. Browser POSTs to `/checkout/forgeschool-lifetime`.
2. Endpoint validates product + price against DB.
3. Endpoint ensures session cookie (check DevTools → Application → Cookies → `forge_session`).
4. Endpoint inserts `orders` row with status=`open`.
5. Endpoint calls Stripe; gets back a session object with a `url` field.
6. Endpoint updates orders.stripe_checkout_session_id.
7. Endpoint redirects (303) to `https://checkout.stripe.com/c/pay/...`.
8. Browser lands on Stripe's hosted Checkout showing ForgeSchool — Lifetime · $497.

Fill in the card:

- **Card number:** `4242 4242 4242 4242`
- **Expiration:** any future month/year (e.g., `12/30`)
- **CVC:** `123`
- **Email:** any valid email

Click **Pay**. Stripe processes, redirects to `http://localhost:5173/checkout/success?session_id=cs_test_...`. The page 404s (lesson 047 builds it) but the session_id in the URL proves Stripe completed the flow.

Verify server-side:

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT id, session_id, status, stripe_checkout_session_id, total_cents FROM orders ORDER BY created_at DESC LIMIT 1;"
```

Expected: one row with status=`open`, `stripe_checkout_session_id=cs_test_...`, total_cents=49700.

Verify in the Stripe dashboard at https://dashboard.stripe.com/test/payments:

1. A recent Payment line with ForgeSchool — Lifetime
2. Click through → **Metadata** tab
3. Confirm `forge_order_id`, `forge_session_id`, `forge_product_slug`

Three correlation keys present = the webhook receiver (lesson 048) can always match events to our DB rows.

Subscription smoke test — same flow, Pro Monthly card:

- Card: `4242 4242 4242 4242`
- Post-pay redirect to `/checkout/success`
- Stripe dashboard: subscription created in trialing state (7-day trial per seed spec)
- Local DB: orders row with status=`open`, `mode=subscription` inferrable from the Stripe session

Once this pass is clean, subsequent lessons can focus on the webhook side with confidence the checkout half works end-to-end.

## Why we chose this — the PE7 judgment

**Alternative 1: Skip manual smoke; go straight to Playwright E2E**
Playwright tests are in Module 4's later lessons (058-061). A manual smoke before writing tests catches issues that would cause the tests themselves to be flaky — a misconfigured env, a wrong Stripe account, a blocked cookie. Manual first, automated second.

**Alternative 2: Test against Stripe's API using curl/HTTPie without opening a browser**
Works for server-to-Stripe validation. Doesn't exercise the cookie-flow, the form-POST handling, or the hosted Checkout UI. The browser is part of the test surface.

**Alternative 3: Make this a lesson on using the Stripe CLI's `trigger` command**
`stripe trigger checkout.session.completed` fires a synthetic event without going through the checkout UI. Useful for testing webhook handlers in isolation (next lesson), but doesn't exercise the checkout endpoint at all. Different concern.

The PE7 choice — a documented manual-verification protocol — wins because it builds confidence in the session creation path before we invest in webhook handlers and tests that depend on it.

## What could go wrong

**Symptom:** Browser lands on Stripe's Checkout but gets a blank page
**Cause:** Stripe's Checkout blocks your domain, or the session is in "archived" state.
**Fix:** Confirm the session URL returned from the endpoint starts with `https://checkout.stripe.com`. Confirm `PUBLIC_APP_URL` in `.env.local` matches the port SvelteKit is serving on (default 5173). Stripe bases its CSP / origin allow-list on the URL you provide.

**Symptom:** DB has an `orders` row with `stripe_checkout_session_id=null`
**Cause:** Stripe returned an error between the INSERT and the UPDATE. Inspect the error via:
```bash
tail -f /tmp/dev-log.txt
```
Common causes: wrong `STRIPE_SECRET_KEY` (401 Unauthorized), wrong `stripe_price_id` in the DB (doesn't exist in your Stripe account). Re-seed.

**Symptom:** Stripe dashboard metadata tab is empty
**Cause:** The `metadata` field in `sessions.create` was omitted or passed as an empty object.
**Fix:** Review the endpoint. The `metadata: { forge_order_id, forge_session_id, forge_product_slug }` block must be present. Also verify the values are non-empty strings — Stripe silently drops metadata whose values are empty.

**Symptom:** Pay button on Stripe Checkout does nothing
**Cause:** Stripe's test-mode Checkout requires a card. Insufficient field fill-in.
**Fix:** Fill every required field (card, expiration, CVC, email). Stripe enables Pay only after all validations pass.

## Verify

```bash
# After the manual flow, the DB has the expected order row
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT count(*) FILTER (WHERE stripe_checkout_session_id IS NOT NULL) FROM orders;"
```
Expected: at least 1 (one per smoke-test click).

```bash
# Stripe dashboard link
open https://dashboard.stripe.com/test/payments
```
Expected: recent Payment rows matching your smoke-test clicks.

## Mistake log — things that went wrong the first time I did this

- **Used `PUBLIC_APP_URL=http://localhost:5173/` with the trailing slash.** Stripe appended its placeholder to produce `http://localhost:5173//checkout/success?...` — double slash. SvelteKit handled it by redirecting, but the extra hop was noise. Trimmed to `http://localhost:5173` (no trailing slash). Matches the `.env.example` default.
- **Forgot to restart `pnpm dev` after changing `.env.local`.** Env is read at server start; key rotations don't live-reload. Ctrl+C, `pnpm dev`, retry.
- **Opened the Stripe dashboard in live mode by accident.** Didn't see my test payments. Toggled to test mode (top-left in the dashboard); smoke test rows appeared.
- **Expected the cookie to be visible in DevTools immediately.** Chrome's Cookies tab caches; sometimes a refresh is needed. Hit F5 on the DevTools Application → Cookies panel; the `forge_session` cookie appeared.

## Commit this change

No code change. Commit the lesson doc only:

```bash
git add curriculum/module-04-money/lesson-046-checkout-smoke-test.md
git commit -m "docs(checkout): manual smoke test protocol + lesson 046"
```

With the happy path verified, lesson 047 builds the `/checkout/success` landing page — polite confirmation only; the grant happens in the webhook.
