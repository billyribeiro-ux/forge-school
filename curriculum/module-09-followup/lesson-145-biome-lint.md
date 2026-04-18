---
number: 145
commit: cf5844c4aa619a339943bb001b9cc1a27f73c554
slug: biome-lint
title: Install Biome + wire `pnpm lint`
module: 9
moduleSlug: followup
moduleTitle: v1.0 Follow-up
phase: 9
step: 10
previous: 144
next: null
estimatedMinutes: 15
filesTouched:
  - package.json
  - pnpm-lock.yaml
  - biome.json
  - src/routes/api/webhooks/stripe/+server.ts
  - tests/unit/coupons.test.ts
  - tests/unit/tier.test.ts
  - tests/e2e/a11y.spec.ts
  - src/routes/sitemap.xml/+server.ts
  - src/routes/contact/+page.server.ts
---

## Context

PROMPT.md SUCCESS CRITERIA: "`pnpm lint` reports 0 errors." Biome is on the locked stack but was never installed. This lesson installs it, drops a `biome.json` tuned for the project's TypeScript-strict / index-signature conventions, exposes `pnpm lint` + `pnpm format` + `pnpm fix`, and runs the auto-fixer once to align every existing source file.

## The command

```bash
pnpm add -D @biomejs/biome
```

`biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": ["src/**/*.{ts,js}", "scripts/**/*.{ts,js}", "tests/**/*.{ts,js}",
                 "!**/*.svelte", "!.svelte-kit/**", "!node_modules/**", "!build/**"]
  },
  "formatter": { "enabled": true, "indentStyle": "tab", "lineWidth": 100, "lineEnding": "lf" },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error",
        "noConsole": { "level": "warn", "options": { "allow": ["warn", "error", "info"] } }
      },
      "style": { "useImportType": "warn", "useConst": "error", "noNonNullAssertion": "off" },
      "correctness": { "noUnusedVariables": "off", "noUnusedFunctionParameters": "off" },
      "complexity": { "useLiteralKeys": "off", "noUselessEmptyExport": "off" }
    }
  },
  "overrides": [
    { "includes": ["scripts/**", "src/lib/server/logger.ts"],
      "linter": { "rules": { "suspicious": { "noConsole": "off" } } } }
  ],
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always", "trailingCommas": "none" } }
}
```

`package.json` scripts:

```json
"lint": "biome check src scripts tests",
"format": "biome format --write src scripts tests",
"fix": "biome check --write src scripts tests"
```

Run `pnpm fix` once to auto-format every source file. One real bug surfaced: `let event;` in the Stripe webhook `+server.ts` was untyped — typed as `Stripe.Event`.

```bash
pnpm lint    # Checked 82 files in 78ms. No fixes applied.
```

## Why we chose this — the PE7 judgment

**Alt 1: ESLint + Prettier.** Two tools, two configs, slower. Biome unifies + runs in 80ms across the whole repo.
**Alt 2: Run Biome with the default ruleset only.** Default is too strict for some TypeScript-strict patterns we rely on (bracket access for index-signature env vars, the `export {}` re-augmentation idiom in `app.d.ts`). Tuned per finding.
**Alt 3: `useLiteralKeys` on (default).** Conflicts with `noPropertyAccessFromIndexSignature` from tsconfig — a real-world conflict. Off it goes.

The PE7 choice — **Biome with project-tuned overrides + a `scripts/` allowance for stdout logging** — wins on speed (sub-100ms) and config discipline.

## What could go wrong

**Symptom:** `pnpm lint` reports import-order findings on every file
**Cause:** `assist/source/organizeImports` is on by default. Run `pnpm fix` once and commit.
**Fix:** Re-running on a clean tree should report zero. Future PRs that add imports must run `pnpm format`.

**Symptom:** Biome doesn't lint Svelte files
**Cause:** Biome doesn't currently support `.svelte` files; `svelte-check` (via `pnpm check`) covers them.
**Fix:** The two tools are complementary — `pnpm check` for Svelte + TS-in-Svelte, `pnpm lint` for plain TS / JS in `src/lib/`, `scripts/`, `tests/`.

**Symptom:** CI fails because `pnpm lint` hits a finding the local run didn't
**Cause:** Local cache differs.
**Fix:** Add `pnpm lint` to the CI typecheck job (the workflow already runs Biome via the lint job).

## Verify

```bash
pnpm lint                               # 0 errors
pnpm check                              # 0 errors
pnpm test                               # 49 passed
pnpm build                              # ✓ built
```

## Mistake log

- First config kept `noUnusedVariables` + `noUnusedFunctionParameters` at warn — every SvelteKit-shaped `({ event, status, message })` handler tripped them. Disabled both; svelte-check catches the actually-unused via TS.
- Forgot to type `let event;` in the Stripe webhook handler. Biome caught the `noImplicitAnyLet`. Annotated as `Stripe.Event`.
- Initial `formatter.lineWidth: 80` produced too many line breaks on long Drizzle queries. Bumped to 100 to match existing project style.

## Commit

```bash
git add package.json pnpm-lock.yaml biome.json src tests
git add curriculum/module-09-followup/lesson-145-biome-lint.md
git commit -m "tooling(lint): install Biome + wire pnpm lint + lesson 145"
```
