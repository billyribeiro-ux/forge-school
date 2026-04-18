---
number: 135
slug: v1-release
title: Tag v1.0.0 — the first release
module: 8
moduleSlug: ship
moduleTitle: Ship
phase: 8
step: 11
previous: 134
next: null
estimatedMinutes: 5
filesTouched: []
---

## Context

Eight modules. One hundred and thirty-five lessons. A membership platform with cart, checkout, subscriptions, coupons, entitlements, a meta-course, marketing surface, observability, and the docs set every runbook needs. Every commit paired with a lesson explaining what we chose and why.

This lesson is the cut. Green-gate checks, tag, push.

## The command

```bash
# Green-gate checks
pnpm check                               # 0 errors, 0 warnings
pnpm build                               # ✓ built
pnpm exec vitest run tests/unit/         # 40/40 passed

# Pre-release hygiene
git status                               # clean
git log --oneline phase-7-complete..HEAD # spot-check the release range

# The tag
git tag -a v1.0.0 -m "ForgeSchool v1.0.0 — eight modules, 135 lessons"
git push origin v1.0.0
```

## Why we chose this — the PE7 judgment

**Alt 1: v0.x "pre-release" forever.** Versioning 1.0.0 commits us to semver; subsequent changes make informed promises.
**Alt 2: Include the release-notes inline with the tag annotation.** Tag messages are one-liners; the narrative lives in `docs/CHANGELOG.md`.

## Verify

```bash
git tag -l v1.0.0      # present
git tag -v v1.0.0      # annotated, has the one-line message
```

## Mistake log

- Tagged before CI passed once on `main` — rolled back the tag, waited for CI, retagged.

## Commit

This lesson's "commit" is the tag itself:

```bash
git add curriculum/module-08-ship/lesson-135-v1-release.md
git commit -m "docs(release): v1.0.0 release lesson + lesson 135"
git tag -a v1.0.0 -m "ForgeSchool v1.0.0 — eight modules, 135 lessons"
```

**MODULE 8 COMPLETE — FORGESCHOOL PLATFORM AND CURRICULUM READY FOR REVIEW.**
