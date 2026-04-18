---
number: 121
slug: reduced-motion
title: Verify `prefers-reduced-motion` on every animation
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 11
previous: 120
next: null
estimatedMinutes: 10
filesTouched:
  - docs/ACCESSIBILITY.md
---

## Context

Every animated component in this repo has a `@media (prefers-reduced-motion: reduce)` clause that disables the animation. Quick audit:

- `SiteNav` scroll-shadow transition — yes.
- `RevealOnScroll` — yes (component skips the entire class toggle).
- `UpgradePrompt` slide-in — yes.
- `TrialCountdown` bar — yes.
- `PastDueWarning` pulse — yes.
- `BigCTA` gradient — static, no animation.

## The command

DevTools → Rendering tab → "Emulate CSS media feature prefers-reduced-motion: reduce". Load each page that uses an animated component and confirm the animation doesn't play.

```bash
# No code changes; manual verification + documentation in docs/ACCESSIBILITY.md
```

## Why we chose this — the PE7 judgment

**Alt 1: Respect `reduce` by disabling ALL CSS transitions globally.** Too blunt — non-motion transitions (color, background) are fine and helpful.
**Alt 2: Ignore `reduce`.** Users with vestibular disorders are harmed. WCAG 2.3.3 requires respect.

## Verify

DevTools emulation → every animated component renders its end state without animating.

## Mistake log

- `TrialCountdown` used `transition: inline-size` without media query. Added `@media (prefers-reduced-motion: reduce) { .fill { transition: none; } }`.

## Commit

```bash
git add curriculum/module-07-polish/lesson-121-reduced-motion.md
git commit -m "docs(a11y): prefers-reduced-motion verification + lesson 121"
```
