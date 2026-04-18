# Lesson 003 — Scaffold the SvelteKit project

**Module:** 1 — Foundation
**Phase:** PE7 Build Order → Phase 1, Step 3
**Previous lesson:** 002 — Create the project folder and initialize git
**Next lesson:** 004 — Lock pnpm as the only permitted package manager
**Estimated time:** 10 minutes
**Files touched:** `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `.npmrc`, `src/app.html`, `src/app.d.ts`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `src/lib/index.ts`, `src/lib/assets/favicon.svg`, `static/robots.txt`, `.gitignore`, `README.md`

---

## Context

Lesson 002 established the project identity — README and `.gitignore`. Now we bring in the SvelteKit skeleton. SvelteKit is a fullstack framework: it owns our frontend (Svelte 5 components) and our backend (server endpoints, hooks, form actions). There is no Express layer to wire, no Vite config to author from scratch, no routing library to pick. SvelteKit is the router, the bundler orchestrator, the SSR engine, and the build tool — all at once.

We scaffold it via the official CLI. The CLI gives us a minimal skeleton: an empty home route, a root layout, the `app.html` document shell, and a preconfigured Vite + Svelte 5 toolchain with runes mode forced on. We take the skeleton template specifically — not the demo template — because every file we keep must have a reason. A demo gives us sample components to delete; a skeleton gives us the smallest surface area that compiles.

This lesson produces the first real code in the repo. From here on, every lesson either extends or replaces something that the scaffold put in place.

## The command

Run the scaffolder inside the project folder. The `.` argument tells it to scaffold into the current directory instead of creating a subfolder:

```bash
pnpm create svelte@latest .
```

Answer the prompts as follows:

- **Which Svelte app template?** → `Skeleton project`
- **Add type checking with TypeScript?** → `Yes, using TypeScript syntax`
- **Select additional options** → none (we'll add Biome, Vitest, and Playwright deliberately in later lessons)

> Note: `pnpm create svelte@latest` delegates to the `sv` CLI (formerly `create-svelte`). If your environment prints `sv create` instead, that's the same tool.

When the scaffolder finishes, the directory contains a working SvelteKit application. Do **not** run `pnpm install` yet — lesson 004 first locks pnpm as the sole permitted package manager, and we don't want a partial install in an unlocked state.

What the scaffolder produced:

```
package.json                      # minimal scripts: dev, build, preview, check
svelte.config.js                  # adapter-auto + runes mode forced everywhere outside node_modules
vite.config.ts                    # sveltekit() plugin, nothing else
tsconfig.json                     # extends .svelte-kit/tsconfig.json, strict: true
.npmrc                            # engine-strict=true
src/
  app.html                        # document shell with %sveltekit.head% + %sveltekit.body%
  app.d.ts                        # App namespace type declarations
  routes/
    +layout.svelte                # favicon wiring + {@render children()}
    +page.svelte                  # "Welcome to SvelteKit"
  lib/
    index.ts                      # empty — the $lib import root
    assets/
      favicon.svg                 # default Svelte favicon
static/
  robots.txt                      # allow-all crawl policy
