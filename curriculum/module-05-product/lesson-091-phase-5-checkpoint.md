---
number: 91
commit: 836010ef78204dad44ac09d0d8cfddf10690757f
slug: phase-5-checkpoint
title: Tag phase-5-complete
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 29
previous: 90
next: null
estimatedMinutes: 5
filesTouched: []
---

## Context

Module 5 is 29 lessons, 26 code commits, 40 unit tests, 2 E2E specs, and the metamorphic moment: the platform now hosts its own first course (the meta-product). Before Module 6 opens with the marketing sweep, tag the repo so we can cleanly revisit Phase 5 from any future branch.

## The command

```bash
pnpm check          # 0 errors
pnpm build          # ✓ built
pnpm test           # 40/40 unit
git status          # clean
git tag -a phase-5-complete -m "Phase 5 (Module 5) — Product layer complete"
git log --oneline phase-4-complete..HEAD | wc -l   # ~29
```

## Why we chose this — the PE7 judgment

**Alternative 1: Skip the tag, rely on commit messages.**
Tags are the explicit checkpoint — `git diff phase-4-complete..phase-5-complete` instantly shows "here's everything Module 5 did." Commit-message search is noisier.

**Alternative 2: Use lightweight tags.**
Annotated tags carry a message and a tagger — the audit trail matters for a curriculum that teaches git hygiene.

**Alternative 3: Tag every lesson.**
Thousands of tags. The tag cost is per-milestone, not per-step.

The PE7 choice — **annotated tag per phase checkpoint** — wins on diff ergonomics and on signalling "this ran green at this point in history."

## What could go wrong

**Symptom:** `git push origin phase-5-complete` doesn't push
**Cause:** `git push` doesn't push tags by default.
**Fix:** `git push origin phase-5-complete` (specific) or `git push --tags` (all).

**Symptom:** `pnpm test` fails intermittently
**Cause:** An E2E test depends on Stripe's test API and an unavailable Postgres.
**Fix:** Tag only when all three (`check`, `build`, `test`) come back green. Playwright suites are not part of the unit `pnpm test` — they're run via `pnpm test:e2e`.

## Verify

```bash
git tag -l phase-5-complete     # present
git tag -v phase-5-complete     # shows the annotation + tagger
```

## Mistake log

- **Tagged before running the unit suite** — 38/40 passed; one coupon test had a flaky future-date assertion. Fixed the test, re-tagged.
- **Used `git tag phase-5-complete`** (lightweight) — lost the phase-complete message after a rebase. Switched to annotated `git tag -a … -m …`.

## Commit

This lesson's "commit" is the tag itself:

```bash
git add curriculum/module-05-product/lesson-091-phase-5-checkpoint.md
git commit -m "docs(module-5): tag phase-5-complete + lesson 091"
git tag -a phase-5-complete -m "Phase 5 (Module 5) — Product layer complete"
```

Module 6 begins with the public marketing layout, hero, and Motion-animated reveals.
