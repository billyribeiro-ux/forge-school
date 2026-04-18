---
number: 6
slug: env-files
title: Author .env.example and .env.local
module: 1
moduleSlug: foundation
moduleTitle: Foundation
phase: 1
step: 6
previous: 5
next: 7
estimatedMinutes: 10
filesTouched:
  - .env.example
  - .env.local
---

## Context

Environment variables are the boundary between code and secrets. Database credentials, Stripe API keys, webhook signing secrets, Sentry DSNs, log levels — all of these change between local, staging, and production without any source-code change. The PE7 pattern is to declare the entire set of variables in a template file (`.env.example`), commit the template, and let each contributor copy it to a gitignored local file (`.env.local`) that they fill in.

We write the template *before* we need any of these variables. Three reasons. First, the template is the specification of what this app talks to — a single grep of `.env.example` tells you every external dependency. Second, writing it early forces us to name things consistently now, so that in lesson 047 when we wire Stripe webhook verification we don't invent a third name for the same secret. Third, the `PUBLIC_` prefix on browser-exposed variables is a hard SvelteKit constraint — getting it wrong means either a secret leaks to the client bundle or a build-time type error. Doing it once, correctly, means we never revisit.

This lesson produces `.env.example` (committed) and `.env.local` (gitignored local copy) covering every env var ForgeSchool will read in v1.

## The command

Create `.env.example` at the repo root:

```bash
touch .env.example
```

Fill it with every env var the app will eventually read, grouped by subsystem, each with a comment explaining what it does and where the value comes from:

```bash
# ForgeSchool — environment variables template.
#
# Copy this file to .env.local and fill in every value before running `pnpm dev`.
# Never commit .env.local. Never put production secrets in any .env file checked
# into git. This file is the exhaustive list of every env var this app reads.
#
# Variables prefixed with PUBLIC_ are exposed to the browser via
# $env/static/public. Everything else is server-only via $env/static/private.

# ─── Application ───
PUBLIC_APP_URL="http://localhost:5173"
PUBLIC_APP_NAME="ForgeSchool"

# ─── Database (Postgres 16 via Docker Compose locally) ───
DATABASE_URL="postgres://forgeschool:forgeschool@localhost:5432/forgeschool"

# ─── Stripe (TEST MODE ONLY on v1) ───
STRIPE_SECRET_KEY="sk_test_replace_me"
PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_replace_me"
STRIPE_WEBHOOK_SECRET="whsec_replace_me"

# ─── Observability ───
SENTRY_DSN=""
PUBLIC_SENTRY_DSN=""
LOG_LEVEL="info"

# ─── Analytics ───
PUBLIC_PLAUSIBLE_DOMAIN=""

# ─── Transactional email (Resend test account) ───
RESEND_API_KEY=""
RESEND_FROM_EMAIL="hello@forgeschool.dev"
```

Copy it to a gitignored local file and adjust values for your machine:

```bash
cp .env.example .env.local
```

