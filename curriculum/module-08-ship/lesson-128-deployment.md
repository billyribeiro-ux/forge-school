---
number: 128
commit: 9f1cc1c1e07c0afc5642ac892bfeb72056727126
slug: deployment
title: Ship docs/DEPLOYMENT.md + docs/STAGING.md
module: 8
moduleSlug: ship
moduleTitle: Ship
phase: 8
step: 4
previous: 127
next: null
estimatedMinutes: 10
filesTouched:
  - docs/DEPLOYMENT.md
  - docs/STAGING.md
---

## Context

Two canonical docs pinning the deploy surface: target (Vercel + fallbacks), required env vars in production, deploy sequence, staging is Vercel previews with test-mode Stripe and a staging DB.

## The command

Create `docs/DEPLOYMENT.md` + `docs/STAGING.md` as above.

## Why we chose this — the PE7 judgment

**Alt 1: Lock to Vercel exclusively.** Vercel is the path of least resistance but `adapter-auto` keeps the exit door open.
**Alt 2: Self-host first.** More infra to learn. Defer to a post-v1 lesson when/if Vercel gets painful.

## Verify

Docs exist. `grep -c "STRIPE" docs/DEPLOYMENT.md` finds the env-var checklist.

## Mistake log

- Listed `pk_live_` as required for staging — staging uses `pk_test_`. Fixed.

## Commit

```bash
git add docs/DEPLOYMENT.md docs/STAGING.md curriculum/module-08-ship/lesson-128-deployment.md
git commit -m "docs(deploy): deployment + staging playbook + lesson 128"
```
