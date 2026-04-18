---
number: 139
slug: client-sentry
title: Wire Sentry on the client
module: 9
moduleSlug: followup
moduleTitle: v1.0 Follow-up
phase: 9
step: 4
previous: 138
next: null
estimatedMinutes: 10
filesTouched:
  - src/lib/sentry-client.ts
  - src/hooks.client.ts
---

## Context

Lesson 127 wired the server-side Sentry seam through `hooks.server.ts`. PROMPT.md step 132 calls for "Sentry wire-up (client + server)" — this lesson closes the client half: a mirror stub at `src/lib/sentry-client.ts` + a `src/hooks.client.ts` whose `handleError` forwards through the stub.

Same env-gated, lazy pattern as the server. When `PUBLIC_SENTRY_DSN` is empty, the stub no-ops; when populated and `@sentry/sveltekit` installs, the swap is one line.

## The command

`src/lib/sentry-client.ts`:

```ts
import { PUBLIC_SENTRY_DSN } from '$env/static/public';

export type ClientSentryLike = { captureException(err: unknown, hint?: Record<string, unknown>): void };
let instance: ClientSentryLike | null = null;

export function getClientSentry(): ClientSentryLike | null { return instance; }
export async function initClientSentry(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (PUBLIC_SENTRY_DSN === '' || instance !== null) return;
  // Real impl: Sentry.init({ dsn: PUBLIC_SENTRY_DSN, tracesSampleRate: 0.1 });
  instance = { captureException(err, hint) { console.error('[sentry-client-stub]', err, hint); } };
}
```

`src/hooks.client.ts`:

```ts
import type { HandleClientError } from '@sveltejs/kit';
import { getClientSentry, initClientSentry } from '$lib/sentry-client';

void initClientSentry();

export const handleError: HandleClientError = ({ error, event, status, message }) => {
  const errorId = crypto.randomUUID();
  getClientSentry()?.captureException(error, {
    tags: { errorId, path: event.url.pathname, status: String(status) }
  });
  return { message: 'An unexpected error occurred', errorId };
};
```

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: Initialize Sentry inline in `app.html`.** Loses the lazy gate — tracker loads even with no DSN.
**Alt 2: Wrap every component in a try/catch.** SvelteKit's `handleError` hook IS the right seam.
**Alt 3: Skip until `@sentry/sveltekit` installs.** Then the wiring lives in a future "install Sentry" PR. Land the seam now so installing the SDK is a one-file change.

## What could go wrong

**Symptom:** `process.env.PUBLIC_SENTRY_DSN` shows up in the bundle
**Cause:** Used `process.env` instead of `$env/static/public`.
**Fix:** Always go through `$env/static/public`. SvelteKit substitutes the value at build time.

**Symptom:** Server errors duplicate to client Sentry
**Cause:** Server `handleError` and client `handleError` are independent hooks. SSR errors fire the server hook; client-only errors fire the client hook. No overlap.

## Verify

`pnpm check && pnpm build`. With `PUBLIC_SENTRY_DSN=""`, throw a deliberate `error()` from a `+page.svelte` `$effect` — the stub logs `[sentry-client-stub]` to the browser console.

## Mistake log

- Tried to share the `SentryLike` type between server + client modules — `$env/static/private` and `$env/static/public` are different module surfaces; cleaner to mirror.
- Forgot the `typeof window === 'undefined'` guard — Vite's SSR pass evaluated the client init.

## Commit

```bash
git add src/lib/sentry-client.ts src/hooks.client.ts
git add curriculum/module-09-followup/lesson-139-client-sentry.md
git commit -m "feat(observability): client-side Sentry hook + stub + lesson 139"
```
