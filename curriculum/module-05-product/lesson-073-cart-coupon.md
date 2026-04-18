---
number: 73
slug: cart-coupon
title: Apply a coupon in the cart + Stripe mirror
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 11
previous: 72
next: null
estimatedMinutes: 30
filesTouched:
  - src/lib/cart/coupons.ts
  - src/lib/server/stripe/coupons.ts
  - src/routes/cart/+page.server.ts
  - src/routes/cart/+page.svelte
  - src/routes/cart/checkout/+server.ts
---

## Context

Coupons live in our DB (lesson 057 seeded 12). Stripe has its own coupon primitive. Until now the two systems haven't touched — DB coupons drove what we could SHOW; Stripe coupons drove what we could CHARGE.

This lesson closes the gap. Three moving parts:

1. **`computeCouponDiscount`** — a pure function that decides whether a given coupon applies to a given subtotal, returning a discriminated-union result (`{ok: true, discountCents, coupon}` or `{ok: false, reason}`). Zero side effects; unit tests (lesson 088) target this directly.
2. **Cart-page form actions** — `?/apply` + `?/remove` set/clear a `forge_coupon` cookie. The `load` reads the cookie, runs the pure function against the current cart subtotal, and exposes `appliedCoupon` to the Svelte template.
3. **`ensureStripeCoupon`** — a lazy Stripe mirror. The first time a DB coupon is used in a checkout, we call `stripe.coupons.create`, stash the resulting id on our row, and reuse it on every subsequent checkout.

The `/cart/checkout` endpoint then either passes `discounts: [{coupon: stripeCouponId}]` to the Stripe session OR leaves `allow_promotion_codes: true` open — Stripe forbids both in the same call.

## The command

`src/lib/cart/coupons.ts`:

```ts
export function computeCouponDiscount(coupon: Coupon, subtotalCents: number, now = new Date()): ApplyCouponResult {
  if (!coupon.active) return { ok: false, reason: 'inactive' };
  if (coupon.validFrom && coupon.validFrom > now) return { ok: false, reason: 'not_yet_valid' };
  if (coupon.validUntil && coupon.validUntil <= now) return { ok: false, reason: 'expired' };
  if (coupon.maxRedemptions !== null && coupon.redemptionsCount >= coupon.maxRedemptions) return { ok: false, reason: 'max_redemptions_reached' };
  if (subtotalCents <= 0) return { ok: false, reason: 'subtotal_zero' };
  const raw = coupon.discountType === 'percent'
    ? Math.floor((subtotalCents * coupon.discountValue) / 100)
    : coupon.discountValue;
  return { ok: true, discountCents: Math.min(raw, subtotalCents), coupon };
}
```

`src/routes/cart/+page.server.ts` — `load` + two actions:

```ts
export const load = async ({ cookies }) => {
  const code = cookies.get(COUPON_COOKIE_NAME);
  if (!code) return { appliedCoupon: null };
  const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (!coupon) { cookies.delete(COUPON_COOKIE_NAME, { path: '/' }); return { appliedCoupon: null }; }
  const items = deserializeCart(cookies.get(CART_COOKIE_NAME));
  const result = computeCouponDiscount(coupon, subtotalCents(items));
  if (!result.ok) return { appliedCoupon: null, couponError: failureMessage(result.reason) };
  return { appliedCoupon: { code: coupon.code, discountCents: result.discountCents, discountType: coupon.discountType, discountValue: coupon.discountValue } };
};

export const actions = {
  apply: async ({ request, cookies }) => { /* validate + cookies.set */ },
  remove: async ({ cookies }) => { cookies.delete(COUPON_COOKIE_NAME, { path: '/' }); return { removed: true }; }
};
```

`src/lib/server/stripe/coupons.ts`:

```ts
export async function ensureStripeCoupon(db: Db, coupon: Coupon): Promise<string> {
  if (coupon.stripeCouponId !== null) return coupon.stripeCouponId;
  const stripeCoupon = await stripe.coupons.create({
    name: coupon.code,
    duration: coupon.duration,
    ...(coupon.durationInMonths !== null && { duration_in_months: coupon.durationInMonths }),
    ...(coupon.maxRedemptions !== null && { max_redemptions: coupon.maxRedemptions }),
    ...(coupon.discountType === 'percent'
      ? { percent_off: coupon.discountValue }
      : { amount_off: coupon.discountValue, currency: 'usd' })
  });
  await db.update(coupons).set({ stripeCouponId: stripeCoupon.id, updatedAt: new Date() }).where(eq(coupons.id, coupon.id));
  return stripeCoupon.id;
}
```

