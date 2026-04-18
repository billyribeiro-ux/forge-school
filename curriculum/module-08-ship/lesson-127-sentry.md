---
number: 127
commit: d5202fc1942ee01fcbcb2e5c40692a0dffcf3004
slug: sentry
title: Wire Sentry through hooks.server.ts
module: 8
moduleSlug: ship
moduleTitle: Ship
phase: 8
step: 3
previous: 126
next: null
estimatedMinutes: 10
filesTouched:
  - src/lib/server/sentry.ts
  - src/hooks.server.ts
---

## Context

Server-side error observability. The seam is `handleError` (hooks.server.ts, lesson 015). We route uncaught errors to pino for structured logs (already there) AND to Sentry when `SENTRY_DSN` is set.

This lesson ships the integration scaffold — a lazy, env-gated `getSentry()` + `initSentry()` pair. When `@sentry/sveltekit` installs (post-course, or in a follow-up), swap the stub in one place.

## The command

`src/lib/server/sentry.ts`:

```ts
import { SENTRY_DSN } from '$env/static/private';

export type SentryLike = { captureException(err: unknown, hint?: Record<string, unknown>): void };
let instance: SentryLike | null = null;

export function getSentry(): SentryLike | null { return instance; }
export async function initSentry(): Promise<void> {
  if (SENTRY_DSN === '' || instance !== null) return;
  // When @sentry/sveltekit installs:
  //   const Sentry = await import('@sentry/sveltekit');
  //   Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 0.2 });
  //   instance = { captureException: (e, h) => Sentry.captureException(e, h) };
  instance = { captureException(err, hint) { console.error('[sentry-stub]', err, hint); } };
}
```

`src/hooks.server.ts`:

```diff
+ import { getSentry, initSentry } from '$lib/server/sentry';
+ if (!building) void initSentry();

  export const handleError = ({ error, event, status, message }) => {
    …
+   getSentry()?.captureException(error, { tags: { errorId, path: event.url.pathname, status: String(status) } });
    return { message, errorId };
  };
```

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: Hard-install Sentry from day one.** Sentry billing + a live project. Course-friendly to defer.
**Alt 2: Toss `Sentry.init` directly into `hooks.server.ts`.** Couples boot to the SDK; harder to unit-test the error path.
**Alt 3: Send errors via plain fetch to Sentry's HTTP ingestion API.** Possible but brittle; the SDK handles rate limits, stack processing, source maps.

## Verify

With `SENTRY_DSN=""` (dev default), the stub no-ops; errors still log via pino. With a real DSN + `@sentry/sveltekit` installed, swap the stub to the real `Sentry.init`.

## Mistake log

- Called `initSentry()` at top-level without `building` guard — tried to import during prerender and hit the env-read issue from lesson 075.

## Commit

```bash
git add src/lib/server/sentry.ts src/hooks.server.ts
git add curriculum/module-08-ship/lesson-127-sentry.md
git commit -m "feat(observability): Sentry scaffold + handleError hook + lesson 127"
```
