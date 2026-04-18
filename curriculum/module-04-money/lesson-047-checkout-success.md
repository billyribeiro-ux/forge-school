---
number: 47
slug: checkout-success
title: Build the /checkout/success confirmation page
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 8
previous: 46
next: 48
estimatedMinutes: 10
filesTouched:
  - src/routes/checkout/success/+page.ts
  - src/routes/checkout/success/+page.svelte
---

## Context

Stripe's hosted Checkout redirects the buyer to `success_url` after payment. For ForgeSchool, that's `/checkout/success?session_id={CHECKOUT_SESSION_ID}`. This page does exactly one job: **acknowledge the payment**. It does NOT grant access. It does NOT mutate the order. It does NOT mutate entitlements.

The **webhook receiver** is the only code path that grants. This is the most important structural decision in Module 4, documented in `docs/ARCHITECTURE.md §4.3`: *"Entitlements are the grant truth, not orders. The checkout success URL creates an order; the webhook grants the entitlement. Client code checks entitlements, never orders."*

Why the split: the success URL fires on a browser redirect. It can fire without payment completing — a user could hit the URL directly, Stripe could redirect then the webhook deliver later, a network hiccup could drop either side. The webhook is Stripe's authoritative signal that money moved. The grant ALWAYS waits for the webhook.

This lesson ships a lean confirmation page. Stripe session id is echoed for support reference; users are pointed at `/lessons` and `/account/billing`. No DB reads. No state mutation.

## The command

Create `src/routes/checkout/success/+page.ts`:

```ts
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
  const sessionId = url.searchParams.get('session_id');
  return { sessionId };
};

// URL carries a query param; prerender can't capture dynamic query state.
export const prerender = false;
```

Create `src/routes/checkout/success/+page.svelte`. Five visual elements:

1. **Eyebrow: "Payment received"** — success-color pill.
2. **H1: "Thanks — we're processing your order."** — honest about the async grant.
3. **Lede paragraph** — explains the webhook grant model in plain English: "Access gets activated by a webhook, which usually fires within a few seconds." Link to `/account/billing` and `/lessons`.
4. **Reference line** — echoes the Stripe session id as a copyable `<code>`. Support engineers ask for this when users write in.
5. **CTA row** — primary "Open the curriculum" → `/lessons`, secondary "Billing details" → `/account/billing`.

`<meta name="robots" content="noindex">` — we don't want search engines to index confirmation pages with session IDs in URLs.

Verify:

```bash
pnpm check
pnpm build
pnpm dev  # visit /checkout/success?session_id=cs_test_abc
```

Expected: page renders, echoes the session_id, links work.

## Why we chose this — the PE7 judgment

**Alternative 1: Grant access on the success URL**
The #1 way to build a "paid but no access" bug. The success URL fires on every Stripe-sign-initiated redirect, whether or not the payment actually posted. A webhook-only grant is the only robust pattern.

**Alternative 2: Read the Stripe session server-side on `/checkout/success` to confirm payment**
Could call `stripe.checkout.sessions.retrieve(sessionId)` in `+page.server.ts` and check `payment_status === 'paid'`. Works as a secondary check — the webhook remains the grant. Adds a synchronous Stripe API call to the redirect path which slows the confirmation page. Reserved for future lesson if we want to guard against pages visible before the webhook fires; not implemented here.

**Alternative 3: Spin on the success page waiting for the webhook to mark the order as complete**
Poll `/api/orders/:id/status` every 500ms until status flips. Gives the UI an "access unlocked!" moment. Also couples the user's page-visibility time to backend timing — fragile. A message that tells the user "access activates in a few seconds" is a more honest UX than a spinner that sometimes resolves, sometimes hangs.

**Alternative 4: Include `noindex` only in a sitemap rather than on-page**
`<meta name="robots" content="noindex">` is in the HTML; search engines fetching the page respect it even without a sitemap. A sitemap exclusion helps but doesn't cover direct-URL discovery.

The PE7 choice — lean confirmation page, webhook-authoritative grant, explicit honest copy about the async model — wins because it's the only architecture where "paid but no access" bugs become impossible.

## What could go wrong

**Symptom:** User refreshes the page and sees a confusing "we're processing" message even though access is live
**Cause:** The success page is static copy; it doesn't reflect real state.
**Fix:** Future lesson can add a lightweight live check — query the order's status via an API and show "Access active" once the webhook updated. For v1, the honest copy is fine.

**Symptom:** `session_id` is missing from the URL
**Cause:** The user bookmarked `/checkout/success` without the query param.
**Fix:** The component already handles `null` — the reference line simply doesn't render. The rest of the page still works.

**Symptom:** Search engines index the success page
**Cause:** `<meta robots noindex>` was dropped in a refactor.
**Fix:** The meta tag is in `<svelte:head>`; confirm it's there.

## Verify

```bash
ls src/routes/checkout/success/
pnpm check
pnpm build
pnpm dev  # /checkout/success?session_id=cs_test_demo
```
Expected: files exist; types clean; page renders with the echoed session id.

## Mistake log — things that went wrong the first time I did this

- **First draft granted access here.** Caught during the "what could go wrong" section's judgment exercise — reread `docs/ARCHITECTURE.md §4.3`. Moved all grant logic to the webhook (lesson 049). The success page returned to its lean, honest state.
- **Used a single CTA to `/lessons`.** Forgot that subscription buyers want to see /account/billing to confirm the trial/cycle. Added a secondary CTA. Two clear next-steps, no decision fatigue.
- **Forgot `noindex`.** A test success URL ended up in my local browser history and I wondered if Google would see it. Added the meta tag and a TODO to verify in production via `robots.txt` + sitemap in Module 6.

## Commit this change

```bash
git add src/routes/checkout/success/
git add curriculum/module-04-money/lesson-047-checkout-success.md
git commit -m "feat(checkout): /checkout/success confirmation page + lesson 047"
```

With the happy-path UI in place, lesson 048 builds the webhook receiver that actually grants access.
