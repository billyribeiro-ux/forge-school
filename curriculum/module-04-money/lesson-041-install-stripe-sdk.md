---
number: 41
commit: a5b8d6276b8b9fd14c270d6f133e9e7e0b0e38b1
slug: install-stripe-sdk
title: Install the Stripe Node SDK with a test-key boot guard
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 2
previous: 40
next: 42
estimatedMinutes: 15
filesTouched:
  - package.json
  - pnpm-lock.yaml
  - src/lib/server/stripe/client.ts
---

## Context

With the account set up and keys in `.env.local`, we install Stripe's official Node SDK and wrap it in a typed singleton at `src/lib/server/stripe/client.ts`. The singleton includes a **boot-time guard** — `assertTestKey` — that throws if the secret key doesn't start with `sk_test_`. If someone accidentally rotates `.env.local` to live keys, the app crashes at import time with a clear error, before any request ever reaches Stripe. This is the last line of defense on top of the discipline from lesson 040.

The client is server-only (under `src/lib/server/`). A browser-bundle import fails at build time because `$env/static/private` is unreachable from the client.

We also **pin the API version** via `apiVersion: '2026-03-25.dahlia'`. Stripe groups breaking changes into dated API versions; pinning means our code sees the API at the date we wrote it. Upgrading is a deliberate act — bump the constant, read the diff, test.

## The command

Install the SDK:

```bash
pnpm add stripe
```

Create `src/lib/server/stripe/client.ts`:

```ts
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

function assertTestKey(key: string): void {
  if (key === '' || key === 'sk_test_replace_me') {
    throw new Error('[stripe] STRIPE_SECRET_KEY is not set. Fill in .env.local.');
  }
  if (!key.startsWith('sk_test_')) {
    throw new Error(
      `[stripe] STRIPE_SECRET_KEY must start with "sk_test_" (got "${key.slice(0, 8)}..."). ` +
      'v1 of ForgeSchool runs test-mode only. See docs/STRIPE.md §1.'
    );
  }
}

assertTestKey(STRIPE_SECRET_KEY);

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2026-03-25.dahlia',
  appInfo: { name: 'forgeschool', version: '0.0.1' },
  typescript: true
});

export type StripeClient = typeof stripe;
```

Three details:

- **`assertTestKey` runs at module top-level.** The check fires on first import, which happens during server boot. Any code path that touches Stripe sees the error before its first API call.
- **`appInfo`** — Stripe's SDK tags every request with the app name + version in the User-Agent header. Makes debugging dashboard API logs trivial — requests from ForgeSchool are instantly distinguishable from manual dashboard actions or other apps.
- **`typescript: true`** — forces the SDK's type definitions into strict mode. Without it, expanded types (e.g., list return values) fall back to looser inferences.

Verify:

```bash
pnpm check
pnpm build
```
Expected: 0 errors. The `sk_test_replace_me` placeholder in `.env.example` satisfies the guard at build time only if `.env.local` matches — if a student forgot the copy, the guard fires the moment they run `pnpm build` or `pnpm dev`.

## Why we chose this — the PE7 judgment

**Alternative 1: Skip the test-key guard; trust the environment**
A `.env.local` that somehow contains live keys would silently charge real cards. The three-line guard costs nothing and catches the class of accident that matters most.

**Alternative 2: Don't pin `apiVersion`; let the SDK pick the latest**
Stripe's SDK tracks its own "current" API version. That version drifts with every SDK minor bump; a `pnpm up stripe` could silently flip our code onto a new API with subtly different field shapes. Pinning freezes the contract and makes upgrades explicit.

**Alternative 3: Use the Stripe REST API directly with fetch()**
Works. Also forfeits every Stripe SDK benefit: typed return values, automatic retries on network errors, built-in webhook-signature verification, pagination helpers. The SDK is worth its single dep.

**Alternative 4: Create per-request Stripe instances instead of a singleton**
Stripe's instance is stateless; re-instantiation per request has zero correctness cost but wastes the TLS session reuse the SDK does internally. A singleton is strictly better.

