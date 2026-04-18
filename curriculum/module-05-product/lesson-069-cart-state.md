---
number: 69
slug: cart-state
title: Build the client-side cart with Svelte 5 runes
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 7
previous: 68
next: null
estimatedMinutes: 20
filesTouched:
  - src/lib/cart/cart-math.ts
  - src/lib/cart/cart.svelte.ts
---

## Context

Browsing is done. The cart is the bridge from discovery to checkout — a local, reactive data structure that stores line items, computes subtotals, and never touches the server until the user commits to a purchase (lesson 072's handoff).

Two files, zero runtime dependencies outside Svelte:

1. **`src/lib/cart/cart-math.ts`** — pure, test-friendly arithmetic: `subtotalCents`, `lineItemTotalCents`, `assertSingleCurrency`, plus three immutable updaters (`addOrIncrement`, `setQuantity`, `removeItem`). Zero Svelte. Zero reactivity. Unit tests (lesson 087) target this module directly.
2. **`src/lib/cart/cart.svelte.ts`** — the reactive wrapper. One `$state` rune, a module-level singleton factory, get-accessor properties that derive on read. Consumers write `const cart = useCart(); cart.add(item); cart.subtotalCents` and the UI re-renders automatically.

Persistence (lesson 070), UI (lesson 071), checkout handoff (lesson 072), and coupons (lesson 073) each layer onto this foundation without reopening the cart math.

## The command

`src/lib/cart/cart-math.ts`:

```ts
export type CartLineItem = {
  priceId: string; productSlug: string; productName: string;
  unitAmountCents: number; currency: string; quantity: number;
};

export function lineItemTotalCents(item: CartLineItem): number {
  return item.unitAmountCents * item.quantity;
}
export function subtotalCents(items: readonly CartLineItem[]): number {
  let total = 0; for (const it of items) total += lineItemTotalCents(it); return total;
}
export function assertSingleCurrency(items: readonly CartLineItem[]): string | null {
  if (items.length === 0) return null;
  const first = items[0]!.currency;
  for (const it of items) if (it.currency !== first) throw new Error('mixed currencies');
  return first;
}
// addOrIncrement, setQuantity, removeItem — immutable returns.
```

`src/lib/cart/cart.svelte.ts`:

```ts
import { addOrIncrement, assertSingleCurrency, removeItem, setQuantity,
  subtotalCents, totalQuantity, type CartLineItem } from './cart-math';

function createCart() {
  const state = $state<{ items: CartLineItem[] }>({ items: [] });
  return {
    get items() { return state.items; },
    get subtotalCents() { return subtotalCents(state.items); },
    get quantity() { return totalQuantity(state.items); },
    get currency() { return assertSingleCurrency(state.items); },
    add(item: CartLineItem) { state.items = addOrIncrement(state.items, item); },
    setQuantity(id: string, q: number) { state.items = setQuantity(state.items, id, q); },
    remove(id: string) { state.items = removeItem(state.items, id); },
    clear() { state.items = []; },
    hydrate(items: readonly CartLineItem[]) { state.items = [...items]; }
  };
}

let singleton: ReturnType<typeof createCart> | null = null;
export function useCart() {
  if (singleton === null) singleton = createCart();
  return singleton;
}
```

Filename is `cart.svelte.ts` — Svelte's compiler only allows runes inside files matching `*.svelte` or `*.svelte.ts` / `*.svelte.js`.

```bash
pnpm check
pnpm build
```

## Why we chose this — the PE7 judgment

**Alternative 1: A Svelte store (`writable`).**
Svelte 5 stores still work but the ecosystem is migrating to runes. Runes are the future API; stores are legacy. Greenfield code uses runes.

**Alternative 2: Raw objects + `$state` inline in components.**
Every component that touches the cart would have to hoist state through props. A module-scoped singleton is the correct lifetime for user-wide state that persists across route transitions.

**Alternative 3: Put the whole cart on the server and make every cart mutation a roundtrip.**
Works, but it adds a round-trip for every quantity tick and couples UX responsiveness to network latency. Local state + eventual persistence (lesson 070 writes a cookie, not every keystroke) is the better trade-off for a small catalog.

**Alternative 4: Use `$state.raw` instead of `$state`.**
`$state.raw` opts out of proxy-based mutation tracking. We'd save an imperceptible amount of bookkeeping but lose the ability to mutate nested fields and have them reactively observed. Not worth the ergonomic loss at three or four line items.

The PE7 choice — **pure math module + rune-based singleton, split into two files** — wins because the math is testable in isolation and the reactive wrapper is a thin, replaceable facade.

## What could go wrong

**Symptom:** `pnpm check` errors "`$state` is only available inside .svelte or .svelte.ts/.svelte.js files"
**Cause:** The reactive file was named `cart.ts` instead of `cart.svelte.ts`.
**Fix:** Rename to `cart.svelte.ts`. The `.svelte.ts` suffix is how Svelte 5 opts the file into rune compilation.

**Symptom:** Two pages each import `useCart()` but have different state
**Cause:** Each import constructed a fresh cart — no singleton.
**Fix:** The module-level `singleton` variable + `useCart()` factory guarantees one instance per client. Test-only reset helper is exported but never shipped to production paths.

**Symptom:** `cart.subtotalCents` returns `NaN`
**Cause:** `unitAmountCents` typed as `number` but the incoming price somewhere was a string (from a JSON payload). String × number = NaN.
**Fix:** Cast / validate at the ingress (the add-to-cart handler). `cart-math.ts` only accepts `CartLineItem` whose shape is typed — the failure is at the boundary, not inside the math.

## Verify

```bash
pnpm check
pnpm build
```
Expected: zero errors.

When the UI lands (lesson 071) we'll smoke-test `cart.add()` from a component.

## Mistake log

- **First draft used a plain `.ts` extension** and got a confusing Svelte compiler error about rune usage. Renamed to `.svelte.ts`.
- **Wrote `state.items.push(item)` in `add()`** — Svelte 5's proxy observes mutations but returning a new array reads more naturally and keeps the store's outward behavior functional. Switched to `state.items = addOrIncrement(...)`.
- **Typed `items` as `CartLineItem[]` in the public getter** — consumers could mutate the array directly and skip the observable setter. Changed to `readonly CartLineItem[]` at the boundary; internal array is still the proxy.

## Commit

```bash
git add src/lib/cart/
git add curriculum/module-05-product/lesson-069-cart-state.md
git commit -m "feat(cart): client-side $state cart module + lesson 069"
```

Next lesson wires the cart to a cookie so a refresh doesn't empty it.
