---
number: 24
slug: seed-dev-script
title: Build scripts/seed-dev.ts with production guards
module: 2
moduleSlug: data
moduleTitle: Data
phase: 2
step: 8
previous: 23
next: 25
estimatedMinutes: 15
filesTouched:
  - scripts/lib/env.ts
  - scripts/reset.ts
  - scripts/seed-dev.ts
---

## Context

A seed script populates an empty database with predictable development data — products, prices, fixture sessions, coupon codes — so `pnpm dev` renders a real UI on first run. It also writes the patterns the real app code will follow: opening a connection, using Drizzle's typed query builder, closing the connection cleanly.

Three structural concerns this lesson solves before any actual seed data is inserted:

1. **Production guards.** The seed script MUST never run against a hosted or production database. A developer who sources the wrong env file and runs `pnpm db:seed` should see a hard stop, not fictitious test rows in Stripe's staging environment.
2. **Shared helpers.** The `reset.ts` script from lesson 023 already has env-loading and production-guard logic. Duplicating it in `seed-dev.ts` would produce two maintenance targets. We extract the helpers into `scripts/lib/env.ts` and refactor `reset.ts` to use them.
3. **Predictable skeleton.** The seed script's skeleton — load env, guard, open client, do work, close client — is the same for every future seed operation. We ship the skeleton now; lesson 025 fills in the first real fixture.

This lesson produces a callable `pnpm db:seed` that exits cleanly with "no-op" output. Real data arrives in lesson 025.

## The command

Create `scripts/lib/env.ts` with three exports — the shared helpers any dev script can call:

```ts
import { config } from 'dotenv';

export function loadEnv(): void {
  config({ path: '.env.local' });
  config();
}

export function requireDatabaseUrl(scriptName: string): string {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === '') {
    console.error(`[${scriptName}] DATABASE_URL is not set. Fill in .env.local.`);
    process.exit(1);
  }
  return url;
}

export function refuseIfProdLike(scriptName: string, url: string): void {
  const redFlags = [
    /prod/i, /production/i,
    /\.amazonaws\.com/i, /\.rds\./i,
    /\.supabase\.co/i, /\.neon\.tech/i,
    /\.railway\.app/i, /\.render\.com/i
  ];
  const hit = redFlags.find((p) => p.test(url));
  if (hit !== undefined) {
    console.error(`[${scriptName}] DATABASE_URL matches "${hit.source}" — refusing to run.`);
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production') {
    console.error(`[${scriptName}] NODE_ENV=production — refusing to run.`);
    process.exit(1);
  }
}
```

Refactor `scripts/reset.ts` to use the shared helpers. The inline dotenv + guard code is gone; each responsibility is named by the helper it calls:

```ts
import { spawnSync } from 'node:child_process';
import postgres from 'postgres';
import { loadEnv, refuseIfProdLike, requireDatabaseUrl } from './lib/env.ts';

loadEnv();
const databaseUrl = requireDatabaseUrl('reset');
refuseIfProdLike('reset', databaseUrl);

// ... remainder of reset unchanged
```

Create `scripts/seed-dev.ts` with the same skeleton — load env, guard, open Drizzle client, run work, close client:

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema.ts';
import { loadEnv, refuseIfProdLike, requireDatabaseUrl } from './lib/env.ts';

loadEnv();
const databaseUrl = requireDatabaseUrl('seed');
refuseIfProdLike('seed', databaseUrl);

