---
number: 74
commit: b1ef9927deae874affaf1e5b87c9441c3f89a7b8
slug: membership-tiers
title: Derive membership tiers (free / pro / lifetime) from entitlements
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 12
previous: 73
next: null
estimatedMinutes: 15
filesTouched:
  - src/lib/entitlements/tier.ts
  - src/lib/server/entitlements/tier-queries.ts
---

## Context

The `entitlements` table records atomic facts — "this session owns X, granted by source Y, at time Z." The UI wants something higher-level: a single label the user sees on their profile and the nav bar (`Free`, `Pro`, `Lifetime`).

We don't add a `tier` column to any table. Tiers are a **derived property**: you compute them from the live set of entitlements at read-time. Storing a denormalized tier would desynchronize the instant a webhook mutates an entitlement; derivation eliminates that whole class of bug.

Two files, clean separation:

- **`src/lib/entitlements/tier.ts`** — pure function, zero DB. Takes `EntitlementWithKind[]` and returns `'free' | 'pro' | 'lifetime'`. Unit-tested in lesson 089.
- **`src/lib/server/entitlements/tier-queries.ts`** — the DB-aware wrapper: join entitlements to products for the kind, call the pure function, return the tier.

Lesson 075 uses `getSessionTier` to gate routes.

## The command

`src/lib/entitlements/tier.ts`:

```ts
export type Tier = 'free' | 'pro' | 'lifetime';
export type EntitlementWithKind = Entitlement & {
  productKind: 'course' | 'bundle' | 'subscription' | 'lifetime';
};

export function tierFromEntitlements(ents: readonly EntitlementWithKind[]): Tier {
  const active = ents.filter((e) => e.revokedAt === null);
  if (active.length === 0) return 'free';
  for (const e of active) if (e.source === 'purchase' && e.productKind === 'lifetime') return 'lifetime';
  for (const e of active) if (e.source === 'subscription' || e.source === 'trial') return 'pro';
  return 'free';
}

const RANK: Record<Tier, number> = { free: 0, pro: 1, lifetime: 2 };
export function tierAtLeast(actual: Tier, required: Tier): boolean {
  return RANK[actual] >= RANK[required];
}
```

`src/lib/server/entitlements/tier-queries.ts`:

```ts
export async function getSessionEntitlementsWithKind(db, sessionId) {
  const rows = await db.select({ entitlement: entitlements, productKind: products.kind })
    .from(entitlements)
    .innerJoin(products, eq(products.id, entitlements.productId))
    .where(and(eq(entitlements.sessionId, sessionId), isNull(entitlements.revokedAt)));
  return rows.map((r) => ({ ...r.entitlement, productKind: r.productKind }));
}

export async function getSessionTier(db, sessionId): Promise<Tier> {
  return tierFromEntitlements(await getSessionEntitlementsWithKind(db, sessionId));
}
```

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alternative 1: Add a `tier` column on a `users` table.**
No users in v1. Even with users, the tier is a view over entitlements; maintaining it denormalized means either a write trigger (fragile) or forgetting to update it somewhere (silent-drift bug). Derivation is free of those failure modes.

**Alternative 2: Compute the tier inside every load function that needs it.**
Duplicates the derivation logic across four+ routes. First one that drifts is a bug.

**Alternative 3: Introduce a more granular tier enum (`trial`, `pro_monthly`, `pro_yearly`, `lifetime`).**
The UI's actual branches are: "can they access pro content?" + "should we show the Upgrade CTA?". Three levels fit; finer granularity pushes internal details (billing interval) into UI concerns.

**Alternative 4: Short-circuit inside the query with a `CASE WHEN`.**
Postgres can compute the tier, but you lose the pure-function unit test and the tier becomes a query-result detail rather than a first-class type.

The PE7 choice — **pure function + thin DB wrapper, two files** — wins because the logic is type-correct in TS, unit-tested without DB setup, and reusable from any server-side entry point.

## What could go wrong

**Symptom:** A user cancelled their subscription mid-period and still sees "Pro"
**Cause:** `cancel_at_period_end` is a subscription field, not an entitlement field. The entitlement remains active until the period ends (then Stripe fires `subscription.deleted` → webhook revokes → `revokedAt` is set).
**Fix:** The filter `e.revokedAt === null` is correct. A cancelled-but-still-active subscription IS Pro until period end — that's the intended semantics.

**Symptom:** A lifetime purchase refunded yesterday still shows "Lifetime"
**Cause:** Refund webhook (lesson 053) didn't fire or didn't revoke the entitlement.
**Fix:** Check `entitlements` for the row where `source = 'purchase'` and `productId = lifetime-product-id`; confirm `revoked_at` is set. If not, check the webhook handler logs.

**Symptom:** `tierFromEntitlements` returns `'free'` despite a live subscription entitlement
**Cause:** Entitlement was created with `source: 'grant'` (manual admin grant) — doesn't match any branch.
**Fix:** Expected behaviour for admin grants of arbitrary products. If we want manual grants to confer tier status, add a fourth `grant` branch with explicit `productKind` logic.

## Verify

```bash
pnpm check
```

Once lesson 089's unit tests land, `pnpm test tier` confirms every cell of the truth table.

## Mistake log

- **Put `tier.ts` under `src/lib/server/`.** It's pure and could be imported from the browser (for optimistic UI). Moved to `src/lib/entitlements/` so client code can import the derivation.
- **Returned `tier: Tier | null` for the empty entitlements case.** Over-modeled — null is redundant with `'free'`. Tightened to the three-value union.
- **Typed `EntitlementWithKind` as `Entitlement & { productKind: string }`.** Too loose; used the schema's kind enum values directly.

## Commit

```bash
git add src/lib/entitlements/ src/lib/server/entitlements/tier-queries.ts
git add curriculum/module-05-product/lesson-074-membership-tiers.md
git commit -m "feat(entitlements): derive tier from entitlements + lesson 074"
```

Next lesson uses `getSessionTier` to gate /course and show the UpgradePrompt.
