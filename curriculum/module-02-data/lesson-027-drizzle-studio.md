---
number: 27
slug: drizzle-studio
title: Open Drizzle Studio and explore the schema
module: 2
moduleSlug: data
moduleTitle: Data
phase: 2
step: 11
previous: 26
next: 28
estimatedMinutes: 10
filesTouched: []
---

## Context

The `psql` shell is the low-level way to inspect a database. Drizzle Studio is the ergonomic way. It's a local web app launched by `drizzle-kit studio` that reads the same `drizzle.config.ts` we set up in lesson 018, connects to the DB, and renders every table as a spreadsheet-like grid with column types, foreign-key relationships, and inline row-editing. For a developer debugging a failed webhook flow, an admin verifying seed data, or a PR reviewer doing a sanity check on a new table, Studio is 10× faster than typing SQL at a shell.

Studio is a **local** tool. It serves on a localhost URL, it uses your `.env.local` credentials, it does not expose a public surface. Running it against production requires tunneling — which we don't do; production inspection is through audited admin tooling that lands in Module 8.

This lesson has no code changes. The value is the walkthrough — where Studio opens, what you can see, what the PE7 uses of Studio are, what the anti-patterns are.

## The command

```bash
pnpm db:studio
```

Expected output:

```
No config path provided, using default 'drizzle.config.ts'
Reading config file '/Users/.../drizzle.config.ts'
Drizzle Studio is up and running on https://local.drizzle.studio
```

Studio opens in your default browser. If it doesn't auto-open, visit `https://local.drizzle.studio` manually.

**What you see on load:**

- **Left sidebar** — every table in the `public` schema. Ordered alphabetically. Click to open.
- **Top bar** — schema selector (we have one: `public`), search, refresh.
- **Main pane** — spreadsheet view of the selected table's rows.

**Click `products`.** You should see one row:

| id (uuid) | slug | name | description | kind | status | stripe_product_id | created_at | updated_at |
|---|---|---|---|---|---|---|---|---|
| (uuid) | forgeschool-lifetime | ForgeSchool — Lifetime | One-time purchase, permanent access... | lifetime | active | prod_test_forgeschool_lifetime | (ts) | (ts) |

**Click `prices`.** One row with `product_id` matching the products row's `id`.

**Click the `product_id` cell.** Studio recognizes this as a foreign key and offers to navigate to the parent row. Clicking `→ products` jumps you to the `products` table scrolled to the linked row.

### Four Studio workflows you'll use weekly

1. **Verify a seed or migration ran correctly.** After `pnpm db:reset && pnpm db:seed`, Studio shows every table's row count at a glance. A blank `products` table after seeding means the seed failed silently.

2. **Inspect a webhook flow.** When a Stripe webhook lands in Module 4, you'll want to see: did the `orders` row get created? Did `payments` get a row? Did `entitlements` get a grant? Studio answers all three in 10 seconds by clicking through the related tables.

3. **Manually fix test data.** A dev coupon expired — you want to extend it without writing an UPDATE query. Double-click the cell, edit the value, Studio runs the UPDATE for you. (Caveat below about prod.)

4. **Validate schema changes before committing a migration.** After `pnpm exec drizzle-kit generate`, reload Studio. New columns appear instantly. Compare against what you expected; if something's off, fix the schema and regenerate.

## Why we chose this — the PE7 judgment

**Alternative 1: Use pgAdmin**
pgAdmin is the veteran — powerful, stable, familiar. It's also a separate app to install, a separate connection config to maintain, and has a UI designed for DBAs, not application developers. Drizzle Studio's schema-aware layout (foreign-key click-through, enum drop-downs, type-aware cell editors) is tuned to the kinds of data-exploration tasks an app developer does. pgAdmin is more powerful; Studio is more appropriate.

**Alternative 2: Use the `psql` CLI exclusively**
`psql` is the reliable fallback and the right tool for batch operations and scripts. For a quick "does this row exist?" check, Studio's one-click navigation beats typing `SELECT ... FROM ... WHERE ...` and scanning the terminal output. We keep both — psql for scripts and CI, Studio for interactive work.

**Alternative 3: Build a custom admin UI inside the SvelteKit app**
Module 8 adds a real admin UI for production operations (refund processing, entitlement grants, coupon creation). The custom UI and Studio are NOT substitutes — the admin UI is auth-gated, audit-logged, and scoped to the operations the product supports. Studio is an unrestricted developer tool. Different blast radiuses, different audiences.

