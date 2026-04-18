---
number: 86
slug: admin-shell
title: Build an admin shell behind a feature flag
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 24
previous: 85
next: null
estimatedMinutes: 15
filesTouched:
  - .env.example
  - src/routes/admin/+layout.server.ts
  - src/routes/admin/+layout.svelte
  - src/routes/admin/+page.svelte
---

## Context

The v1 of ForgeSchool is authless. A real admin UI needs auth — not before. But Billy still wants a scratchpad for peeking at counts during local development: "how many products are in my DB after this seed?" — without opening `psql` or Drizzle Studio every time.

`/admin` is that scratchpad. Two guards gate it:

1. **`dev` from `$app/environment`** — the route is unconditionally 404 in production, period.
2. **`ENABLE_ADMIN_SHELL="true"` env flag** — even in dev, you have to opt in.

Both must pass or the layout `error(404, …)`s. No auth, no `401`, nothing that leaks existence. A production visitor to `/admin` gets a plain route-not-found.

When auth lands in a future module series, this gate flips to a role check; the feature-flag scaffolding makes the gate's expansion seam obvious.

## The command

`.env.example` — add the flag:

```bash
ENABLE_ADMIN_SHELL="false"
```

`src/routes/admin/+layout.server.ts`:

```ts
import { dev } from '$app/environment';
import { ENABLE_ADMIN_SHELL } from '$env/static/private';
export const load: LayoutServerLoad = async () => {
  if (!dev) error(404, { message: 'Not found', errorId: 'admin-not-in-prod' });
  if (ENABLE_ADMIN_SHELL !== 'true') error(404, { message: 'Not found', errorId: 'admin-flag-off' });

  const [[productCount], [couponCount], [orderCount], [subscriptionCount]] = await Promise.all([
    db.select({ n: count() }).from(products),
    db.select({ n: count() }).from(coupons),
    db.select({ n: count() }).from(orders),
    db.select({ n: count() }).from(subscriptions)
  ]);

  return { counts: { products: productCount?.n ?? 0, coupons: couponCount?.n ?? 0, orders: orderCount?.n ?? 0, subscriptions: subscriptionCount?.n ?? 0 } };
};
```

`+layout.svelte` — yellow DEV-MODE banner + sidebar with stub links (Products / Coupons / Orders / Subscriptions). Each sidebar stub is intentionally a `<span>`, not a link: these deep-link surfaces land when auth ships.

`+page.svelte` — a 4-card grid rendering the counts.

```bash
pnpm check
pnpm build
```

## Why we chose this — the PE7 judgment

**Alternative 1: Wait for auth to build admin.**
Delays a useful dev tool for months. The feature-flag gate ships the tool today with a clean upgrade seam for later.

**Alternative 2: Use a dynamic import gated by `if (dev)` so prod bundles don't even contain the admin code.**
Better for prod code size, but the current gate (error 404 + layout server guard) keeps the route dead. If profiling shows admin code bloats the prod bundle, revisit with `if (dev)` at the route definition.

**Alternative 3: Guard with a password in the env, not a flag.**
Passwords belong in auth systems. A boolean flag matches the state ("is this turned on?") without pretending to be security.

**Alternative 4: Return `error(401, …)` instead of `404`.**
Leaks the route's existence — an attacker probing `/admin` learns it's there. 404 is the secrecy-preserving choice.

The PE7 choice — **two-layer gate (env + flag), 404 on any failure, dev-only** — wins on secrecy, simplicity, and expandability.

## What could go wrong

**Symptom:** `/admin` returns 404 in dev even with `ENABLE_ADMIN_SHELL="true"`
**Cause:** `.env.local` not reloaded — Vite's dev server only reads env on startup.
**Fix:** Restart `pnpm dev`.

**Symptom:** `pnpm build` emits a TS error `'ENABLE_ADMIN_SHELL' has no exported member`
**Cause:** Key exists in `.env.local` but not in the root `.env` (which SvelteKit type-checks against).
**Fix:** Adding the key to `.env.example` and copying to `.env.local` is sufficient in a fresh clone. SvelteKit emits `$env/static/private` typings from the running `.env*` files — make sure a restart happens.

**Symptom:** In prod the 404 fires but the layout still flashes before the error handler takes over
**Cause:** SSR builds the layout tree, then errors inside load. The generated HTML never reaches the browser.
**Fix:** Expected behaviour. The user sees the app's standard 404 page only.

## Verify

```bash
pnpm check
pnpm build
pnpm dev
# Visit /admin — dashboard loads.
# Set ENABLE_ADMIN_SHELL="false", restart, visit /admin — 404.
```

## Mistake log

- **Wrote `if (dev === false)` as `if (!dev)`** — trivial, but the explicit form reads cleaner. Stuck with the explicit form for the 404-in-prod guard to emphasize intent.
- **Used `process.env.ENABLE_ADMIN_SHELL`** — wrong in SvelteKit. `$env/static/private` is the SvelteKit way, and it type-checks at build time.
- **Didn't add `<meta name="robots" content="noindex">`** — search engines should never crawl `/admin` even if it accidentally ships. Added.

## Commit

```bash
git add .env.example src/routes/admin/
git add curriculum/module-05-product/lesson-086-admin-shell.md
git commit -m "feat(admin): feature-flag-gated admin shell + lesson 086"
```