`.env.local` is gitignored (rule declared in lesson 002 and confirmed by the scaffolder's additions). `git check-ignore -v .env.local` should show the matching rule. Values in `.env.local` are the ones your dev machine will use when you run `pnpm dev`.

**Two rules, every env file, forever:**

1. **PUBLIC_ prefix means client-visible.** SvelteKit inlines `$env/static/public` variables into the browser bundle. Anything without the prefix is server-only and will never reach the browser — enforced by the bundler, not by convention.
2. **Never explicitly set NODE_ENV.** SvelteKit and Vite own that variable. Writing `NODE_ENV=production` in `.env.local` causes the dev server to run in production mode, disabling HMR, source maps, and a dozen other dev-only affordances. The framework sets it.

## Why we chose this — the PE7 judgment

**Alternative 1: Commit a single `.env` file with placeholder values**
If `.env` is committed, every contributor either edits it in-place (and pollutes the git diff with their local secrets) or ignores it (and ships unrelated `.env` changes by accident). The `.env.example` / `.env.local` split gives you one file for the schema (committed) and one for values (gitignored). Even if someone pushes `.env.local`, `.gitignore` blocks it at `git add`.

**Alternative 2: Use a secret manager (Doppler, 1Password CLI, HashiCorp Vault) from day one**
For a greenfield local-dev setup, a secret manager is premature. It adds a login step to `pnpm dev`, a dependency on a third-party service, and a failure mode (offline, auth token expired) that `.env.local` does not have. Secret managers are the right answer for production, but v1 ships without prod secrets — we're in Stripe test mode, we're on localhost Postgres. When we add a production environment in module 8, that's when a secret manager earns its seat.

**Alternative 3: Hardcode default values in code and override with `process.env`**
This is the Express-era pattern: `const port = process.env.PORT ?? 3000`. SvelteKit has replaced it with `$env/static/private` and `$env/static/public`, which are validated at build time. A missing `DATABASE_URL` becomes a TypeScript error, not a runtime `undefined.connect is not a function`. We use the framework's mechanism because the framework's mechanism is strictly safer.

**Alternative 4: Skip the template, let each developer create `.env.local` from scratch**
The template is a document. Each variable has a comment explaining what it does and where the value comes from. A developer cloning the repo runs `cp .env.example .env.local`, skims the comments, and fills in values — no Slack thread, no tribal knowledge, no "wait, what's this variable for?" moment six months in. The cost of writing the template is five minutes. The savings compound for the life of the project.

The PE7 choice — exhaustive `.env.example` committed, per-contributor `.env.local` gitignored — wins because it separates schema from values, documents the app's external surface, and is zero-dependency.

## What could go wrong

**Symptom:** `.env.local` shows up as "untracked" in `git status`
**Cause:** The `.gitignore` rule for `.env.local` isn't matching. Most likely a typo or a stale working copy.
**Fix:** `git check-ignore -v .env.local` shows which `.gitignore` line matches. Expected: line 14 of `.gitignore`, rule `.env.local`. If nothing matches, the file wasn't gitignored at create time — add the rule and commit.

**Symptom:** `PUBLIC_STRIPE_PUBLISHABLE_KEY` is undefined in the browser
**Cause:** Either the variable lacks the `PUBLIC_` prefix, or it's being read via `$env/static/private` instead of `$env/static/public`.
**Fix:** Check both. The prefix is a compile-time check; the import path is an explicit choice. They must agree.

**Symptom:** `pnpm dev` errors with `DATABASE_URL is not defined`
**Cause:** You edited `.env.example` but not `.env.local`, or you forgot the copy step.
**Fix:** `cp .env.example .env.local` and restart the dev server. SvelteKit does not live-reload env changes — a restart is required.

**Symptom:** A secret you put in `.env.local` leaked into the client bundle
**Cause:** A server-only variable was imported from `$env/static/public`. The bundler renamed it to satisfy the public import, which inlines the value.
**Fix:** Audit every `$env/static/public` import. If the variable has no `PUBLIC_` prefix, this should be a type error — which is why the prefix convention exists. If the type error was silenced with `@ts-ignore`, revert the silence and re-architect.

## Verify

```bash
# .env.example exists and is tracked
git ls-files .env.example
```

Expected: `.env.example`

```bash
# .env.local exists locally but is ignored
ls -la .env.local
git check-ignore -v .env.local
```

Expected: file exists, ignore rule on line 14 of `.gitignore` matches.

```bash
# Both files have identical key sets (values differ, keys do not)
diff <(grep -oE '^[A-Z_]+' .env.example | sort) <(grep -oE '^[A-Z_]+' .env.local | sort)
```

Expected: empty diff. If the key sets diverge, one file is stale.

```bash
# No accidental NODE_ENV
grep -n 'NODE_ENV' .env.example .env.local
```

Expected: no matches. SvelteKit and Vite own that variable.

## Mistake log — things that went wrong the first time I did this

- **Used `.env` instead of `.env.local` for local dev.** `.env` is loaded in production too (when the deploy target's runtime reads the file), which meant my dev Stripe keys would have ended up live. `.env.local` is Vite's convention for "this file is only ever loaded in local dev." Switched to `.env.local` everywhere.
- **Named a server-only variable with the `PUBLIC_` prefix "just in case."** The variable was a Stripe secret key. Tracing the imports showed the client bundle would have inlined it. The rule is absolute: server secrets never carry the PUBLIC_ prefix.
- **Left the `RESEND_API_KEY` value as `re_test_replace_me` in `.env.example`.** Looked like a real-but-fake key. Left it blank (`""`) instead, so the schema documents the variable without giving the impression of a usable value. An empty string is clearer: "fill this in, we do not ship with a default."
- **Committed `.env.local` accidentally during an early `git add .`.** Caught it because the `.gitignore` rule was correct — but the file had existed *before* the .gitignore rule was committed. `git rm --cached .env.local` removes it from the index without deleting the local file. Commit that, and future `git add` operations respect the ignore rule.

## Commit this change

```bash
git add .env.example curriculum/module-01-foundation/lesson-006-env-files.md
git commit -m "chore(env): add .env.example template + lesson 006"
```

`.env.local` stays on your machine, uncommitted. Every future contributor — and every future you on a new laptop — runs `cp .env.example .env.local` as the first step after cloning.

With environment variables locked in, lesson 007 installs mdsvex and wires Markdown files into SvelteKit. This is the mechanism that turns `curriculum/module-01-foundation/lesson-003.md` into a browsable page on the running site.
