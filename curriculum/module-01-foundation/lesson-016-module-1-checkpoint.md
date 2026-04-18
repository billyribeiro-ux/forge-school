---
number: 16
commit: f2efe86a2df615352af2b05d799ac8eee965c00a
slug: module-1-checkpoint
title: Validate the foundation and tag the Module 1 checkpoint
module: 1
moduleSlug: foundation
moduleTitle: Foundation
phase: 1
step: 16
previous: 15
next: 17
estimatedMinutes: 10
filesTouched: []
---

## Context

Module 1 built the foundation: product spec, SvelteKit scaffold, pnpm lockdown, TypeScript strictness, environment variables, Markdown pipeline, OKLCH tokens, 9-tier breakpoints, fluid typography, `@layer` cascade, Iconify + bespoke SVG generator, Svelte Agentation inspector, and server-side logging + error handling. Fifteen commits, each self-contained, each with its own lesson.

Every subsequent module rests on this foundation. Module 2 wires Postgres and Drizzle; Module 3 builds the curriculum renderer; Module 4 wires Stripe; Modules 5–8 build product features, marketing, polish, and CI. If any of the 15 foundation commits is broken — a type error slipped through, an import path drifted, a token reference points to a deleted alias — the whole downstream chain inherits the break.

This lesson is **verification theater, and it matters**. We run every gate the repo has (typechecker, build), fix anything that's red, then cut a git tag so we have a known-good anchor to revert to if Module 2 introduces a regression we can't isolate.

This is not a commit-new-code lesson. The deliverable is a passing verification run, a git tag, and a short status report.

## The command

Run the three quality gates in order. Each must pass before moving to the next.

```bash
# Gate 1 — TypeScript + Svelte type checking
pnpm check
```

Expected:

```
COMPLETED 172 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

Zero errors, zero warnings. The `FILES` count is Svelte files (both `.svelte` and `.md` via mdsvex) plus `.ts` files reachable from the build graph. If the count drops unexpectedly, something moved out of the graph and we need to trace why. If warnings appear, fix them — warnings are errors in waiting.

```bash
# Gate 2 — Production build
pnpm build
```

Expected:

```
✓ built in [N]ms
> Using @sveltejs/adapter-auto
  Could not detect a supported production environment.
  ✔ done
```

The `Could not detect a supported production environment` warning is expected at this phase — we haven't chosen a deploy target (module 8 wires Vercel/Netlify/Node adapter). `adapter-auto` falls back gracefully. The important line is `✓ built` with no error output.

```bash
# Gate 3 — Run the dev server for a smoke test
pnpm dev
```

Open the dev server in a browser. The home page should render:

1. **The heading "Welcome to ForgeSchool"** — styled by the base layer, sized by `--font-size-4xl`
2. **Three icons in a row** — ForgeMark (bespoke), Phosphor lightning bolt, Carbon code glyph — all in the brand amber, all scaling with the fluid type scale
3. **Body text** — rendered via mdsvex, wrapped by the root layout, inheriting `--color-fg` and `--font-size-base`
4. **No console errors** in DevTools
5. **Svelte Agentation active** — hold Control+Shift, hover an element, see the source file mapped

Stop the dev server (Ctrl+C).

Now cut the phase-1 checkpoint tag:

```bash
git tag -a phase-1-complete -m "Phase 1 foundation complete

