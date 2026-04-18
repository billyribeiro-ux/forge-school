---
number: 45
slug: checkout-endpoint
title: Build /checkout/[product]/+server.ts with Stripe Checkout Session
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 6
previous: 44
next: null
estimatedMinutes: 30
filesTouched:
  - src/lib/server/session.ts
  - src/routes/checkout/[product]/+server.ts
---

## Context

The `/pricing` Start-checkout form POSTs to `/checkout/<slug>` with a hidden `priceId` field. This lesson builds the endpoint that receives that POST, validates the request against the DB, creates an `orders` row, opens a Stripe Checkout Session, persists the session ID on the order, and redirects the buyer to Stripe's hosted Checkout.

Three boundaries this endpoint owns:

1. **Anonymous session cookie.** v1 is auth-free; every commerce action keys off an opaque `session_id` cookie. `src/lib/server/session.ts` owns the cookie's name, security attributes, and get-or-create logic.
2. **DB write is always first, Stripe call is second.** We create an `open` order BEFORE calling Stripe so that if Stripe fails, our DB has a record of the attempt. If the DB fails, we never call Stripe at all — no orphaned Stripe sessions.
3. **Metadata carries the forge_order_id into Stripe.** The webhook receiver (lesson 048) uses that metadata to correlate incoming events to our order rows. Without it, we'd have to search Stripe's metadata by Stripe session id — a round-trip we avoid by denormalizing our ID into Stripe upfront.

## The command

Create `src/lib/server/session.ts`:

```ts
import type { Cookies } from '@sveltejs/kit';

const COOKIE_NAME = 'forge_session';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

export function ensureSessionCookie(cookies: Cookies): string {
  const existing = cookies.get(COOKIE_NAME);
  if (existing !== undefined && existing !== '') return existing;
  const fresh = crypto.randomUUID();
  cookies.set(COOKIE_NAME, fresh, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_SECONDS
  });
  return fresh;
}
```

