---
number: 42
slug: stripe-cli-webhooks
title: Wire the Stripe CLI for local webhook forwarding
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 3
previous: 41
next: null
estimatedMinutes: 10
filesTouched:
  - docs/STRIPE.md
---

## Context

Stripe webhooks fire from Stripe's infrastructure to an HTTPS endpoint. During development, that endpoint lives on your machine at `localhost:5173`, which Stripe's servers cannot reach. The **Stripe CLI** bridges the gap: `stripe listen` opens a long-lived connection to Stripe's relay, receives every test-mode webhook event for your account, and forwards each one to your local server.

Without the CLI, you can build the webhook handler but never observe it firing. Lesson 048 (the webhook receiver) depends on this wiring.

The CLI also prints a per-session `whsec_...` signing secret. The webhook receiver verifies incoming events against this secret, so the signing-secret handshake is coupled to the CLI's session: every time you restart the CLI, you get a new secret and must update `.env.local`.

## The command

Install the Stripe CLI. On macOS:

```bash
brew install stripe/stripe-cli/stripe
```

On Linux / Windows: see https://stripe.com/docs/stripe-cli#install. Package managers available for apt, dnf, scoop, winget, and standalone binaries.

Authenticate against the Stripe account from lesson 040:

```bash
stripe login
```

The CLI prints a URL; opening it in a browser confirms the pairing. The CLI can now make API calls as your test-mode account.

Start forwarding to the local dev server:

```bash
stripe listen --forward-to localhost:5173/api/webhooks/stripe
```

Expected output:

```
> Ready! Your webhook signing secret is whsec_...
```

Copy the `whsec_...` value into `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET="whsec_abc123..."
```

**Restart the SvelteKit dev server** (Ctrl+C, `pnpm dev`) so it picks up the new env value. `.env` changes are read once at startup.

Leave `stripe listen` running in a separate terminal window. While it runs, every test-mode webhook Stripe generates for your account forwards to `http://localhost:5173/api/webhooks/stripe`. The receiver (lesson 048) logs each one.

Trigger a synthetic event to confirm the pipe works (requires the webhook receiver from lesson 048; until then this exercises only the CLI side):

```bash
stripe trigger checkout.session.completed
```

The CLI logs `Triggered checkout.session.completed` and your dev server's pino log shows an inbound POST to `/api/webhooks/stripe`.