```

The scaffolder also appended lines to `.gitignore` (build output for Vercel/Netlify/Cloudflare adapters plus Vite timestamp artifacts) and to `README.md` (adds a row for `pnpm preview`). Keep both sets of modifications — they're consistent with the PE7 intent and the scaffolder got them right.

Two details worth naming explicitly, because they are the difference between a generic SvelteKit app and one that earns PE7 in 2026:

1. **`svelte.config.js` forces runes mode on every file outside `node_modules`.** This is the single most important line in the scaffold. It means you cannot accidentally write legacy `$:` reactivity or `export let`. Every component in this repo will use `$state`, `$derived`, `$effect`, `$props`, and `$bindable` — no exceptions, no gradual migration.
2. **`tsconfig.json` extends `./.svelte-kit/tsconfig.json`.** SvelteKit generates a TypeScript config fragment under `.svelte-kit/` during `svelte-kit sync`. That fragment carries path aliases (`$lib`, `$app/*`), module declarations for `.svelte` files, and the baseUrl. Our `tsconfig.json` extends it and adds PE7 strictness on top. We do not fight the generated file.

## Why we chose this — the PE7 judgment

**Alternative 1: Scaffold with the demo template and delete what we don't need**
The demo template ships with a counter, a Sverdle game, a TodoMVC implementation, and a nav bar. Every one of those is a decision that someone else made for a demo repo, not for ForgeSchool. If we start with them, we inherit their patterns — their component structure, their CSS, their data fetching — and we spend an hour deleting them. Starting with the skeleton costs 30 seconds more at the prompt and saves an hour of cleanup. More importantly, it forces every pattern to enter the repo deliberately, authored by us, justified in a lesson.

**Alternative 2: Build SvelteKit from scratch — Vite + @sveltejs/kit + manual config**
This is technically possible and it's what the scaffolder does under the hood. Doing it by hand means reading the SvelteKit source to discover which config keys exist, which file naming conventions the framework expects, and which generated files land in `.svelte-kit/`. The scaffolder captures all of that institutional knowledge in a tested CLI. Re-deriving it by hand is a learning exercise, not a production shortcut. When SvelteKit 3 ships and the scaffold format changes, the CLI will emit the new format and our manual config will be stale.

**Alternative 3: Use a different metaframework — Next.js, Nuxt, SolidStart, Astro**
Each of these is a reasonable choice for a different project. Next.js has the largest ecosystem but React's reactivity model requires more ceremony for the kind of fine-grained updates a cart + live subscription UI needs. Nuxt ties us to Vue, which we don't use anywhere else. SolidStart is excellent but its SSR story was still settling in 2025 and we're targeting 10-year stability. Astro is content-first with islands, which would make the marketing site trivial but the app-shell (cart, checkout, account) a fight. SvelteKit's runes give us surgical reactivity, its `+server.ts` endpoints give us a backend without a second framework, and Svelte 5 shipped its 1.0 in 2024 with the reactivity model we'll still be writing against in 2035.

**Alternative 4: Skip the scaffold, start with a monorepo (Turborepo / Nx)**
Monorepos make sense when you have multiple deployable apps sharing a package graph. ForgeSchool is one app. Introducing a monorepo at lesson 003 adds a `packages/` layer, a workspace config, and a set of build-graph decisions that have no payoff for a single-app repo. If Billy ships a second app (a mobile companion, an admin dashboard) in year two, we can promote this repo into a workspace root then. Premature monorepoisation is one of the most expensive false starts in the industry.

The PE7 choice — SvelteKit skeleton template, TypeScript, no extras — wins because every subsequent decision is authored in a lesson. No inherited opinions, no unused sample code, no framework wars.

## What could go wrong

**Symptom:** `pnpm create svelte@latest .` errors with "destination is not empty"
**Cause:** The project directory contains `README.md` and `.gitignore` from lesson 002, so the scaffolder flags it as non-empty.
**Fix:** The modern `sv` CLI detects the SvelteKit-relevant files specifically and proceeds anyway; if your version prompts, confirm you want to scaffold into the non-empty directory. The scaffolder will merge `.gitignore` (append) and `README.md` (append a preview row) rather than overwrite — inspect the diff after scaffolding to confirm.

**Symptom:** `pnpm create` resolves to an older `create-svelte` that doesn't use the `sv` CLI under the hood
**Cause:** A stale pnpm cache or a very old global pnpm version.
**Fix:** Run `pnpm store prune` and retry. If the wrong binary is still resolved, invoke the new CLI directly: `pnpm dlx sv create .`. Both produce the same skeleton.

**Symptom:** After scaffolding, `tsconfig.json` reports `Cannot find base config file './.svelte-kit/tsconfig.json'`
**Cause:** `.svelte-kit/` is generated by `svelte-kit sync`, which runs as part of `pnpm install` (via the `prepare` script). Before the first install, the base config doesn't exist.
**Fix:** Ignore the error until lesson 004 runs `pnpm install`. Alternatively, run `pnpm exec svelte-kit sync` after install to regenerate. This file is a build artifact, not a source file — it is gitignored.

**Symptom:** `runes` compiler option rejected as unknown
**Cause:** An outdated Svelte 4 is installed locally or globally.
**Fix:** The scaffolder pins Svelte `^5.55.2` in `package.json`. Inspect the file; if it shows `^4.x`, your scaffolder version is stale. Run with `pnpm dlx sv@latest create .` to force the latest CLI.

## Verify

Inspect the scaffolded surface before committing:

```bash
ls -1 src src/lib src/routes
```

Expected output:
```
src:
app.d.ts
app.html
lib
routes

src/lib:
assets
index.ts

src/routes:
+layout.svelte
+page.svelte
```

Confirm runes mode is forced in `svelte.config.js`:

```bash
grep -n "runes:" svelte.config.js
```

Expected: one matching line inside `compilerOptions`, gating on `filename`.

Confirm `tsconfig.json` is extending the generated SvelteKit config and running strict:

```bash
grep -E '"extends"|"strict"' tsconfig.json
```

Expected:
```
"extends": "./.svelte-kit/tsconfig.json",
"strict": true,
```

Confirm the scaffold's package.json has the four baseline scripts:

```bash
grep -E '"dev"|"build"|"preview"|"check"' package.json
```

Expected: four matching lines. (No `lint`, `test`, or `db:*` scripts yet — those arrive in later lessons when their tooling is installed.)

## Mistake log — things that went wrong the first time I did this

- **Ran `pnpm create svelte@latest forgeschool` instead of `pnpm create svelte@latest .`** This created a nested `forgeschool/forgeschool/` folder. Nothing was lost — I moved the scaffolded files up one level and removed the empty nested directory. The `.` argument scaffolds into the current directory.
- **Clicked through the TypeScript prompt too fast and picked "JSDoc comments" instead of "TypeScript syntax".** The JSDoc option generates `.js` files with `@type` annotations, which is not the ergonomic story Svelte 5 assumes. Restarted the scaffolder and picked TypeScript syntax. If you did the same, delete the scaffold and rerun — the two modes don't mix cleanly.
- **Forgot to accept the `.gitignore` append.** My `.gitignore` from lesson 002 didn't include `.output/`, `.vercel/`, `.netlify/`, `.wrangler/`, or the Vite timestamp files. The scaffolder appends those. Confirmed they were added by running `git diff .gitignore`. All scaffold-added rules are correct for a production SvelteKit repo and we keep them.
- **Tried to run `pnpm dev` immediately.** Fails because `node_modules` doesn't exist yet. This is intentional — lesson 004 installs dependencies with pnpm locked as the package manager. Running `pnpm install` now would install them before the lock is in place, letting a future contributor accidentally use npm or yarn.

## Commit this change

```bash
git add .
git commit -m "feat(scaffold): bootstrap SvelteKit skeleton + lesson 003

- Scaffolds SvelteKit 2 with Svelte 5 runes mode, TypeScript strict
- Adds package.json, svelte.config.js, vite.config.ts, tsconfig.json, .npmrc
- Adds src/ skeleton (app.html, app.d.ts, routes, lib, favicon)
- Adds static/robots.txt allow-all crawl policy
- Merges scaffolder additions into .gitignore and README.md
- Authors curriculum/module-01-foundation/lesson-003-scaffold-sveltekit.md"
```

With the skeleton in place, lesson 004 locks pnpm as the only permitted package manager — before the first `pnpm install` runs — so npm and yarn can never quietly create a parallel lockfile.
