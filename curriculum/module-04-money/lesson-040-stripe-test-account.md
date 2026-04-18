---
number: 40
slug: stripe-test-account
title: Set up the Stripe test-mode account
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 1
previous: 39
next: null
estimatedMinutes: 10
filesTouched:
  - docs/STRIPE.md
  - .env.example
---

## Context

Module 4 wires Stripe — test-mode only in v1. Before a single line of Stripe SDK code, we create a Stripe account, collect the test keys, and document the setup so every contributor uses the same credential pattern. The runtime guard we install in lesson 041 refuses to boot on non-test keys, but the first line of defense is discipline — the `.env.example` lines and the setup doc make the "test mode only" contract explicit.

This lesson produces `docs/STRIPE.md` and a polished `.env.example` block. No code in `src/`. No deps. The commit is documentation + developer-onboarding material that every future Stripe-touching lesson references.

## The command

Create `docs/STRIPE.md` with six sections: posture (test-mode only in v1), account setup walkthrough, test card numbers table, dashboard navigation, what test mode does and doesn't protect, change log.

The setup walkthrough names five concrete steps:

1. Register at https://dashboard.stripe.com/register
2. Confirm email; land on dashboard with Test mode toggle on
3. Developers → API keys → reveal test secret key
4. Paste `STRIPE_SECRET_KEY` and `PUBLIC_STRIPE_PUBLISHABLE_KEY` into `.env.local`
5. `STRIPE_WEBHOOK_SECRET` comes later — from the Stripe CLI in lesson 042

Test card numbers table covers success, requires-auth (3DS), declined (generic), declined (insufficient funds), disputed charge. All CVCs `123`, any future expiration.

Update `.env.example` to reference the doc and explicitly number the setup steps inline:

```diff
-# Get these from https://dashboard.stripe.com/test/apikeys. Keys must start with
-# sk_test_ / pk_test_ — the app refuses to boot with live keys in v1.
+# ─── Stripe (TEST MODE ONLY on v1 — see docs/STRIPE.md) ────────────────────
+# 1. Create a Stripe account: https://dashboard.stripe.com/register
+# 2. Toggle "Test mode" in the dashboard; stay in test mode for this course.
+# 3. Developers -> API keys -> reveal the test secret key.
+# 4. Paste the two keys below. The app refuses to boot on anything without
+#    "sk_test_" / "pk_test_" prefix.
 STRIPE_SECRET_KEY="sk_test_replace_me"
```

Verify:

```bash
ls docs/STRIPE.md
grep -E "STRIPE_" .env.example | wc -l
```
Expected: file exists; at least 3 Stripe-related lines in .env.example.

## Why we chose this — the PE7 judgment

**Alternative 1: Skip docs, learn Stripe as you go**
Stripe's docs are excellent. A dedicated project-local `docs/STRIPE.md` documents **our** choices: why test-mode-only, which cards to use for which tests, which dashboard pages matter for debugging. It's a quickstart, not a reference.

**Alternative 2: Paywall the Stripe onboarding behind a form the student fills in**
An anti-pattern. Every barrier between "I want to learn" and "I'm coding" costs enrollment. The student creates a Stripe account when they need to; the course doesn't gate on it.

**Alternative 3: Use a Stripe-alternative payment provider (LemonSqueezy, Paddle) for simpler onboarding**
LemonSqueezy and Paddle abstract tax and compliance, but they lack the depth of Stripe's webhook taxonomy, subscription lifecycle, and coupon primitives. The goal of Module 4 is to teach the full commerce model; Stripe exposes that model; the alternatives hide it.

**Alternative 4: Put Stripe setup inline in the next lesson (041 — install SDK)**
Two concerns in one commit — install + dashboard walkthrough. Easier to review in separate lessons. The account setup is the pre-req; the SDK install is the first line of code. Keep them separate.

The PE7 choice — dedicated setup doc, `.env.example` comment with numbered steps — wins because onboarding friction is minimized and the team's Stripe conventions live in the repo.

## What could go wrong

**Symptom:** A key in `.env.local` starts with `sk_live_` or `pk_live_`
**Cause:** Toggled out of test mode, or copied keys from a different account's live section.
**Fix:** Re-enable test mode in the dashboard (top-left toggle), copy the test keys. The guard in `src/lib/server/stripe/client.ts` (lesson 041) throws on non-test keys at app boot.

**Symptom:** Stripe 2FA prompts during dashboard login prevent quick access
**Cause:** Stripe recommends 2FA; it takes a minute to set up.
**Fix:** Just do it — test-mode-only mitigates the financial risk, but the Stripe account owns your future production keys; 2FA on that account matters.

**Symptom:** Unable to see test-mode data in the dashboard
**Cause:** You're viewing live mode (a common misclick).
**Fix:** Toggle test mode on (top-left, orange pill). Every dashboard page mirrors test-mode state.

## Verify

```bash
ls docs/STRIPE.md
```
Expected: file exists.

```bash
grep 'sk_test_' .env.example
grep 'pk_test_' .env.example
grep 'whsec_' .env.example
```
Expected: one line each, all placeholder values.

```bash
grep -c '^## ' docs/STRIPE.md
```
Expected: `6`.

## Mistake log — things that went wrong the first time I did this

- **Put a live secret key in `.env.local` on the first attempt.** Found it via the runtime guard at boot. Rotated the leaked live key in the Stripe dashboard (good habit), replaced with the test key. No money moved — the guard stopped any SDK call before it could.
- **Assumed the Stripe webhook secret could be read from the dashboard.** The CLI-forwarded local webhook secret (`whsec_...`) is per-CLI-session, not dashboard-registered. Dashboard webhook endpoints are for real deployed environments. Lesson 042 clarifies.
- **Used my personal email for the Stripe account.** Fine for learning; not fine for a real business. If this transitions to production, Billy moves the account to a business email before going live.
- **Documented Stripe's card-declined PAN as `4000 0000 0000 0001`.** Wrong digit; the correct PAN is `4000 0000 0000 0002`. Fixed in the doc; added a link to Stripe's full test-cards list as the canonical source.

## Commit this change

```bash
git add docs/STRIPE.md .env.example
git add curriculum/module-04-money/lesson-040-stripe-test-account.md
git commit -m "docs(stripe): document test-mode account setup + lesson 040"
```

Module 4 opens. Lesson 041 installs the Stripe SDK and wires the typed client with a runtime test-key guard.
