# Lesson 022 — Run the first migration

**Module:** 2 — Data
**Phase:** PE7 Build Order → Phase 2, Step 6
**Previous lesson:** 021 — Generate the first migration
**Next lesson:** 023 — Add `db:reset`, `db:seed`, `db:studio` scripts
**Estimated time:** 10 minutes
**Files touched:** `package.json`, `scripts/migrate.ts`

---

## Context

Lesson 021 produced `drizzle/migrations/0000_*.sql` — the SQL file that describes the v1 schema. This lesson runs it against the Postgres instance we started in lesson 017, creating 15 tables, 8 enums, and every index/foreign-key/constraint the schema declares.

The migration is applied by a typed TypeScript runner — `scripts/migrate.ts` — that uses drizzle-orm's own migrator (`drizzle-orm/postgres-js/migrator`). The migrator opens a dedicated connection, wraps each migration file in a transaction, records completion in a `__drizzle_migrations` table, and refuses to re-apply a migration it has already run. This is the same script we'll invoke in CI and in production (pointed at different `DATABASE_URL`s).

A migration runner is **not** the same as a migration **tool**. The tool (`drizzle-kit generate`) authored the SQL; the runner applies it. Keeping them separate means CI and production can apply migrations without needing the drizzle-kit dev CLI installed — the runner ships with the app's runtime deps.

## The command

Ensure the local Postgres container is running:

```bash
docker compose up -d
```

Wait for the healthcheck to report green (about 5-10 seconds):

```bash
docker compose ps
```

Expected: `forgeschool-postgres` status `running (healthy)`.

Create `scripts/migrate.ts` — the typed migrator runner:

```ts
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({ path: '.env.local' });
config();

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl === '') {
  console.error('[migrate] DATABASE_URL is not set.');
  process.exit(1);
}

async function main(): Promise<void> {
  const client = postgres(databaseUrl as string, { max: 1, prepare: false });
  try {
    console.log('[migrate] applying migrations...');
    await migrate(drizzle(client), { migrationsFolder: './drizzle/migrations' });
    console.log('[migrate] done');
  } finally {
    await client.end({ timeout: 5 });
  }
}

await main();
```

Three design choices in 30 lines:

1. **`max: 1`** — a dedicated single-connection client for the migrator. Running with the default pool (max=10) creates a race condition if the app is using the same database simultaneously.
2. **`prepare: false`** — consistent with `src/lib/server/db/index.ts`; migrations sometimes run through connection poolers that don't support prepared statements.
3. **`client.end({ timeout: 5 })`** in a `finally` — the client is closed whether the migration succeeded or failed. Leaving an open connection on exit produces "database has N idle connections" warnings over time.

Register the command in `package.json`:

```diff
 "scripts": {
   ...
-  "icons:generate": "tsx scripts/generate-icons.ts"
+  "icons:generate": "tsx scripts/generate-icons.ts",
+  "db:migrate": "tsx scripts/migrate.ts"
 },
```

Run it:

```bash
pnpm db:migrate
```

Expected output:

```
[migrate] applying migrations...
[migrate] done
```

(On a first run against a fresh database, drizzle-orm prints additional lines showing which migration files were applied. Subsequent runs against an already-migrated database complete quickly with no new files applied.)

Verify the tables exist:

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool -c "\dt"
```

Expected: a tabular list of 16 tables (15 app tables + `__drizzle_migrations`).

Verify the migration ledger:

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id;"
```

Expected: one row for `0000_ambitious_carlie_cooper.sql`, its SHA hash, and the timestamp the migration ran.

