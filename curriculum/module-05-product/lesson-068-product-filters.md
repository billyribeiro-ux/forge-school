---
number: 68
slug: product-filters
title: Add kind / category / max-price filters to /products
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 6
previous: 67
next: null
estimatedMinutes: 15
filesTouched:
  - src/lib/server/db/schema.ts
  - src/lib/server/db/queries.ts
  - src/routes/products/+page.server.ts
  - src/routes/products/+page.svelte
---

## Context

Search (lesson 067) handles free-text matching. Filters are the complementary axis: the user knows what TYPE of thing they want and wants to pare the catalog to it. We ship three orthogonal filter dimensions — **kind** (course / bundle / subscription / lifetime), **category** (editorial from lesson 066), and **max price** (in dollars, ceiling-matched against the cheapest active price).

All three filters compose via URL query params — `?kind=lifetime&category=platform&maxPrice=500` is a valid shareable URL. SvelteKit load runs server-side, Drizzle builds the WHERE, Postgres returns the subset. No client-side filtering.

This lesson adds a `filterActiveProducts` query, updates `/products` load to honor URL params, and renders a three-field form inline on the page.

## The command

`src/lib/server/db/schema.ts` — export a typed union for the product kind enum (used by the filter parser):

```ts
export type ProductKindValue = (typeof productKind.enumValues)[number];
```

`src/lib/server/db/queries.ts` — add `filterActiveProducts`:

```ts
export type ProductFilters = {
  kind?: ProductKindValue;
  categorySlug?: string;
  maxPriceCents?: number;
};

export async function filterActiveProducts(db: Db, filters: ProductFilters): Promise<ProductWithPrices[]> {
  const conditions = [eq(products.status, 'active')];
  if (filters.kind !== undefined) conditions.push(eq(products.kind, filters.kind));
  if (filters.categorySlug !== undefined) {
    conditions.push(sql`exists (
      select 1 from ${productCategoryMemberships} m
      join ${productCategories} c on c.id = m.category_id
      where m.product_id = ${products.id} and c.slug = ${filters.categorySlug}
    )`);
  }
  if (filters.maxPriceCents !== undefined) {
    conditions.push(sql`exists (
      select 1 from ${prices} p
      where p.product_id = ${products.id} and p.active = true
        and p.unit_amount_cents <= ${filters.maxPriceCents}
    )`);
  }
  // … select + leftJoin prices + groupBy
}
```

`src/routes/products/+page.server.ts` — parse `kind`, `category`, `maxPrice` from `url.searchParams`, build `ProductFilters`, delegate to `filterActiveProducts` when any filter is set, otherwise fall back to the full catalog.

`+page.svelte` — a `<form method="GET">` with three controls (`<select name="kind">`, `<select name="category">`, `<input name="maxPrice">`), an Apply button, and a Reset link (`href="/products"`).

```bash
pnpm check
pnpm build
```

## Why we chose this — the PE7 judgment

**Alternative 1: Client-side filtering on the full catalog.**
Requires shipping every product to every browser. Breaks down once filters become non-trivial (joins to the categories table). Server-side composes naturally with the existing Drizzle surface.

**Alternative 2: POST the filter form.**
Filter URLs must be shareable and indexable. POST breaks deep-links, back-button behavior, and search-engine crawling. GET is the REST-correct verb for idempotent reads.

**Alternative 3: JavaScript-only: submit the form onchange, debounce it.**
Requires client bundling, defeats progressive enhancement, and still needs server-side handling for the no-JS case. Ship the server-side baseline first; layer progressive enhancement later if needed.

**Alternative 4: Max-price filter on the average, not the minimum, price.**
A subscription with $49/mo and $497/yr should clear a $100 max-price filter — the $49 variant matches the user's budget. Filtering on minimum is the user-intent-correct rule.

The PE7 choice — **server-side GET with `exists`-subqueries for the relational conditions** — wins on simplicity, shareability, crawlability, and no-JS fallback.

## What could go wrong

**Symptom:** `pnpm check` fails with `exactOptionalPropertyTypes` error on `ProductFilters`
**Cause:** Building the filter object with `kind: undefined` violates `exactOptionalPropertyTypes: true` — optional keys must be absent, not present-with-undefined.
**Fix:** Mutate the filter object conditionally (`if (kind !== undefined) filters.kind = kind`), never set an optional key to `undefined`.

**Symptom:** `maxPrice=50%` returns every product (SQL injection scare)
**Cause:** Value is user-controlled; could be non-numeric.
**Fix:** `parseMaxPrice` returns `undefined` on any non-finite or negative number, the key is never set, and the filter is skipped.

**Symptom:** A category filter silently shows zero products even when matches exist
**Cause:** Category slug was compared against the category ID or against `productCategoryMemberships.categoryId` directly.
**Fix:** The `exists` subquery joins memberships to categories and matches on `categories.slug`. Cross-check by listing memberships joined to categories in a psql prompt.

## Verify

```bash
pnpm check
pnpm build
pnpm dev
curl -s 'http://localhost:5173/products?kind=lifetime' | grep -c 'forgeschool-lifetime'
curl -s 'http://localhost:5173/products?category=platform' | grep -c 'data-product-card'
curl -s 'http://localhost:5173/products?maxPrice=50' | grep -c 'forgeschool-pro-monthly'
```
Expected: each query returns at least one match for its intended product.

## Mistake log

- **First draft used `.kind = parseKind(x)`** which set the key to `undefined` when the param was absent — broke `exactOptionalPropertyTypes`. Rewrote to guard with `if (x !== undefined) filters.kind = x`.
- **Built the category filter as a JOIN on the main query**, not an `exists` subquery. Produced duplicate rows when a product belonged to multiple categories with the same slug filter — meaningless but visually off. `exists` is semantically correct.
- **Max-price filter compared `prices.unitAmountCents` from the LEFT JOIN** — products without any price silently excluded themselves even when the max was high. Moved the price condition into its own `exists` subquery so it acts on the raw set, not the joined one.

## Commit

```bash
git add src/lib/server/db/schema.ts src/lib/server/db/queries.ts src/routes/products/+page.server.ts src/routes/products/+page.svelte
git add curriculum/module-05-product/lesson-068-product-filters.md
git commit -m "feat(routes): /products kind/category/max-price filters + lesson 068"
```

Filters close the browse layer. Next module (lessons 069–073) builds the cart.
