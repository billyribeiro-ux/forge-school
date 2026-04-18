---
number: 66
slug: category-browse
title: Build category browsing at /products/category/[slug]
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 4
previous: 65
next: null
estimatedMinutes: 20
filesTouched:
  - scripts/seed-categories.ts
  - scripts/seed-dev.ts
  - src/lib/server/db/queries.ts
  - src/routes/products/category/[slug]/+page.server.ts
  - src/routes/products/category/[slug]/+page.svelte
  - src/routes/products/+page.server.ts
  - src/routes/products/+page.svelte
---

## Context

Module 2 shipped `product_categories` + `product_category_memberships` tables but nothing consumed them. Lesson 064 built the flat `/products` grid; lesson 065 built the per-product detail. What's missing is the **editorial middle layer** — a way to say "show me everything in *Foundations*" without hand-coding a route per theme.

In PE7 terms a **category** is a curated editorial surface with its own page and URL (`/products/category/foundations`) — shareable, indexable, linkable from marketing. A **tag** is a flat decorator used for faceted filtering later (lesson 067). Categories are few, named, stable; tags are many, lowercase, disposable. Both live on the product but serve different jobs: categories answer "where does this belong?"; tags answer "what is this flavored with?"

This lesson seeds three categories (`foundations`, `production-grade`, `platform`), links each of the three seeded products via the join table, adds two query helpers, and wires a new `/products/category/[slug]` route plus a "Browse by category" strip on `/products`.

## The command

`scripts/seed-categories.ts`:

```ts
import { eq } from 'drizzle-orm';
import { productCategories, productCategoryMemberships, products } from '../src/lib/server/db/schema';
import type { Db } from '../src/lib/server/db';

const CATEGORIES = [
  { slug: 'foundations', name: 'Foundations', description: 'Start here.' },
  { slug: 'production-grade', name: 'Production-grade', description: 'Ship-ready builds.' },
  { slug: 'platform', name: 'Platform', description: 'Everything, forever.' }
] as const;

const MEMBERSHIPS: Array<{ productSlug: string; categorySlug: string }> = [
  { productSlug: 'forgeschool-lifetime',     categorySlug: 'foundations' },
  { productSlug: 'forgeschool-lifetime',     categorySlug: 'production-grade' },
  { productSlug: 'forgeschool-lifetime',     categorySlug: 'platform' },
  { productSlug: 'forgeschool-pro-yearly',   categorySlug: 'production-grade' },
  { productSlug: 'forgeschool-pro-yearly',   categorySlug: 'platform' },
  { productSlug: 'forgeschool-pro-monthly',  categorySlug: 'platform' }
];

export async function seedCategories(db: Db) {
  for (const c of CATEGORIES) {
    await db.insert(productCategories).values(c).onConflictDoNothing({ target: productCategories.slug });
  }
  for (const m of MEMBERSHIPS) {
    const [p] = await db.select().from(products).where(eq(products.slug, m.productSlug)).limit(1);
    const [c] = await db.select().from(productCategories).where(eq(productCategories.slug, m.categorySlug)).limit(1);
    if (!p || !c) continue;
    await db.insert(productCategoryMemberships)
      .values({ productId: p.id, categoryId: c.id })
      .onConflictDoNothing();
  }
}
```

`scripts/seed-dev.ts` — call `seedCategories(db)` after `seedProducts(db)`.

`src/lib/server/db/queries.ts`:

```ts
export async function listCategoriesWithProductCounts(db: Db) {
  return db.select({
    slug: productCategories.slug,
    name: productCategories.name,
    productCount: sql<number>`count(${productCategoryMemberships.productId})::int`
  })
  .from(productCategories)
  .leftJoin(productCategoryMemberships, eq(productCategoryMemberships.categoryId, productCategories.id))
  .groupBy(productCategories.id)
  .orderBy(productCategories.name);
}

export async function listProductsByCategorySlug(db: Db, slug: string) {
  const [category] = await db.select().from(productCategories)
    .where(eq(productCategories.slug, slug)).limit(1);
  if (!category) return null;
  const rows = await db.select({ product: products })
    .from(products)
    .innerJoin(productCategoryMemberships, eq(productCategoryMemberships.productId, products.id))
    .where(and(
      eq(productCategoryMemberships.categoryId, category.id),
      eq(products.status, 'active')
    ))
    .orderBy(products.name);
  return { category, products: rows.map((r) => r.product) };
}
```

