# Lesson 026 — Write the first Vitest unit test for a DB query

**Module:** 2 — Data
**Phase:** PE7 Build Order → Phase 2, Step 10
**Previous lesson:** 025 — Seed the first test product
**Next lesson:** 027 — Open Drizzle Studio and explore the schema
**Estimated time:** 20 minutes
**Files touched:** `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `tests/setup.ts`, `src/lib/server/db/queries.ts`, `src/lib/server/db/queries.test.ts`

---

## Context

The seeded row from lesson 025 lives in the database. This lesson wires Vitest, writes the first **production-grade query function** (`getProductBySlug`), and writes the first **integration test** that exercises it against the real Postgres instance.

Two disciplines this lesson establishes and every future test will honor:

1. **Integration tests hit the real database.** Not a SQLite stub. Not an in-memory mock. The real Postgres container from lesson 017. When we mock the database, tests pass against a fiction and break when reality intrudes — constraint violations, enum coercion, index behavior, NULL handling, `ORDER BY` stability. The only way to catch that class of bug at test time is to run against the database you'll ship against.
2. **Queries live in named, testable functions — not inline inside load functions.** Every data access is a function in `src/lib/server/db/queries.ts`. Every such function gets at least one test. Load functions and endpoints call these typed query helpers; they don't construct queries inline.

This lesson produces one real query (`getProductBySlug`), one real utility (`listActivePricesForProduct`), and a test file with three passing assertions.

## The command

Install Vitest and Node typings (the test file needs `process.env`):

```bash
pnpm add -D vitest @types/node
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
    setupFiles: ['./tests/setup.ts']
  }
});
```

- **`environment: 'node'`** — the DB tests run in Node, not a browser DOM environment. Component tests (Module 3+) will override to `'jsdom'` in their own scope.
- **`globals: false`** — every test file imports `describe` / `it` / `expect` explicitly. Global imports hide dependencies; explicit is PE7-correct.
- **`include`** — tests live alongside the code they test (`src/**/*.test.ts`) and in the top-level `tests/` directory for cross-cutting integration.
- **`setupFiles`** — one global setup runs before every file.

Create `tests/setup.ts`:

```ts
import { config } from 'dotenv';

config({ path: '.env.local' });
config();
```

Same dotenv priority as every script — `.env.local` first, `.env` second. Every test sees the same `DATABASE_URL` the dev server sees.

Create `src/lib/server/db/queries.ts` with two functions — `getProductBySlug` and `listActivePricesForProduct`:

```ts
import { eq } from 'drizzle-orm';
import type { Db } from './index.ts';
import { prices, products, type Price, type Product } from './schema.ts';

export async function getProductBySlug(db: Db, slug: string): Promise<Product | null> {
  const [row] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return row ?? null;
}

export async function listActivePricesForProduct(db: Db, productId: string): Promise<Price[]> {
  return db
    .select()
    .from(prices)
    .where(eq(prices.productId, productId))
    .orderBy(prices.createdAt);
}
```

These two functions are the first production query code in the codebase. Both accept `db: Db` as an argument — dependency-injected rather than importing the singleton directly. Tests pass a test-local Drizzle instance; prod code passes the `db` from `src/lib/server/db/index.ts`. Same function, two contexts.

Create `src/lib/server/db/queries.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getProductBySlug, listActivePricesForProduct } from './queries.ts';
import * as schema from './schema.ts';

const databaseUrl = process.env['DATABASE_URL'];
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.');
}

const client = postgres(databaseUrl, { max: 1, prepare: false });
const db = drizzle(client, { schema });

describe('queries — products', () => {
  beforeAll(async () => {
    const row = await getProductBySlug(db, 'forgeschool-lifetime');
    if (row === null) {
      throw new Error(
        'Seed row "forgeschool-lifetime" not found. Run `pnpm db:reset && pnpm db:seed` first.'
      );
    }
  });

  afterAll(async () => {
    await client.end({ timeout: 5 });
  });

  it('returns the seeded lifetime product by slug', async () => { /* ... */ });
  it('returns null for an unknown slug', async () => { /* ... */ });
  it('lists active prices in creation order', async () => { /* ... */ });
});
```

**`process.env['DATABASE_URL']` with bracket notation.** Our PE7 tsconfig has `noPropertyAccessFromIndexSignature: true`. `process.env` is typed as `NodeJS.ProcessEnv` which is an index signature (`Record<string, string | undefined>`). Bracket notation is required. (Only `$env/static/private` — SvelteKit's typed virtual module — supports dot notation, because its keys are statically declared.)

The `beforeAll` guard fails the suite fast with a clear message if the seed data is missing. The developer running `pnpm test` against an unseeded database should see "run db:reset && db:seed first", not a mysterious "expected non-null but got null" in the first assertion.

Register the test command:

```diff
 "scripts": {
   ...
   "db:studio": "drizzle-kit studio",
+  "test": "vitest run",
+  "test:watch": "vitest"
 }
```

Run the tests:

```bash
docker compose up -d --wait   # ensure Postgres is up
pnpm db:reset && pnpm db:seed  # fresh schema + seed
pnpm test
```

Expected output:

```
 ✓ src/lib/server/db/queries.test.ts (3)
   ✓ queries — products (3)
     ✓ returns the seeded lifetime product by slug
     ✓ returns null for an unknown slug
     ✓ lists active prices in creation order

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Why we chose this — the PE7 judgment

