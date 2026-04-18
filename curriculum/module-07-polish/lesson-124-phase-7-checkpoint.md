---
number: 124
slug: phase-7-checkpoint
title: Tag phase-7-complete
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 14
previous: 123
next: null
estimatedMinutes: 5
filesTouched: []
---

## Context

Module 7 (Polish) shipped Plausible + typed events, performance + accessibility + color + responsive + focus + motion + keyboard audits, and the PERFORMANCE.md + ACCESSIBILITY.md + IMAGES.md reference docs. Every gate green.

## The command

```bash
pnpm check && pnpm build
pnpm test             # 40/40 unit
git tag -a phase-7-complete -m "Phase 7 (Module 7) — Polish complete"
```

## Why we chose this — the PE7 judgment

Annotated tag so `git diff phase-6-complete..phase-7-complete` isolates the polish work.

## Verify

```bash
git tag -l | grep phase-7   # present
```

## Commit

```bash
git add curriculum/module-07-polish/lesson-124-phase-7-checkpoint.md
git commit -m "docs(module-7): tag phase-7-complete + lesson 124"
git tag -a phase-7-complete -m "Phase 7 (Module 7) — Polish complete"
```

Module 8 opens the ship door: CI, Sentry, deploy docs, and the v1.0.0 release.
