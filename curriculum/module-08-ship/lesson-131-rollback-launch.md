---
number: 131
commit: 29c1092c1eaedbd44a7be904bba9c79b6db38c18
slug: rollback-launch
title: docs/ROLLBACK.md + docs/LAUNCH_CHECKLIST.md
module: 8
moduleSlug: ship
moduleTitle: Ship
phase: 8
step: 7
previous: 130
next: null
estimatedMinutes: 10
filesTouched:
  - docs/ROLLBACK.md
  - docs/LAUNCH_CHECKLIST.md
---

## Context

Two pre-flight playbooks. ROLLBACK lays out the decision tree + the actual commands to revert. LAUNCH_CHECKLIST is the top-to-bottom pre-flip list.

## The command

Write both docs as above.

## Why we chose this — the PE7 judgment

**Alt 1: One combined doc.** Different moments, different audiences. Rollback is read during an incident; launch is read during a calm pre-deploy. Split.
**Alt 2: Store as GitHub issue templates.** Issues are ephemeral; docs are the canonical source.

## Verify

Both docs exist. Test a rollback dry-run against a staging deploy.

## Mistake log

- Rollback doc originally said "run the down migration" — there's no down migration (see MIGRATIONS.md). Corrected to "deploy a reverting forward migration."

## Commit

```bash
git add docs/ROLLBACK.md docs/LAUNCH_CHECKLIST.md curriculum/module-08-ship/lesson-131-rollback-launch.md
git commit -m "docs(ops): rollback + launch checklist + lesson 131"
```
