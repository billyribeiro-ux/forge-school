# ForgeSchool — Stripe setup

**Scope:** How Stripe is wired into ForgeSchool v1. Account setup, key management, test-mode discipline, local webhook forwarding, test card numbers. Read this before any Stripe-touching lesson.

---

## 1. Posture: test mode only in v1

v1 ships **without live Stripe keys**. The only Stripe credentials this codebase ever sees start with `sk_test_` (secret) or `pk_test_` (publishable). The runtime refuses to boot when a key without the `test_` segment is presented — see `src/lib/server/stripe/client.ts` (lesson 041).

Why: a course about building a commerce platform should not be able to accidentally charge a reader. Test mode uses real Stripe APIs with fake money; every checkout flow, subscription lifecycle, coupon calculation, and refund path works identically to live mode. When the student eventually ships to production, swapping the keys is the entire code change.

## 2. Account setup

1. Create a Stripe account at https://dashboard.stripe.com/register. Use a real email; you can use the same Stripe account for v1 and future live work.
2. Confirm the email. You land on the Stripe Dashboard with the **"Test mode"** toggle in the top nav. Keep it **on** for the duration of this course.
3. Go to **Developers → API keys**. Stripe shows two test-mode keys:
   - **Publishable key** (`pk_test_...`) — safe to embed in the browser bundle.
   - **Secret key** (`sk_test_...`) — server-only; never commit.
4. Click "Reveal test key" on the secret. Copy it to `.env.local`:

   ```bash
   STRIPE_SECRET_KEY="sk_test_51Abc..."
   PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51Abc..."
   ```

5. The webhook secret (`STRIPE_WEBHOOK_SECRET`) comes from the Stripe CLI, not the dashboard. Lesson 042 covers it.

## 3. Test card numbers

Stripe's test-mode accepts these PAN sequences. All CVCs are `123`; all expiration dates are any future month/year:

| Scenario | Card number |
|---|---|
| Successful charge | `4242 4242 4242 4242` |
| Requires authentication (3DS) | `4000 0025 0000 3155` |
| Declined — generic | `4000 0000 0000 0002` |
| Declined — insufficient funds | `4000 0000 0000 9995` |
| Disputed charge | `4000 0000 0000 0259` |

Full list: https://stripe.com/docs/testing#cards

## 4. Dashboard navigation for this project

- **Products** (https://dashboard.stripe.com/test/products) — the seed script (lesson 043) creates products here. Do NOT create products manually in the dashboard; the seed is the source of truth.
- **Payments** (https://dashboard.stripe.com/test/payments) — every successful Checkout Session lands here. Useful for debugging failed webhook deliveries.
- **Webhooks** (https://dashboard.stripe.com/test/webhooks) — we don't register webhooks in the dashboard for local dev (the CLI forwards from Stripe to localhost). In production, this is where the production webhook endpoint is declared.
- **Developers → Logs** — every API call from our codebase appears here with full request/response payloads. Invaluable for debugging.

## 5. Test mode ≠ production safety

Test mode protects against real money moving. It does NOT protect against:
- Shipping `sk_test_...` to public code (it's not a secret in production, but leaking keys teaches bad habits).
- Hard-coding prices / Stripe IDs instead of seeding them.
- Grant-on-success-URL patterns (the success URL can fire without a payment succeeding — the webhook is the only source of truth).

Every one of these is rejected by the architecture in Module 4. See `docs/ARCHITECTURE.md §4.3` for the grant-truth rule.

## 6. Change log

- **2026-04-18** — Initial draft; tracks the Stripe test-mode setup for Module 4.
