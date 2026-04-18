---
number: 71
commit: 5e2ef0806a556ce43b5951481754d15dc48df146
slug: cart-ui
title: Build the cart UI — add, remove, update quantity
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 9
previous: 70
next: null
estimatedMinutes: 20
filesTouched:
  - src/lib/cart/AddToCartButton.svelte
  - src/lib/cart/CartBadge.svelte
  - src/lib/cart/cart.svelte.ts
  - src/routes/cart/+page.svelte
  - src/routes/products/[slug]/+page.svelte
  - src/routes/products/+page.svelte
---

## Context

The state exists (lesson 069), the cookie persists it (lesson 070). Now the user needs to actually *touch* the cart. Three surfaces:

- **`AddToCartButton`** — drops onto a product detail price row, writes one `CartLineItem` into the singleton and flips to `Added ✓` for 1.2s.
- **`CartBadge`** — a tiny reactive link displaying the live item count, wired into the browse hero and the product-page breadcrumb.
- **`/cart`** — the cart page: line-item rows, inline quantity input, Remove buttons, subtotal, Clear cart, and a primary `Checkout →` link (lesson 072 wires the handoff).

No forms, no server actions. Everything mutates the rune-backed singleton directly; the persistence layer writes the cookie on the next tick.

## The command

`src/lib/cart/AddToCartButton.svelte` — takes the five fields needed to build a `CartLineItem` and calls `cart.add(…)`:

```svelte
<script lang="ts">
  import { useCart, type CartLineItem } from './cart.svelte';
  type Props = {
    priceId: string; productSlug: string; productName: string;
    unitAmountCents: number; currency: string;
  };
  let { priceId, productSlug, productName, unitAmountCents, currency }: Props = $props();
  const cart = useCart();
  let justAdded = $state(false);
  function add(): void {
    cart.add({ priceId, productSlug, productName, unitAmountCents, currency, quantity: 1 });
    justAdded = true;
    setTimeout(() => (justAdded = false), 1200);
  }
</script>
<button type="button" class="add" onclick={add} disabled={justAdded}>
  {justAdded ? 'Added ✓' : 'Add to cart'}
</button>
```

`src/lib/cart/CartBadge.svelte` — reactive across the whole app:

```svelte
<script lang="ts">
  import { useCart } from './cart.svelte';
  const cart = useCart();
</script>
<a href="/cart" class="badge" aria-label="Cart ({cart.quantity} items)">
  <span>Cart</span><span class="count">{cart.quantity}</span>
</a>
```

`src/routes/cart/+page.svelte` — line-item list, quantity inputs (`oninput` calls `cart.setQuantity(priceId, n)`), Remove (`cart.remove(priceId)`), subtotal via `cart.subtotalCents`, Clear (`cart.clear()`), Checkout link to `/cart/checkout`.

Also re-export `CartLineItem` from `cart.svelte.ts` so components can import `{ useCart, type CartLineItem }` from a single module:

```ts
export type { CartLineItem } from './cart-math';
```

`src/routes/products/[slug]/+page.svelte` — swap the single `Start checkout` button for two side-by-side actions: `<AddToCartButton />` + `Buy now` (direct-purchase form, unchanged). Breadcrumb gets a `<CartBadge />` on the right.

`src/routes/products/+page.svelte` — hero-actions row gets a `<CartBadge />` next to the search link.

```bash
pnpm check
pnpm build
pnpm dev
```

## Why we chose this — the PE7 judgment

**Alternative 1: Use `<form method="POST" action="?/addToCart">` with a SvelteKit action.**
Every click becomes a round-trip. Add-to-cart is a 0-latency operation from the user's POV; an action here is overkill and introduces stale UI (the form resolves after the network hop, not on click).

**Alternative 2: Drawer that slides in on add, blocking the page.**
Every add-to-cart shouldn't interrupt the flow. The `Added ✓` in-place flash + a live cart badge count is enough feedback. The drawer goes to lesson 076 if we decide we want one.

**Alternative 3: Disable the button permanently once the item is in the cart.**
Users sometimes want two of something. Bumping the badge count + flashing feedback keeps the button live; quantity is managed on `/cart`.

**Alternative 4: Skip `CartBadge` — users navigate by typing `/cart`.**
Discoverability matters. The badge is the visual anchor for "I have items in this cart." Three small components are not a cost worth avoiding.

The PE7 choice — **direct rune mutation, no server actions, in-place feedback, live global badge** — wins on perceived latency and integrates naturally with the lesson 070 persistence.

## What could go wrong

**Symptom:** The badge count doesn't update after an add
**Cause:** The badge component imported `useCart()` in module scope instead of inside the `<script>` block, so the Svelte compiler never wrapped the read in a reactive effect.
**Fix:** Instantiate `const cart = useCart();` inside the `<script lang="ts">` block; that's the only place the compiler tracks reactive dependencies for template reads.

**Symptom:** Quantity input accepts `-5` and the cart shows negative totals
**Cause:** `setQuantity` was called with whatever the input parsed to.
**Fix:** `cart.setQuantity(priceId, Math.max(0, Math.trunc(next)))`. Zero deletes the row via the quantity-setter's `<=0` rule in `cart-math.ts`.

**Symptom:** Removing a line item visibly flashes two items before collapsing
**Cause:** Keyed block's `(item.priceId)` key wasn't unique — if the cart somehow held two items with the same priceId, `remove` would only delete the first and the UI diffed oddly.
**Fix:** The `cart-math.addOrIncrement` merges by `priceId`, so duplicates are impossible. The keyed block remains the correct shape.

## Verify

```bash
pnpm check
pnpm build
pnpm dev
```

Manual smoke:
1. `/products/forgeschool-lifetime` → click `Add to cart`. Button flashes `Added ✓`.
2. Top-right `Cart 1` badge appears.
3. `/cart` shows the line item, the subtotal, the quantity input.
4. Bump quantity → subtotal updates live.
5. Refresh the page → cart survives (courtesy of lesson 070).
6. Click `Remove` or `Clear cart` → cart empties.

## Mistake log

- **Forgot to re-export `CartLineItem` from `cart.svelte.ts`** — `AddToCartButton` couldn't import the type next to `useCart`. Added the re-export line.
- **Typed the quantity handler's `event` as `Event`** without narrowing — `target.value` didn't exist on `EventTarget`. Narrowed with `event.currentTarget as HTMLInputElement`.
- **The first layout of `/cart` used a `<table>`** — lovely until the mobile breakpoint. Switched to a `grid-template-columns: 1fr auto auto auto` list of `.row`s that collapse cleanly on xs.

## Commit

```bash
git add src/lib/cart/AddToCartButton.svelte src/lib/cart/CartBadge.svelte src/lib/cart/cart.svelte.ts
git add src/routes/cart/ src/routes/products/[slug]/+page.svelte src/routes/products/+page.svelte
git add curriculum/module-05-product/lesson-071-cart-ui.md
git commit -m "feat(cart): add-to-cart button + cart page + badge + lesson 071"
```

Next: the handoff — turning this cart into a Stripe Checkout Session.
