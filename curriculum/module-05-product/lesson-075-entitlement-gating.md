---
number: 75
slug: entitlement-gating
title: Gate routes by tier via hooks.server.ts
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 13
previous: 74
next: null
estimatedMinutes: 20
filesTouched:
  - src/app.d.ts
  - src/hooks.server.ts
  - src/lib/server/entitlements/require-tier.ts
---

## Context

Every request now pre-computes two facts before the load function fires: the `sessionId` and the derived `tier`. Stashing them on `event.locals` means every downstream load can write `locals.tier === 'pro'` instead of re-querying the DB.

The gate itself is a one-liner: `requireTier(locals.tier, 'pro')` throws a `redirect(303, '/pricing')` when the caller isn't authorized. Routes that want to render an upgrade PROMPT (instead of redirecting) skip the helper and call `tierAtLeast(locals.tier, 'pro')` directly.

## The command

`src/app.d.ts` — declare `Locals`:

```ts
import type { Tier } from '$lib/entitlements/tier';
declare global {
  namespace App {
    interface Error { message: string; errorId: string }
    interface Locals { sessionId: string; tier: Tier }
  }
}
export {};
```

`src/hooks.server.ts` — resolve tier on every request:

```ts
export const handle: Handle = async ({ event, resolve }) => {
  const startedAt = performance.now();
  event.locals.sessionId = ensureSessionCookie(event.cookies);
  event.locals.tier = await getSessionTier(db, event.locals.sessionId);
  const response = await resolve(event);
  // …log as before
};
```

`src/lib/server/entitlements/require-tier.ts`:

```ts
export function requireTier(actual: Tier, required: Tier, opts: { upgradeTo?: string } = {}): void {
  if (tierAtLeast(actual, required)) return;
  redirect(303, opts.upgradeTo ?? '/pricing');
}
```

Gated route example (non-binding — the real usage lands on /course in lesson 080):

```ts
// src/routes/course/+page.server.ts
export const load = async ({ locals }) => {
  requireTier(locals.tier, 'pro', { upgradeTo: '/pricing?from=course' });
  // …
};
```

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alternative 1: Query the tier inside every gated load function.**
Each protected page pays one DB round-trip per request. At N protected routes in one navigation (SvelteKit can load layout + page in parallel), that's N queries. Hooks compute once, reuse N times.

**Alternative 2: Store the tier in the session cookie.**
Fast, but the cookie is user-writable. A crafted cookie would claim `tier=lifetime` and bypass the gate. Always derive tier server-side from the DB.

**Alternative 3: Put the gate in +layout.server.ts.**
Works, but the layout runs for every descendant route — gating /course via the (app) layout is fine, but scoping the hook's pre-compute at the HOOK layer means BOTH +layout.server.ts and +page.server.ts enjoy the pre-computed value without recomputing.

**Alternative 4: Middleware-style `event.locals.requireTier` method.**
Cute but obscures the call site. Explicit `requireTier(locals.tier, 'pro')` is greppable.

The PE7 choice — **hook computes once, explicit helper gates each route** — wins on call-site clarity and request-cost economy.

## What could go wrong

**Symptom:** Every request hits the DB for entitlement lookup
**Cause:** That's by design in v1 — Postgres is local and the query hits the indexed `entitlements_session_revoked_idx`. If it becomes a bottleneck, memoize per request via `event.locals` (already doing that) or cache per-session for 30s behind a read-through cache (not needed yet).

**Symptom:** `locals.tier` is undefined inside a `+server.ts` endpoint
**Cause:** Old endpoint written before this lesson isn't aware of the new `Locals` shape; TS flags the usage.
**Fix:** Redeclare / update the endpoint. Or: hook ALWAYS sets both fields, so the runtime value is always defined — the TS error is a reminder, not a runtime bug.

**Symptom:** Redirect loop on /pricing
**Cause:** `/pricing` itself called `requireTier(..., 'pro')` — circular.
**Fix:** Never gate a page whose purpose is to help the user upgrade. Gate only the downstream routes.

**Symptom:** Hook fires for static asset requests, wasting a DB query
**Cause:** SvelteKit runs hooks on every request including `/favicon.svg` (though SvelteKit's static asset resolver usually short-circuits before `handle`).
**Fix:** If profiling shows this matters, early-return when `event.route.id === null` (no matching route → static asset or 404).

## Verify

```bash
pnpm check
```

Once the meta-course routes (lessons 079–082) land, a manual smoke:

1. Clear the session cookie, hit `/course`.
2. Observe 303 to `/pricing`.
3. Purchase the lifetime product via the Stripe test flow.
4. Webhook grants the entitlement, cookie unchanged, refresh → `locals.tier` is now `'lifetime'`, `/course` renders.

## Mistake log

- **Declared `Locals` inline inside the hook file.** Svelte-kit reads the declaration from `src/app.d.ts`; inline declarations compile-locally but don't propagate to load functions. Moved to `app.d.ts`.
- **Put `ensureSessionCookie` AFTER `getSessionTier`.** The tier query needs the session id — had to re-order.
- **Used `throw redirect(...)` inside the helper and typed it `: never`.** SvelteKit's `redirect` helper is ALREADY typed `: never` when you call it without `throw`. Dropping the `throw` is the SvelteKit 2.x idiom.

## Commit

```bash
git add src/app.d.ts src/hooks.server.ts src/lib/server/entitlements/require-tier.ts
git add curriculum/module-05-product/lesson-075-entitlement-gating.md
git commit -m "feat(hooks): gate routes by derived tier + lesson 075"
```

Next: three status-banner components (UpgradePrompt, RenewalBanner, TrialCountdown, PastDueWarning).
