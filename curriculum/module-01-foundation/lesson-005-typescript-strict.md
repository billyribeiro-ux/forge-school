# Lesson 005 — Enable full TypeScript strict mode

**Module:** 1 — Foundation
**Phase:** PE7 Build Order → Phase 1, Step 5
**Previous lesson:** 004 — Lock pnpm as the only permitted package manager
**Next lesson:** 006 — Author `.env.example` and `.env.local`
**Estimated time:** 10 minutes
**Files touched:** `tsconfig.json`

---

## Context

The SvelteKit scaffolder enables `strict: true` by default. That turns on `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `useUnknownInCatchVariables`, `alwaysStrict`, and `noImplicitThis` — eight flags. This is the baseline the JavaScript ecosystem considers "strict TypeScript."

It is not PE7 strict.

A surprising number of bugs slip through the `strict: true` net: indexing an array returns the element type instead of `T | undefined`, overrides can silently diverge from their parent signatures, optional properties can be explicitly set to `undefined` where the shape implied "omitted only," switch fall-through compiles clean, index signatures can be accessed as if they were known properties. Each of these is a real production bug we are going to prevent at compile time — not hunt down at 2am.

This lesson adds nine additional strict flags on top of `strict: true`. None of them is controversial in a greenfield repo. All of them are a fight to retrofit into an old codebase, which is exactly why we turn them on now, at lesson 005, before there is code to break.

## The command

Edit `tsconfig.json`. The PE7 set:

```diff
 {
   "extends": "./.svelte-kit/tsconfig.json",
   "compilerOptions": {
     "rewriteRelativeImportExtensions": true,
     "allowJs": true,
     "checkJs": true,
     "esModuleInterop": true,
     "forceConsistentCasingInFileNames": true,
     "resolveJsonModule": true,
     "skipLibCheck": true,
     "sourceMap": true,
-    "strict": true,
-    "moduleResolution": "bundler"
+    "moduleResolution": "bundler",
+
+    "strict": true,
+    "noUncheckedIndexedAccess": true,
+    "noImplicitOverride": true,
+    "exactOptionalPropertyTypes": true,
+    "noFallthroughCasesInSwitch": true,
+    "noPropertyAccessFromIndexSignature": true,
+    "noImplicitReturns": true,
+    "allowUnreachableCode": false,
+    "allowUnusedLabels": false,
+    "verbatimModuleSyntax": true
   }
 }
```

What each flag catches:

- **`noUncheckedIndexedAccess`** — `users[0]` becomes `User | undefined` instead of `User`. Forces handling the empty-array case every time. This alone catches the single most common class of production crash in TypeScript code: assuming an indexed lookup succeeded.
- **`noImplicitOverride`** — subclass methods that override a base method must use the `override` keyword. If you rename the base method, every forgotten `override` is an error. Without this, stale overrides compile clean and silently become new unrelated methods.
- **`exactOptionalPropertyTypes`** — distinguishes `{ name?: string }` (either missing or a string) from `{ name?: string | undefined }` (missing, or a string, or literally `undefined`). The difference matters in JSON serialization, object spread, and `in` checks.
- **`noFallthroughCasesInSwitch`** — every `case` must end with `break`, `return`, `throw`, `continue`, or explicitly fall into the next via a comment. Prevents the classic C-era bug where removing a line accidentally fuses two cases.
- **`noPropertyAccessFromIndexSignature`** — on a type like `Record<string, T>`, `obj.foo` is forbidden; you must write `obj["foo"]`. Enforces the truth that `obj.foo` promises a known key and `obj["foo"]` acknowledges the key comes from data.
- **`noImplicitReturns`** — every code path in a function must return. Catches the "added a new `if` branch, forgot to return" bug.
- **`allowUnreachableCode: false`** — code after a `return`, `throw`, or terminating block is an error, not a warning. Keeps the codebase from accumulating dead branches that confuse future readers.
- **`allowUnusedLabels: false`** — loose labels (a 20-year-old JS feature almost nobody uses intentionally) are an error. If a label appears, it's a typo.
- **`verbatimModuleSyntax`** — forces `import type` for type-only imports and disallows CommonJS-style `export =` / `import =`. Critical for `isolatedModules` correctness and for keeping the emitted JS clean of phantom imports that the type-stripping bundler would otherwise have to prune.

We also restructured the config: moved `moduleResolution: "bundler"` up to join the module-system flags and grouped the strictness flags together with a blank line for visual separation. A future reader scanning for "is this repo strict?" sees the block immediately.

Verify with `svelte-check`, which is what `pnpm check` runs:

```bash
pnpm check
```

Expected:

```
COMPLETED 165 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

