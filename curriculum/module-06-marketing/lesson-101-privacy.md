---
number: 101
slug: privacy
title: Build /privacy
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 10
previous: 100
next: null
estimatedMinutes: 5
filesTouched:
  - src/routes/privacy/+page.svelte
---

## Context

Privacy policy. Four sections (what we collect, analytics, third parties, your rights).

## The command

`src/routes/privacy/+page.svelte` — same `.prose` layout pattern; lists exactly what data we touch (session cookie only) and the three third parties (Stripe, Resend, Plausible).

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: Boilerplate privacy template from a generator.** The privacy policy must match the actual app's data handling; generated boilerplate usually lists more than is true.

## Verify

`pnpm check && pnpm build`. Visit `/privacy`.

## Mistake log

- Said "we may use cookies for analytics" — untrue. Plausible is cookie-less. Fixed.

## Commit

```bash
git add src/routes/privacy/ && git add curriculum/module-06-marketing/lesson-101-privacy.md
git commit -m "feat(routes): /privacy + lesson 101"
```
