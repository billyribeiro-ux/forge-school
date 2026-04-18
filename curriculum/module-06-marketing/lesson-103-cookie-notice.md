---
number: 103
slug: cookie-notice
title: Build /cookie-notice
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 12
previous: 102
next: null
estimatedMinutes: 5
filesTouched:
  - src/routes/cookie-notice/+page.svelte
---

## Context

Exhaustive list of first-party cookies: `forge_session`, `forge_cart`, `forge_coupon`, plus Stripe-set cookies during Checkout. Each has a name, purpose, and max-age.

## The command

`src/routes/cookie-notice/+page.svelte` with a `<dl>` of each cookie. No consent banner — we set only strictly-necessary functional cookies; Plausible is cookie-less.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: A cookie-banner library.** Required only if we set non-necessary cookies. We don't.
**Alt 2: Skip the page.** Some EU jurisdictions require this disclosure; writing it once is cheap insurance.

## Verify

`pnpm check`. Visit `/cookie-notice`.

## Mistake log

- Claimed "no cookies at all" initially — session/cart/coupon cookies are cookies; just functional ones. Corrected.

## Commit

```bash
git add src/routes/cookie-notice/ curriculum/module-06-marketing/lesson-103-cookie-notice.md
git commit -m "feat(routes): /cookie-notice + lesson 103"
```
