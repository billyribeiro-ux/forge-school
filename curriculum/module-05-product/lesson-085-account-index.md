---
number: 85
slug: account-index
title: Build the /account dashboard
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 23
previous: 84
next: null
estimatedMinutes: 15
filesTouched:
  - src/routes/account/+page.server.ts
  - src/routes/account/+page.svelte
---

## Context

The `/account` route didn't exist until now — visitors landed on `/account/billing` by happenstance via links. This lesson ships a proper dashboard: the user's current tier up top, a count of active entitlements, and three section cards linking to Billing, Course, and Cart.

The tier + sessionId are read directly from `event.locals` (populated by the hook in lesson 075). No extra DB round-trip for the tier — hook already paid that cost.

## The command

`src/routes/account/+page.server.ts`:

```ts
export const load: PageServerLoad = async ({ locals }) => {
  const entitlementsWithKind = await getSessionEntitlementsWithKind(db, locals.sessionId);
  return {
    sessionId: locals.sessionId,
    tier: locals.tier,
    tierLabel: tierLabel(locals.tier),
    entitlementCount: entitlementsWithKind.length
  };
};
```

`+page.svelte` renders a tier card + three section links. Uses CSS `:has()` to style the tier card differently when lifetime:

```css
.tier-card:has([data-tier='lifetime']) {
  border-color: var(--color-brand);
}
```

```bash
pnpm check
pnpm build
```

## Why we chose this — the PE7 judgment

**Alternative 1: Combine `/account` and `/account/billing` into one long page.**
Different concerns. Billing is dense transactional history; the dashboard is a tier-centric jump-off. Separating keeps each page focused.

**Alternative 2: Hit the DB to count entitlements AND re-derive tier.**
The hook already wrote `locals.tier`. Recomputing in the load throws away the hook's work.

**Alternative 3: Show all three plan tiers with checkmarks for what the user owns.**
Too busy. The dashboard shows the user's CURRENT state; `/pricing` shows the comparison.

**Alternative 4: Use `{@const tier = locals.tier}` inside the template instead of passing via load.**
Svelte templates can't import `$app/stores` into load context. Passing via `data` keeps the TS types consistent from load → render.

The PE7 choice — **thin load over locals, tier card + three links, CSS `:has()` for lifetime accent** — wins on both speed (no extra queries) and clarity.

## What could go wrong

**Symptom:** Tier chip shows `Free` but `/account/billing` lists an active subscription
**Cause:** The subscription entitlement hasn't been granted (e.g., webhook didn't fire, or the entitlement row is revoked).
**Fix:** Check the webhook logs (lesson 050); confirm the subscription's entitlement row exists and is non-revoked.

**Symptom:** `:has()` selector doesn't work on older browsers
**Cause:** Safari before 15.4 and Firefox before 121 lack native `:has()`.
**Fix:** The gradient-style degrades gracefully — the card still renders with default border. Acceptable progressive enhancement.

**Symptom:** Every navigation to `/account` re-fires the entitlement query
**Cause:** The load function runs on every navigation by design.
**Fix:** Acceptable for v1. If profiling shows it matters, memoize via `event.locals.entitlements` in the hook.

## Verify

```bash
pnpm check
pnpm build
pnpm dev
# Visit /account — tier card + three link cards.
# Visit /account?cachebust — same page.
```

## Mistake log

- **Used `$derived` inside the load function** — runes can only be used inside components / `.svelte.ts` files. Moved the derivation inline at load-return time.
- **Returned the raw tier string without a display label** — UI would render `'free'` in lowercase. Added `tierLabel` helper from lesson 074.
- **Forgot to set the `robots: noindex` meta tag** — per-session account pages shouldn't be indexed. Added.

## Commit

```bash
git add src/routes/account/+page.server.ts src/routes/account/+page.svelte
git add curriculum/module-05-product/lesson-085-account-index.md
git commit -m "feat(account): /account dashboard with tier chip + lesson 085"
```
