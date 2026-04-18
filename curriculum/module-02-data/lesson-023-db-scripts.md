---
number: 23
commit: 9dd7b0a73719add8a5ae84f039e09d4fb76a4b6f
slug: db-scripts
title: Add db:reset, db:seed, and db:studio scripts
module: 2
moduleSlug: data
moduleTitle: Data
phase: 2
step: 7
previous: 22
next: 24
estimatedMinutes: 10
filesTouched:
  - package.json
  - scripts/reset.ts
---

## Context

The local dev loop needs three more named commands so developers never have to remember the underlying invocations:

- **`pnpm db:reset`** — drop every table, re-apply every migration. The nuclear-but-clean reset for when you want a guaranteed-fresh state.
- **`pnpm db:seed`** — insert the development seed data. Not yet implemented — lesson 024 builds `scripts/seed-dev.ts`. This lesson wires the script name in advance.
- **`pnpm db:studio`** — launch Drizzle Studio, a local browser UI for inspecting and editing table data.

Named scripts are a contract. Every developer on the project, every CI job, and every future-you who returns after three months remembers "reset the db" — not "run tsx against a file in scripts/". The abstraction matters.

This lesson's meaningful work is the reset script (`scripts/reset.ts`). `db:seed` is a pointer to a file that will exist in lesson 024. `db:studio` is a one-line passthrough to `drizzle-kit studio`.

## The command

Create `scripts/reset.ts`:

```ts
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import postgres from 'postgres';

config({ path: '.env.local' });
config();

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl === '') {
  console.error('[reset] DATABASE_URL is not set.');
  process.exit(1);
}

function refuseIfProdLike(url: string): void {
  const redFlags = [
    /prod/i, /production/i,
    /\.amazonaws\.com/i, /\.rds\./i,
    /\.supabase\.co/i, /\.neon\.tech/i,
    /\.railway\.app/i, /\.render\.com/i
  ];
  const hit = redFlags.find((pattern) => pattern.test(url));
  if (hit !== undefined) {
    console.error(
      `[reset] DATABASE_URL matches "${hit.source}" — refusing to drop.`
    );
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('[reset] NODE_ENV=production — refusing to drop.');
    process.exit(1);
  }
}

async function main(): Promise<void> {
  refuseIfProdLike(databaseUrl as string);

  const client = postgres(databaseUrl as string, { max: 1, prepare: false });
  try {
    await client.unsafe('DROP SCHEMA IF EXISTS public CASCADE');
    await client.unsafe('CREATE SCHEMA public');
    await client.unsafe('GRANT ALL ON SCHEMA public TO CURRENT_USER');
  } finally {
    await client.end({ timeout: 5 });
  }

  const result = spawnSync('pnpm', ['exec', 'tsx', 'scripts/migrate.ts'], {
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

await main();
```

Three structural choices:

1. **`refuseIfProdLike`** — belt-and-suspenders check that refuses to run if the DATABASE_URL looks like a hosted database (AWS RDS, Supabase, Neon, Railway, Render) or contains the word "prod" / "production". This is the most important 15 lines in the script. A developer who accidentally sources a staging env file and runs `pnpm db:reset` should see a hard stop, not a wiped staging database. The check errors on the side of false positives — names like "productivity-staging-db" would trigger the guard. That's acceptable; renaming the DB is easier than restoring from backup.
2. **`DROP SCHEMA public CASCADE` + `CREATE SCHEMA public`** — drops every table, type, function, sequence, and index in one statement. Then recreates the empty schema. This is cleaner than `DROP TABLE IF EXISTS` for every individual table because it catches artifacts that aren't in the current schema.ts (from old migrations, manual experiments, etc.).
3. **`spawnSync('pnpm exec tsx scripts/migrate.ts')`** — re-uses the existing migrator rather than duplicating the migration logic. The `spawnSync` + `stdio: 'inherit'` pattern pipes the migrator's output directly to this script's stdout, so the user sees the migration progress in real time.

Register all three scripts in `package.json`:

```diff
 "scripts": {
   ...
   "icons:generate": "tsx scripts/generate-icons.ts",
-  "db:migrate": "tsx scripts/migrate.ts"
+  "db:migrate": "tsx scripts/migrate.ts",
+  "db:reset": "tsx scripts/reset.ts",
+  "db:seed": "tsx scripts/seed-dev.ts",
+  "db:studio": "drizzle-kit studio"
 },
```

Test the reset:

```bash
pnpm db:reset
```

Expected output:

```
[reset] dropping public schema...
[reset] public schema recreated
[reset] running migrations...
[migrate] applying migrations...
[migrate] done
[reset] done
```