- **`httpOnly: true`** — JS can't read it, defusing XSS exfiltration.
- **`secure: true`** — only sent over HTTPS.
- **`sameSite: 'lax'`** — sent on top-level navigations (which Stripe's redirect back IS), blocked on cross-site embeds.
- **`maxAge: 1 year`** — matches a reasonable "same customer returning in 12 months" window.

Create `src/routes/checkout/[product]/+server.ts`. POST-only handler. Structure:

```ts
export const POST: RequestHandler = async ({ params, request, cookies }) => {
  // 1. Parse + validate priceId from form data
  const form = await request.formData();
  const priceId = form.get('priceId');
  if (typeof priceId !== 'string' || priceId === '') {
    error(400, { message: 'Missing priceId', errorId: 'checkout-missing-price' });
  }

  // 2. Validate product + price against DB (single join query)
  const [match] = await db.select({ product: products, price: prices })
    .from(products)
    .innerJoin(prices, eq(prices.productId, products.id))
    .where(and(
      eq(products.slug, params.product),
      eq(products.status, 'active'),
      eq(prices.id, priceId),
      eq(prices.active, true)
    ))
    .limit(1);
  if (match === undefined) error(404, { ... });

  // 3. Ensure the session cookie; use its value as the order's session_id
  const sessionId = ensureSessionCookie(cookies);

  // 4. Insert open order BEFORE calling Stripe
  const [order] = await db.insert(orders).values({
    sessionId,
    status: 'open',
    currency: match.price.currency,
    subtotalCents: match.price.unitAmountCents,
    discountCents: 0,
    totalCents: match.price.unitAmountCents
  }).returning();

  // 5. Create Stripe Checkout Session; mode depends on price interval
  const mode = match.price.interval === 'one_time' ? 'payment' : 'subscription';
  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: match.price.stripePriceId, quantity: 1 }],
    success_url: `${PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${PUBLIC_APP_URL}/pricing?cancelled=1`,
    client_reference_id: order.id,
    metadata: { forge_order_id: order.id, forge_session_id: sessionId, forge_product_slug: params.product },
    ...(mode === 'subscription' && match.price.trialPeriodDays !== null
      ? { subscription_data: { trial_period_days: match.price.trialPeriodDays, metadata: { ... } } }
      : {}),
    allow_promotion_codes: true
  });

  // 6. Mirror Stripe session id on the order
  await db.update(orders).set({
    stripeCheckoutSessionId: session.id,
    updatedAt: new Date()
  }).where(eq(orders.id, order.id));

  // 7. Redirect to Stripe's hosted Checkout
  if (session.url === null) error(500, { ... });
  redirect(303, session.url);
};
```

Key choices:

- **`client_reference_id: order.id`** — Stripe stores this on the session and surfaces it on every webhook event derived from the session. Gives us two lookup paths (via `stripe_checkout_session_id` or via `client_reference_id`) in case one is missing.
- **`metadata: { forge_order_id, forge_session_id, forge_product_slug }`** — the primary correlation mechanism. Every webhook handler reads these to correlate events back to DB rows.
- **`subscription_data.trial_period_days`** — only set when the price declares a trial. Stripe fails the Checkout request if you pass `trial_period_days` on a non-subscription price.
- **`allow_promotion_codes: true`** — enables Stripe's built-in coupon input on the checkout page. Coupons are the native Stripe object our schema mirrors; lesson 057 wires them.
- **`redirect(303, session.url)`** — SvelteKit's helper; 303 See Other is the correct status for POST-redirect-GET after a side effect.

Verify:

```bash
pnpm check
pnpm build
```
Expected: 0 errors. At build time, the Stripe client's test-key guard runs during SvelteKit's prerender analysis — `.env.local` must have a `sk_test_...`-shaped value (not the literal `sk_test_replace_me`) for the build to pass.

```bash
pnpm dev
```
Navigate to `/pricing`, click Start-checkout. Without real Stripe keys, the Stripe API returns an authentication error — visible in the dev server's pino log. With real keys, you're redirected to Stripe's hosted Checkout.

## Why we chose this — the PE7 judgment

**Alternative 1: Create the order AFTER Stripe session creation**
Orders exist only for successful Stripe sessions. Smaller database, cleaner "orders = purchases" semantics. Also loses the audit trail: a Stripe network error mid-checkout means we have no record of the attempt. The open-order-first pattern gives us an orphan to reconcile (a stripe-reconcile script visits open orders older than 30 minutes and cleans up), which is far better than a blind spot.

**Alternative 2: Pass `slug` alone; look up the product's default price**
The POST form already knows the price — passing it avoids a second lookup. It also protects against a UI rendering an archived price that the user clicks; the DB query re-validates `prices.active`. Defense in depth.

**Alternative 3: Use Stripe's low-level Payment Intent API instead of Checkout Sessions**
Payment Intents give you full control over the checkout UI but require building the whole frontend payment flow — Stripe Elements, 3DS handling, Apple Pay / Google Pay buttons. Checkout Session is a hosted page Stripe maintains. For v1 we want the fast path; Elements can come later when UI differentiation matters.

**Alternative 4: Skip `client_reference_id`; use metadata alone**
Metadata is the primary correlation mechanism. `client_reference_id` is a first-class column on Checkout Sessions — it shows up in the Stripe dashboard UI at a glance. Zero cost to populate both.

**Alternative 5: Use `redirect(302)` instead of `303`**
302 is "Found"; 303 is "See Other." 303 explicitly tells the client "use GET to fetch the new URL" — correct after a POST. Some clients treat them equivalently; 303 is the spec-correct choice.

The PE7 choice — session cookie helper + pre-Stripe DB write + metadata correlation + 303 redirect + subscription_data conditional — wins because it gives us audit trails, correlation on both sides, spec-correct HTTP, and minimum bespoke UI.

## What could go wrong

**Symptom:** Build fails with `[stripe] STRIPE_SECRET_KEY is not set`
**Cause:** SvelteKit's prerender analysis imports the Stripe client, which runs the boot guard. A placeholder `sk_test_replace_me` or empty value trips the guard.
**Fix:** Put a Stripe-test-shaped value in `.env.local`. For build-without-Stripe-account workflows, a placeholder like `sk_test_local_placeholder_not_a_real_key` passes the prefix check; actual API calls would fail at runtime, which is correct for local dev without keys.

**Symptom:** Stripe returns `You cannot pass trial_period_days for a PaymentIntent`
**Cause:** A one-time price with `trial_period_days` set. The spec's mode is `payment`; trials are a subscription-only concept.
**Fix:** The conditional `mode === 'subscription' && match.price.trialPeriodDays !== null` gates the `subscription_data` block. Confirm both conditions fire.

**Symptom:** Stripe returns `No such price: price_...`
**Cause:** The `stripePriceId` in the DB refers to a Stripe price that doesn't exist in your test-mode account (likely from a different Stripe account's seed run).
**Fix:** `pnpm db:reset && pnpm db:seed` — the seed script syncs Stripe + DB against your current account.

**Symptom:** Redirect produces infinite loop — `/checkout/<slug>` → `/pricing` → `/checkout/<slug>` → ...
**Cause:** The cancel URL is a prerendered static page, and a bot / crawler follows the Start-checkout form. Crawlers rarely POST, so this is unusual; more likely the response on a failure path is somehow re-triggering the form.
**Fix:** Ensure errors use `error(...)` (which returns a proper 4xx page), not `redirect(...)`. The redirect is only the happy path.

## Verify

```bash
# Files exist
ls src/lib/server/session.ts src/routes/checkout/\[product\]/+server.ts
pnpm check
```

```bash
pnpm build
```
Expected: 0 errors.

```bash
pnpm dev
```
Visit `/pricing`, click Start-checkout. Without real Stripe keys:
- Expect Stripe to reject with 401 in the pino log; order row created in DB with status='open' and stripe_checkout_session_id=null (because the update never ran).

With real Stripe test keys + `stripe listen` running:
- Expect redirect to `https://checkout.stripe.com/c/pay/...`
- Paying with `4242 4242 4242 4242` returns to `/checkout/success` (lesson 047)
- Webhook delivers `checkout.session.completed` to local dev (lesson 048)

## Mistake log — things that went wrong the first time I did this

- **Called Stripe BEFORE inserting the order.** When Stripe returned 401 during testing, I had no record the user had tried — the UI just bounced. Swapped the order: DB insert → Stripe call. If Stripe fails, the open order persists as the audit trail.
- **Hardcoded the `/checkout/success` URL template.** Stripe's placeholder syntax is `{CHECKOUT_SESSION_ID}` — a magic string Stripe replaces server-side. First draft used `:sessionId` (route-param style), which Stripe passed through as a literal.
- **Set `customer_email: undefined` explicitly.** Stripe's SDK types with `exactOptionalPropertyTypes: true` reject explicit undefineds on optional fields. Removed the line; Stripe auto-collects an email on subscription mode anyway.
- **Used `redirect(302)`.** Fine for GET-to-GET; the spec-correct status after a form POST is 303. Fixed to `redirect(303)`.
- **Forgot that `params.product` is the slug, not the product id.** First draft filtered `where products.id = params.product` and returned 0 matches every time. The URL is `/checkout/<slug>`; slug is the business key for humans, id is the internal key.

## Commit this change

```bash
git add src/lib/server/session.ts src/routes/checkout/\[product\]/+server.ts
git add curriculum/module-04-money/lesson-045-checkout-endpoint.md
git commit -m "feat(checkout): POST /checkout/[product] creates Stripe session + lesson 045"
```

Checkout is live end-to-end: `/pricing` → form POST → Stripe hosted Checkout. Lesson 046 was originally planned to cover the session creation separately, but since it's inseparable from the endpoint it ships here. Lesson 047 builds the `/checkout/success` landing page.
