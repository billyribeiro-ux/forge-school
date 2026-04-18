---
number: 4
slug: lock-pnpm
title: Lock pnpm as the only permitted package manager
module: 1
moduleSlug: foundation
moduleTitle: Foundation
phase: 1
step: 4
previous: 3
next: 5
estimatedMinutes: 8
filesTouched:
  - package.json
  - .npmrc
  - pnpm-workspace.yaml
---

## Context

Lesson 003 produced a SvelteKit skeleton. Before we run `pnpm install` and create the first `pnpm-lock.yaml`, we lock pnpm as the only permitted package manager. This has to happen *before* the first install — otherwise a future contributor can run `npm install` on a clean checkout, produce a `package-lock.json` that resolves a different dependency tree, and introduce the subtle class of bugs where CI green but local is red (or vice versa) because two different lockfiles disagree on which transitive version of a shared dependency to resolve.

We use three mechanisms together because defence in depth beats any single mechanism:

1. **`packageManager` field** in `package.json` — a Node.js standard (via Corepack) that declares which tool and version manage this repo.
2. **`engines` field** — declares the minimum Node and pnpm versions the repo supports, enforced by `engine-strict=true`.
3. **`preinstall` script** invoking [`only-allow`](https://github.com/pnpm/only-allow) — fails the install with a clear error message if anyone runs `npm install` or `yarn install`.
4. **`.npmrc` flags** — `package-manager-strict=true` and `package-manager-strict-version=true` make pnpm itself refuse to install when the local pnpm version doesn't match `packageManager`.
5. **`pnpm-workspace.yaml`** — declares this directory as its own workspace root so pnpm never walks up the filesystem and accidentally adopts a parent workspace config, which silently breaks installs with no output.

This lesson produces a repo that is hostile to the wrong tool and friendly to the right one.

## The command

Edit `package.json`. Add `packageManager`, `engines`, and a `preinstall` script:

```diff
 {
   "name": "forgeschool",
   "private": true,
   "version": "0.0.1",
   "type": "module",
+  "packageManager": "pnpm@10.7.0",
+  "engines": {
+    "node": ">=22.11.0",
+    "pnpm": ">=10.0.0"
+  },
   "scripts": {
+    "preinstall": "npx -y only-allow pnpm",
     "dev": "vite dev",
```

Edit `.npmrc`. Add three pnpm-strict flags on top of the existing `engine-strict`:

```diff
 engine-strict=true
+package-manager-strict=true
+package-manager-strict-version=true
+auto-install-peers=true
```

Create `pnpm-workspace.yaml` at the repo root to declare this as a standalone workspace:

```yaml
# Declares forgeschool as its own workspace root so pnpm never walks up
# the filesystem and adopts a parent pnpm-workspace.yaml. This repo is a
# single package, not a monorepo — `packages` is intentionally empty.
packages: []
```

That's the entire change — three files. Now run the first install:

```bash
pnpm install
```

Expected first-line of output:

```
Lockfile is up to date, resolution step is skipped
```

(or, on the very first install, `Packages are hard linked from the content-addressable store` followed by dependency resolution). When the install finishes, `pnpm-lock.yaml` appears in the repo and `node_modules/` is populated.

**What the four mechanisms actually do, each on its own:**

- **`packageManager: "pnpm@10.7.0"`** — Read by Corepack (shipped with Node 16.9+) to download and exec the exact pnpm version when any `pnpm` command is invoked. Also read by `package-manager-strict-version=true` to refuse to proceed if the active pnpm binary doesn't match.
- **`engines.node`** — Combined with `engine-strict=true`, pnpm refuses to install on Node < 22.11. A developer on Node 18 hits a hard stop with a clear error, not a mysterious runtime failure three weeks in.
- **`preinstall: "npx -y only-allow pnpm"`** — When someone runs `npm install`, npm executes the `preinstall` script first. `only-allow pnpm` checks the invoking user agent and exits with a loud error if it's not pnpm. This is the belt-and-suspenders guard for humans who ignore docs.
- **`auto-install-peers=true`** — Separate concern but related hygiene. With peer dependencies auto-installed, we never ship a repo where `pnpm install` succeeds but the app fails at runtime because a peer wasn't explicitly added. Every package's peer requirements are satisfied.

## Why we chose this — the PE7 judgment

**Alternative 1: Document "use pnpm" in the README and trust contributors**
This relies on humans reading docs. Pre-release contributors — and future you at 2am after a long weekend — will run `npm install` out of muscle memory. When that happens, a `package-lock.json` gets committed, CI runs against a different resolution tree than local, and the resulting divergence is catastrophic because symptoms appear at runtime, not install time. Documentation is a request. Enforcement is a guarantee. For a 10-year repo, we enforce.

**Alternative 2: Use only `packageManager` (Corepack) without `only-allow`**
Corepack is the official Node.js story, and on a machine with Corepack enabled it transparently selects the right pnpm version. But Corepack is *disabled by default* on most Node installations in 2026, and on a machine without it, `packageManager` is ignored. `only-allow` works regardless of Corepack state because it runs as a script, not a shell lookup. We want the enforcement to work on day-one for every developer, regardless of how they configured their machine.

**Alternative 3: Use only `only-allow` without `packageManager` or `engines`**
`only-allow` blocks the wrong tool but doesn't specify which pnpm version to use. That means two developers on the same repo can be running pnpm 8 and pnpm 10, producing lockfile format drift. The `packageManager` field pins the version. The `engines` field puts a floor under it. Together, the repo is deterministic across machines and time.

**Alternative 4: Use a different package manager — npm, yarn, bun**
npm is universal but ~3-5× slower than pnpm for cold installs, uses ~10× the disk space per repo, and its peer-dependency handling is lax enough to produce subtle runtime failures in monorepo-adjacent setups. Yarn v1 is archived; Yarn v4 (berry) uses a Plug'n'Play resolution by default that fights half the tooling ecosystem — Vitest, some Svelte preprocessors, a long tail of TypeScript tooling all need escape hatches. Bun's install is fast but it's still a moving target for production-grade compatibility with SvelteKit's server-side code paths, and the `bun` binary's runtime diverges from Node in ways that matter when we ship. pnpm is the Goldilocks choice: fast, disk-efficient via its content-addressable store, strict-by-default peer resolution, and compatible with every tool in our locked stack.

The PE7 choice — pnpm locked four ways — wins because the wrong tool is physically refused, the right version is pinned, and there's no ambiguity for the next contributor in 2028.

## What could go wrong

**Symptom:** `pnpm install` fails with `Unsupported engine` complaining about Node version
**Cause:** Local Node is older than `22.11.0` and `engine-strict=true` is honoring the engines field.
**Fix:** Install Node 22 LTS (`nvm install 22` or `fnm install 22`). If you legitimately need a different Node version for another project, use `nvm`/`fnm`/`volta` to switch per-repo — don't loosen the engines field.

**Symptom:** `npm install` runs successfully and creates `package-lock.json`
**Cause:** The `preinstall` script didn't execute, usually because the user ran `npm install --ignore-scripts`.
**Fix:** There is no runtime defense against `--ignore-scripts`. The remaining layer is social: delete `package-lock.json` immediately, run `pnpm install` to regenerate `pnpm-lock.yaml`, and write a PR-template check that rejects commits containing `package-lock.json` or `yarn.lock`.

**Symptom:** `pnpm install` prints `This repo uses pnpm@10.7.0 but you have pnpm@9.x installed`
**Cause:** `package-manager-strict-version=true` is refusing because local pnpm doesn't match.
**Fix:** Either run with Corepack enabled (`corepack enable`) which auto-downloads the pinned version, or `pnpm self-update 10.7.0` to match. Do not comment out the strict flag.

**Symptom:** CI fails with `Cannot find module '@sveltejs/kit'` even though install succeeded
**Cause:** On CI, `auto-install-peers=true` needs the lockfile to be up to date. If a peer was added without regenerating the lockfile, CI won't install it.
**Fix:** Regenerate locally with `pnpm install --lockfile-only`, commit the updated `pnpm-lock.yaml`, and re-push.

## Verify

Confirm every guard is in place:

```bash
# packageManager pinned
grep '"packageManager"' package.json
```
Expected: `"packageManager": "pnpm@10.7.0",`

```bash
# preinstall script present
grep '"preinstall"' package.json
```
Expected: `"preinstall": "npx -y only-allow pnpm",`

```bash
# engines declared
grep -A2 '"engines"' package.json
```
Expected: node and pnpm version minimums listed.

```bash
# .npmrc strict flags
cat .npmrc
```
Expected: four lines — `engine-strict`, `package-manager-strict`, `package-manager-strict-version`, `auto-install-peers`, all set to true.

Attempt the blocked path to confirm the guard fires:

```bash
npm install
```

Expected: npm starts, then the `preinstall` script runs and `only-allow` exits non-zero with a message pointing at pnpm. `package-lock.json` should NOT be created. If it was created anyway (older npm versions run preinstall after partial resolution), delete it and do not commit.

Now run the permitted path:

```bash
pnpm install
```

Expected: install succeeds, `pnpm-lock.yaml` is created, `node_modules/` populates.

```bash
# Lockfile present
ls -la pnpm-lock.yaml
```
Expected: file exists.

## Mistake log — things that went wrong the first time I did this

- **Forgot the `-y` flag on `npx only-allow pnpm`.** npx prompted for confirmation the first time only-allow ran, hanging the install in CI. Added `-y` so npx downloads and runs without asking.
- **Pinned pnpm to an exact patch version I didn't verify existed.** First draft had `pnpm@10.99.99` as a placeholder. When install ran, Corepack fetched 404 and errored. Double-check the version exists on the pnpm releases page before committing — `pnpm@10.7.0` is a real release; `pnpm@10.99.99` is not.
- **Set `"engines": { "node": "22" }`.** pnpm reads this as "must start with 22" but npm reads it as ">=22" — lax, producing divergence across tools. Switched to explicit semver range `">=22.11.0"` which every tool interprets consistently.
- **Deleted `package-lock.json` but forgot to regenerate with pnpm.** Left the repo with no lockfile at all, which meant CI resolved a different dependency tree than local. Regenerating with `pnpm install` produces `pnpm-lock.yaml`, which must be committed.
- **`pnpm install` succeeded with "Done in 131ms" but produced no `node_modules` or lockfile.** pnpm had discovered a `pnpm-workspace.yaml` somewhere above this directory (in my case, `$HOME/pnpm-workspace.yaml` from another project's scaffold) and was treating forgeschool as a leaf of that other workspace — where this package didn't match the workspace filter, so it skipped installation without error. The silent-success failure mode is particularly nasty because nothing in the output flags a problem. Fix: add a local `pnpm-workspace.yaml` with `packages: []`, which halts pnpm's upward walk. Verified by deleting `node_modules` + lockfile and rerunning `pnpm install` — packages resolve and install in 2.5s.

## Commit this change

```bash
git add package.json .npmrc pnpm-workspace.yaml pnpm-lock.yaml
git add curriculum/module-01-foundation/lesson-004-lock-pnpm.md
git commit -m "chore(pnpm): lock pnpm as only permitted package manager + lesson 004"
```

With pnpm locked, lesson 005 tightens `tsconfig.json` from the scaffolder's `strict: true` baseline to full PE7 strictness — the set of flags that catch the category of bug where `obj[key]` silently returns `undefined` in production.
