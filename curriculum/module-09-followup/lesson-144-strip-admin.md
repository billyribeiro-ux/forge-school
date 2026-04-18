---
number: 144
slug: strip-admin
title: Strip /admin from the production bundle via a Vite plugin
module: 9
moduleSlug: followup
moduleTitle: v1.0 Follow-up
phase: 9
step: 9
previous: 143
next: null
estimatedMinutes: 15
filesTouched:
  - vite.config.ts
---

## Context

PROMPT.md SUCCESS CRITERIA: "Dev routes absent from production bundle." Lesson 086 ships /admin behind two runtime gates (`dev` + `ENABLE_ADMIN_SHELL`). Both 404 in production — but the route's CODE still compiles into the production bundle. This lesson closes the gap with a tiny Vite plugin that replaces the admin route's modules with empty stubs at build time when `NODE_ENV === 'production'`.

Tree-shake-friendly: the stub imports nothing, so Vite drops every transitive admin import along with it. Net result: `grep ENABLE_ADMIN_SHELL .svelte-kit/output/server/chunks/*.js` returns nothing in a production build.

## The command

`vite.config.ts`:

```ts
import type { Plugin } from 'vite';

function stripAdminInProd(): Plugin {
  const STUB = `import { error } from '@sveltejs/kit';
export const load = () => error(404, { message: 'Not found', errorId: 'admin-stripped' });
`;
  return {
    name: 'forgeschool:strip-admin-in-prod',
    apply: 'build',
    enforce: 'pre',
    load(id) {
      if (process.env['NODE_ENV'] !== 'production') return null;
      if (!id.includes('/src/routes/admin/')) return null;
      if (id.endsWith('+layout.server.ts')) return STUB;
      if (id.endsWith('+page.svelte') || id.endsWith('+layout.svelte')) {
        return '<!-- stripped admin route -->\n';
      }
      return null;
    }
  };
}

export default defineConfig({
  plugins: [stripAdminInProd(), enhancedImages(), sveltekit()]
});
```

```bash
pnpm build
grep -l "ENABLE_ADMIN_SHELL" .svelte-kit/output/server/chunks/*.js   # only curriculum.js (lesson markdown)
```

## Why we chose this — the PE7 judgment

**Alt 1: Maintain a separate `src/routes-prod/` directory and swap `kit.files.routes` based on `NODE_ENV`.** Doubles route maintenance (every shared route must exist in both folders).
**Alt 2: Move /admin under `src/routes/dev/` and use a route-group conditional.** SvelteKit doesn't conditionally drop route groups — they're compiled regardless.
**Alt 3: Live with the runtime 404 only.** The route returns 404 fine, but the code shipping inflates the bundle and exposes admin internals to anyone who downloads + greps the production output.
**Alt 4: Use `vite.build.rollupOptions.external`.** External works for dependencies, not for source files inside the project.

The PE7 choice — **a 30-line `apply: 'build'` Vite plugin** — wins because dev mode is untouched, the runtime gate from lesson 086 still fires for the rare paranoid case, and the prod bundle is provably admin-free.

## What could go wrong

**Symptom:** `pnpm dev` returns 404 on /admin
**Cause:** `apply: 'build'` should restrict the plugin to builds; if it runs in dev, the stub takes over.
**Fix:** The `apply: 'build'` field is the dev-mode bypass. Verified: dev still serves the real /admin layout.

**Symptom:** Other routes accidentally swept in
**Cause:** The path check uses `id.includes('/src/routes/admin/')` — admin is the only matching prefix.
**Fix:** If a future "admin-tools" route lands and should also be dev-only, extend the matcher.

**Symptom:** `+server.ts` endpoint under `/api/admin/` still ships
**Cause:** Filter only catches routes under `src/routes/admin/`. Endpoints under `src/routes/api/admin/` (none today) would need their own match.
**Fix:** Future-proof: change the matcher to include any path with `/admin/` segment, or add a complementary glob for `/api/admin/`.

## Verify

```bash
pnpm check                        # 0 errors
pnpm build                        # ✓ built (NODE_ENV=production by default)
grep -lE "ENABLE_ADMIN_SHELL" .svelte-kit/output/server/chunks/*.js
# Expected: only curriculum.js (which is lesson markdown referencing the constant by name).
```

## Mistake log

- First draft used `kit.files.routes = process.env.NODE_ENV === 'production' ? 'src/routes-prod' : 'src/routes'` — required a phantom `src/routes-prod` directory I'd have to keep in sync. Reverted.
- Forgot `enforce: 'pre'` — Vite's default plugin order let SvelteKit's built-in route loader read the original file before my stub took effect. `enforce: 'pre'` runs my plugin first.

## Commit

```bash
git add vite.config.ts svelte.config.js curriculum/module-09-followup/lesson-144-strip-admin.md
git commit -m "build(prod): strip /admin from production bundle via Vite plugin + lesson 144"
```
