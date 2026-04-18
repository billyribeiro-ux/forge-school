---
number: 134
slug: index-changelog
title: docs/INDEX.md + docs/CHANGELOG.md
module: 8
moduleSlug: ship
moduleTitle: Ship
phase: 8
step: 10
previous: 133
next: null
estimatedMinutes: 10
filesTouched:
  - docs/INDEX.md
  - docs/CHANGELOG.md
---

## Context

The last two docs close the set. INDEX is a table-of-contents so future readers find the right playbook fast. CHANGELOG is the per-release history of what shipped when.

## The command

Write both docs with the structure above.

## Why we chose this — the PE7 judgment

**Alt 1: Git log as the changelog.** Unreadable. A curated CHANGELOG explains the WHY alongside the WHAT.
**Alt 2: Skip the INDEX, expect contributors to `ls docs/`.** Default filesystem order doesn't reflect reader interest. Curate.

## Verify

- `docs/INDEX.md` links every existing doc.
- `docs/CHANGELOG.md` has an unreleased 1.0.0 section summarizing the eight modules.

## Mistake log

- Listed `SPEC.md` twice — once under "Product & spec" and once under "Ops." Kept under "Product & spec" only.

## Commit

```bash
git add docs/INDEX.md docs/CHANGELOG.md curriculum/module-08-ship/lesson-134-index-changelog.md
git commit -m "docs(meta): index + changelog + lesson 134"
```
