---
number: 132
commit: 5e0159bf25e9d330a299018dcc3a2314098c2acb
slug: security-monitoring
title: docs/SECURITY.md + docs/MONITORING.md
module: 8
moduleSlug: ship
moduleTitle: Ship
phase: 8
step: 8
previous: 131
next: null
estimatedMinutes: 10
filesTouched:
  - docs/SECURITY.md
  - docs/MONITORING.md
---

## Context

Two pillars of operating the system in the open. SECURITY documents the disclosure policy + our defense-in-depth posture. MONITORING documents the first-4-hour + first-week + weekly rituals, informal SLOs, and alert thresholds.

## The command

Write both docs as above.

## Why we chose this — the PE7 judgment

**Alt 1: No public security doc.** Reporters don't know where to send findings; vulnerabilities rot in a sender's inbox.
**Alt 2: Strict SLOs from day one.** Paying customers of v1 don't demand strict SLOs; informal targets with a concrete 0.5% error budget give us room to learn the actual steady state.

## Verify

Both docs exist + are linked from the README.

## Mistake log

- Listed "CSP" as a default — we don't ship a hand-crafted CSP in v1 (Vercel's defaults are good enough). Noted future-work only.

## Commit

```bash
git add docs/SECURITY.md docs/MONITORING.md curriculum/module-08-ship/lesson-132-security-monitoring.md
git commit -m "docs(ops): security + monitoring playbooks + lesson 132"
```