Verify a representative table has the shape you expect:

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool -c "\d orders"
```

Expected: columns `id`, `session_id`, `stripe_checkout_session_id`, `status`, `currency`, `subtotal_cents`, `discount_cents`, `total_cents`, `coupon_id`, `created_at`, `updated_at`. Indexes visible at the bottom.

## Why we chose this — the PE7 judgment

**Alternative 1: Apply the migration by running `psql < 0000_*.sql` manually**
Works for one migration. Breaks the moment you have two, because there's nothing tracking which have run. A second `psql < 0000_*.sql` would try to re-create every table. The migrator maintains a `__drizzle_migrations` ledger so each file runs exactly once.

**Alternative 2: Use `drizzle-kit migrate` as the runner**
`drizzle-kit migrate` works — it's the CLI-wrapping version of our runner. We chose the typed script for two reasons. First, it depends only on `drizzle-orm` + `postgres`, which we already ship as runtime deps; `drizzle-kit` is a dev dep that we don't want in production. Second, a typed script has a call-stack we can step into from CI / a debugger / a log aggregator; a CLI subshell is opaque.

**Alternative 3: Roll a custom migrator using raw `postgres.js`**
Possible — parse the SQL files, track applied hashes in a custom table, apply in order. Drizzle's migrator already does this correctly, including edge cases like partial-transaction recovery and file hash comparison. Re-implementing is a fun exercise that produces worse code than what's already battle-tested.

**Alternative 4: Run the migration via a SvelteKit hook on server startup**
The "automatic migration" pattern — on every deploy, the app boots and runs pending migrations. Seductive, dangerous. Two app instances can boot simultaneously (blue/green deploy, rolling restart) and both try to apply the same migration, racing on the ledger. Migrations belong in a separate, sequential step of the deploy pipeline — before the app starts, with a lock if needed.

**Alternative 5: Apply migrations on schema push (`drizzle-kit push`)**
See lesson 021's rejection of `push`. Push skips the migration file. No record, no reviewability, no rollback path.

The PE7 choice — typed runner script, single-connection client, clean finally block, separate npm script — wins because it's the same code that runs in dev, CI, and production, with observable typed behavior.

## What could go wrong

**Symptom:** `pnpm db:migrate` errors with `ECONNREFUSED 127.0.0.1:5432`
**Cause:** Postgres is not running. Either Docker isn't started or the compose service is stopped.
**Fix:** `docker compose up -d`. Wait for `docker compose ps` to show the `forgeschool-postgres` container as `running (healthy)`. Retry `pnpm db:migrate`.

**Symptom:** `Cannot connect to the Docker daemon at unix:///Users/.../.docker/run/docker.sock`
**Cause:** Docker Desktop (or Colima/OrbStack/whatever runtime) is not running.
**Fix:** Start Docker Desktop (or equivalent). The compose service can't run without a daemon. macOS: `open -a Docker`; Linux: `sudo systemctl start docker`.

**Symptom:** `pnpm db:migrate` runs clean but `\dt` shows no tables
**Cause:** The migrator connected to a different database than you think. Common when `DATABASE_URL` in `.env.local` points at a cloud host rather than localhost, or vice versa.
**Fix:** `echo "$DATABASE_URL"` in a shell that sources `.env.local` and confirm it matches what you expect. The docker psql check queries the container's database — so if `DATABASE_URL` points elsewhere, the container won't have the new tables.

**Symptom:** `relation "__drizzle_migrations" already exists` on a subsequent run
**Cause:** Not an error — the migrator always ensures this table exists. If a prior failure left an inconsistent state, you might be seeing the diagnostic message.
**Fix:** `pnpm db:migrate` should be idempotent. If not, drop the test database and re-migrate: `docker compose down -v && docker compose up -d && pnpm db:migrate`.

**Symptom:** Migration applies, but a `NOT NULL` constraint fails because data already exists
**Cause:** An existing database with rows, and a new migration that adds a non-nullable column without a default. The migration can't fill the new column for old rows.
**Fix:** Either give the column a default (modify schema.ts + regenerate), or add a migration step that backfills before setting NOT NULL. Not applicable on first-migration freshness; guards future migrations.

## Verify

```bash
# Script file exists
ls scripts/migrate.ts
```

```bash
# Script runs cleanly against a live database
pnpm db:migrate
```
Expected: `[migrate] done` with no errors.

```bash
# Drizzle migration ledger has one row
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT count(*) FROM __drizzle_migrations;"
```
Expected: `1`.

```bash
# 15 app tables created
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name != '__drizzle_migrations';"
```
Expected: `15`.

```bash
# Enums are in place
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;"
```
Expected: 8 rows (`coupon_discount_type`, `coupon_duration`, `entitlement_source`, `order_status`, `price_interval`, `product_kind`, `product_status`, `subscription_status`).

```bash
pnpm check
```
Expected: 0 errors.

## Mistake log — things that went wrong the first time I did this

- **First run of `pnpm db:migrate` failed with `connection refused` — Docker wasn't running.** Obvious in retrospect. Added a one-liner to my shell's dev-startup script: `docker compose up -d --wait`. The `--wait` flag blocks until the healthcheck is green.
- **Pool was max=10 by default and the migrator raced against itself on a retry.** First migration attempt timed out due to a network glitch; retried immediately without closing the pool; second attempt used a second connection that picked up a half-committed state. Switched the migrator client to `max: 1` so the migrator is literally single-threaded.
- **Forgot the `await client.end()` in the finally.** Script exited with "connection still open" warnings in CI. Added the finally block; connection closes cleanly on both success and failure paths.
- **Piped `drizzle/migrations/0000_*.sql` directly into `psql` to test the SQL before using the migrator.** Worked, but bypassed the `__drizzle_migrations` ledger; when I later ran `pnpm db:migrate`, it saw no prior migration and tried to run `0000` again, which errored because the tables already existed. Fix: drop the test DB + re-migrate via the script. Rule: always use the migrator, even for testing. `psql < file.sql` is only for data seeding, never for schema.

## Commit this change

```bash
git add package.json scripts/migrate.ts
git add curriculum/module-02-data/lesson-022-run-first-migration.md
git commit -m "feat(db): add migrate.ts runner + db:migrate script + lesson 022"
```

Tables exist. Indexes are in place. The database is now ready for real data. Lesson 023 adds the companion scripts — `db:reset`, `db:seed`, `db:studio` — so the local dev loop is one command per operation.
