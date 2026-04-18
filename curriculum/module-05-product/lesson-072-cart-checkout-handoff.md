---
number: 72
slug: cart-checkout-handoff
title: Hand the cart off to Stripe Checkout
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 10
previous: 71
next: null
estimatedMinutes: 25
filesTouched:
  - src/routes/cart/checkout/+server.ts
  - src/routes/cart/+page.svelte
---

## Context

The single-product handoff already exists (`POST /checkout/[product]`, from lesson 045). The cart is the multi-product equivalent: one endpoint, N line items, one Stripe session, one redirect.

The endpoint re-validates every line item against the DB before building the Stripe session. A cart cookie can be tampered with — we never trust the unit amount from the cookie, always re-read `prices.unitAmountCents` from Postgres. If the cookie references an `active = false` price or an `archived` product, the request aborts with a 400 rather than silently drop items.

Stripe imposes two hard constraints we encode at the boundary: (1) a session can't mix subscription + one-time prices; (2) a session is single-currency. Both are 400s here with unambiguous `errorId`s so a support reply can quote the code.

The entitlement is granted downstream — the webhook (lesson 049) already dispatches on `checkout.session.completed`. Nothing here mutates `entitlements`.

## The command

`src/routes/cart/checkout/+server.ts`:

```ts
export const POST: RequestHandler = async ({ cookies }) => {
  const raw = cookies.get(CART_COOKIE_NAME);
  const items = deserializeCart(raw);
  if (items.length === 0) error(400, { message: 'Cart is empty', errorId: 'cart-checkout-empty' });

  // Re-validate every item against the live DB.
  const priceIds = [...new Set(items.map((i) => i.priceId))];
  const priceRows = await db.select({ price: prices, product: products })
    .from(prices)
    .innerJoin(products, eq(prices.productId, products.id))
    .where(and(
      inArray(prices.id, priceIds),
      eq(prices.active, true),
      eq(products.status, 'active')
    ));
  const priceById = new Map(priceRows.map((r) => [r.price.id, r]));
  if (priceById.size !== priceIds.length) {
    error(400, { message: 'One or more cart items are no longer available', errorId: 'cart-checkout-stale-items' });
  }

  // Stripe: single mode + single currency.
  const firstInterval = priceById.get(items[0]!.priceId)!.price.interval;
  const mode: 'payment' | 'subscription' =
    firstInterval === null || firstInterval === 'one_time' ? 'payment' : 'subscription';
  // …loop every item, 400 on mode mismatch; same for currency.

  // Persist open order + order_items.
  const [order] = await db.insert(orders).values({ sessionId, status: 'open', currency, subtotalCents, totalCents: subtotalCents, discountCents: 0 }).returning();
  await db.insert(orderItems).values(items.map((it) => ({ orderId: order.id, priceId: it.priceId, quantity: it.quantity, unitAmountCents: priceById.get(it.priceId)!.price.unitAmountCents })));

  // Create Stripe session.
  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: items.map((it) => ({ price: priceById.get(it.priceId)!.price.stripePriceId, quantity: it.quantity })),
    success_url: `${PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${PUBLIC_APP_URL}/cart?cancelled=1`,
    client_reference_id: order.id,
    metadata: { forge_order_id: order.id, forge_session_id: sessionId, forge_cart_checkout: '1' },
    allow_promotion_codes: true,
    ...(mode === 'subscription' ? { subscription_data: { metadata: {…}, ...(trialDays !== null && { trial_period_days: trialDays }) } } : {})
  });

  await db.update(orders).set({ stripeCheckoutSessionId: session.id, updatedAt: new Date() }).where(eq(orders.id, order.id));
  redirect(303, session.url!);
};
```

`src/routes/cart/+page.svelte` — swap the `<a href="/cart/checkout">` for a `<form method="POST" action="/cart/checkout">` so the endpoint actually receives the request.

```bash
pnpm check
pnpm build
```

## Why we chose this — the PE7 judgment

**Alternative 1: Trust the cookie's `unitAmountCents`.**
The cookie is user-writable. A malicious client can rewrite their cart to pay $0.01 for a $497 product. Always re-read prices server-side.

**Alternative 2: Store the cart in Postgres (`carts` + `cart_items`) as the source of truth.**
The schema already has those tables; a future milestone may flip to DB-backed carts for shared-household access. For v1, cookie + server-validation hits 99% of the value at 10% of the code.

**Alternative 3: Silently drop stale items and proceed.**
Users would see a checkout total different from the cart total with no explanation. 400 + clear errorId lets the UI re-read fresh prices and ask the user to retry.

**Alternative 4: One Stripe session per line item (loop the create call).**
Stripe supports multi-line sessions; splitting defeats combined discounts (Checkout-native promo codes), multiplies webhook events, and creates orphaned open orders. Use the one-session pattern.

The PE7 choice — **server re-validates, single session per cart, mode + currency guards, 400 on drift** — wins on integrity, auditability, and future-proofness.

## What could go wrong

**Symptom:** Checkout returns 400 `cart-checkout-stale-items` for a cart that looks correct
**Cause:** A price was toggled to `active = false` (admin tool) or the product status moved to `archived`; cookie still references the stale id.
**Fix:** Re-add the item from the product detail page — the browse surface only shows active items. Or clear the cart.

**Symptom:** Stripe rejects the session with "you can't mix subscription and one-time items"
**Cause:** A tampered cookie slipped past — or a product was re-kinded without a price cleanup.
**Fix:** The `cart-checkout-mixed-modes` 400 should fire first. If Stripe sees it, the mode guard was bypassed; audit the `thisMode` loop for correctness.

**Symptom:** `orders.stripeCheckoutSessionId` is null after a successful session
**Cause:** The session was created but the UPDATE failed silently (e.g., the DB transaction got rolled back by an error downstream).
**Fix:** The UPDATE happens after `stripe.checkout.sessions.create`. If Stripe succeeded but the UPDATE errored, the order is orphaned until the webhook matches by `client_reference_id`. The webhook handler (lesson 049) already tolerates this.

**Symptom:** `error(400, …)` inside the POST throws a TypeScript error that `redirect`/`error` don't return `never`
**Cause:** SvelteKit's `error` is typed as `(status, opts) => never` — calling it returns `never`, so `priceById.get(id)!` is a legal non-null assertion after the guard. TS still complains if the flow inference can't see the throw.
**Fix:** Keep `!` non-null assertions for indexed lookups that a guard already checked; or narrow with an explicit `if (row === undefined) error(…)`.

## Verify

```bash
pnpm check
pnpm build
pnpm dev
stripe listen --forward-to localhost:5173/api/webhooks/stripe   # in another terminal
```

Manual smoke:
1. Add two products to the cart (both lifetime).
2. Hit `/cart` → Checkout.
3. Complete the Stripe-hosted flow with card `4242 4242 4242 4242`.
4. Observe the webhook fires, the order status transitions, the entitlement is granted.

Mixed-mode test:
1. Add a subscription product + a lifetime product.
2. Checkout → 400 `cart-checkout-mixed-modes`.

## Mistake log

- **First draft built the Stripe line items from the cookie's `unitAmountCents`.** That would let a tampered cookie change the unit amount in the session. Switched to reading from `priceById` exclusively and passing only `stripePriceId` + quantity to Stripe.
- **Stripe's TypeScript named-type paths have moved around across SDK versions.** Tried `Stripe.Checkout.SessionCreateParams` and got a `has no exported member` error from the barrel re-exports. Dropped the named annotation and relied on inline inference against `stripe.checkout.sessions.create`.
- **Forgot the `inArray` import from drizzle-orm.** The unique-priceId set was the right approach; IN clause needs `inArray`, not a chain of `or(eq, eq, …)`.
- **Used `redirect(302, …)` first** — the SvelteKit convention for a POST → GET transition is `303 See Other`. Swapped.

## Commit

```bash
git add src/routes/cart/checkout/ src/routes/cart/+page.svelte
git add curriculum/module-05-product/lesson-072-cart-checkout-handoff.md
git commit -m "feat(cart): Stripe checkout session from cart + lesson 072"
```

Cart pipeline is one lesson from complete: next we let the user type a coupon code and watch the total fall.