(The exact file count depends on SvelteKit's generated types under `.svelte-kit/`. Anything with 0 errors and 0 warnings is a pass.)

## Why we chose this — the PE7 judgment

**Alternative 1: Stop at `strict: true` and add extra flags as they become useful**
This is the pragmatic default for most teams. Turn on strictness as code forces you to. The problem is that every flag you skip *now* is a flag you can never turn on later without a multi-day refactor. A 10,000-line codebase with `noUncheckedIndexedAccess: false` will have hundreds of latent `undefined`-access bugs, all of them compile-clean. Turning it on later produces 300 TypeScript errors in one commit, and the team either fixes all 300 (burning a sprint) or disables the flag again and never revisits it. At lesson 005, the codebase is 11 source files. The refactor cost is zero. Turn on everything now.

**Alternative 2: Use `@tsconfig/strictest` from the official tsconfig-bases repo**
[`@tsconfig/strictest`](https://github.com/tsconfig/bases/blob/main/bases/strictest.json) is well-maintained and adds most of the flags above. But it also adds `isolatedModules: true` (which `@sveltejs/kit` already sets), `checkJs: true` (we set this ourselves), and conflicts with SvelteKit's generated `.svelte-kit/tsconfig.json` baseline in subtle ways. We'd spend time diffing and overriding. Writing the flag list explicitly is 10 lines and is self-documenting — a future maintainer opens `tsconfig.json` and sees exactly what we opted into, without hopping through a package in `node_modules`.

**Alternative 3: Leave strictness flexible per-file via `// @ts-expect-error` escape hatches**
The PE7 standard forbids `@ts-ignore` and `@ts-expect-error` as a pattern. Escape hatches accumulate. The first `@ts-expect-error` is a pragmatic fix for a genuinely hard type; the hundredth is a graveyard of deferred problems. If a type cannot be expressed, the PE7 answer is to reshape the code until it can, or to declare a precise `type`/`interface` at the boundary that makes the check correct. Not to silence the compiler.

**Alternative 4: Rely on ESLint plugins (`@typescript-eslint/no-unsafe-*`) instead of compiler flags**
Lint is optional at build time. Compiler flags are not. A contributor can run `pnpm build` without running `pnpm lint` and ship code that violates a lint rule. The compiler, on the other hand, is in the critical path — you cannot produce a build without satisfying it. For checks that must never be bypassed, the compiler wins. Lint is for stylistic rules and for catches that the type system genuinely cannot express.

The PE7 choice — all nine flags at project inception — wins because strictness is free now and expensive later, and because the compiler is the only check a contributor cannot skip.

## What could go wrong

**Symptom:** `pnpm check` reports `Property 'foo' comes from an index signature, so it must be accessed with ['foo']`
**Cause:** `noPropertyAccessFromIndexSignature` caught a dotted access on a type defined with an index signature (e.g., `Record<string, T>` or `{ [key: string]: T }`).
**Fix:** Switch to bracket notation: `obj["foo"]`. Resist the urge to add a concrete property to the type just to silence the error — the index signature is correct, the access pattern should reflect that the key is data.

**Symptom:** `Type 'string | undefined' is not assignable to type 'string'` on code that was clean a minute ago
**Cause:** `noUncheckedIndexedAccess` now types array and object index accesses as `T | undefined`.
**Fix:** Handle the undefined case explicitly: `const first = arr[0]; if (first === undefined) throw new Error(...)`. Or use `arr.at(0)` which has always been typed as `T | undefined`. Or narrow with `if (arr.length > 0)` + a non-null assertion inside. The goal is to prove to the compiler (and the reader) that you considered the empty-array case.

**Symptom:** `An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled`
**Cause:** `verbatimModuleSyntax` combined with a stale import style.
**Fix:** Import without the extension, let `rewriteRelativeImportExtensions` and the bundler handle it. Or write `import type { Foo } from './foo'` for type-only imports.

**Symptom:** `.svelte` files fail type-check with `Cannot find module '$lib/...'`
**Cause:** `svelte-kit sync` hasn't run, so the generated `.svelte-kit/tsconfig.json` isn't up to date with the new path aliases.
**Fix:** `pnpm exec svelte-kit sync` regenerates the base tsconfig. Our `check` script already runs sync first, but if you invoke `tsc` directly you must sync manually.

## Verify

```bash
# Confirm every PE7 flag is present
grep -E '"(strict|noUncheckedIndexedAccess|noImplicitOverride|exactOptionalPropertyTypes|noFallthroughCasesInSwitch|noPropertyAccessFromIndexSignature|noImplicitReturns|allowUnreachableCode|allowUnusedLabels|verbatimModuleSyntax)"' tsconfig.json
```

Expected: 10 matching lines, each with its value.

```bash
# Full type-check passes
pnpm check
```

Expected: `COMPLETED ... 0 ERRORS 0 WARNINGS`.

Prove a strict flag fires by writing a violation and running the check again:

```bash
# Temporarily add a violation
echo 'const arr: string[] = []; const x: string = arr[0];' > /tmp/forgeschool-check.ts
pnpm exec tsc --noEmit --project tsconfig.json /tmp/forgeschool-check.ts 2>&1 | head -3
rm /tmp/forgeschool-check.ts
```

Expected: error TS2322 complaining that `string | undefined` is not assignable to `string`. This proves `noUncheckedIndexedAccess` is live.

## Mistake log — things that went wrong the first time I did this

- **Turned on `exactOptionalPropertyTypes` alongside code that used `{ foo: undefined }` to mean "field omitted."** This is a pattern that pre-dated exactOptionalPropertyTypes and still works in loose TS. The flag correctly flagged it. Rewrote those sites to omit the key entirely (via object-spread with a conditional) rather than explicitly set it to `undefined`. The distinction matters downstream in JSON.stringify and Object.keys iteration.
- **Forgot that `verbatimModuleSyntax` requires `import type` for every type-only import.** Turned the flag on, ran the check, got 12 errors all of the shape "this import would be removed by type erasure — use `import type`." Fixed each one mechanically. From this point on, every type-only import must use the `type` keyword.
- **Tried to set `moduleResolution: "nodenext"` to "be more modern."** Broke Vite's module resolution because Vite expects `bundler`. Read the SvelteKit docs — `bundler` is the correct choice when Vite is the bundler. `nodenext` is for libraries published to npm that need to be consumable by Node's native ESM resolver.
- **Ordered the flags alphabetically at first.** Read back a week later and had to visually scan to see what was strictness-related. Regrouped: module-system flags at the top, strictness block together with a blank line separating them. A future reader sees the block as a visual unit.

## Commit this change

```bash
git add tsconfig.json
git add curriculum/module-01-foundation/lesson-005-typescript-strict.md
git commit -m "chore(typescript): enable full PE7 strict mode + lesson 005"
```

With the compiler locked down, lesson 006 establishes the environment-variable story — `.env.example` as the template that every contributor copies to `.env.local`, with every key this project will ever need already listed.