**Alternative 1: Mock the database in tests**
`drizzle-orm` has mock helpers; `vitest` makes mocking trivial. Tempting because mocks are fast (no DB round-trip) and hermetic (no shared state between tests). They're also a fiction — a mock can't tell you that your `ORDER BY` wasn't stable, that your `UNIQUE INDEX` has a race under concurrent inserts, that your enum coercion silently accepts an unmapped value. The PE7 rule: integration tests hit a real Postgres. Unit tests (pure functions with no I/O) can mock freely — but DB-adjacent logic is integration, not unit.

**Alternative 2: Spin up a test-specific Postgres container per run**
Every test run creates and destroys a Postgres container. Hermetic, slow. Adds ~5-10 seconds per invocation because container startup dwarfs test execution. We use the existing `forgeschool-postgres` container and rely on `pnpm db:reset && pnpm db:seed` as the pre-test contract. CI will run migrations + seed + tests sequentially against a fresh container in the pipeline (Module 8), but local dev shouldn't pay the startup tax.

**Alternative 3: Use Vitest's `@vitest/coverage-v8` from day one**
Coverage tooling is useful. It also adds a build-time cost and a reporting surface that's most valuable at the end of Module 8. We add it in Module 8 when CI gates are assembled; adding it now would be noise.

**Alternative 4: Call queries inline in load functions; test the load functions directly**
Tempting — fewer files, less indirection. Breaks when multiple load functions need similar queries (you end up with the query duplicated across files). Named query helpers are the DRY point; load functions consume them. Tests test the helpers at the level where shape matters most — the SQL they produce, the rows they return.

**Alternative 5: Use Drizzle's `relational query API` (`db.query.products.findFirst`) instead of `select().from()`**
We already use `findFirst` in the seed script's fallback. For this lesson's two query helpers, `select().from()` is more explicit about column selection and ordering. In later lessons where we join heavily (product + prices + categories), we'll use `db.query` with eager loading. The two APIs coexist — pick based on the shape of the data you need.

The PE7 choice — named queries, integration tests against real Postgres, explicit imports, DB-dependency-injected for testability — wins because it catches the class of bug that mocks hide and scales to the rest of the codebase without ceremony.

## What could go wrong

**Symptom:** `pnpm test` fails with `getaddrinfo ENOTFOUND` or `ECONNREFUSED 127.0.0.1:5432`
**Cause:** Postgres container isn't running.
**Fix:** `docker compose up -d --wait` before tests. Add this to your local pre-test routine or a `predev` npm hook if you run it often.

**Symptom:** `throw new Error('Seed row "forgeschool-lifetime" not found')`
**Cause:** Database is up but wasn't seeded.
**Fix:** `pnpm db:reset && pnpm db:seed`. The error message says exactly this.

**Symptom:** Tests pass locally but fail in CI with `connection terminated`
**Cause:** CI ran migrations but the Postgres container was stopped before tests ran, or the CI job terminated the DB between stages.
**Fix:** In Module 8's CI workflow, ensure Postgres is running as a service throughout the test job. Don't run `db:reset` before each test — do it once at the start of the job.

**Symptom:** `Property 'DATABASE_URL' comes from an index signature, so it must be accessed with ['DATABASE_URL']`
**Cause:** PE7 tsconfig's `noPropertyAccessFromIndexSignature: true` disallows `process.env.DATABASE_URL`.
**Fix:** Use bracket notation: `process.env['DATABASE_URL']`. This is the correct way to read env vars in a strictly-typed file.

**Symptom:** Test hangs forever after assertions pass
**Cause:** The `client` connection isn't being closed. Every test file needs an `afterAll` that calls `await client.end()`.
**Fix:** Ensure `afterAll(async () => { await client.end({ timeout: 5 }); })` is present. Vitest won't exit while a socket is open.

## Verify

```bash
# Config, setup, queries, and test file all present
ls vitest.config.ts tests/setup.ts src/lib/server/db/queries.ts src/lib/server/db/queries.test.ts
```

```bash
# Types clean
pnpm check
```
Expected: 0 errors.

```bash
# Test command registered
grep '"test"' package.json
```

```bash
# Full run with fresh data
docker compose up -d --wait && pnpm db:reset && pnpm db:seed && pnpm test
```
Expected: 3 passing, 0 failing.

## Mistake log — things that went wrong the first time I did this

- **Wrote `process.env.DATABASE_URL` in the test file.** PE7's `noPropertyAccessFromIndexSignature` flag rejected it. The fix is three characters of bracket notation. Important lesson: the same env access pattern is fine in scripts (outside `src/`, so outside `svelte-check`'s scope) but wrong in `src/` test files. Consistency matters — I'll lean on bracket notation everywhere now.
- **Forgot to install `@types/node`.** svelte-check errored on the bare `process` reference. `@types/node` is a devDep every Node-targeting project needs; I had avoided installing it because the scripts were outside the check scope. Once test files moved under `src/`, the types came with them. Added.
- **Tried `vitest run --typecheck`.** Looked for a combined typecheck + test command. Vitest's typecheck mode has its own runner and different config surface; it conflicts with svelte-check's scope. Kept the split: `pnpm check` handles types, `pnpm test` handles runtime. One tool per concern.
- **Opened a second DB client inside each test.** Broke connection-pool limits during a longer suite. Moved the client to module scope — one per file — and closed it in `afterAll`. No more pool exhaustion.

## Commit this change

```bash
git add package.json pnpm-lock.yaml vitest.config.ts tests/setup.ts \
       src/lib/server/db/queries.ts src/lib/server/db/queries.test.ts
git add curriculum/module-02-data/lesson-026-first-vitest-test.md
git commit -m "feat(db): add Vitest + first integration test for queries + lesson 026"
```

With Vitest wired and the first integration test passing, every future data-layer function gets its own test in the same shape. Lesson 027 tours Drizzle Studio — the other tool for inspecting the database, this one with a GUI.
