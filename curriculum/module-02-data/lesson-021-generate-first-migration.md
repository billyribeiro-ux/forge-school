---
number: 21
commit: a29a4448c41597594d26098c302a02d04a2c5eb2
slug: generate-first-migration
title: Generate the first migration
module: 2
moduleSlug: data
moduleTitle: Data
phase: 2
step: 5
previous: 20
next: 22
estimatedMinutes: 5
filesTouched:
  - drizzle.config.ts
  - drizzle/migrations/0000_*.sql
  - drizzle/migrations/meta/
---

## Context

The schema file is the blueprint. The migration is the execution. `drizzle-kit generate` reads `src/lib/server/db/schema.ts`, compares it against the most recent snapshot (none, on this first run), and produces two artifacts:

1. **`drizzle/migrations/0000_<random-name>.sql`** — the SQL to bring a fresh database up to the current schema. This is the file that actually runs against Postgres in lesson 022.
2. **`drizzle/migrations/meta/0000_snapshot.json`** + **`_journal.json`** — the snapshot drizzle-kit compares future schema changes against. These produce the *next* migration's diff, not a full rebuild.

Both artifacts are committed to the repo. Migration SQL is a permanent record of how the database shape evolved; the snapshot JSON is how drizzle-kit knows "this column existed before, now it's being renamed, generate a rename statement, not a drop+add." Losing either breaks the migration pipeline.

The `drizzle/` directory appears for the first time in this lesson — it sits next to `src/`, not inside it, because migrations are not application source code.

## The command

Before running generate, fix a subtle dotenv loading issue from lesson 018. The original `import 'dotenv/config'` reads `.env` by default, not `.env.local` — but our secrets live in `.env.local`. Update `drizzle.config.ts` to explicitly load both files, in priority order:

```diff
 import { defineConfig } from 'drizzle-kit';
-import 'dotenv/config';
+import { config } from 'dotenv';
+
+// Load .env.local first (local overrides), then .env as fallback.
+config({ path: '.env.local' });
+config();

 const databaseUrl = process.env.DATABASE_URL;
```

Run the generator:

```bash
pnpm exec drizzle-kit generate
```

Expected output:

```
◇ injected env (12) from .env.local
◇ injected env (0) from .env
15 tables
cart_items 6 columns 2 indexes 2 fks
carts 5 columns 1 indexes 1 fks
...
[✓] Your SQL migration file ➜ drizzle/migrations/0000_ambitious_carlie_cooper.sql 🚀
```

The random suffix (`ambitious_carlie_cooper`) is drizzle-kit's auto-generated name. It's stable across runs — the same schema diff always produces the same name — and exists so file listings sort meaningfully by timestamp number prefix while staying readable.

Inspect the generated SQL:

```bash
head -20 drizzle/migrations/0000_*.sql
```

Expected output starts with enum declarations, then table creates:

```sql
CREATE TYPE "public"."coupon_discount_type" AS ENUM('percent', 'amount');--> statement-breakpoint
CREATE TYPE "public"."coupon_duration" AS ENUM('once', 'repeating', 'forever');--> statement-breakpoint
...
CREATE TABLE "cart_items" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    ...
);
```

The `--> statement-breakpoint` comments split the file into individual SQL statements — drizzle-kit's runtime reads them as separate queries so a partial failure doesn't leave the DB in a half-applied state.

Confirm the meta files were also written:

```bash
ls drizzle/migrations/meta/
```

Expected: `_journal.json` (migration history) and `0000_snapshot.json` (schema snapshot for diffing future changes).

## Why we chose this — the PE7 judgment

**Alternative 1: Hand-author the migration SQL**
You keep schema.ts and you keep `drizzle/migrations/0000.sql`, but you write both by hand. They can drift silently — schema.ts claims a column exists, the migration forgets to create it, the app fails at runtime with "column does not exist." Drizzle-kit's generator is the single source that guarantees they match. Hand-authored migrations are a choice people make when they don't trust their tool; Drizzle's generator is trustworthy.

**Alternative 2: Use `drizzle-kit push` instead of generate + migrate**
`push` skips the migration file entirely — it inspects the live database and applies whatever SQL is needed to match the current schema.ts. Excellent for prototyping, disastrous for production. A production database has data; `push` will destructively alter tables to match the schema, no review step. The `generate → migrate` flow produces committed SQL that a reviewer sees before it runs. Every production migration gets a PR.

**Alternative 3: Skip the snapshot JSON, rebuild the schema each time**
Without the snapshot, every migration would be a full `CREATE TABLE ... IF NOT EXISTS`, which works only for greenfield databases and breaks the moment you need an `ALTER TABLE`. The snapshot is how incremental migrations are possible.

**Alternative 4: Put migrations in a separate repo**
Some teams keep schema and migrations in a separate repo from the app, to decouple release cycles. Rarely worth the friction in a single-app codebase. Our migrations live alongside the schema they're generated from — they version together, they deploy together.

**Alternative 5: Name migrations by hand**
Drizzle-kit auto-names migrations (`0000_ambitious_carlie_cooper.sql`). The random-word suffix annoys some developers who prefer descriptive names (`0000_initial_schema.sql`). Drizzle-kit lets you pass `--name` for custom names — we don't. The number prefix is the semantic order; the random suffix is a unique tag that prevents collision if two devs generate migrations in parallel. Over a 3-year project with 200 migrations, nobody reads migration filenames — they read the SQL inside.

