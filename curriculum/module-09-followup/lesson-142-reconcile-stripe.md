---
number: 142
commit: 931f336fdfbf61ba494fed25ccc1e7069136dd0c
slug: reconcile-stripe
title: scripts/reconcile-stripe.ts — DB ↔ Stripe drift detector
module: 9
moduleSlug: followup
moduleTitle: v1.0 Follow-up
phase: 9
step: 7
previous: 141
next: null
estimatedMinutes: 15
filesTouched:
  - scripts/reconcile-stripe.ts
---

## Context

PROMPT.md's PROJECT FILE STRUCTURE lists `scripts/reconcile-stripe.ts`. This lesson ships it.

The script is read-only — never mutates Stripe, never mutates the DB. It walks four axes of potential drift between our DB and Stripe:

1. **Missing in DB** — Stripe products our DB doesn't know about.
2. **Deleted in Stripe** — DB rows that point at Stripe ids that no longer exist.
3. **Price drift** — `prices.unit_amount_cents` differs from Stripe's `unit_amount`.
4. **Subscription status drift** — `subscriptions.status` differs from Stripe's current state (a webhook missed delivery).

Output: human-readable report on stdout. Exit 0 = clean, exit 1 = drift found — wire into a nightly cron / CI gate when paranoia escalates.

## The command

`scripts/reconcile-stripe.ts` — same env-guard pattern as `seed-dev.ts` (refuses prod-like DATABASE_URL / STRIPE_SECRET_KEY). Iterates products, prices, subscriptions; calls Stripe SDK in read-only mode; aggregates a `Report` object; prints + exits with the right code.

```bash
pnpm exec tsx scripts/reconcile-stripe.ts
```

Expected output on a clean post-`db:seed` run:

```
[reconcile-stripe] report:

  ✓ No drift detected.
```

## Why we chose this — the PE7 judgment

**Alt 1: Re-run `pnpm db:seed` to "fix" drift.** The seed creates Stripe products it can't find — that's not reconciliation, that's drift introduction. Always read first; act second.
**Alt 2: Wire reconciliation into the seed script.** Conflates "set up dev fixtures" with "audit production." Two different jobs.
**Alt 3: Make the script auto-heal.** Tempting, dangerous. Auto-heal can mask a webhook delivery failure that should have escalated. Manual review of the report is the right next step.

## What could go wrong

**Symptom:** Stripe rate-limit when iterating many subscriptions
**Cause:** No batching; one `subscriptions.retrieve` per row.
**Fix:** Stripe's `subscriptions.list` returns batches of 100. Tighten the loop when it matters; not until production has > 100 subs.

**Symptom:** False positive on `priceDrift` for trial pricing changes
**Cause:** Trial period changes don't move `unit_amount`, so this isn't a false positive — it's a true catch.

## Verify

```bash
docker compose up -d --wait     # local Postgres
pnpm db:reset && pnpm db:seed   # populate DB + Stripe test mode
pnpm exec tsx scripts/reconcile-stripe.ts
```

Expected: exit 0, `✓ No drift detected.`

## Mistake log

- Used `stripe.products.list({ active: false })` initially — Stripe interprets `false` as "any state." Switched to explicit `active: true` (we don't reconcile archived products).
- Forgot to close the postgres connection in the `finally` block — script hung. Added `client.end({ timeout: 5 })`.
- Used `console.error` for the drift report — drift isn't an exception, it's a finding. Switched to `console.log` + non-zero exit.

## Commit

```bash
git add scripts/reconcile-stripe.ts curriculum/module-09-followup/lesson-142-reconcile-stripe.md
git commit -m "feat(scripts): reconcile-stripe drift detector + lesson 142"
```