Module 1 ships:
- Product spec and repo identity
- SvelteKit 2 + Svelte 5 runes scaffold
- pnpm locked (packageManager + engines + only-allow + strict flags)
- TypeScript strict + 9 PE7 flags
- .env.example / .env.local contract
- mdsvex Markdown pipeline
- OKLCH tokens, 9-tier breakpoints, fluid typography
- @layer cascade with reset + base
- Iconify (Phosphor + Carbon) + svg-to-svelte generator
- Svelte Agentation inspector in dev
- hooks.server.ts + pino logger + App.Error shape"
```

Verify the tag:

```bash
git tag -l | grep phase
git log --oneline phase-1-complete | head -3
```

Expected: `phase-1-complete` appears in the tag list, and points at the most recent commit.

## Why we chose this — the PE7 judgment

**Alternative 1: Skip the verification — "it built at the end of the last lesson"**
Each lesson verifies its own commit. That doesn't guarantee the *sequence* still works after 15 commits. A type that was added in lesson 005 might be incompatible with an import added in lesson 015 — unlikely, but verification is cheap and catches the unlikely case. Run the gates.

**Alternative 2: Skip the tag — branches are enough**
Tags are immutable pointers to commits; branches move. A tag named `phase-1-complete` is a permanent marker that points to the exact commit where Module 1 closed, forever. When a Module 4 regression asks "was this working before Stripe?", `git checkout phase-1-complete` answers in two seconds. Without the tag, you're reading the log to find the right commit. Tags are cheap. Use them.

**Alternative 3: Add a lint gate in addition to check + build**
We will, in Module 8's CI setup. Biome isn't installed yet — installing it mid-Module 1 for the verification gate would require a new lesson, and introducing the Biome config is its own lesson-sized concern. For now, `pnpm check` covers the type errors Biome would also flag; stylistic lint concerns (unused imports, import-sort order) are deferred to when Biome lands. The verification hierarchy will be `check → lint → test → build` in Module 8; for phase-1, `check → build` is the subset we enforce.

**Alternative 4: Tag the commit from lesson 015 instead of this lesson**
Possible, but then the tag commit is a `feat(hooks): ...` commit, which makes it look like the hooks work is the phase boundary rather than the verification being the phase boundary. Tagging *after* explicit verification (and optionally after a "docs: close module 1" commit, if we had one) makes the tag semantically correct: "this point was verified green."

The PE7 choice — explicit verification + a semantic tag — wins because it makes the foundation's state provable and recoverable.

## What could go wrong

**Symptom:** `pnpm check` passes on my machine but fails on a teammate's
**Cause:** Stale `.svelte-kit/` generated files. The base config fragment at `.svelte-kit/tsconfig.json` is a build artifact; if it drifted locally and wasn't regenerated on the teammate's checkout, types differ.
**Fix:** `rm -rf .svelte-kit && pnpm install && pnpm check` regenerates the fragment cleanly. If the failure persists, the drift is in a committed file — diff the teammate's working tree against `main`.

**Symptom:** `pnpm build` fails with `adapter-auto` errors about missing platform
**Cause:** `adapter-auto` requires SvelteKit to detect a platform (Vercel, Netlify, Node, Cloudflare). In a bare local environment with none detected, it warns but does not fail. If you see a hard error, something else (missing peer dep, version mismatch) is the real cause — read the error carefully.
**Fix:** Confirm `@sveltejs/adapter-auto` is in `devDependencies`. If the error is platform-specific, Module 8 will swap to a concrete adapter (`@sveltejs/adapter-vercel` or `@sveltejs/adapter-node`).

**Symptom:** Dev server starts but home page is blank / unstyled
**Cause:** One of the CSS imports in `+layout.svelte` failed silently. Most likely `$lib/styles/...` path resolution.
**Fix:** Check DevTools Network tab for a failed CSS request. `pnpm exec svelte-kit sync` regenerates `$lib` aliases. Restart dev.

**Symptom:** Tag creation errors with `fatal: tag 'phase-1-complete' already exists`
**Cause:** You already tagged and are re-running the lesson.
**Fix:** `git tag -d phase-1-complete && git tag -a phase-1-complete -m "..."` — delete and recreate. (Safe locally. Don't do this on a pushed tag without understanding the consequences for collaborators.)

## Verify

```bash
# The full suite
pnpm check && pnpm build
```

Expected: check reports 0/0; build completes successfully.

```bash
# The tag is in place and points at HEAD
git tag -l phase-1-complete
git rev-parse phase-1-complete HEAD
```

Expected: tag exists; the two SHAs match (or are within 1 commit if the tag was cut before this lesson's commit — it's legitimate to put the tag on this lesson's commit itself).

```bash
# Module 1 lesson count sanity
ls curriculum/module-01-foundation/*.md | wc -l
```

Expected: `16` — one lesson per step in the build order.

```bash
# Repo state summary
git log --oneline phase-1-complete | head -20
```

Expected: 15-16 `feat(...)` / `chore(...)` / `docs(...)` commits corresponding to lessons 001–016.

## Mistake log — things that went wrong the first time I did this

- **Ran `pnpm check` without first running `svelte-kit sync`.** The `check` script chains `svelte-kit sync && svelte-check`, so this is a non-issue with the provided script. But when invoking `svelte-check` directly during iteration, I hit "cannot find module $lib" errors because the SvelteKit-generated types were stale. The fix: `pnpm exec svelte-kit sync` or just use `pnpm check`.
- **Tagged `phase-1` instead of `phase-1-complete`.** The naming convention matters because we will have `phase-2`, `phase-3`, etc., and the `-complete` suffix makes the semantic clear: this tag marks completion, not the start or any intermediate state. Renamed the tag.
- **Forgot to include the `adapter-auto` warning explanation in my reproduction notes.** A teammate ran `pnpm build` and got spooked by the platform warning. Added a note to the `.env.example` comments and to this lesson's "What could go wrong" section — the warning is expected until Module 8 picks an adapter.
- **Considered running `git push --tags` as part of this lesson.** Held off: pushing tags is an action with shared-state consequences (other contributors' CI may auto-deploy on tag), and we haven't set up a remote deploy yet. Tag stays local for now; we push during Module 8's release flow.

## Commit this change

```bash
git add curriculum/module-01-foundation/lesson-016-module-1-checkpoint.md
git commit -m "docs(module-1): validate foundation + tag phase-1-complete + lesson 016"
git tag -a phase-1-complete -m "Phase 1 foundation complete"
```

Module 1 is done.

**Module 1 summary** — 16 lessons, 16 commits, 1 tag:

| # | Lesson | Outcome |
|---|---|---|
| 001 | Spec the product | `docs/SPEC.md` |
| 002 | Create the project folder | `README.md` + `.gitignore` |
| 003 | Scaffold SvelteKit | `pnpm create svelte@latest` + base files |
| 004 | Lock pnpm | `packageManager` + `engines` + `only-allow` + `pnpm-workspace.yaml` |
| 005 | TypeScript strict | 9 PE7 flags on top of `strict: true` |
| 006 | `.env.example` | every env var declared, `.env.local` gitignored |
| 007 | mdsvex | `.md` files compile as Svelte components |
| 008 | OKLCH tokens | primitives + semantic aliases in `@layer tokens` |
| 009 | 9-tier breakpoints | canonical scale 320 → 3840 |
| 010 | Fluid typography | 11-step clamp() scale, 320 → 1536 anchors |
| 011 | `@layer` cascade | reset → tokens → base → components → utilities → overrides |
| 012 | Iconify | Phosphor + Carbon JSON bundles |
| 013 | svg-to-svelte generator | `pnpm icons:generate` emits Svelte 5 components |
| 014 | Svelte Agentation | vite-plugin-svelte inspector, tree-shaken from prod |
| 015 | `hooks.server.ts` + pino | structured logging + correlation-ID error handler |
| 016 | Checkpoint | all gates green, `phase-1-complete` tag cut |

Module 2 wires Postgres + Drizzle. Lesson 017 — Docker Compose for local Postgres — is the first step.