The PE7 choice — `drizzle-kit generate` + committed SQL + committed snapshot — wins because it produces reviewable migration files that can't silently drift from the schema source.

## What could go wrong

**Symptom:** `drizzle-kit generate` errors with `DATABASE_URL is not set`
**Cause:** `.env.local` exists but dotenv isn't loading it. The default `dotenv/config` reads `.env`, not `.env.local`.
**Fix:** The explicit `config({ path: '.env.local' })` from the `drizzle.config.ts` edit above. Verify `DATABASE_URL` appears in `.env.local` (it should, from lesson 006).

**Symptom:** The generated SQL uses `gen_random_uuid()` but your Postgres throws "function does not exist"
**Cause:** Older Postgres versions (earlier than 13) or fresh installs without the pgcrypto extension. `gen_random_uuid()` is built into Postgres 13+ via the `pgcrypto` module, which is included by default on 13+ and enabled automatically for UUID columns.
**Fix:** You're on Postgres 16 (from lesson 017's Docker Compose), so this shouldn't happen. If it does, confirm the container is actually running Postgres 16: `docker exec forgeschool-postgres psql -U forgeschool -c "SHOW server_version;"`.

**Symptom:** Running `drizzle-kit generate` produces a second migration instead of updating the first
**Cause:** You ran generate, edited the schema, and ran generate again. Drizzle-kit doesn't retroactively modify `0000_*.sql`; it creates `0001_*.sql` with just the diff. That's correct behavior for an applied migration. For a not-yet-applied migration, you can manually delete `0001_*.sql` + roll back the snapshot, or accept the second migration as part of the history.
**Fix:** If the migration hasn't been applied to any environment yet, deleting `0001_*.sql` and regenerating the snapshot is fine. Once a migration is applied anywhere (dev, CI, prod), it's effectively append-only — you can't rewrite history.

**Symptom:** A table shows up with a different column order than schema.ts
**Cause:** Drizzle-kit's generator groups columns by type and constraint for SQL readability, not by schema.ts declaration order. The *name* and *type* match; the order is cosmetic.
**Fix:** Don't worry about it. Column order in the SQL is not semantic. The `SELECT *` ordering at runtime will reflect the Postgres-assigned column order, which matches what `CREATE TABLE` produced.

## Verify

```bash
# Migration artifacts exist
ls drizzle/migrations/
```
Expected: one `0000_*.sql` file and a `meta/` directory.

```bash
# Snapshot JSON and journal
ls drizzle/migrations/meta/
```
Expected: `_journal.json` and `0000_snapshot.json`.

```bash
# SQL contains every expected table
for t in products prices product_categories product_category_memberships \
         orders order_items payments refunds subscriptions \
         entitlements coupons coupon_redemptions carts cart_items webhook_events; do
  grep -q "CREATE TABLE \"$t\"" drizzle/migrations/0000_*.sql && echo "found $t" || echo "MISSING $t"
done
```
Expected: 15 `found` lines.

```bash
# Every enum is declared
grep "CREATE TYPE" drizzle/migrations/0000_*.sql | wc -l
```
Expected: `8`.

```bash
# pnpm check still passes (the schema file hasn't changed, but svelte-kit sync regenerates types)
pnpm check
```
Expected: 0 errors.

## Mistake log — things that went wrong the first time I did this

- **`import 'dotenv/config'` loaded `.env` instead of `.env.local`.** The call-site of drizzle-kit is outside SvelteKit, so `$env/static/private` isn't available. Switched to explicit `config({ path: '.env.local' })` and chained a fallback to `.env`. Future drizzle-kit commands see the right `DATABASE_URL` regardless of which env file the developer is using.
- **Ran `drizzle-kit push` instead of `generate` during exploration.** `push` is tempting because it's one command and skips the migration file. Learned quickly: on any non-empty schema, `push` rewrites tables without warning. Disciplined: `generate` first, review the SQL, apply via `migrate`. Committed to never calling `push` in this project.
- **Didn't add `drizzle/` to the git tracking explicitly.** First commit after generate, I assumed `git add .` would pick it up — it did, but only because `drizzle/` is not in `.gitignore`. Worth verifying — an earlier draft of `.gitignore` had `drizzle/meta/` listed (meant to exclude a different drizzle-kit version's output path). Confirmed the current meta lives inside `drizzle/migrations/meta/`, which is NOT matched by the ignore rule, so the files tracked correctly. Left the legacy rule in place; it's harmless.
- **Tried to use the auto-generated migration name as the only identifier.** Wanted a committed `CHANGELOG.md` entry keyed by the random name. Realized the number prefix (`0000`, `0001`) is the real semantic identifier — the random suffix is just a collision-proof tag. Changelog keys off the number.

## Commit this change

```bash
git add drizzle.config.ts drizzle/
git add curriculum/module-02-data/lesson-021-generate-first-migration.md
git commit -m "feat(db): generate first migration from schema + lesson 021"
```

With the migration SQL on disk and reviewed, lesson 022 runs it against the local Postgres container and confirms the tables are created.
