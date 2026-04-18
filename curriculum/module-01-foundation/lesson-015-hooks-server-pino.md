# Lesson 015 — Scaffold `hooks.server.ts` with pino logger + error handler

**Module:** 1 — Foundation
**Phase:** PE7 Build Order → Phase 1, Step 15
**Previous lesson:** 014 — Wire Svelte Agentation for dev-time source inspection
**Next lesson:** 016 — Validate the foundation and tag the Module 1 checkpoint
**Estimated time:** 20 minutes
**Files touched:** `package.json`, `pnpm-lock.yaml`, `src/lib/server/logger.ts`, `src/hooks.server.ts`, `src/app.d.ts`

---

## Context

Every server-side SvelteKit codebase needs two things before it can safely ship a single production request: **structured logging** (so operational questions like "what's slow?", "what's failing?", "who hit this endpoint?" have machine-readable answers) and a **top-level error handler** (so uncaught exceptions don't leak stack traces to users and don't silently disappear). SvelteKit's `hooks.server.ts` is where both live.

We use **pino** — the fastest JSON logger in the Node ecosystem — and a handwritten `handleError` hook that generates a correlation ID for every error, logs the full stack server-side, and returns a sanitized shape to the client. The correlation ID is what a support engineer asks for when a user writes in with "something broke" — they quote the `errorId`, we grep our logs, the full trace is one query away.

This lesson establishes the **logging contract** for the rest of the codebase. Every future server endpoint, load function, form action, and webhook handler will log through this same logger. Every uncaught error will route through this same handler. The contract is strict: no `console.log` in server code, no raw error messages sent to clients, no PII in log output.

## The command

Install pino as a runtime dependency and pino-pretty as a devDependency (for human-readable dev logs):

```bash
pnpm add pino
pnpm add -D pino-pretty
```

Create `src/lib/server/logger.ts` — a singleton pino instance with environment-driven level and static redaction paths:

```ts
/**
 * Structured server logger (pino).
 *
 * - Production: default JSON output to stdout so log aggregators index
 *   every field without a parser.
 * - Development: pino-pretty transport for a human-readable stream.
 * - Level: read from LOG_LEVEL (.env.local), default "info".
 * - Redaction: authorization + cookie headers censored unconditionally.
 *
 * Server-only. Importing this from client code is a SvelteKit build error
 * because $env/static/private is not reachable from the browser bundle.
 */
import pino from 'pino';
import type { LoggerOptions } from 'pino';
import { LOG_LEVEL } from '$env/static/private';

const level: string = LOG_LEVEL !== '' ? LOG_LEVEL : 'info';

const baseOptions: LoggerOptions = {
  level,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]'
  }
};

const options: LoggerOptions = import.meta.env.DEV
  ? {
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname'
        }
      }
    }
  : baseOptions;

export const logger = pino(options);
export type Logger = typeof logger;
```

Create `src/hooks.server.ts` — the two exported hooks SvelteKit calls for every request and every unhandled error:

```ts
/**
 * Server hooks — request logging + top-level error handler.
 *
 * `handle` wraps every server request. We time the response, then emit
 * one structured log line per request. 5xx logs at `error`, 4xx at
 * `warn`, everything else at `info`.
 *
 * `handleError` catches uncaught errors thrown inside load functions,
 * form actions, +server.ts endpoints, etc. We log the full error
 * (stack included) server-side and return a sanitized shape to the
 * client — never the stack, never the original message. The generated
 * errorId is the correlation key a support request can quote back.
 */
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';

export const handle: Handle = async ({ event, resolve }) => {
  const startedAt = performance.now();
  const response = await resolve(event);
  const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;

  const logPayload = {
    method: event.request.method,
    path: event.url.pathname,
    status: response.status,
    duration_ms: durationMs
  };

  if (response.status >= 500) logger.error(logPayload, 'request');
  else if (response.status >= 400) logger.warn(logPayload, 'request');
  else logger.info(logPayload, 'request');

  return response;
};

export const handleError: HandleServerError = ({ error, event, status, message }) => {
  const errorId = crypto.randomUUID();

  logger.error(
    {
      errorId,
      status,
      message,
      method: event.request.method,
      path: event.url.pathname,
      err: error
    },
    'unhandled_server_error'
  );

  return {
    message: 'An unexpected error occurred',
    errorId
  };
};
```

