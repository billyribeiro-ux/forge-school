---
number: 133
commit: a47deccdd15a6eae87fe0a6c4015763fadc5bdc1
slug: incident-contributing
title: docs/INCIDENT_RESPONSE.md + docs/CONTRIBUTING.md
module: 8
moduleSlug: ship
moduleTitle: Ship
phase: 8
step: 9
previous: 132
next: null
estimatedMinutes: 10
filesTouched:
  - docs/INCIDENT_RESPONSE.md
  - docs/CONTRIBUTING.md
---

## Context

Incident response codifies the sev-1/2/3 triage + the post-mortem template + the "no blame" norm. CONTRIBUTING onboards future contributors (or future-you after a six-month gap) to the repo conventions.

## The command

Write both docs as above.

## Why we chose this — the PE7 judgment

**Alt 1: Skip CONTRIBUTING — the README covers setup.** The README is for end-users; CONTRIBUTING is for repo-changers. Different reader.
**Alt 2: Blameful post-mortems.** Blame produces silence — people stop reporting near-misses. PE7 teams practice blameless post-mortems.

## Verify

Both docs exist. Post-mortem template fits on one screen.

## Mistake log

- First CONTRIBUTING included `pnpm i`. Our preinstall hook rejects npm/yarn in favor of pnpm — aligned.

## Commit

```bash
git add docs/INCIDENT_RESPONSE.md docs/CONTRIBUTING.md curriculum/module-08-ship/lesson-133-incident-contributing.md
git commit -m "docs(ops): incident response + contributing + lesson 133"
```
