---
number: 28
slug: module-2-checkpoint
title: Validate Module 2 and tag the phase-2 checkpoint
module: 2
moduleSlug: data
moduleTitle: Data
phase: 2
step: 12
previous: 27
next: 29
estimatedMinutes: 10
filesTouched: []
---

## Context

Module 2 wired the data layer: Docker Postgres, Drizzle ORM + postgres.js + drizzle-kit, the full 13-table schema, the first migration, the migrator runner, `db:reset` / `db:seed` / `db:studio` scripts with production guards, the first real seed fixture (ForgeSchool Lifetime), and the first integration test against the real DB.

Like Module 1's lesson 016, this lesson is verification + a tag. Every gate runs, every failure gets fixed, we cut `phase-2-complete`, and Module 3 starts from a known-good anchor.

## The command

Run every gate in order.

```bash
# 1. Postgres is up and healthy
docker compose up -d --wait
docker compose ps
```
Expected: `forgeschool-postgres` status `running (healthy)`.

```bash
# 2. Fresh schema + fresh seed
pnpm db:reset
pnpm db:seed
```
Expected: both complete in under 5 seconds each with no errors.

```bash
# 3. Type check
pnpm check
```
Expected:

```
COMPLETED 644 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

Note the jump from Module 1's 172 files to 644. The growth is Drizzle's generic type surface + Vitest's types + new source files; every one of them is zero-issue.

```bash
# 4. Integration tests
pnpm test
```
Expected:

```
Test Files  1 passed (1)
     Tests  3 passed (3)
```

```bash
# 5. Production build
pnpm build
```
Expected:

```
✓ built in [N]ms
```

All five green. Cut the tag:

```bash
git tag -a phase-2-complete -m "Phase 2 data layer complete

