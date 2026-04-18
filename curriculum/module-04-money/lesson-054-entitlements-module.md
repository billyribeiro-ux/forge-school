---
number: 54
slug: entitlements-module
title: Extract entitlements into a dedicated server module
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 15
previous: 53
next: null
estimatedMinutes: 20
filesTouched:
  - src/lib/server/entitlements/index.ts
  - src/lib/server/stripe/webhook-handlers/checkout-completed.ts
  - src/lib/server/stripe/webhook-handlers/subscription-lifecycle.ts
  - src/lib/server/stripe/webhook-handlers/refund-dispute.ts
---

## Context

The grant / revoke patterns are now scattered across three handler files, each reimplementing the same `insert ... onConflictDoUpdate` + `update ... where revoked_at is null` shapes. This lesson consolidates them into `src/lib/server/entitlements/` — one module, five exported functions, every webhook handler delegating to it.

Benefits:

1. **Single place to change the grant/revoke contract.** If we add a `grace_period_ends_at` column or change the source-enum semantics, one file moves.
2. **Testable in isolation.** A future Vitest suite targets `grantPurchaseEntitlement`, `revokeSubscriptionEntitlement`, etc. — no Stripe mocks required, just Drizzle + Postgres.
3. **One read path for gating.** `hasEntitlement(db, { sessionId, productSlug })` returns a boolean the UI / server load can ask once per request.

The architecture document (§4.3) already promises "entitlements are the grant truth" — this lesson makes that promise enforceable in code.

## The command

Create `src/lib/server/entitlements/index.ts` with six exports:

```ts
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '$lib/server/db';
import { entitlements, products, type Entitlement, type NewEntitlement } from '$lib/server/db/schema';

export async function grantPurchaseEntitlement(db: Db, args: {
  sessionId: string; productId: string; sourceRef: string;
}): Promise<void> {
  const row: NewEntitlement = { sessionId: args.sessionId, productId: args.productId, source: 'purchase', sourceRef: args.sourceRef };
  await db.insert(entitlements).values(row).onConflictDoUpdate({
    target: [entitlements.sessionId, entitlements.productId, entitlements.source],
    set: { revokedAt: null, sourceRef: args.sourceRef }
  });
}

export async function grantSubscriptionEntitlement(db: Db, args: {
  sessionId: string; productId: string; subscriptionId: string;
}): Promise<void> {
  const row: NewEntitlement = { sessionId: args.sessionId, productId: args.productId, source: 'subscription', sourceRef: args.subscriptionId };
  await db.insert(entitlements).values(row).onConflictDoUpdate({
    target: [entitlements.sessionId, entitlements.productId, entitlements.source],
    set: { revokedAt: null, sourceRef: args.subscriptionId }
  });
}

export async function revokePurchaseEntitlementsForSession(db: Db, args: {
  sessionId: string;
}): Promise<void> {
  await db.update(entitlements).set({ revokedAt: new Date() })
    .where(and(
      eq(entitlements.sessionId, args.sessionId),
      eq(entitlements.source, 'purchase'),
      isNull(entitlements.revokedAt)
    ));
}

export async function revokeSubscriptionEntitlement(db: Db, args: {
  sessionId: string; productId: string;
}): Promise<void> {
  await db.update(entitlements).set({ revokedAt: new Date() })
    .where(and(
      eq(entitlements.sessionId, args.sessionId),
      eq(entitlements.productId, args.productId),
      eq(entitlements.source, 'subscription'),
      isNull(entitlements.revokedAt)
    ));
}

export async function hasEntitlement(db: Db, args: {
  sessionId: string; productSlug: string;
}): Promise<boolean> {
  const [row] = await db.select({ id: entitlements.id }).from(entitlements)
    .innerJoin(products, eq(products.id, entitlements.productId))
    .where(and(
      eq(entitlements.sessionId, args.sessionId),
      eq(products.slug, args.productSlug),
      isNull(entitlements.revokedAt)
    )).limit(1);
  return row !== undefined;
}

export async function listEntitlementsForSession(db: Db, sessionId: string): Promise<Entitlement[]> { /* ... */ }
```

Refactor the three handler files:

- **`checkout-completed.ts`**: swap the inline `db.insert(entitlements)...` call for `grantPurchaseEntitlement(db, { sessionId, productId, sourceRef: session.id })`. Drop the `entitlements` import.
- **`subscription-lifecycle.ts`**: remove the local `grantSubscriptionEntitlement` / `revokeSubscriptionEntitlement` functions; call the module's versions. Drop the `and` + `entitlements` imports.
- **`refund-dispute.ts`**: replace the inline revoke with `revokePurchaseEntitlementsForSession(db, { sessionId: order.sessionId })`. Drop `and` + `entitlements`.