`src/routes/cart/checkout/+server.ts` — read the `forge_coupon` cookie, resolve coupon, call `ensureStripeCoupon`, persist `discountCents` + `couponId` on the order, insert a `couponRedemptions` row, pass `discounts: [{coupon: stripeCouponId}]` to Stripe (and drop `allow_promotion_codes` — Stripe rejects the combination).

`src/routes/cart/+page.svelte` — add a `<form method="POST" action="?/apply">` above the summary; show the applied coupon + a Remove button when `data.appliedCoupon !== null`; render a discount row in the summary.

```bash
pnpm check
pnpm build
```

## Why we chose this — the PE7 judgment

**Alternative 1: Let the user enter the promo on Stripe's page.**
Works, but breaks the cart-page preview — the user has no idea what they'll pay until they click through. Also hides our DB-side coupon terms from the app, preventing UI like "remaining redemptions" or "expires in 3 days."

**Alternative 2: Sync every DB coupon to Stripe eagerly on seed.**
Makes the seed slow and requires live Stripe API calls on every `db:seed`. Lazy mirroring at first-use amortizes that cost across a user population and keeps the seed decoupled from the network.

**Alternative 3: Do the discount math only on our side, don't tell Stripe, reconcile manually.**
The user sees a $9 discount on /cart and pays $0 of discount at Stripe. Bad UX; support nightmare. Not acceptable.

**Alternative 4: Use `allow_promotion_codes: true` + Stripe-native promo codes exclusively.**
Stripe promo codes are a fine primitive, but you lose the ability to render "code WELCOME10 gives you 10% off — $4.90 saved" on your cart page without round-tripping. Local preview is the whole point of applying the coupon in the cart vs. at Stripe.

The PE7 choice — **pure computation + cookie session + lazy Stripe mirror** — wins because the discount preview is instant, the Stripe session is accurate, and the DB remains the source of truth.

## What could go wrong

**Symptom:** Stripe session errors "Cannot combine discounts with allow_promotion_codes"
**Cause:** Both flags set on the session.
**Fix:** Conditional spread — if an applied coupon resolved, set `discounts`; else set `allow_promotion_codes: true`. Never both.

**Symptom:** `ensureStripeCoupon` creates a duplicate Stripe coupon on every checkout
**Cause:** The `DB.update` to write `stripeCouponId` silently failed (e.g., row was deleted between check and update).
**Fix:** The update uses `eq(coupons.id, coupon.id)` — matches on PK, no race window unless another tenant deletes concurrently, which shouldn't happen in v1. Log a warning and abort the checkout if the update returns zero rows.

**Symptom:** A user applies `INSIDER50` but the discount shows `$0`
**Cause:** The cart cookie is empty; subtotal is 0; the `subtotal_zero` branch returns `{ok: false}`.
**Fix:** The load exposes `couponError: 'Add an item to your cart before applying a coupon.'` — user-readable message.

**Symptom:** Coupon applies on /cart but /cart/checkout ignores it
**Cause:** The cookie path wasn't `/` so only /cart sees it.
**Fix:** `cookies.set(..., { path: '/', ... })`. Already in the code — this is the mistake to avoid.

## Verify

```bash
pnpm check
pnpm build
pnpm dev
```

Manual smoke:
1. Add a product to the cart.
2. Enter `WELCOME10`. Subtotal shows `$49.70`, discount shows `−$4.97`, total shows `$44.73`.
3. Enter `EXPIRED`. Error message renders.
4. Click Checkout. Stripe page shows the discount applied on the line items.

## Mistake log

- **Passed `allow_promotion_codes: true` AND `discounts: [...]` to Stripe.** Stripe rejects the combination. Turned the flags into an XOR: conditional spread picks one.
- **Serialized the full coupon object into the cookie.** Only the code belongs in the cookie — the server re-reads coupon state on every load so validity is always current.
- **Forgot to insert into `coupon_redemptions`** — orders had `couponId` but there was no per-session usage row. Added the insert on the checkout handoff.
- **Thought percent discounts would overflow to negative.** `Math.min(raw, subtotalCents)` clamps so a 100% off on a $50 cart = exactly $50 off, never more.

## Commit

```bash
git add src/lib/cart/coupons.ts src/lib/server/stripe/coupons.ts
git add src/routes/cart/+page.server.ts src/routes/cart/+page.svelte src/routes/cart/checkout/+server.ts
git add curriculum/module-05-product/lesson-073-cart-coupon.md
git commit -m "feat(cart): coupon application + lazy Stripe mirror + lesson 073"
```

Cart pipeline is complete. Module 5 pivots to memberships, entitlement gating, banners, the meta-course, and the polish sweep that wraps Phase 5.
