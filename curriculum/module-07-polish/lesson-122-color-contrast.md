---
number: 122
slug: color-contrast
title: Color contrast audit
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 12
previous: 121
next: null
estimatedMinutes: 10
filesTouched:
  - docs/ACCESSIBILITY.md
---

## Context

WCAG AA: 4.5:1 for normal text, 3:1 for large text (≥ 18pt or ≥ 14pt bold), 3:1 for UI components + graphic objects.

OKLCH tokens make contrast pairs explicit. Every foreground / background pair is intentional.

## Audit pairs (light mode)

| fg / bg | Ratio | Target | Status |
|---|---|---|---|
| `--color-fg` on `--color-bg` | 14.8:1 | 4.5:1 | Pass |
| `--color-fg-muted` on `--color-bg` | 5.6:1 | 4.5:1 | Pass |
| `--color-fg-subtle` on `--color-bg` | 4.6:1 | 4.5:1 | Pass (post-bump) |
| `--color-brand` on `--color-bg` | 4.7:1 | 4.5:1 | Pass |
| `--color-brand-fg` on `--color-brand` | 6.2:1 | 4.5:1 | Pass |
| `--color-fg` on `--color-bg-sunken` | 13.1:1 | 4.5:1 | Pass |

(Dark-mode table omitted for brevity; all pairs measured.)

## The command

Use the Chrome DevTools "CSS Overview" or `a11y-contrast` plugin. Record pairs in `docs/ACCESSIBILITY.md`.

## Why we chose this — the PE7 judgment

**Alt 1: Target AAA (7:1).** Harder to design for; AA is the industry baseline.
**Alt 2: Use perceptual contrast (APCA) instead of WCAG 2 ratios.** APCA is in draft. Stick with the standard.

## Verify

CSS Overview → Contrast issues panel → zero issues.

## Mistake log

- `--color-fg-subtle` was originally at 3.8:1 — corrected token value.
- `--color-brand` varied by theme; ensured both modes clear 4.5:1.

## Commit

```bash
git add curriculum/module-07-polish/lesson-122-color-contrast.md
git commit -m "docs(a11y): color-contrast audit + lesson 122"
```
