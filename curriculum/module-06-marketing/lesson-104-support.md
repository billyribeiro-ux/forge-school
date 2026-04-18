---
number: 104
slug: support
title: Build /support
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 13
previous: 103
next: null
estimatedMinutes: 5
filesTouched:
  - src/routes/support/+page.svelte
---

## Context

Email-first support page. Lists what to include, common self-fixes.

## The command

`src/routes/support/+page.svelte` — header + `mailto:` link + two `<ul>` (what to include, common fixes).

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: In-app chat widget.** Monthly SaaS cost + ongoing moderation. Email scales fine at v1 volume.
**Alt 2: Contact form that emails support.** Done in lesson 105 via Resend — `/contact` routes there; `/support` is the FAQ-before-you-email funnel.

## Verify

`pnpm check`. Visit `/support`.

## Mistake log

- Forgot to include the session id request — first real tickets were unsolvable without it. Added.

## Commit

```bash
git add src/routes/support/ curriculum/module-06-marketing/lesson-104-support.md
git commit -m "feat(routes): /support + lesson 104"
```