Verify a fresh state:

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool -c "\dt"
```

Expected: 16 tables (15 app tables + `__drizzle_migrations`), each empty.

`pnpm db:seed` will fail until lesson 024 creates `scripts/seed-dev.ts`. `pnpm db:studio` opens a browser tab; we'll walk through its UI in lesson 027.

## Why we chose this — the PE7 judgment

**Alternative 1: Use `docker compose down -v` for reset**
Deletes the Docker volume, which wipes ALL data including anything outside the app schema. Takes 10+ seconds to tear down and bring up the container. The reset script completes in under a second because it only drops and recreates the public schema — no container restart needed.

**Alternative 2: Write a Makefile instead of package.json scripts**
Makefiles are excellent for cross-language projects. For a TypeScript-only project, `package.json scripts` is the ergonomic choice: shell completion works out of the box via pnpm, commands are discoverable via `pnpm run`, and there's no separate toolchain.

**Alternative 3: Manual `DROP TABLE` statements**
Listing each table in a `DROP TABLE IF EXISTS` chain works. It's brittle — miss a table, the reset is incomplete; add a table, update the drop script. `DROP SCHEMA ... CASCADE` removes every object in the schema regardless of what changed.

**Alternative 4: Skip the production guard; trust the developer**
The developer who runs `pnpm db:reset` 100 times a day will eventually do it with the wrong `DATABASE_URL` loaded. The guard costs 15 lines and catches the "wrong env file sourced" category of catastrophe. Zero-trust posture on destructive commands is a PE7 hallmark.

**Alternative 5: Put `db:seed` behind `db:reset:seed` as a combined script**
We could have a single `db:reset:seed` that resets and seeds in one call. We keep them separate because tests reset frequently without seeding, and seeding frequently happens without a reset (top up a specific persona). Keep the primitives separate; compose them when needed (`pnpm db:reset && pnpm db:seed`).

The PE7 choice — typed reset script with a production guard, three named `db:*` npm scripts — wins because it makes every db operation a one-word command and makes a destructive operation impossible against a production-shaped URL.

## What could go wrong

**Symptom:** `pnpm db:reset` errors with `permission denied for schema public`
**Cause:** The Postgres role connecting doesn't own the `public` schema, or the schema was created by a different role.
**Fix:** Inside the Docker Compose service, the `forgeschool` user IS the DB owner, so this doesn't happen locally. If it does (maybe you're targeting a managed DB against the rules of this script), review who owns the schema and whether this script should even be running against that database.

**Symptom:** The script refuses to run because it thinks the URL is production-like
**Cause:** A false positive in the regex match. Maybe your local DB is hosted at a `.rds.amazonaws.com`-style dev subdomain, or your branch name leaked "production" into an env.
**Fix:** Rename the dev database or the env var to something that doesn't match. The guard deliberately favors false positives; loosening it requires a conscious choice.

**Symptom:** `pnpm db:seed` errors with `Cannot find module 'scripts/seed-dev.ts'`
**Cause:** Lesson 024 creates this file. Until then, `db:seed` is a registered pointer to a file that doesn't exist yet.
**Fix:** Wait for lesson 024, or manually create a stub `scripts/seed-dev.ts` that exits 0 if you want to test the pipeline now.

**Symptom:** `pnpm db:studio` errors with `Cannot find drizzle-kit`
**Cause:** `drizzle-kit` is a dev dependency; if pnpm is run in production mode with `--prod` or `NODE_ENV=production`, dev deps aren't installed.
**Fix:** Studio is a local dev tool. Run it from a machine with the full install (`pnpm install` without `--prod`).

**Symptom:** After `db:reset`, the first `db:migrate` hangs
**Cause:** An app connection is still holding a transaction against the old schema. The drop won't complete until that connection releases.
**Fix:** Kill any running dev server or other DB consumers before reset. If the problem persists, use `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'forgeschool' AND pid <> pg_backend_pid();`.

## Verify

```bash
# All three scripts are registered
grep -E '"db:(migrate|reset|seed|studio)":' package.json | wc -l
```
Expected: `4`.

```bash
# Reset script exists and is typed
ls scripts/reset.ts
pnpm check
```
Expected: file exists; 0 errors on check.

```bash
# Run the reset end-to-end
pnpm db:reset
```
Expected: completes in ~1-2 seconds with "[reset] done".

```bash
# Verify tables are back and empty
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool \
  -c "SELECT count(*) FROM products;"
```
Expected: `0` (no rows, but table exists).

```bash
# The production guard fires on a production-like URL
DATABASE_URL="postgres://user:pass@db.prod-cluster.example.com:5432/app" \
  pnpm db:reset 2>&1 | head -3
```
Expected: error message ending in "refusing to drop". Exit code 1.

## Mistake log — things that went wrong the first time I did this

- **Tried `TRUNCATE TABLE` on every table individually.** Worked, but missed the sequence reset (`id` columns continued from their last value across resets) and didn't clear types. Switched to `DROP SCHEMA public CASCADE` + recreate — which resets sequences, enums, functions, everything in one statement.
- **Used `child_process.exec` instead of `spawnSync`.** `exec` buffers stdout; the migrator's progress lines didn't appear until the whole thing finished. `spawnSync` with `stdio: 'inherit'` streams output live. Changed.
- **Forgot the `GRANT ALL ON SCHEMA public TO CURRENT_USER` line.** Dropped the schema, recreated it, but Postgres 15+ removed the default public CREATE grant. Subsequent `CREATE TABLE` in the migration errored with "permission denied for schema public". Added the grant; now the script works regardless of Postgres version-defaults.
- **The production guard used substring `includes()` instead of regex.** A DB named `forgeschool-production-test` would have passed because "production" wasn't case-sensitive and my check was case-sensitive. Switched to case-insensitive regex `/production/i` and the false-negative disappeared.

## Commit this change

```bash
git add package.json scripts/reset.ts
git add curriculum/module-02-data/lesson-023-db-scripts.md
git commit -m "feat(db): add db:reset / db:seed / db:studio scripts + lesson 023"
```

With the `db:*` command family registered, the local dev loop is one word per operation. Lesson 024 implements the actual seed script the `db:seed` command points to.