async function main(): Promise<void> {
  const client = postgres(databaseUrl, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  try {
    console.log('[seed] inserting dev fixtures...');
    // Lesson 025 fills this in. Skeleton is intentionally a no-op.
    await db.execute('SELECT 1');
    console.log('[seed] done');
  } finally {
    await client.end({ timeout: 5 });
  }
}

await main();
```

**Note on the schema import.** We import `../src/lib/server/db/schema.ts` with a relative path, NOT `$lib/server/db/schema.ts`. The `$lib` alias is a SvelteKit virtual — tsx-run scripts don't have access to it. Relative paths are portable across every runtime the script might run in.

Verify:

```bash
pnpm check
```
Expected: 0 errors.

```bash
pnpm db:reset && pnpm db:seed
```
Expected output (end of run):

```
[reset] done
[seed] inserting dev fixtures...
[seed] done
```

Exit code 0 on both.

## Why we chose this — the PE7 judgment

**Alternative 1: Duplicate the env-loading / production-guard code inline in each script**
Two copies of 30 lines is 60 lines of duplicated logic. Three copies (add migrate.ts) is 90. At that point the duplication becomes a maintenance bug waiting to happen — someone updates the prod-regex in `reset.ts` and forgets `seed-dev.ts`. Factoring out now — two scripts — is the right moment. The rule of thumb: copy once is fine, copy twice is the refactor signal.

**Alternative 2: Use a framework like drizzle-seed for the seed pipeline**
`drizzle-seed` (an official sister project) generates random-ish data from the schema's shape. Useful for load testing, less useful for deterministic dev fixtures that the rest of the codebase references by ID (e.g., "the ForgeSchool Lifetime product with price $497"). Hand-authored seed data is exactly what this project needs.

**Alternative 3: Skip the production guard; trust NODE_ENV alone**
`NODE_ENV` is the obvious signal. It's also the least reliable — it's set by the consumer, and defaults vary by tool (`tsx` doesn't set it, Vite dev sets it, `pnpm` passes through). The URL-regex is the belt to NODE_ENV's suspenders. Both are cheap, so both run.

**Alternative 4: Put the seed data in a `.sql` file and pipe to `psql`**
Works for static data. Breaks the moment you need logic — "create a subscription that starts 7 days ago", "insert 12 coupon states", "generate 100 orders with randomized timestamps". SQL is the wrong language for that work. A typed Drizzle script has the full power of TypeScript and the type-safety of the schema.

**Alternative 5: Put the helpers inside `src/lib/server/`**
Scripts should be siblings of `src/`, not children. Putting shared-dev helpers under `src/lib/server/` would leak them into the SvelteKit build graph, adding to the server bundle. Dev-time shell helpers belong in `scripts/lib/`.

The PE7 choice — shared helpers in `scripts/lib/env.ts`, every destructive script calls the production guard first, no-op skeleton for seed-dev — wins because the safety discipline is enforced by composition, not trusted to memory.

## What could go wrong

**Symptom:** `pnpm db:seed` runs "[seed] inserting dev fixtures..." but no data appears
**Cause:** The skeleton deliberately does nothing (`SELECT 1` placeholder). Real work lands in lesson 025.
**Fix:** Wait for lesson 025. Or, if you're exploring ahead, add your own `INSERT` inside the try block.

**Symptom:** `Cannot find module '../src/lib/server/db/schema'`
**Cause:** A missing or misspelled `.ts` extension on the import. The PE7 tsconfig has `rewriteRelativeImportExtensions: true`, so relative imports MUST include the `.ts` extension.
**Fix:** Ensure `import * as schema from '../src/lib/server/db/schema.ts';` — with the `.ts`.

**Symptom:** `pnpm db:seed` errors with `getaddrinfo ENOTFOUND postgres`
**Cause:** `DATABASE_URL` points at a hostname that doesn't resolve. Usually means the Docker container isn't running, or a Compose service name leaked into a local env file.
**Fix:** `docker compose up -d --wait`. Confirm `DATABASE_URL` uses `localhost:5432`, not the internal service hostname `postgres:5432`.

**Symptom:** The production guard fires on a DATABASE_URL that contains "production" but is actually local (e.g., `my-production-test` as a DB name)
**Cause:** The regex is intentionally broad. False positives are safer than false negatives for a destructive operation.
**Fix:** Rename your local database to something without "production" / "prod" / cloud provider hostnames in the URL. The inconvenience is real but minor.

## Verify

```bash
# The shared helpers are in scripts/lib/
ls scripts/lib/env.ts
```

```bash
# Reset uses the helpers (no inline dotenv/refuse code)
grep "loadEnv\|refuseIfProdLike\|requireDatabaseUrl" scripts/reset.ts
```
Expected: three matches (the three helper calls).

```bash
# seed-dev exists with the skeleton
ls scripts/seed-dev.ts
grep "refuseIfProdLike" scripts/seed-dev.ts
```
Expected: file exists, guard called.

```bash
pnpm check
```
Expected: 0 errors.

```bash
# Full reset + seed loop works end-to-end
pnpm db:reset && pnpm db:seed
```
Expected: completes in under 5 seconds with "[seed] done" exit 0.

```bash
# Production guard fires on a hosted URL
DATABASE_URL="postgres://app:pass@db.foo.supabase.co:5432/app" \
  pnpm db:seed 2>&1 | head -3
```
Expected: "refusing to run" error message. Exit code 1.

## Mistake log — things that went wrong the first time I did this

- **Imported schema via `$lib/server/db/schema.ts`.** svelte-check was happy (the alias resolves in tsconfig). tsx was not — at runtime it errored with "cannot find module $lib". Switched to a relative path. SvelteKit-specific aliases belong inside `src/`; scripts use vanilla relative imports.
- **Put the shared helpers in `src/lib/server/dev/`.** Tried to re-use them from the existing `$lib/server` area. Realized the scripts shouldn't drag SvelteKit's build context around. Moved to `scripts/lib/env.ts`.
- **Called `process.exit(1)` from inside the helper without logging the reason.** First pass of `refuseIfProdLike` just exited; the developer saw a silent exit-code-1. Added the explicit `console.error` with the matching pattern, so the guard's decision is visible.
- **Didn't take the scriptName parameter on `refuseIfProdLike` / `requireDatabaseUrl`.** First pass: every guard-fire said `[refuse] ...` without context. When multiple scripts logged the same prefix, it was unclear which script stopped. Added `scriptName` so the output includes `[reset]` / `[seed]` / whatever — attribution preserved.

## Commit this change

```bash
git add scripts/lib/env.ts scripts/reset.ts scripts/seed-dev.ts
git add curriculum/module-02-data/lesson-024-seed-dev-script.md
git commit -m "feat(db): scaffold seed-dev.ts with shared env guards + lesson 024"
```

With the skeleton and the guards in place, lesson 025 fills the seed script with the first real fixture: the ForgeSchool Lifetime product + its Stripe-test-mode price.
