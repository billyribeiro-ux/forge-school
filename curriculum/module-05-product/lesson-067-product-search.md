---
number: 67
commit: 2b09ab6fc7d0cba24f0473e28b9828eeddaaaad9
slug: product-search
title: Build product search at /products/search
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 5
previous: 66
next: null
estimatedMinutes: 15
filesTouched:
  - src/lib/server/db/queries.ts
  - src/routes/products/search/+page.server.ts
  - src/routes/products/search/+page.svelte
  - src/routes/products/+page.svelte
---

## Context

Category browsing (lesson 066) handles the curated-theme axis. Search handles the free-text axis: a user types `stripe` or `lifetime` and we return every product whose name, description, or tag list hits the query. Different intent, different route.

At three products the query is overkill — you can see the whole catalog on one screen. The point of wiring it now is that search is a **foundation** for the cart flow (lesson 069+) and for the filtering UI (lesson 068). Build the query, build the route, move on.

Implementation uses plain `ILIKE '%query%'` on `name` and `description` plus an `unnest` over `tags`. `tsvector` is justified once the catalog exceeds ~100 rows or users complain — neither is true today.

## The command

`src/lib/server/db/queries.ts` — add `searchActiveProducts`:

```ts
export async function searchActiveProducts(db: Db, query: string): Promise<ProductWithPrices[]> {
  const trimmed = query.trim();
  if (trimmed === '') return [];
  const pattern = `%${trimmed.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;

  const rows = await db.select({ product: products, price: prices })
    .from(products)
    .leftJoin(prices, and(eq(prices.productId, products.id), eq(prices.active, true)))
    .where(and(
      eq(products.status, 'active'),
      or(
        ilike(products.name, pattern),
        ilike(products.description, pattern),
        sql`exists (select 1 from unnest(${products.tags}) t where t ilike ${pattern})`
      )
    ))
    .orderBy(products.name, prices.createdAt);
  // group by product id → ProductWithPrices[]
}
```

Note the `replaceAll('%', '\\%')` — any user-supplied `%` is a wildcard in `ILIKE`; escape it.

`src/routes/products/search/+page.server.ts`:

```ts
export const load = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  const results = q.trim() === '' ? [] : await searchActiveProducts(db, q);
  return { q, results };
};
```

`+page.svelte` — a `<form method="GET" role="search">` with a single `<input name="q" type="search">`, the result count, and a product-card grid (same markup as lesson 064).

Wire `/products/+page.svelte` to link to `/products/search`.

```bash
pnpm check
pnpm build
pnpm dev
```

## Why we chose this — the PE7 judgment

**Alternative 1: Client-side fuzzy search (Fuse.js) over the whole catalog shipped to the browser.**
Ships the entire product list into every browser, exposes draft / unpublished products unless carefully filtered, bypasses the server's auth boundary. Wrong layer — search is a data concern.

**Alternative 2: `tsvector` + GIN index from day one.**
Premature for three products. `tsvector` requires a maintenance column, trigger or generated-column upkeep, and rank tuning. The ILIKE query is O(rows) — irrelevant at our scale; the day we have 100+ products we revisit.

**Alternative 3: Offload to Algolia / Meilisearch.**
Third-party service, monthly cost, extra failure mode, and the catalog is small enough that Postgres is faster. Revisit when the ILIKE plan no longer fits in memory.

**Alternative 4: Use a POST form instead of GET.**
GET makes search URLs shareable (`/products/search?q=stripe`), indexable, bookmarkable. POST breaks all three. GET is the REST-correct choice.

The PE7 choice — **server-rendered ILIKE search on a GET form** — wins on simplicity and shareability today, and trades up cleanly (to `tsvector` or to a search service) when the data volume demands it.

## What could go wrong

**Symptom:** A query of `50%` returns every product, not the ones tagged `'50%'`
**Cause:** `%` and `_` are SQL LIKE wildcards. Unescaped user input matches everything.
**Fix:** Escape `%` and `_` in the pattern: `trimmed.replaceAll('%', '\\%').replaceAll('_', '\\_')`. Driver default escape character is backslash.

**Symptom:** Search returns products where the tag *contains* the query but ordering feels random
**Cause:** Postgres default `ORDER BY` is stable only when the column is unique. `ORDER BY products.name` is deterministic.
**Fix:** Already covered — ordered by `products.name, prices.createdAt`.

**Symptom:** Search returns draft products
**Cause:** Forgot the `eq(products.status, 'active')` filter in the WHERE.
**Fix:** Always filter by status on public surfaces. Add a test when the DB is available.

## Verify

```bash
pnpm check
pnpm build
pnpm dev
curl -s 'http://localhost:5173/products/search?q=lifetime' | grep -c 'forgeschool-lifetime'
```
Expected: `>= 1` hit.

```bash
curl -s 'http://localhost:5173/products/search?q=does-not-exist' | grep -c 'No products match'
```
Expected: `1`.

## Mistake log

- **Started with the catalog shipped to the client + `.filter()` in Svelte.** Works for three rows, pollutes the bundle and leaks draft products. Moved the query server-side.
- **Forgot to escape `%` in the ILIKE pattern.** A query containing `%` returned every row; looked like a search-broken bug. Escape before building the pattern.
- **Tried `sql.raw` to interpolate the pattern** into the query string — Drizzle's parameter binding already handles this; using `sql.raw` opens SQL injection. Reverted to the parameterized `ilike(col, pattern)` helper.

## Commit

```bash
git add src/lib/server/db/queries.ts src/routes/products/search/ src/routes/products/+page.svelte
git add curriculum/module-05-product/lesson-067-product-search.md
git commit -m "feat(routes): /products/search + lesson 067"
```

With the search surface live, lesson 068 layers faceted filters (price / category / tags) on top.