Module 2 ships:
- Docker Compose Postgres 16 (healthcheck, named volume, UTC)
- Drizzle ORM + postgres.js + drizzle-kit wired
- docs/ARCHITECTURE.md with v1 data-model design + 8 judgments
- 13-table schema, 8 enums, typed FK actions (cascade/restrict/set null)
- Migration #0000 generated + applied via typed migrator
- db:reset / db:seed / db:studio / db:migrate scripts with prod guards
- seed-dev.ts skeleton + first real fixture (ForgeSchool Lifetime)
- Vitest + first integration test (3 passing) against real Postgres
- Drizzle Studio documented"
```

Verify:

```bash
git tag -l | grep phase
```
Expected: `phase-1-complete` and `phase-2-complete`.

## Why we chose this — the PE7 judgment

**Alternative 1: Skip the checkpoint tag, rely on branch names**
See Module 1's rationale (lesson 016). Tags are cheap immutable markers; branches move. Keep them.

**Alternative 2: Include `db:studio` as a gate**
Studio is a GUI tool; there's no pass/fail output to automate. Not a gate. It's in the toolchain, not the verification chain.

**Alternative 3: Add `pnpm test:e2e` here**
E2E tests arrive in Module 4 with Playwright. Not relevant to the Module 2 contract (data layer). Each module's verification gate validates the module's specific contract; we don't front-load future modules' concerns.

The PE7 choice — five specific gates (DB up, reset, seed, check, test, build), explicit tag with a scoped message — wins because it produces a reproducible "the foundation + data layer both work" anchor.

## What could go wrong

**Symptom:** `pnpm test` fails with "seed row not found"
**Cause:** You ran `db:reset` but forgot `db:seed`. The test file's `beforeAll` checks for the seeded product.
**Fix:** `pnpm db:seed`. Retry tests.

**Symptom:** `pnpm check` reports new warnings that weren't there at lesson 026
**Cause:** An incremental edit somewhere leaked a type issue. Nothing in Module 2's final lessons should have introduced warnings — the last code change was the Studio lesson which didn't touch source.
**Fix:** `git diff phase-1-complete..HEAD -- src/` shows everything Module 2 added. Narrow to the introducing commit.

**Symptom:** `pnpm build` warns about adapter-auto's missing platform
**Cause:** Same as Module 1. Expected until Module 8.
**Fix:** Ignore. The warning is informational, not an error.

**Symptom:** Postgres container isn't healthy after `docker compose up -d --wait`
**Cause:** The previous container was in a weird state — partial data, locked volume, port conflict.
**Fix:** `docker compose down && docker compose up -d --wait`. If still unhealthy: `docker compose down -v` (wipes the volume) and retry. Then `pnpm db:reset && pnpm db:seed`.

## Verify

```bash
# Lesson count
ls curriculum/module-02-data/*.md | wc -l
```
Expected: `12` — one per step (017 through 028).

```bash
# Tag points at this commit's tree
git rev-parse phase-2-complete HEAD
```
Expected: the two SHAs match (or the tag is within 1 commit).

```bash
# All gates pass
docker compose up -d --wait && pnpm db:reset && pnpm db:seed && pnpm check && pnpm test && pnpm build
```
Expected: every step exits 0.

## Mistake log — things that went wrong the first time I did this

- **Ran `pnpm test` without running `pnpm db:seed` first.** The `beforeAll` in queries.test.ts threw "seed row not found". Fast-fail with a readable error, but it meant an extra cycle. Considered adding a `pretest` npm script that chains `db:reset && db:seed` — decided against, because local iteration often wants `pnpm test` without a full reset. Discipline instead: if the DB isn't seeded, seed it; `pretest` automation would mask the failure mode.
- **Cut the tag from a working tree with unstaged changes.** Tag moved forward in git's ref graph but half the changes weren't committed. Had to delete the tag and re-tag after committing. Rule: always `git status` clean before tagging.
- **Tried `pnpm db:reset && pnpm test` directly.** Race condition — the reset's migrations finished before the test's connection pool warmed up, so the first test saw empty tables. Sequenced with `&&`, which serializes. The issue was actually the test's connection reached an old cached socket. Closing and re-opening test connections between runs fixed it, but `afterAll` already handles this at file level. Non-issue in practice; initial misdiagnosis noted.
- **Almost shipped without a `phase-2-complete` tag "because we'll add it at the end of a bigger milestone".** Lesson 016's rationale still applies: tags are cheap; cut them at every module boundary. Overruled myself; tagged.

## Commit this change

```bash
git add curriculum/module-02-data/lesson-028-module-2-checkpoint.md
git commit -m "docs(module-2): validate data layer + tag phase-2-complete + lesson 028"
git tag -a phase-2-complete -m "Phase 2 data layer complete"
```

**Module 2 summary** — 12 lessons, 12 commits, 1 tag:

| # | Lesson | Outcome |
|---|---|---|
| 017 | Docker Compose | Postgres 16 Alpine, healthcheck, named volume |
| 018 | Install Drizzle | drizzle-orm, postgres.js, drizzle-kit, dotenv |
| 019 | Design schema | `docs/ARCHITECTURE.md` — 9 sections, 13 tables, 8 judgments |
| 020 | Write schema | `src/lib/server/db/schema.ts` — 15 tables, 8 enums, FK actions |
| 021 | Generate migration | `drizzle/migrations/0000_*.sql` + snapshot |
| 022 | Run migration | `scripts/migrate.ts`, `db:migrate` script |
| 023 | db scripts | `db:reset`, `db:seed`, `db:studio` + prod guards |
| 024 | Seed skeleton | `scripts/lib/env.ts` shared helpers; seed-dev.ts skeleton |
| 025 | First product | ForgeSchool Lifetime @ $497 seeded idempotently |
| 026 | First test | Vitest + real Postgres integration test, 3 passing |
| 027 | Drizzle Studio | GUI walkthrough, four workflows documented |
| 028 | Checkpoint | all gates green, `phase-2-complete` tag cut |

Module 3 — Content Pipeline — builds the lesson loader and renderer. Lesson 029 designs the curriculum folder structure.