`src/routes/products/category/[slug]/+page.server.ts`:

```ts
export const load = async ({ params }) => {
  const result = await listProductsByCategorySlug(db, params.slug);
  if (result === null) error(404, { message: `Category "${params.slug}" not found`, errorId: `category-not-found-${params.slug}` });
  return result;
};
```

`+page.svelte` renders the category name, description, and a product card grid (reusing the lesson-064 card markup).

`src/routes/products/+page.server.ts` — additionally return `categories: await listCategoriesWithProductCounts(db)`.
`src/routes/products/+page.svelte` — render a "Browse by category" strip above the product grid: one `<a href="/products/category/{c.slug}">{c.name} ({c.productCount})</a>` per category.

Apply:

```bash
pnpm db:reset && pnpm db:seed
pnpm check
pnpm build
```

## Why we chose this — the PE7 judgment

**Alternative 1: Use tags only, skip categories.**
Tags are flat — no `/products/category/<slug>` URL per theme, no dedicated editorial page, no per-theme copy. Fine for filtering, useless for SEO landing pages.

**Alternative 2: Categorize via `product.kind`.**
`kind` is a billing primitive (`course` / `bundle` / `subscription` / `lifetime`) orthogonal to editorial themes. A Foundations category might mix a course and a subscription; `kind` can't express that.

**Alternative 3: Embed category navigation in a modal on `/products`.**
No shareable URL, no SEO, no way for a marketing email to deep-link to `/products/category/foundations`. Modals are for ephemeral UI, not browse axes.

The PE7 choice — **dedicated route + join table + seeded categories** — wins on 10-year longevity: each category is a stable URL, indexable, linkable, and the join table cleanly supports a product belonging to multiple categories later without schema churn.

## What could go wrong

**Symptom:** `pnpm db:seed` inserts duplicate memberships on rerun
**Cause:** No unique guard on `(productId, categoryId)`.
**Fix:** Use `.onConflictDoNothing()` on the composite PK (the schema already defines it as primary key); rerun-safe.

**Symptom:** 404 on a known category slug
**Cause:** Memberships for that category weren't seeded OR the linked product's `status` isn't `'active'`.
**Fix:** Check `product_category_memberships` directly; confirm `products.status = 'active'` for the joined rows.

**Symptom:** Category page shows 0 products despite memberships existing
**Cause:** `orderBy` referenced `prices.createdAt` (copy-pasted from the detail page) but no prices have been created yet for the seeded products.
**Fix:** Order by `products.name` on the category list — prices are a detail-page concern.

## Verify

```bash
pnpm check
pnpm build
pnpm dev
curl -s http://localhost:5173/products/category/foundations | grep -o '<h1[^>]*>[^<]*</h1>'
```
Expected: `<h1>Foundations</h1>` (or equivalent), plus one product card for `forgeschool-lifetime`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/products/category/does-not-exist
```
Expected: `404`.

## Mistake log

- **Used `eq(productCategories.slug, params.slug)` but forgot to filter `products.status='active'`** — draft products leaked onto the public browse page. Added the status guard inside `listProductsByCategorySlug`.
- **Named the category `Foundations` in the DB but linked `/products/category/Foundations`** — mixed case broke routing on case-sensitive lookup. Fixed by always using lower-kebab slugs (`foundations`) and treating the display name as a separate column.
- **Forgot to wire `seedCategories` into `seed-dev.ts` `main()`** — the script existed but was never called; categories silently missing on every reseed. Added the call after `seedProducts`.

## Commit

```bash
git add scripts/seed-categories.ts scripts/seed-dev.ts
git add src/lib/server/db/queries.ts
git add src/routes/products/category/ src/routes/products/+page.server.ts src/routes/products/+page.svelte
git add curriculum/module-05-product/lesson-066-category-browse.md
git commit -m "feat(routes): /products/category/[slug] + lesson 066"
```
