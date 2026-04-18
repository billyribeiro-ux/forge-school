---
number: 39
slug: module-3-checkpoint
title: Validate Module 3 and tag the phase-3 checkpoint
module: 3
moduleSlug: content-pipeline
moduleTitle: Content Pipeline
phase: 3
step: 11
previous: 38
next: null
estimatedMinutes: 10
filesTouched: []
---

## Context

Module 3 is done. The curriculum folder structure is documented, every lesson carries typed frontmatter, the loader ingests it at build time, the listing and per-lesson routes prerender, syntax highlighting runs through shiki, navigation chrome (prev/next + sidebar) is wired, the root URL is a proper landing page, and a reading-progress indicator marks scroll position.

This lesson is verification + the `phase-3-complete` tag. Module 4 — Stripe test-mode integration — starts next.

## The command

```bash
docker compose up -d --wait
pnpm db:reset && pnpm db:seed
pnpm check
pnpm test
pnpm build
```

Expected: check is 0/0; test passes (8 tests: 3 DB query + 5 curriculum loader); build writes ~39 prerendered HTML files (1 root + 1 listing + 37 lessons).

Cut the tag:

```bash
git tag -a phase-3-complete -m "Phase 3 content pipeline complete

Module 3 ships:
- docs/CURRICULUM.md — folder layout + frontmatter schema
- YAML frontmatter on every existing and future lesson
- src/lib/curriculum/ loader with build-time validation
- /lessons listing route with module/lesson index
- /lessons/[slug] per-lesson route with breadcrumb + metadata + body
- shiki syntax highlighting (dual theme, no runtime JS)
- Per-lesson prev/next navigation cards
- Per-module sticky sidebar at lg+ breakpoints
- Loader-driven / landing page with ForgeMark icon + live stats
- Motion installed + rAF-throttled reading progress bar
  respecting prefers-reduced-motion"
```

## Why we chose this — the PE7 judgment

**Alternative 1: Skip the checkpoint**
Same rationale as lessons 016 and 028. Tags are cheap immutable anchors; each module earns its own.

**Alternative 2: Wait until Module 6 polishes the whole student-facing surface**
Modules 3's content pipeline and Module 6's marketing site have clean boundaries. Tagging the content pipeline complete now creates a stable "the curriculum reads" state to revert to if Module 4's Stripe work introduces a regression unrelated to content.

**Alternative 3: Add E2E tests to the checkpoint gate**
Playwright E2E tests arrive in Module 8 when CI assembles. For now, integration tests (Vitest) + build (SvelteKit prerender) are the practical gates.

## What could go wrong

**Symptom:** `pnpm test` fails on curriculum tests
**Cause:** The loader validation now rejects a lesson that was modified mid-module.
**Fix:** Loader errors print the offending file path — fix it or flag it as `draft: true` while iterating.

**Symptom:** Tag-creation fails because phase-3-complete already exists
**Cause:** Lesson re-run.
**Fix:** `git tag -d phase-3-complete && git tag -a phase-3-complete ...`

## Verify

```bash
pnpm check && pnpm test && pnpm build
```
Expected: all green.

```bash
ls .svelte-kit/output/prerendered/pages/lessons/ | wc -l
```
Expected: 37 (lessons 001-039 minus 029 slug collision check... no, all 39).

Actually expected: `39` — lessons 001 through 039, all prerendered.

```bash
git tag -l | grep phase
```
Expected: `phase-1-complete`, `phase-2-complete`, `phase-3-complete`.

## Mistake log — things that went wrong the first time I did this

- **Ran `pnpm build` before the dev DB was up.** The integration tests (and the build if Vitest is chained) need Postgres. `docker compose up -d --wait` first.
- **Forgot the reading-progress bar's `will-change: transform` in dev mode.** Dev server showed choppy animation on a long lesson; CSS hint was missing. Added it; smooth in dev and prod.
- **Assumed `phase-3-complete` would come with ~10 lessons per the original spec.** Module 3 shipped 11 (029-039) because the retrofit needed its own lesson. The PROMPT's target range of 130-170 still holds; 11 is inside the flex allowance.

## Commit this change

```bash
git add curriculum/module-03-content-pipeline/lesson-039-module-3-checkpoint.md
git commit -m "docs(module-3): validate content pipeline + tag phase-3-complete + lesson 039"
git tag -a phase-3-complete -m "Phase 3 content pipeline complete"
```

**Module 3 summary — 11 lessons, 11 commits, 1 tag:**

| # | Lesson | Outcome |
|---|---|---|
| 029 | Curriculum architecture | `docs/CURRICULUM.md` — schema + structure |
| 030 | Retrofit frontmatter | 28 existing lessons normalized to the schema |
| 031 | Build loader | `src/lib/curriculum/index.ts` typed + validated |
| 032 | /lessons listing | Table-of-contents route + mdsvex highlighter fix |
| 033 | /lessons/[slug] | Per-lesson page with breadcrumb + metadata + body |
| 034 | Shiki highlighting | Dual-theme code blocks at build time |
| 035 | Prev/next nav | Bottom-of-page navigation cards |
| 036 | Module sidebar | Sticky desktop sidebar with aria-current |
| 037 | Landing page | Real `/` with hero + modules preview + PE7 callout |
| 038 | Reading progress | Motion installed + scroll-linked progress bar |
| 039 | Checkpoint | Gates green, `phase-3-complete` tag cut |

Module 4 opens with Stripe test-mode integration: account setup, Stripe SDK install, Stripe CLI wiring for local webhook forwarding. Lesson 040 — Stripe test-mode account setup — is the first step.