Update `src/app.d.ts` to reflect the new `App.Error` shape. SvelteKit's generated types read this ambient declaration to type the `error` prop on error pages:

```diff
 declare global {
 	namespace App {
-		// interface Error {}
+		interface Error {
+			message: string;
+			errorId: string;
+		}
 		// interface Locals {}
 		// interface PageData {}
 		// interface PageState {}
 		// interface Platform {}
 	}
 }
```

Verify:

```bash
pnpm check
pnpm build
```

Expected: 0 errors, clean build.

## Why we chose this — the PE7 judgment

**Alternative 1: `console.log` for everything**
Zero dependencies. Zero setup. Output is whatever shape you stringify it to. That is also the problem: no consistent shape means no grepping for common fields, no level-based filtering, no aggregation. A log aggregator (Datadog, CloudWatch, Sentry Logs) given `console.log` output gets an unstructured blob per line; it can text-match, but it cannot index fields. A structured logger emits JSON where every field is a queryable column. When you have 10,000 log lines a day, that is the difference between "find every 5xx on /api/checkout in the last hour" taking five seconds or twenty minutes.

**Alternative 2: Winston**
Winston is the veteran of Node logging — mature, featureful, widely deployed. It is also **7-15× slower** than pino in direct benchmarks and has a plugin-heavy ecosystem where transports are each their own package with compatibility quirks. Pino was built specifically to answer Winston's performance gap; it has won the "fast structured logger" competition by a wide margin. For a product doing any nontrivial request volume, pino's speed matters.

**Alternative 3: Bunyan**
Bunyan was the canonical structured logger in the Node 0.10 era. Active development slowed after 2017; the ecosystem moved to pino. Bunyan still works, but picking it in 2026 is a museum-piece choice.

**Alternative 4: Let SvelteKit's default `handleError` stand**
SvelteKit's default is to call `console.error(error)` and return `{ message: error.message }`. Two problems. First, `console.error(error)` is unstructured — same aggregation problem as alternative 1. Second, returning `error.message` to the client can leak internals: "ECONNREFUSED" from a database error, "Invalid credentials for admin user foo" from a misconfigured auth flow, real stack lines in dev-compatible error formats. The sanitized `{ message: 'An unexpected error occurred', errorId }` gives the user enough to report the problem without exposing anything.

**Alternative 5: Skip redaction**
Redacting `req.headers.authorization` and `req.headers.cookie` seems paranoid — why would we ever log those? Because a future contributor writes `logger.info({ req }, 'inbound')` and the `req` object has full headers. Without redaction, that one line leaks session cookies to the log aggregator, where any developer with log access can see them. Redaction at the logger level is a safety net for the careless case, not a replacement for writing careful log statements.

The PE7 choice — pino + bespoke hooks.server.ts + App.Error shape + redaction — wins because it establishes the contract that every future server file will honor and does so with 60 lines of code.

## What could go wrong

**Symptom:** `import { LOG_LEVEL } from '$env/static/private'` produces a TypeScript error
**Cause:** `LOG_LEVEL` isn't declared in `.env.example` / `.env.local`, or SvelteKit's `svelte-kit sync` hasn't run to regenerate `.svelte-kit/ambient.d.ts`.
**Fix:** Confirm `LOG_LEVEL` is declared in `.env.example` (it is, from lesson 006). Run `pnpm exec svelte-kit sync`. If still broken, restart the dev server.

