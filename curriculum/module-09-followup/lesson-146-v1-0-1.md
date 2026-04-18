---
number: 146
commit: 7e57238a659b102d06cf3009fd612256f6d32d14
slug: v1-0-1
title: Tag v1.0.1 — close the SUCCESS CRITERIA gap
module: 9
moduleSlug: followup
moduleTitle: v1.0 Follow-up
phase: 9
step: 11
previous: 145
next: null
estimatedMinutes: 5
filesTouched: []
---

## Context

Module 9 closed every gap PROMPT.md SUCCESS CRITERIA called out:

| Item | Lesson | Status |
|---|---|---|
| Entitlement grant/revoke unit tests | 136 | ✓ 9 tests |
| Pricing preview on landing | 137 | ✓ shipped |
| Full custom-event funnel | 138 | ✓ checkout/coupon/contact wired |
| Client-side Sentry | 139 | ✓ stub + `hooks.client.ts` |
| @axe-core/playwright + spec | 140 | ✓ 11-page scan |
| @sveltejs/enhanced-img | 141 | ✓ Vite plugin wired |
| `scripts/reconcile-stripe.ts` | 142 | ✓ drift detector |
| Lesson commit hashes | 143 | ✓ all 144 lessons stamped |
| Dev routes stripped from prod bundle | 144 | ✓ Vite plugin |
| Biome + `pnpm lint` | 145 | ✓ 0 errors |

This lesson cuts v1.0.1.

## The command

```bash
pnpm check                              # 0 errors, 0 warnings
pnpm lint                               # 0 errors
pnpm test                               # 49/49 passed
pnpm build                              # ✓ built (admin stripped from prod chunk)

git tag -a v1.0.1 -m "ForgeSchool v1.0.1 — SUCCESS CRITERIA gaps closed"
```

## Why we chose this — the PE7 judgment

v1.0.0 shipped the eight modules end-to-end. v1.0.1 is the patch increment that closes the SUCCESS CRITERIA contract from PROMPT.md. Semver: no breaking changes, only additive (new tests, new tooling, new instrumentation). Patch is the right bump.

## Verify

```bash
git tag -l v1.0.1                       # present
git log --oneline v1.0.0..HEAD | wc -l  # ~12 commits
git diff v1.0.0..v1.0.1 --stat | tail -1
```

## Commit

```bash
git add curriculum/module-09-followup/lesson-146-v1-0-1.md
git commit -m "docs(release): v1.0.1 release lesson + lesson 146"
git tag -a v1.0.1 -m "ForgeSchool v1.0.1 — SUCCESS CRITERIA gaps closed"
```

**ALL PROMPT.md SUCCESS CRITERIA SATISFIED.**