**Alternative 4: Inspect the database via an IDE plugin (DataGrip, VS Code's Database Client)**
Valid. Requires per-IDE configuration and a connection string to manage per project. Studio's "one command to launch" is lower friction. IDE plugins are better when you want to author SQL with auto-complete (they have richer SQL editors); Studio is better for row-level inspection.

The PE7 choice — Drizzle Studio as the default local inspection tool — wins because it's bundled with our ORM's tooling, schema-aware, and one command away.

## What could go wrong

**Symptom:** `pnpm db:studio` errors with `DATABASE_URL is not set`
**Cause:** `.env.local` isn't loaded. `drizzle.config.ts`'s dotenv setup from lesson 021 reads `.env.local` first, but if the file is missing or empty, the config throws.
**Fix:** Verify `.env.local` exists and has `DATABASE_URL` set. The error message in `drizzle.config.ts` tells you exactly this.

**Symptom:** Browser opens to `https://local.drizzle.studio` and shows "unable to connect"
**Cause:** Postgres isn't running.
**Fix:** `docker compose up -d --wait`. Studio doesn't start the DB for you.

**Symptom:** Studio loads but the row grid is empty for every table
**Cause:** DB is up, migrations ran, but seed didn't run (or was pointed at a different DB).
**Fix:** `pnpm db:seed`. Click Studio's refresh button after.

**Symptom:** Edit-in-cell fails silently when you try to change an `id` column
**Cause:** Primary key columns are read-only in Studio by design — changing a UUID cascades into every foreign key in the database.
**Fix:** Don't edit primary keys through Studio. If you need to rekey, write a migration.

**Symptom:** Studio appears to be accessing a production database
**Cause:** `.env.local` contains a production `DATABASE_URL`. Catastrophic if acted upon.
**Fix:** Studio has NO production guards. The protection is on your `.env.local` — never put production credentials there. If you somehow did, exit Studio immediately (`Ctrl+C` in the terminal), rotate any cached credentials, and audit what you clicked.

## Verify

```bash
# Studio command is registered
grep '"db:studio"' package.json
```
Expected: one match.

```bash
# Launch Studio (foreground; terminate with Ctrl+C)
pnpm db:studio
```
Expected: "Drizzle Studio is up and running on https://local.drizzle.studio".

Open the URL. Confirm:

1. Sidebar lists every table from the schema (products, prices, orders, order_items, payments, refunds, subscriptions, entitlements, coupons, coupon_redemptions, carts, cart_items, product_categories, product_category_memberships, webhook_events).
2. Clicking `products` shows the seeded `forgeschool-lifetime` row.
3. Clicking `prices.product_id` offers foreign-key navigation to the parent product.
4. Enum columns (e.g., `products.kind`) show a drop-down of valid values when you click to edit.

Stop Studio with `Ctrl+C` when done.

## Mistake log — things that went wrong the first time I did this

- **Clicked through foreign-key navigation without understanding it was reversible.** Jumped from `prices.product_id` into `products`, couldn't find my way back. Studio's browser back button works — Studio respects history. Or close the tab and re-click from the sidebar.
- **Edited a `unit_amount_cents` value directly to "test a pricing change".** Broke downstream tests that asserted on the exact seed value. Studio's edit feature is not reversible in the same session (no undo). Rule: never edit seeded test fixtures in Studio. If you need different data, update the seed script + re-run `db:reset && db:seed`.
- **Tried to keep Studio running while applying a migration.** Studio held a connection against the old schema; drizzle-kit migrate paused waiting. Killed Studio, re-ran migrate, it succeeded. Rule: stop Studio before any schema-changing operation.
- **Assumed Studio's "delete row" would respect foreign-key cascades.** Deleted a `products` row; `prices` children were orphaned because Studio's delete doesn't walk FK chains. The schema's `onDelete: 'cascade'` would have handled it, but only if the DELETE went through Postgres' SQL engine — which it did, but I was surprised by the cascade behavior. Reviewed schema.ts' onDelete policies to match expectations. No bug — just a mental-model update.

## Commit this change

This lesson produces no code change. Commit only the lesson:

```bash
git add curriculum/module-02-data/lesson-027-drizzle-studio.md
git commit -m "docs(db): add Drizzle Studio walkthrough + lesson 027"
```

With a GUI and a CLI both wired, every future database question — "does this row exist?", "what's in the entitlements table for session X?", "did the webhook create a record?" — has a 5-second answer. Lesson 028 closes Module 2 with verification and the phase-2-complete tag.
