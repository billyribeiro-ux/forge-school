---
number: 65
commit: 024f18aae3306ed4fb556a5707fd9dfee09bcca6
slug: product-detail
title: Build the /products/[slug] detail page
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 3
previous: 64
next: null
estimatedMinutes: 15
filesTouched:
  - src/routes/products/[slug]/+page.server.ts
  - src/routes/products/[slug]/+page.svelte
---

## Context

Individual product page. Reads the product + its active prices, renders kind / name / description / tags, and provides one Start-checkout form per price. A product with two prices (say future monthly + yearly on the same subscription product) shows two buttons; a single-price product shows one. The detail page is functionally the long form of `/pricing`'s card — same CTA, more context.

## The command

`src/routes/products/[slug]/+page.server.ts`:

```ts
export const load = async ({ params }) => {
  const [product] = await db.select().from(products)
    .where(and(eq(products.slug, params.slug), eq(products.status, 'active'))).limit(1);
  if (product === undefined) error(404, { message: `Product "${params.slug}" not found`, errorId: `product-not-found-${params.slug}` });

  const productPrices = await db.select().from(prices)
    .where(and(eq(prices.productId, product.id), eq(prices.active, true)))
    .orderBy(prices.createdAt);

  return { product, prices: productPrices };
};
```

`src/routes/products/[slug]/+page.svelte` renders:
- Breadcrumb (← All products)
- Kind eyebrow, H1, description, tags
- "Available plans" section with one `.price-row` per active price
- Each price row has the amount + interval + optional trial note + Start-checkout form POSTing to `/checkout/<slug>`

Verify:

```bash
pnpm check
pnpm build
pnpm dev  # /products/forgeschool-lifetime
```

## Why we chose this — the PE7 judgment

**Alternative 1: Merge into /pricing**
The detail page carries the product description at length; /pricing is a compact card grid. Different information densities.

**Alternative 2: Skip detail pages, send browse clicks directly to checkout**
Forces a decision without context. For a $497 purchase, users want the long-form pitch.

**Alternative 3: Embed detail in a modal on /products**
Modal URLs aren't shareable; SEO suffers. Dedicated URL wins.

The PE7 choice — dedicated detail route with one form per price — wins because it's shareable, indexable, and matches the mental model "product = URL."

## What could go wrong

**Symptom:** 404 on a legitimate slug
**Cause:** Product status is `draft` or `archived`.
**Fix:** The query filters `status='active'`. Change status via the seed or a direct UPDATE.

**Symptom:** Checkout button forms submit to the wrong price
**Cause:** Hidden `priceId` value didn't re-render after props updated (Svelte 5 reactivity).
**Fix:** Data binding in the template uses `data.prices` directly — each iteration's `price.id` value is bound at render. Confirm no manual `let` caching.

## Verify

```bash
pnpm check
pnpm build
pnpm dev  # /products/<slug>
```

## Mistake log

- **Passed the whole product object through the hidden input.** The `priceId` field is the only thing the checkout endpoint needs; don't over-share.
- **Rendered the description without a null check.** Product.description is nullable. Added `{#if data.product.description}` guard.

## Commit

```bash
git add src/routes/products/\[slug\]/
git add curriculum/module-05-product/lesson-065-product-detail.md
git commit -m "feat(routes): /products/[slug] detail page + lesson 065"
```
