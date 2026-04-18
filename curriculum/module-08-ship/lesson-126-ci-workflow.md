---
number: 126
commit: da74588ae0e37dffcd4ff56629378f253bd742fb
slug: ci-workflow
title: GitHub Actions CI — typecheck, lint, unit, build, E2E
module: 8
moduleSlug: ship
moduleTitle: Ship
phase: 8
step: 2
previous: 125
next: null
estimatedMinutes: 25
filesTouched:
  - .github/workflows/ci.yml
---

## Context

Every push + PR to `main` runs five jobs in a gated sequence: typecheck + lint + unit (parallel), build (depends on the three), E2E critical-path (depends on build, runs against a Postgres service container).

## The command

`.github/workflows/ci.yml` defines five jobs:

1. **typecheck** — `pnpm check`
2. **lint** — `pnpm lint`
3. **unit** — `pnpm exec vitest run tests/unit/`
4. **build** — `pnpm build` (needs: the first three)
5. **e2e** — `playwright test tests/e2e/critical-path.spec.ts` (needs: build; uses postgres:16 service)

Env is primed from `.env.example` with placeholder Stripe test keys. Real Stripe calls don't happen in CI — only routes that require the key at boot (see `assertTestKey` in lesson 040) need it non-empty.

```bash
# Commit + push; watch the Actions tab
git push origin main
```

## Why we chose this — the PE7 judgment

**Alt 1: One monolithic job.** Faster when everything passes; slower to diagnose when one stage fails because nothing parallelizes.
**Alt 2: Run E2E in parallel with unit.** E2E requires build artifacts; blocking on build prevents wasted compute on an already-broken build.
**Alt 3: Use a separate `test` runner like CircleCI.** GitHub Actions is free, native, and has a matching MCP tool surface.

## Verify

Push a branch, open a PR, watch the five jobs run. All green on `main`.

## Mistake log

- First draft shared a working directory across jobs — each job runs in a fresh container by default. Moved setup into each job's steps.
- Forgot the `pnpm/action-setup` — `pnpm` wasn't on PATH. Added.
- Didn't cache `pnpm store` — first run took 3 minutes on install. Added `cache: pnpm` to `setup-node`.

## Commit

```bash
git add .github/workflows/ci.yml
git add curriculum/module-08-ship/lesson-126-ci-workflow.md
git commit -m "ci(github-actions): typecheck+lint+unit+build+e2e workflow + lesson 126"
```
