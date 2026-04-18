# Lesson 002 — Create the project folder and initialize git

**Module:** 1 — Foundation
**Phase:** PE7 Build Order → Phase 1, Step 2
**Previous lesson:** 001 — Spec the product before writing a single line of code
**Next lesson:** 003 — Scaffold the SvelteKit project
**Estimated time:** 5 minutes
**Files touched:** `README.md`, `.gitignore`

---

## Context

Lesson 001 produced the product specification. Now we establish the project's identity and version control hygiene before any dependencies arrive. A proper README tells contributors (and your future self) what the project is, how to run it, and where to find documentation. A proper `.gitignore` prevents node_modules, environment secrets, build artifacts, and OS junk from ever entering the repository.

These two files are the first things a developer sees when they clone a repo. If the README is empty and the `.gitignore` is missing, the project signals "hobby project." If both are complete and precise, the project signals "this person ships production software."

This lesson produces `README.md` and `.gitignore` — the project's public identity and its hygiene rules.

## The command

Git is already initialized from the previous commit. Create the README:

```bash
touch README.md
```

Write `README.md` with:
- Project name and one-line description
- Stack summary (SvelteKit, Svelte 5, TypeScript strict, PostgreSQL, Stripe, Motion, Biome, Vitest + Playwright)
- Getting started instructions (`pnpm install`, `docker compose up`, `pnpm db:reset && pnpm db:seed`, `pnpm dev`)
- Scripts table documenting every `package.json` script
- Links to `docs/` documentation files
- Link to `curriculum/` with explanation that each lesson maps to one commit
- License (Proprietary)

Create `.gitignore` with rules for:

```gitignore
# Dependencies
node_modules/

# Build output
.svelte-kit/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
test-results/
playwright-report/

# Logs
*.log
logs/

# Database
drizzle/meta/

# Stripe CLI
.stripe/

# Sentry
.sentryclirc
```

What just happened: we created two files that define the project's public surface area. The README communicates intent and usage to anyone who encounters the repo. The `.gitignore` ensures that secrets (`.env.local`), build artifacts (`.svelte-kit/`, `build/`), dependency trees (`node_modules/`), and OS noise (`.DS_Store`) never pollute the commit history.

## Why we chose this — the PE7 judgment

**Alternative 1: Skip the README until the project is "done"**
This guarantees the README never gets written. Every project that ships without a README forces every new contributor to reverse-engineer the setup from `package.json` scripts and config files. A README written at project inception is maintained incrementally — you update it when you add a script or a new dependency. A README written after the fact is a chore that no one does well.

**Alternative 2: Use a README generator (readme-md-generator, etc.)**
Generators produce boilerplate that doesn't match your project. They add badges you don't need, sections you won't fill, and a structure that fights your actual documentation. Writing the README by hand takes 5 minutes and produces exactly what you need — no more, no less.

**Alternative 3: Skip `.gitignore` and add files individually**
Without a `.gitignore`, the first `git add .` will stage `node_modules/` (hundreds of megabytes), `.env.local` (secrets), and `.DS_Store` (meaningless OS metadata). You can manually exclude them every time, but one mistake and secrets are in your git history forever. `.gitignore` is a safety net you set once.

**Alternative 4: Use a `.gitignore` template from gitignore.io**
These templates include hundreds of lines for tools you'll never use (Vim swap files for a team that uses VS Code, Windows rules for a macOS team). A curated `.gitignore` with only the rules your project needs is easier to audit and less likely to hide a misconfiguration.

The PE7 choice is to write both files by hand, keeping them minimal and accurate. Every line has a reason.

## What could go wrong

**Symptom:** `.env.local` appears in `git status` as untracked
**Cause:** `.gitignore` wasn't committed before creating `.env.local`, or there's a typo in the ignore rule.
**Fix:** Check that `.env.local` exactly matches the pattern in `.gitignore`. Run `git check-ignore -v .env.local` to verify the rule is matching.

**Symptom:** `node_modules/` shows up in git after `pnpm install`
**Cause:** `.gitignore` was committed after `node_modules/` was already tracked.
**Fix:** Run `git rm -r --cached node_modules/` to untrack it, then commit. The `.gitignore` rule only prevents future tracking — it doesn't untrack already-tracked files.

**Symptom:** README references scripts that don't exist yet
**Cause:** We wrote the README before `package.json` exists.
**Fix:** This is intentional. The README is a forward-looking document. We'll validate that every referenced script exists when we create `package.json` in lesson 003. The README serves as a checklist of what the project must support.

## Verify

```bash
# Confirm both files exist
ls -la README.md .gitignore
```

Expected: both files listed with non-zero sizes.

```bash
# Confirm .gitignore covers the essentials
grep -c "node_modules" .gitignore
grep -c "env.local" .gitignore
grep -c ".svelte-kit" .gitignore
```

Expected: `1` for each — one matching line per pattern.

```bash
# Confirm README has the project name
head -1 README.md
```

Expected: `# ForgeSchool`

## Mistake log — things that went wrong the first time I did this

- **Forgot to ignore `drizzle/meta/`.** Drizzle Kit generates a `meta/` directory inside `drizzle/` that contains internal state. Committing it causes merge conflicts when multiple developers run migrations. Added `drizzle/meta/` to `.gitignore` after the first migration generated unexpected files.
- **Used `.env*` as ignore pattern instead of specific entries.** This accidentally ignored `.env.example`, which should be committed (it's the template). Changed to explicit `.env`, `.env.local`, `.env.*.local` patterns so `.env.example` passes through.
- **README initially had "MIT License" out of habit.** This is proprietary software for Billy's 18K-trader audience, not an open-source project. Changed to "Proprietary. All rights reserved."

## Commit this change

```bash
git add README.md .gitignore
git add curriculum/module-01-foundation/lesson-002-create-project-folder.md
git commit -m "chore: add README and .gitignore + lesson 002

- Adds README.md with project overview, stack, and getting started guide
- Adds .gitignore covering node_modules, build output, env files, IDE, OS noise
- Authors curriculum/module-01-foundation/lesson-002-create-project-folder.md"
```

With the project identity established, lesson 003 scaffolds the actual SvelteKit application — the first real code enters the repo.
