---
number: 63
slug: extend-product-schema
title: Extend the products schema for browsing
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 1
previous: 62
next: null
estimatedMinutes: 15
filesTouched:
  - src/lib/server/db/schema.ts
  - drizzle/migrations/0001_extend_products_browse_fields.sql
---

## Context

Module 5 builds the WooCommerce-equivalent browsing surface — a catalog beyond `/pricing`, categories, search, cart, membership tiers. PROMPT.md's original list mentions "variants" and "inventory"; for a digital-goods SaaS those don't apply (prices cover "variants"; there's no physical stock).

What DOES apply: **browse metadata**. A catalog needs:

- **`tags text[]`** — flexible non-hierarchical labeling (`'beginner'`, `'stripe'`, `'course'`) for faceted browsing later.
- **`thumbnail_url text`** — image URL for list / detail cards. Nullable because not every product has a thumbnail yet.
- **`featured_order integer`** — null = not featured; non-null = position in the "featured" strip on `/products`.

This lesson adds three columns + one index to `products`, generates migration #0001, and leaves product_categories untouched (the existing schema already supports categories).

## The command

Edit `src/lib/server/db/schema.ts`:

```diff
     stripeProductId: text('stripe_product_id'),
+    tags: text('tags').array().notNull().default([]),
+    thumbnailUrl: text('thumbnail_url'),
+    featuredOrder: integer('featured_order'),
     createdAt: createdAt(),
     updatedAt: updatedAt()
   },
   (t) => [
     uniqueIndex('products_slug_uq').on(t.slug),
     uniqueIndex('products_stripe_product_id_uq').on(t.stripeProductId),
-    index('products_status_kind_idx').on(t.status, t.kind)
+    index('products_status_kind_idx').on(t.status, t.kind),
+    index('products_featured_idx').on(t.featuredOrder)
   ]
 );
```

Generate the migration:

```bash
pnpm exec drizzle-kit generate --name "extend_products_browse_fields"
```

Expected output includes:

```
[✓] Your SQL migration file ➜ drizzle/migrations/0001_extend_products_browse_fields.sql
```

Inspect the SQL — three `ALTER TABLE` + one `CREATE INDEX`:

```sql
ALTER TABLE "products" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "products" ADD COLUMN "thumbnail_url" text;
ALTER TABLE "products" ADD COLUMN "featured_order" integer;
CREATE INDEX "products_featured_idx" ON "products" USING btree ("featured_order");
```

Apply to the local DB:

```bash
pnpm db:migrate
```

Re-seed so existing test products pick up the new default values:

```bash
pnpm db:reset && pnpm db:seed
```

Verify:

```bash
pnpm check
pnpm build
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "\d products"
```
Expected: the three new columns + the new index.

## Why we chose this — the PE7 judgment

**Alternative 1: Skip the extension — /pricing already lists products**
`/pricing` is transactional — plan selection. `/products` (lesson 064) is editorial — browse, discover, compare. They serve different intents and deserve different data surfaces. Tags + thumbnails are needed for the editorial surface.

**Alternative 2: Add a full-text search column (`tsvector`)**
Premature for 3 products. Lesson 067 uses `ILIKE` which fits our scale; `tsvector` materializes when we have 100+ products and measurable search pain.

**Alternative 3: Build a separate `product_metadata` table for tags + thumbnail**
Normalizing would matter if browse fields bloated. Three columns on the main table is simpler and the grown-table cost is trivial.

**Alternative 4: Put tags in `metadata jsonb`**
`jsonb` buys flexibility for unstructured data. Tags are a structured concept (array of strings) queried with `ANY` — arrays are the right primitive.

The PE7 choice — three concrete columns + one index on the main table — wins because it's the minimum change for the largest unblock (the next four lessons build on these fields).

## What could go wrong

**Symptom:** `drizzle-kit generate` emits migration but `db:migrate` errors about existing data
**Cause:** `NOT NULL DEFAULT '{}'` is safe for existing rows; `NOT NULL` without a default would have errored.
**Fix:** We included `.default([])`. Confirm the generated SQL has `DEFAULT '{}' NOT NULL`.

**Symptom:** `featured_order` index doesn't exclude nulls, leading to index bloat
**Cause:** Postgres indexes include NULLs by default.
**Fix:** For a "sparse featured" use case the bloat is trivial (null rows are cheap). If it grows, switch to `where featuredOrder is not null` in the index definition (Drizzle supports partial indexes via `.where(sql\`...\`)`).

## Verify

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

```bash
pnpm db:reset && pnpm db:seed
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT slug, tags, thumbnail_url, featured_order FROM products;"
```
Expected: three rows, each with `tags={}`, nulls for thumbnail / featured.

## Mistake log

- **Forgot the default on `tags`.** First migration had `NOT NULL` without `DEFAULT`; Postgres rejected it on existing rows. Added `.default([])`.
- **Named the column `featured` (boolean).** Booleans can't sort. Swapped to `featured_order` (integer or null) so the UI can render a deterministic order.
- **Typed `tags` as `jsonb`** in a first draft — over-engineering for a flat string array. Reverted to `text[]`.

## Commit

```bash
git add src/lib/server/db/schema.ts drizzle/migrations/
git add curriculum/module-05-product/lesson-063-extend-product-schema.md
git commit -m "feat(schema): extend products with browse fields + lesson 063"
```
