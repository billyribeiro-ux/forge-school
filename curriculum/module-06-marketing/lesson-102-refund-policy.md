---
number: 102
slug: refund-policy
title: Build /refund-policy
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 11
previous: 101
next: null
estimatedMinutes: 5
filesTouched:
  - src/routes/refund-policy/+page.svelte
---

## Context

Four-section refund policy: lifetime (14 days, no-questions), subscriptions (cancel anytime, no proration), failed payments (retry, then past_due → unpaid), chargebacks.

## The command

Standard `.prose` page. No dynamic content.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: No published refund policy.** Erodes trust, violates consumer-protection laws in many jurisdictions.
**Alt 2: Conditional refund ("at our discretion").** Ambiguous policies hurt conversion. Be explicit.

## Verify

`pnpm check`. Visit `/refund-policy`.

## Mistake log

- First draft used "discretionary refunds" — conversion killer. Stated the 14-day rule flatly.

## Commit

```bash
git add src/routes/refund-policy/ curriculum/module-06-marketing/lesson-102-refund-policy.md
git commit -m "feat(routes): /refund-policy + lesson 102"
```