Verify:

```bash
pnpm check
pnpm build
```
Expected: 0 errors; file count stays ~the same (handlers drop imports, gain function calls).

## Why we chose this — the PE7 judgment

**Alternative 1: Leave the inline implementations**
Three files, three copies, and soon a fourth (a future `handleChargeDisputeClosed` wanting to grant after a won dispute). DRY the pattern now.

**Alternative 2: Put the functions on a class (`new EntitlementsService(db).grantPurchase(...)`)`**
Classes are overhead for module-scoped logic. Functions with explicit `db` parameter are strictly simpler — easier to test (pass a test db), easier to trace (no `this` binding), easier to tree-shake.

**Alternative 3: Hide the `db` parameter behind a module-level import**
Would halve the signatures. Also couples every caller to the production `db` singleton. The explicit arg lets tests pass a Drizzle instance over a transactional test database.

**Alternative 4: Name the module `access` instead of `entitlements`**
"Entitlements" is the terminology the architecture doc uses. Keep the name. "Access" could collide with future auth concerns.

**Alternative 5: Add `grantedBy` (admin user id) to the grant signatures**
Premature — there's no admin user model in v1. Adding the parameter now with a `null` default creates false optionality. Can add in a future refactor when the admin UI lands.

The PE7 choice — explicit-db plain-function module with single-sourced conflict targets and a single `hasEntitlement` read path — wins because the grant truth has one owner, handlers stay focused on their event mapping, and gating routes get a clean API.

## What could go wrong

**Symptom:** Refactor landed; typecheck green; but at runtime the entitlement doesn't grant
**Cause:** Handlers calling the new module forgot to pass `db` as the first arg. TypeScript should have caught this — if not, the function signatures drifted.
**Fix:** Every call site must be `grantPurchaseEntitlement(db, { ... })`, `revokeSubscriptionEntitlement(db, { ... })`. The module's first positional arg is always `db`.

**Symptom:** `hasEntitlement` always returns false
**Cause:** Usually the `revokedAt is null` filter matching revoked rows only. Or a join path mismatch.
**Fix:** Write a test: insert an entitlement with `revokedAt=null` + `source=purchase` + matching product slug, then `hasEntitlement(...)` should return true. If not, inspect the generated SQL via Drizzle's query builder.

**Symptom:** A handler imports from both `$lib/server/entitlements` and `$lib/server/db/schema` and hits a circular-import error
**Cause:** `entitlements/index.ts` imports from `db/schema.ts`. If `db/schema.ts` later imports from `entitlements`, a cycle forms.
**Fix:** Keep the one-way import. `schema` defines table + type primitives; `entitlements` consumes them. If schema needs entitlement logic, put that logic in entitlements and call FROM schema (never the reverse).

## Verify

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

After a fresh checkout flow (real Stripe + stripe listen):

```bash
docker exec forgeschool-postgres psql -U forgeschool -d forgeschool -c \
  "SELECT source, source_ref, revoked_at FROM entitlements ORDER BY granted_at DESC LIMIT 3;"
```
Expected: recent grants marked with the correct source; revoked_at NULL for active ones.

## Mistake log — things that went wrong the first time I did this

- **Deleted the local `grantSubscriptionEntitlement` helper in `subscription-lifecycle.ts` but forgot to remove the `and` import.** TypeScript flagged the unused import; fixed.
- **The module used `db` as an implicit global** (imported inside functions). Tests failed because they wanted to inject a test db. Refactored to accept `db` as first arg.
- **Renamed `revokePurchaseEntitlementsForSession` to `revokePurchases` during iteration.** Too terse — `Purchases` what? Renamed back. Function names in the entitlements module all include the noun being acted on (`PurchaseEntitlements`, `SubscriptionEntitlement`).
- **Forgot to export the `listEntitlementsForSession` helper.** Discovered when the future billing page tried to use it. Added the export upfront so it's discoverable.

## Commit this change

```bash
git add src/lib/server/entitlements/ \
       src/lib/server/stripe/webhook-handlers/
git add curriculum/module-04-money/lesson-054-entitlements-module.md
git commit -m "refactor(entitlements): extract grant/revoke into dedicated module + lesson 054"
```

With entitlements centralized, the webhook-handler code is tighter and future gating callers (`/lessons/[slug]` paywall, `/account/billing` status chips) call one function. Lesson 055 builds `/account/billing` with Stripe's Billing Portal for self-service subscription management.
