---
number: 64
slug: products-list
title: Build the /products catalog list page
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 2
previous: 63
next: null
estimatedMinutes: 15
filesTouched:
  - src/routes/products/+page.server.ts
  - src/routes/products/+page.svelte
---

## Context

`/pricing` is the transactional route ("pick a plan"). `/products` is the editorial route ("browse what's available"). They share the same DB query (`listActiveProductsWithPrices`) but render differently — products shows a featured strip + all products with tags.

## The command

`src/routes/products/+page.server.ts`:

```ts
export const load = async () => {
  const products = await listActiveProductsWithPrices(db);
  const featured = products
    .filter((p) => p.featuredOrder !== null)
    .sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0));
  return { featured, all: products };
};
```

`src/routes/products/+page.svelte` renders two sections:

- Featured strip (only if there are featured products), cards with a `.featured-card` class that emphasizes via `box-shadow: 0 0 0 1px var(--color-brand)`.
- All products in an `auto-fill minmax(18rem, 1fr)` grid. Each card links to `/products/<slug>` (lesson 065 builds that). Tags render as small pill badges when present.

Verify:

```bash
pnpm build
pnpm dev  # /products
```

Expected: three product cards render; none featured yet (featured_order is null in the seed).

## Why we chose this — the PE7 judgment

**Alternative 1: Merge /products into /pricing**
Conflates two intents: browse vs. transact. Visit patterns differ — /pricing is a landing from marketing; /products is a navigation destination. Keeping them separate lets /pricing stay CTA-dense and /products stay browse-friendly.

**Alternative 2: Skip the featured strip**
v1 currently has no featured products (seed sets `featuredOrder: null`). Shipping the strip anyway is cheap and makes it trivial to feature a product later by updating a single column.

The PE7 choice — reuse the existing join, split featured / all, add `<a>` links to detail pages — wins because it's the minimum delta over /pricing while unlocking browse.

## What could go wrong

**Symptom:** Empty page
**Cause:** Seed isn't run or all products have `status != 'active'`.
**Fix:** `pnpm db:reset && pnpm db:seed`.

**Symptom:** Featured strip renders but empty
**Cause:** Filter works but the `#each` key hits an edge. Unlikely here since `.featuredOrder !== null` is strict.
**Fix:** Confirm at least one product has `featured_order` set via `UPDATE products SET featured_order = 1 WHERE slug = '...'`.

## Verify

```bash
pnpm check
pnpm build
pnpm dev  # /products
```

## Mistake log

- **Used `.sort((a, b) => a.featuredOrder - b.featuredOrder)` without null coalescing.** TypeScript flagged potential null minus null. Added `?? 0` on both sides.
- **Forgot to filter `status='active'`** at the query level. `listActiveProductsWithPrices` already does it — just double-checked.

## Commit

```bash
git add src/routes/products/
git add curriculum/module-05-product/lesson-064-products-list.md
git commit -m "feat(routes): /products catalog list + lesson 064"
```
