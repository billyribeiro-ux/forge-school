---
number: 70
commit: 49ff3147df26b54ea42295739f6e49643e556f53
slug: cart-persistence
title: Persist the cart to a cookie across refreshes
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 8
previous: 69
next: null
estimatedMinutes: 15
filesTouched:
  - src/lib/cart/cart-persistence.ts
  - src/lib/cart/CartPersistence.svelte
  - src/routes/+layout.svelte
---

## Context

Lesson 069 shipped an in-memory reactive cart. Refresh the page and it disappears. For a real storefront that's unacceptable — the cart must survive a reload, a tab close, a one-hour commute. We persist it to a first-party cookie with a 30-day max-age.

Why a cookie and not `localStorage`? A cookie is readable by SvelteKit's `cookies` API during load, which matters the moment the checkout handoff (lesson 072) runs server-side. `localStorage` is client-only — the server can't see it, so the server can't validate the line items before handing off to Stripe. Cookie wins on symmetric access.

The persistence layer splits into two files: **`cart-persistence.ts`** (pure serialize/deserialize with version field + strict validation on read) and **`CartPersistence.svelte`** (the mount-once hydrator + debounced writer). The root `+layout.svelte` mounts the component; everything else stays oblivious.

## The command

`src/lib/cart/cart-persistence.ts` — versioned payload, 25-item cap, strict row-validation on deserialize:

```ts
export const CART_COOKIE_NAME = 'forge_cart';
type PersistedItem = { p: string; s: string; n: string; a: number; c: string; q: number };
type PersistedCart = { v: 1; items: PersistedItem[] };

export function serializeCart(items: readonly CartLineItem[]): string {
  const payload: PersistedCart = { v: 1, items: items.slice(0, 25).map(toPersisted) };
  return encodeURIComponent(JSON.stringify(payload));
}
export function deserializeCart(raw: string | null | undefined): CartLineItem[] {
  if (!raw) return [];
  try {
    const json = JSON.parse(decodeURIComponent(raw)) as Partial<PersistedCart>;
    if (json.v !== 1 || !Array.isArray(json.items)) return [];
    return json.items.filter(isValidRow).map(fromPersisted);
  } catch { return []; }
}
```

`src/lib/cart/CartPersistence.svelte` — no DOM, two `$effect`s:

```svelte
<script lang="ts">
  import { browser } from '$app/environment';
  import { useCart } from './cart.svelte';
  import { CART_COOKIE_NAME, CART_COOKIE_MAX_AGE, deserializeCart, serializeCart } from './cart-persistence';

  const cart = useCart();
  let hydrated = $state(false);

  $effect(() => {
    if (!browser || hydrated) return;
    const existing = readCookie(CART_COOKIE_NAME);
    const items = deserializeCart(existing);
    if (items.length > 0) cart.hydrate(items);
    hydrated = true;
  });

  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    if (!browser || !hydrated) return;
    const snapshot = cart.items;
    if (writeTimer !== null) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => writeCookie(serializeCart(snapshot)), 150);
    return () => { if (writeTimer !== null) clearTimeout(writeTimer); };
  });
</script>
```

`src/routes/+layout.svelte` — mount the component once:

```diff
+  import CartPersistence from '$lib/cart/CartPersistence.svelte';
…
+  <CartPersistence />
  {@render children()}
```

```bash
pnpm check
pnpm build
```

## Why we chose this — the PE7 judgment

**Alternative 1: `localStorage`.**
Client-only. The checkout handoff server-side in lesson 072 can't validate the cart. We'd have to re-post it from the browser just before handoff — an extra round-trip and a spot for race conditions.

**Alternative 2: Persist every cart mutation by POSTing to a server endpoint.**
Correct for a 1M-product catalog with shared household carts. Overkill at our scale. Adds latency on every quantity tick.

**Alternative 3: Store a cart row in Postgres keyed by session_id.**
The schema already has `carts` and `cart_items` tables — lesson 072 uses them for the handoff. Using them for every in-flight mutation would force a round-trip per keystroke. Cookie → checkout-handoff-writes-to-db is the right seam.

**Alternative 4: Skip the version field.**
Version the payload from day one. When we rename a field in v2, old cookies still deserialize (or get rejected cleanly), and users don't lose their cart or crash the hydrate step.

The PE7 choice — **versioned cookie, debounced writes, split pure/effectful concerns** — wins because the pure module is trivially testable, the effectful component is small, and server-side readers (checkout) get the cart without an extra round trip.

## What could go wrong

**Symptom:** Cart resets on every refresh
**Cause:** Hydrate runs before write — first render writes `[]` to the cookie, then the next render reads `[]`.
**Fix:** `hydrated` guard. The write effect early-returns until the hydrate effect sets `hydrated = true`. Verified by the `if (!browser || !hydrated) return;` line.

**Symptom:** Cookie grows unboundedly, request headers start failing
**Cause:** Browsers cap cookies at ~4 KB. Real user could pile on quantity: 1000.
**Fix:** `items.slice(0, 25)` cap in `serializeCart`. Quantity > 1000 would still fit since we store the count, not N copies.

**Symptom:** Corrupted cookie crashes the hydrate
**Cause:** `JSON.parse` throws on malformed input.
**Fix:** `try { … } catch { return []; }` fall-through plus `isValidRow` strict validator rejects anything whose shape doesn't match.

**Symptom:** Dev over HTTP prints "Cookie rejected" in console
**Cause:** The cookie writer set `Secure` unconditionally, but `localhost` is HTTP.
**Fix:** The writer checks `location.protocol === 'https:'` and only then adds `Secure`. Dev over HTTP works; prod stays locked down.

## Verify

```bash
pnpm check
pnpm build
pnpm dev
```

Manual smoke:
1. Open `/products`, click a product, trigger an add-to-cart (lesson 071 wires the button; until then, call `useCart().add({...})` in the console).
2. Open DevTools → Application → Cookies → `forge_cart` exists with a URL-encoded JSON payload.
3. Refresh. Cart survives.

## Mistake log

- **Forgot to guard `document.cookie` with `browser`** — SSR crashed on the first render because `document` is undefined. Wrapped both effects in `if (!browser) return;`.
- **Wrote the cookie on every rune tick** — 40 writes per second while typing a quantity. Added a 150ms debounce.
- **Skipped the version field** — first refactor broke every user's cart because the new shape failed validation. Added `{ v: 1, items: […] }` envelope so future schema bumps can negotiate cleanly.

## Commit

```bash
git add src/lib/cart/cart-persistence.ts src/lib/cart/CartPersistence.svelte src/routes/+layout.svelte
git add curriculum/module-05-product/lesson-070-cart-persistence.md
git commit -m "feat(cart): cookie-backed cart persistence + lesson 070"
```

Next lesson builds the add-to-cart button and the cart drawer UI so the persistence has something to persist.
