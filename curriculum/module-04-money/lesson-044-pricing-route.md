---
number: 44
slug: pricing-route
title: Build the /pricing route
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 5
previous: 43
next: 45
estimatedMinutes: 20
filesTouched:
  - src/lib/server/db/queries.ts
  - src/routes/pricing/+page.server.ts
  - src/routes/pricing/+page.svelte
---

## Context

The seed now writes three products + three prices into Postgres. `/pricing` is the first public route that reads that data — no hardcoded prices, no hardcoded IDs, everything sourced from the DB. A price change in the seed script propagates to the page on the next deploy with zero code edits.

Two patterns this lesson establishes:

1. **Server load (`+page.server.ts`) for DB reads.** Universal load can't import `$lib/server/db` because the DB client is server-only. `+page.server.ts` runs only on the server; each page load hits the DB. For a catalog that changes on Stripe price updates, this is the right shape.
2. **Form POST for checkout initiation.** The Start-checkout button is a `<form method="POST" action="/checkout/{slug}">` with a hidden `priceId` field. Lesson 045 builds the endpoint. Using a form — not a `<a href>` or an `<button onclick>` — means the request is a proper POST (matches Stripe's API expectations), CSRF-protected by SvelteKit, and works without JavaScript.

## The command

Extend `src/lib/server/db/queries.ts` with a join query that groups prices under their product:

```ts
export type ProductWithPrices = Product & { prices: Price[] };

export async function listActiveProductsWithPrices(db: Db): Promise<ProductWithPrices[]> {
  const rows = await db
    .select({ product: products, price: prices })
    .from(products)
    .leftJoin(prices, and(eq(prices.productId, products.id), eq(prices.active, true)))
    .where(eq(products.status, 'active'))
    .orderBy(products.createdAt, prices.createdAt);

  const byId = new Map<string, ProductWithPrices>();
  for (const row of rows) {
    let existing = byId.get(row.product.id);
    if (existing === undefined) {
      existing = { ...row.product, prices: [] };
      byId.set(row.product.id, existing);
    }
    if (row.price !== null) existing.prices.push(row.price);
  }
  return [...byId.values()];
}
```

Left join because a product might be seeded without a price (edge case; shouldn't happen in practice, but the query tolerates it by emitting the product with an empty `prices: []`). Explicit `Map` grouping instead of a reduce — readable, debuggable.

Also fix the earlier `listActivePricesForProduct` to filter on `prices.active = true` (it was returning archived prices too).

Create `src/routes/pricing/+page.server.ts`:

```ts
import { db } from '$lib/server/db';
import { listActiveProductsWithPrices } from '$lib/server/db/queries';

export const load = async () => {
  const products = await listActiveProductsWithPrices(db);
  return { products };
};
```

**Note the imports.** `$lib/server/db/queries` with NO `.ts` extension — aliased imports don't get rewritten; only relative imports require the extension.

Create `src/routes/pricing/+page.svelte`. Hero, three-column auto-fit grid of cards, each card showing product kind badge, name, description, formatted price with interval, optional trial note, and a `<form method="POST">` with the primary price's id + a Start-checkout button.

Two helpers inline in the script:

```ts
function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2
  }).format(cents / 100);
}

function formatInterval(interval: string | null, count: number | null): string {
  if (interval === null || interval === 'one_time') return 'one-time';
  // '... / month' / '... / year' / '... / every 3 month' etc.
  // (shape omitted here; see the committed file)
}
```

`Intl.NumberFormat` handles locale-aware currency rendering. The `maximumFractionDigits` ternary avoids showing `.00` on round-dollar amounts ($497, not $497.00).

Styles wrapped in `@layer components`. The Lifetime card gets a slightly heavier border via `.card.lifetime { border-color: var(--color-brand); box-shadow: 0 0 0 1px var(--color-brand); }` to emphasize it.

Verify:

```bash
pnpm check
pnpm build
pnpm dev  # visit http://localhost:5173/pricing
```

Expected: three cards render with real prices. The Lifetime card has a highlighted border. Clicking "Start checkout" POSTs to `/checkout/<slug>` which 404s (until lesson 045).

## Why we chose this — the PE7 judgment

**Alternative 1: Hardcode the prices in `.svelte`**
The sin lesson 043 just fixed. Repeats the drift risk.

**Alternative 2: Use a universal `+page.ts` load with a client-side fetch of `/api/products`**
Adds an API endpoint, a client fetch, and a loading state. Server load renders the HTML with the data already embedded — no second round-trip, no loading flash, no extra route.

**Alternative 3: Use a `<a>` link instead of a form for the checkout button**
GET requests should be idempotent. Initiating a Stripe Checkout Session is NOT idempotent (it creates a session object in Stripe). POST is semantically correct. Forms give us CSRF protection and no-JS fallback for free.

**Alternative 4: Pass the Stripe price ID in the URL instead of a hidden form field**
URLs are logged, bookmarked, shared. A price ID in a URL is a low-severity but real leak. Hidden form field keeps it off the URL bar.

**Alternative 5: Render the primary price only; hide subsequent prices behind a "see all" toggle**
v1's products have one price each. Multiple-price-per-product is a future concern (maybe a "3-month trial for $19 then $49/mo" plan). When that lands, revisit the card UI.

The PE7 choice — server load reading from DB, form-based POST with hidden priceId, Intl-based currency formatting, per-product card grid — wins because it treats the catalog as data, respects POST semantics, and renders identically with or without JS.

## What could go wrong

**Symptom:** `/pricing` renders an empty list
**Cause:** Seed wasn't run. `products` table is empty.
**Fix:** `pnpm db:reset && pnpm db:seed`.

**Symptom:** Prices render as `$NaN` or `$undefined`
**Cause:** A price row has `null` in `unit_amount_cents` or `currency`.
**Fix:** The schema marks both as NOT NULL; a null here means the seed didn't populate them. Re-run seed; check `docker exec ... psql -c "SELECT * FROM prices;"`.

**Symptom:** Lifetime card's box-shadow creates a halo effect instead of a border
**Cause:** `box-shadow: 0 0 0 1px` paints outside the element's border. The effect stacks with the `border-color: var(--color-brand)` giving a double-thickness line.
**Fix:** Pick one — either `border-color` OR `box-shadow` based 1px outline. Current code uses both intentionally for a 2px emphasis; if it looks heavy, drop the shadow.

**Symptom:** `Intl.NumberFormat` throws for an unknown currency code
**Cause:** The DB has a currency like `'usdt'` or lowercase `'usd'` that the browser locale doesn't recognize.
**Fix:** The schema forces 3-char lowercase ISO 4217. Our seed always uses `'usd'`. `currency.toUpperCase()` in `formatPrice` converts to the ISO form Intl expects.

## Verify

```bash
# Query helper returns the right shape
pnpm test
```
Expected: existing tests still pass; no new tests in this lesson (unit test lands later).

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

```bash
pnpm dev  # /pricing
```
Expected: three cards. Prices formatted as $497, $49, $497 (all USD). Lifetime card emphasized. Start-checkout buttons POST to `/checkout/<slug>` (404 until lesson 045).

## Mistake log — things that went wrong the first time I did this

- **Imported `$lib/server/db/queries.ts` with the `.ts` extension.** Same trap as earlier lessons — alias imports don't get rewritten. Dropped the extension.
- **Formatted prices with `toFixed(2)`.** Always showed `.00` on round dollars. Switched to `Intl.NumberFormat` with `maximumFractionDigits: 0` when cents == 0. `$497` is cleaner than `$497.00`.
- **Set `action="/checkout"` and put the slug in the hidden field.** Cleaner URLs would put the slug in the path. Swapped to `action="/checkout/{slug}"` + hidden price ID — the slug owns the resource, the price ID is the disambiguator.
- **Used `{@const}` outside an `{#each}`.** Svelte 5 doesn't allow `{@const}` at arbitrary positions — only inside certain block tags. Kept the derivation inside the each block: `{@const primaryPrice = product.prices[0]}`.

## Commit this change

```bash
git add src/lib/server/db/queries.ts \
       src/routes/pricing/+page.server.ts \
       src/routes/pricing/+page.svelte
git add curriculum/module-04-money/lesson-044-pricing-route.md
git commit -m "feat(routes): /pricing reads catalog from DB + lesson 044"
```

The catalog is live at `/pricing`. Lesson 045 builds the POST endpoint the Start-checkout button targets.
