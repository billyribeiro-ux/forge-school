---
number: 62
slug: module-4-checkpoint
title: Validate Module 4 and tag the phase-4 checkpoint
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 23
previous: 61
next: 63
estimatedMinutes: 15
filesTouched: []
---

## Context

Module 4 wired Stripe test-mode commerce end-to-end:

- Account setup + SDK + CLI + seeded catalog
- /pricing, /checkout/[product], /checkout/success
- Webhook receiver with signature verification + event-level idempotency
- Six event handlers (`checkout.session.completed`, subscription created/updated/deleted, `trial_will_end`, invoice paid/failed/action_required, charge refunded/dispute_created)
- Entitlements module centralizing grant/revoke
- /account/billing with Stripe Billing Portal handoff
- 12 billing personas + 12 coupon states seeded for UI coverage
- Four Playwright E2E specs (monthly / yearly / lifetime / refund)

Same gate-and-tag pattern as Modules 1-3. Verification proves everything's green; `phase-4-complete` tag cuts the anchor.

## The command

Run every gate:

```bash
docker compose up -d --wait
pnpm db:reset && pnpm db:seed    # includes products + coupons + personas
pnpm check                        # types clean
pnpm test                         # Vitest — DB integration + curriculum loader
pnpm build                        # SvelteKit production build + prerender
pnpm test:e2e                     # Playwright — 4 checkout/refund specs (real Stripe keys)
```

Expected:

- `pnpm check` → 0 errors, 0 warnings (~920 files)
- `pnpm test` → 8 passed (3 DB queries + 5 curriculum loader)
- `pnpm build` → built in ~2s, every route prerendered or dynamic
- `pnpm test:e2e` → 4 passed (monthly, yearly, lifetime, refund)

Cut the tag:

```bash
git tag -a phase-4-complete -m "Phase 4 money complete

Module 4 ships:
- Stripe test-mode account setup + SDK + CLI docs
- Real Stripe test products + prices seeded idempotently
- /pricing DB-driven catalog
- POST /checkout/[product] -> Stripe Checkout Session
- /checkout/success confirmation (grant happens in webhook, not here)
- /api/webhooks/stripe with signature verification + dedupe
- Six event handlers (checkout, subscription lifecycle, trial, invoice, refund+dispute)
- Entitlements module (grant/revoke/read) consumed by handlers
- /account/billing + Stripe Billing Portal handoff
- 12 billing personas + 12 coupon states for UI coverage
- 4 Playwright E2E specs
"
```

## Why we chose this — the PE7 judgment

Same rationale as the prior three checkpoints: tags are cheap immutable anchors, each module earns one.

## What could go wrong

**Symptom:** `pnpm test:e2e` fails with browser-not-installed
**Cause:** `playwright install chromium` wasn't run after `pnpm add -D @playwright/test`.
**Fix:** Install the browser. Not a Module-4 contract bug.

**Symptom:** E2E tests pass locally but fail in CI
**Cause:** CI's Stripe keys differ, or CI's Postgres isn't seeded before the E2E job.
**Fix:** Module 8's CI setup wires the pre-test chain; Module 4 doesn't.

## Verify

```bash
git tag -l | grep phase
```
Expected: `phase-1-complete`, `phase-2-complete`, `phase-3-complete`, `phase-4-complete`.

```bash
ls curriculum/module-04-money/*.md | wc -l
```
Expected: `23` — one lesson per step (040-062).

## Mistake log

- **Forgot that E2E specs require `pnpm db:seed` before running.** Added to the checklist.
- **Tried to tag before the final commit was in.** Tagged HEAD~1 instead of HEAD. Deleted, retagged.

## Commit

```bash
git add curriculum/module-04-money/lesson-062-module-4-checkpoint.md
git commit -m "docs(module-4): validate money layer + tag phase-4-complete + lesson 062"
git tag -a phase-4-complete -m "Phase 4 money complete"
```

**Module 4 summary — 23 lessons, 23 commits, 1 tag.**

| # | Lesson | Outcome |
|---|---|---|
| 040 | Stripe test account | docs/STRIPE.md + .env.example refined |
| 041 | Stripe SDK install | typed client with sk_test_ guard |
| 042 | Stripe CLI | local webhook forwarding documented |
| 043 | Seed Stripe products | real test-mode products + prices via API |
| 044 | /pricing | DB-driven catalog |
| 045 | /checkout/[product] | POST endpoint with Checkout Session |
| 046 | Checkout smoke | manual verification protocol |
| 047 | /checkout/success | lean confirmation (webhook grants) |
| 048 | Webhook receiver | signature + dedupe + dispatcher |
| 049 | checkout.session.completed | order+payment+entitlement grant |
| 050 | Subscription lifecycle | created/updated/deleted |
| 051 | trial_will_end | log hook for future email |
| 052 | Invoice events | paid/failed/action_required |
| 053 | Refund + dispute | full refund revokes; dispute logs |
| 054 | Entitlements module | grant/revoke/read consolidated |
| 055 | /account/billing | portal handoff + status cards |
| 056 | 12 personas | UI coverage seed |
| 057 | 12 coupons | discount matrix seed |
| 058 | Playwright + monthly E2E | install + first spec |
| 059 | Yearly E2E | sibling with trial assertion |
| 060 | Lifetime E2E | one-time mode assertion |
| 061 | Refund E2E | DB-level revoke check |
| 062 | Checkpoint | gates green, phase-4-complete tag |

Module 5 — Product (WooCommerce-parity features) — starts next: product catalog UI, cart, coupons in cart, membership tiers, course content.
