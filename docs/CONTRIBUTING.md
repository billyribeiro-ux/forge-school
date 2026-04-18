# Contributing

## Setup

```bash
git clone <repo>
cd forge-school
pnpm install
cp .env.example .env.local   # fill in your test keys
docker compose up -d         # local Postgres
pnpm db:migrate && pnpm db:seed
pnpm dev
```

## Branch + commit

- Branch from `main`: `git checkout -b claude/<module>-lesson<NNN>-<slug>`
- One lesson per commit. Commit message in Conventional Commits format.
- Every commit must pass `pnpm check` + `pnpm test` + `pnpm build`.

## Code style

- Biome for lint + format (`pnpm lint`).
- Zero `any`, zero `@ts-ignore`, zero hacks.
- Svelte 5 runes only. `$state`, `$derived`, `$props`, `$effect`.
- OKLCH CSS tokens only.

## PRs

- Reference the lesson number in the PR title.
- "Why we chose this" content goes in the lesson markdown, not the PR description.
- CI must be green before review.

## Authoring a lesson

The PE7 Lesson Template (see `PROMPT.md`) is binding:

1. Front-matter (number, slug, title, module info, previous/next, filesTouched).
2. Context (2-4 paragraphs).
3. The command (exact commands / diffs).
4. Why we chose this — the PE7 judgment (2-4 alternatives with real failure modes).
5. What could go wrong.
6. Verify.
7. Mistake log.
8. Commit.

Never skip the "Why we chose this" section. It's the moat.
