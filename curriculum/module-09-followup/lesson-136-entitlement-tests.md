---
number: 136
slug: entitlement-tests
title: Entitlement grant/revoke unit tests with mocked Drizzle
module: 9
moduleSlug: followup
moduleTitle: v1.0 Follow-up
phase: 9
step: 1
previous: 135
next: null
estimatedMinutes: 20
filesTouched:
  - vitest.config.ts
  - tests/stubs/env-private.ts
  - tests/stubs/env-public.ts
  - tests/stubs/app/environment.ts
  - tests/unit/entitlements.test.ts
---

## Context

PROMPT.md Module 5 step 89 calls for unit tests over `entitlements.grant*` / `entitlements.revoke*`. The grant/revoke functions live in `src/lib/server/entitlements/index.ts`, every one of them a thin wrapper around a Drizzle chain. Live-Postgres tests are a separate (heavier) integration suite; this lesson ships the **argument-shape unit tests** — a mock `db` records every chain call and assertions verify the table, values, conflict-target, set-payload, and where-clause shape.

## The command

`vitest.config.ts` — wire `$lib`, `$env/static/private`, `$env/static/public`, and `$app/environment` aliases so server-only code resolves outside SvelteKit:

```ts
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  resolve: {
    alias: {
      $lib: `${root}src/lib`,
      $app: `${root}tests/stubs/app`,
      '$env/static/private': `${root}tests/stubs/env-private.ts`,
      '$env/static/public': `${root}tests/stubs/env-public.ts`
    }
  },
  test: { … }
});
```

Stubs under `tests/stubs/` export the env vars + `browser`/`dev`/`building`/`version` constants the SvelteKit virtual modules normally provide.

`tests/unit/entitlements.test.ts` — for each export, build a `makeMockDb()` that returns a `db` whose `insert/update/select` chain captures every method call into a `Captured` record. Tests then assert against the recorded calls:

```ts
it('writes the source as "purchase" + carries sourceRef', async () => {
  await grantPurchaseEntitlement(mock.db as never, { sessionId: 's1', productId: 'p1', sourceRef: 'cs_test_xyz' });
  expect(mock.captured.insertedValues).toMatchObject({
    sessionId: 's1', productId: 'p1', source: 'purchase', sourceRef: 'cs_test_xyz'
  });
});

it('upserts with revokedAt cleared on conflict (idempotent re-grant)', async () => {
  await grantPurchaseEntitlement(mock.db as never, { … });
  expect(mock.captured.onConflictSet).toMatchObject({ revokedAt: null, sourceRef: 'cs_test_xyz' });
});
```

Nine tests cover grantPurchase, grantSubscription, revokePurchaseForSession, revokeSubscription, hasEntitlement (false + true paths), and a schema-import sanity check.

```bash
pnpm exec vitest run tests/unit/entitlements.test.ts
```

## Why we chose this — the PE7 judgment

**Alt 1: PGlite / pg-mem in-memory Postgres.** Heavier. Worth it once we're testing query semantics (joins, indexes); for argument-shape verification it's overkill.
**Alt 2: Skip — rely on E2E.** E2E exercises the happy path; it doesn't enumerate "did you forget to set source='purchase' in this code path?" Argument-shape tests catch the bugs E2E suites historically miss.
**Alt 3: Mock with `vi.hoisted` + auto-mocking the entire `drizzle-orm` module.** Loses the type-safe `entitlements` table reference in assertions. Hand-rolled chain mock is a few more lines but reads cleaner.

The PE7 choice — **alias virtual modules + capture-everything mock + assertions on the captured shape** — wins on speed (49 tests / 1.4s), zero infra, and complete coverage of the grant/revoke argument plumbing.

## What could go wrong

**Symptom:** Vitest can't resolve `$lib/server/db/schema`
**Cause:** Missing alias entry in `vitest.config.ts`.
**Fix:** Add the four aliases listed above. SvelteKit's vite plugin provides them at runtime; tests need them explicitly.

**Symptom:** `STRIPE_SECRET_KEY` assertion fires in test imports
**Cause:** `src/lib/server/stripe/client.ts` reads `STRIPE_SECRET_KEY` at module load and asserts the prefix.
**Fix:** The stub in `tests/stubs/env-private.ts` ships `sk_test_placeholder…` which clears the assert.

## Verify

```bash
pnpm exec vitest run tests/unit/        # 49 passed (was 40)
pnpm check                              # 0 errors
```

## Mistake log

- First mock returned `Promise.resolve()` from `update().set()` directly — `revoke*` functions chain `.where()` AFTER `.set()`. Restructured to `set → where → resolve`.
- Forgot to wire the `$app/environment` stub — `hooks.server.ts` import chain pulled it in transitively. Added.

## Commit

```bash
git add vitest.config.ts tests/stubs/ tests/unit/entitlements.test.ts
git add curriculum/module-09-followup/lesson-136-entitlement-tests.md
git commit -m "test(unit): entitlement grant/revoke argument-shape tests + lesson 136"
```