**Symptom:** Dev server starts but logs are a single unreadable JSON line per request
**Cause:** `import.meta.env.DEV` is `false` at dev-server start — usually because `NODE_ENV` is set explicitly in `.env.local` (which is forbidden, per lesson 006's rules). SvelteKit owns `NODE_ENV`.
**Fix:** Remove any `NODE_ENV` line from `.env.local`. Restart the dev server; pino-pretty formatting kicks in.

**Symptom:** Client receives `{ message: 'An unexpected error occurred' }` but the `errorId` is missing
**Cause:** `src/app.d.ts` still has the commented-out `// interface Error {}`. TypeScript keeps the default `App.Error` shape (`{ message?: string }`), so SvelteKit drops the `errorId` field on serialization.
**Fix:** Add the full `App.Error` interface with `message: string; errorId: string;` (as shown). Restart the dev server.

**Symptom:** Tests or scripts that don't boot SvelteKit fail with `Cannot find module '$env/static/private'`
**Cause:** `$env/static/private` is a SvelteKit virtual module. Running `src/lib/server/logger.ts` outside a SvelteKit context — e.g., from a unit test — hits this.
**Fix:** Either mock the module in the test config, or structure the logger so it accepts level as a parameter and only reads from `$env` when called from a SvelteKit entry point. For this lesson we keep the `$env` import direct; lesson 026 (first unit test) addresses the mock.

## Verify

```bash
# Hooks and logger files exist
ls src/hooks.server.ts src/lib/server/logger.ts
```

Expected: both paths listed.

```bash
# Dependencies are in place
grep '"pino"' package.json
grep '"pino-pretty"' package.json
```

Expected: `pino` in `dependencies`, `pino-pretty` in `devDependencies`.

```bash
# App.Error is declared
grep -A3 "interface Error" src/app.d.ts
```

Expected: `message: string;` and `errorId: string;` lines.

```bash
pnpm check
pnpm build
```

Expected: 0 errors.

**Live smoke test:** Start the dev server (`pnpm dev`). In another terminal: `curl http://localhost:5173/`. You should see a line in the dev-server stdout similar to:

```
[14:32:10.234] INFO (request): { method: 'GET', path: '/', status: 200, duration_ms: 2.14 }
```

Hit a nonexistent path (`curl http://localhost:5173/nope`) — expect a warn line with status 404.

## Mistake log — things that went wrong the first time I did this

- **Forgot the `!== ''` check on `LOG_LEVEL`.** Wrote `const level = LOG_LEVEL || 'info'`. Works in JS. In TypeScript with `exactOptionalPropertyTypes`, `$env/static/private` exports `LOG_LEVEL` as `string` (not `string | undefined`), and an empty string passes the default-OR operator as truthy. The fix: empty string is the "unset" sentinel SvelteKit emits for a missing var; treat it explicitly.
- **Transport config caused `require` errors in ESM mode.** pino-pretty as a transport runs in a worker thread and needs to be CJS-importable. The first attempt specified `transport: { target: require.resolve('pino-pretty') }` which failed in an ESM project. Fix: use the bare string `target: 'pino-pretty'` — pino's worker loader resolves it via Node's module resolution, which handles ESM/CJS transparently for this package.
- **Returned the original `error.message` from `handleError`.** Worked fine for errors I threw on purpose. Broke when a DB driver threw a connection-string error containing the database password. The sanitized-message principle is non-negotiable: the client gets "An unexpected error occurred" + an errorId, full stop. If we need more granularity (a dedicated "not found" page vs. a "something broke" page), that's modeled via `status`, not `message`.
- **Tried to log the request body in `handle`.** Would have been useful for debugging form submissions. Turned out `event.request.body` is a ReadableStream — reading it in the hook consumes it, so the downstream handler gets an empty body. Moved "log the body" to the form-action's internal handler (where body is already parsed) in a later lesson; request-level logging stays at the metadata level (method, path, status, duration).

## Commit this change

```bash
git add package.json pnpm-lock.yaml src/lib/server/logger.ts src/hooks.server.ts src/app.d.ts
git add curriculum/module-01-foundation/lesson-015-hooks-server-pino.md
git commit -m "feat(hooks): add hooks.server.ts with pino logger + lesson 015"
```

With request logging and error handling in place, every server-side bug produced from this point forward has a traceable errorId. Lesson 016 validates the entire Module 1 foundation — check, lint, build, minimal smoke test — and tags the Phase 1 checkpoint.