**Alternative 5: Put the Stripe client under `src/lib/` (not `server/`)**
The Stripe secret key must NEVER reach the browser. SvelteKit enforces `src/lib/server/` as server-only via the bundler. Place the client there; never anywhere else.

The PE7 choice — pinned API version, boot-time test-key guard, single server-only instance, typed via `typescript: true` — wins because the client refuses to run outside its intended envelope and the contract is enforced by the compiler.

## What could go wrong

**Symptom:** App fails to boot with `[stripe] STRIPE_SECRET_KEY must start with "sk_test_"`
**Cause:** The guard is working as designed. Your `.env.local` has a key that doesn't start with `sk_test_`.
**Fix:** Copy the test secret key from the Stripe dashboard. Test-mode-toggle-on, Developers → API keys → reveal.

**Symptom:** `apiVersion` TypeScript error — "not assignable to type '2026-03-25.dahlia'"
**Cause:** The Stripe SDK's types hard-code the API version it was built against. Pinning to a different version fails the type check.
**Fix:** Update the `apiVersion` constant to the version the installed SDK version was built against. The error message names the expected string. If you genuinely need a different API version, upgrade the SDK (`pnpm up stripe`) and take the new default.

**Symptom:** `Cannot find module '$env/static/private'`
**Cause:** `svelte-kit sync` hasn't run. The ambient env types are generated on demand.
**Fix:** `pnpm exec svelte-kit sync`, or just run `pnpm check` which chains sync.

**Symptom:** Stripe requests fail with "Invalid API Key" at runtime
**Cause:** The test key was rotated in the Stripe dashboard and `.env.local` still has the old one.
**Fix:** Dashboard → Developers → API keys → show test secret. Update `.env.local`. Restart the dev server.

## Verify

```bash
# SDK present
grep '"stripe"' package.json
```
Expected: `"stripe": "^19.x.x"` (or similar current version) in dependencies.

```bash
# Client module exists, is server-only
ls src/lib/server/stripe/client.ts
```

```bash
# Boot-time guard present
grep 'startsWith.*sk_test_' src/lib/server/stripe/client.ts
```
Expected: the guard line.

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

```bash
# Quick runtime smoke (optional): verify the client is instantiable
node --input-type=module -e "import('./src/lib/server/stripe/client.ts').then(m => console.log('stripe ok'))" 2>&1 | tail -1
```
This runs outside SvelteKit — expect either "stripe ok" (key is valid) or the guard error (key is missing/live). Either outcome is correct behavior.

## Mistake log — things that went wrong the first time I did this

- **Assumed I could hardcode `apiVersion` to an older date.** The Stripe SDK rejects non-matching `apiVersion` strings at the type level. Had to match what the installed SDK was built against. Locked to the exact string the type check insisted on.
- **Put the client under `src/lib/stripe/`** (not `server/`). SvelteKit's bundler didn't flag it in dev, but a client-side import would have dragged the secret key into the browser. Moved to `src/lib/server/stripe/client.ts`. Rule: any file that reads `$env/static/private` belongs under `server/`.
- **Wrote the guard as `if (key.startsWith('sk_live_')) throw`.** Technically correct, but a key like `sk_restricted_...` (Stripe's restricted API keys) would have passed. The inverse check `if (!key.startsWith('sk_test_'))` is strict — only `sk_test_...` gets through. That's the v1 contract.
- **Forgot `typescript: true`.** Some SDK return shapes came back as `any` in strict mode. Added the option; types tightened up.

## Commit this change

```bash
git add package.json pnpm-lock.yaml src/lib/server/stripe/client.ts
git add curriculum/module-04-money/lesson-041-install-stripe-sdk.md
git commit -m "feat(stripe): install SDK + typed client with test-key guard + lesson 041"
```

The Stripe client is live. Lesson 042 documents the Stripe CLI so webhooks can forward to localhost during dev.
