---
number: 129
slug: testing-doc
title: docs/TESTING.md — testing strategy
module: 8
moduleSlug: ship
moduleTitle: Ship
phase: 8
step: 5
previous: 128
next: null
estimatedMinutes: 5
filesTouched:
  - docs/TESTING.md
---

## Context

Two-page policy doc describing the three layers (unit / integration / E2E), what runs locally vs CI, the flake policy, and why coverage is not enforced (regression-test-per-bug-fix is).

## The command

Write `docs/TESTING.md`.

## Why we chose this — the PE7 judgment

**Alt 1: Enforce 80% coverage.** Coverage metrics reward test-for-the-sake-of-test. Regression tests tied to real bugs are the higher-value signal.
**Alt 2: Run all E2Es on every CI push.** Slow. Critical-path on every push + full suite on `main` only is the balance.

## Verify

`docs/TESTING.md` exists with the layer table.

## Mistake log

- First draft mandated coverage thresholds — took three PRs to land a simple type-change because "coverage dropped to 79.4%". Dropped the threshold; kept the regression-test norm.

## Commit

```bash
git add docs/TESTING.md curriculum/module-08-ship/lesson-129-testing-doc.md
git commit -m "docs(testing): TESTING.md + lesson 129"
```
