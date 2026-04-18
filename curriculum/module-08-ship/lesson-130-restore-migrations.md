---
number: 130
slug: restore-migrations
title: docs/RESTORE.md + docs/MIGRATIONS.md
module: 8
moduleSlug: ship
moduleTitle: Ship
phase: 8
step: 6
previous: 129
next: null
estimatedMinutes: 10
filesTouched:
  - docs/RESTORE.md
  - docs/MIGRATIONS.md
---

## Context

Two operational docs that get referenced at the worst possible moments: during a data loss (RESTORE) and mid-deploy (MIGRATIONS). Writing them now, when nothing is on fire, is the right time.

## The command

Create both docs with the rules above. Quarterly restore-test is a calendar item; document the date in CHANGELOG.

## Why we chose this — the PE7 judgment

**Alt 1: Skip the docs; DBA will know.** There's no DBA in v1.
**Alt 2: Documented "forward-only migrations" — no rollback plan.** Forward-only is the rule, but the doc still needs to explain how a reverting forward migration looks in practice.

## Verify

Docs exist. Manual restore-test runs at the next quarterly calendar event.

## Mistake log

- Recommended editing old migrations for "typo fixes." Old migrations are immutable; the next migration fixes the typo.

## Commit

```bash
git add docs/RESTORE.md docs/MIGRATIONS.md curriculum/module-08-ship/lesson-130-restore-migrations.md
git commit -m "docs(ops): restore + migrations playbook + lesson 130"
```