Update `docs/STRIPE.md` with a new section walking through install + authenticate + forward + test-trigger (so future contributors don't re-read this lesson to remember how).

## Why we chose this — the PE7 judgment

**Alternative 1: Use a public tunnel (ngrok, Cloudflare Tunnel) to expose localhost**
Works. Requires a public HTTPS endpoint registered as a webhook in the Stripe dashboard, and every restart of ngrok rotates the URL and breaks the registration. The Stripe CLI avoids the public-endpoint dance entirely — the CLI connects to Stripe's relay with your API key, and Stripe delivers events to the CLI which forwards them to localhost. No URL rotation, no public exposure, no DNS to wrangle.

**Alternative 2: Trigger webhooks by manually POSTing from curl**
We can trigger them for unit testing, but synthetic POSTs skip Stripe's signature verification. Our receiver (lesson 048) verifies every incoming signature; manual POSTs would fail the check. `stripe listen` forwards signed, real-shape events — exactly what production will send.

**Alternative 3: Skip live webhook testing in dev; rely on E2E tests only**
E2E tests (lessons 058-061) run the full checkout flow; they implicitly exercise webhooks. Dev-time interactive testing (triggering a specific event, inspecting the handler's log, iterating) is a different loop. Both earn their seat.

**Alternative 4: Register a permanent webhook endpoint for dev in the Stripe dashboard**
Requires a stable public URL. For ephemeral dev machines (laptop, codespace), that's either ngrok (alternative 1) or a deployed preview URL. Either way you're exposing dev machines. Stripe CLI is a LOCAL-only path.

**Alternative 5: Have each developer manage a shared signing secret**
The dashboard-registered webhook endpoint has a stable signing secret that doesn't rotate on CLI restart. For team dev that's tempting; for single-developer ForgeSchool it's overkill and introduces a shared secret to the team. Per-developer CLI sessions with per-session secrets is simpler and safer.

The PE7 choice — `stripe listen` per developer, signing secret in `.env.local` per session — wins because it requires no public exposure, works from any network, and exercises the real signature-verification path.

## What could go wrong

**Symptom:** `stripe listen` exits immediately with "not authenticated"
**Cause:** `stripe login` wasn't completed.
**Fix:** Run `stripe login`, complete the browser pairing, retry.

**Symptom:** Webhook receiver rejects every event with "invalid signature"
**Cause:** The `whsec_...` in `.env.local` is stale (from an earlier `stripe listen` session) or you restarted the dev server without the new secret.
**Fix:** Copy the `whsec_...` value the CURRENT `stripe listen` printed into `.env.local`; restart `pnpm dev`.

**Symptom:** CLI prints `Ready!` but no events forward
**Cause:** The `--forward-to` URL is wrong (port typo, missing path, wrong host).
**Fix:** Must be `http://localhost:5173/api/webhooks/stripe`. The `http://` prefix is optional; the CLI assumes localhost HTTP if no scheme given.

**Symptom:** `stripe trigger` succeeds but nothing reaches the dev server
**Cause:** The CLI session is in a different terminal than you think, or `pnpm dev` is in a stale state.
**Fix:** Confirm `stripe listen` is running in an active terminal (the window should be streaming event logs). Confirm `pnpm dev` is running on port 5173. If both are running and nothing forwards, kill both and restart in order: dev server first, then `stripe listen`.

## Verify

```bash
# CLI installed
stripe --version
```
Expected: `1.x.x`.

```bash
# CLI authenticated
stripe config --list | grep display_name
```
Expected: your Stripe account's display name.

```bash
# Listen + forward works (in a separate terminal)
stripe listen --forward-to localhost:5173/api/webhooks/stripe
```
Expected: `Ready!` with a `whsec_...` line.

After copying the secret to `.env.local` and restarting `pnpm dev`:

```bash
stripe trigger payment_intent.created
```
Expected: dev server's pino logs show `POST /api/webhooks/stripe 200` (once the receiver from lesson 048 is in place; until then a 404 is expected but the forwarding itself is proven).

## Mistake log — things that went wrong the first time I did this

- **Ran `stripe listen` once, then forgot I'd restarted it.** The CLI prints a fresh `whsec_...` on every session. The old one in `.env.local` was invalid. Every incoming webhook failed signature verification. Fixed by copying the current session's secret. Rule: whenever `stripe listen` restarts, `.env.local` must update.
- **Authenticated with `stripe login --api-key sk_test_...`.** The `--api-key` form bypasses the browser and uses a raw API key. Fine for CI; awkward for local because it caches the key in the Stripe CLI config. Used the interactive `stripe login` flow instead — it stores a CLI-specific token that can be revoked per-machine.
- **Expected `stripe trigger` to work without `stripe listen` running.** `trigger` fires the event into your Stripe account; `listen` is what forwards it locally. Without `listen`, Stripe has nowhere to send the event. Ran both: `listen` in one terminal, `trigger` in another.
- **Installed `stripe` via npm (`npm install -g stripe`).** That's the Node SDK, not the CLI — different tool, different binary. Stripe CLI comes from `brew`, apt, or scoop. Node SDK (from lesson 041) is a separate package for the app runtime.

## Commit this change

```bash
git add docs/STRIPE.md
git add curriculum/module-04-money/lesson-042-stripe-cli-webhooks.md
git commit -m "docs(stripe): wire Stripe CLI for local webhook forwarding + lesson 042"
```

With the CLI forwarding in place, Stripe can deliver real test-mode webhooks to our local server. Lesson 043 moves from hardcoded Stripe IDs in the seed script to real Stripe test-mode products and prices.
