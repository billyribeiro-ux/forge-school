---
number: 55
slug: billing-portal
title: /account/billing with Stripe Billing Portal handoff
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 16
previous: 54
next: null
estimatedMinutes: 30
filesTouched:
  - src/lib/server/db/billing-queries.ts
  - src/routes/account/billing/+page.server.ts
  - src/routes/account/billing/+page.svelte
  - src/routes/account/billing/portal/+server.ts
---

## Context

`/account/billing` is the self-service surface for paying customers. It renders:
- Active subscriptions (status, price, renewal date, cancel-at-period-end flag)
- Completed purchases (amount, date, Stripe payment intent id)
- Active entitlements (source + granted date)
- A "Manage in Stripe" button that opens Stripe's **Billing Portal** — hosted UI for updating cards, changing plans, canceling subscriptions, viewing invoices

The portal is Stripe's batteries-included self-service flow. We create a `billingPortal.session.create` call with the customer's Stripe ID + a `return_url`, redirect the user there, and let Stripe handle the rest. When they finish, Stripe redirects back to `return_url`, our webhooks fire for any changes, and our DB catches up.

v1 doesn't have auth — this page keys off the anonymous `forge_session` cookie. The same user on a different device would see no billing state. When auth lands, a migration links sessions to users and the billing page queries by user id; until then, session cookie is the principal.

## The command

Add `src/lib/server/db/billing-queries.ts` with two read helpers: `listSubscriptionsForSession` (joins subscription + price + product) and `listCompletedOrdersForSession` (joins payments + orders, filtered to `orders.status='complete'`).

Create `src/routes/account/billing/+page.server.ts` — server load that ensures the session cookie and runs the three reads (subscriptions, payments, entitlements) in parallel via `Promise.all`.

Create `src/routes/account/billing/+page.svelte` — three cards (subscriptions, purchase history, active entitlements). Each row uses:
- `formatCents(cents, currency)` — Intl.NumberFormat, same pattern as /pricing
- `formatDate(d)` — Intl.DateTimeFormat with short month, numeric day
- A status pill (`status-active`, `status-trialing`, `status-past_due`, etc.) with semantic colors from tokens.css

The subscription card has a `<form method="POST" action="/account/billing/portal">` with a single "Manage in Stripe" button that POSTs to the portal endpoint.

Create `src/routes/account/billing/portal/+server.ts`:

```ts
export const POST: RequestHandler = async ({ cookies }) => {
  const sessionId = ensureSessionCookie(cookies);
  const [primary] = await db.select({ customerId: subscriptions.stripeCustomerId })
    .from(subscriptions).where(eq(subscriptions.sessionId, sessionId))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  if (primary === undefined) error(404, { message: 'No subscription...', errorId: '...' });

  const portal = await stripe.billingPortal.sessions.create({
    customer: primary.customerId,
    return_url: `${PUBLIC_APP_URL}/account/billing`
  });
  redirect(303, portal.url);
};
```

Verify:

```bash
pnpm check
pnpm build
```

Live check (requires real Stripe + an active subscription on the current cookie):

1. Complete a Pro Monthly checkout.
2. Visit `/account/billing` — cards populate.
3. Click "Manage in Stripe" — redirects to `billing.stripe.com/p/...`.
4. In the portal, update the card or cancel. Close the portal.
5. Back on our page: refresh. The status + cancel-at-period-end should reflect any change (the webhook fires between the action and the refresh).

## Why we chose this — the PE7 judgment

**Alternative 1: Build custom UIs for card update, cancel, plan change**
The Stripe Billing Portal is free, localized, accessibility-audited, PCI-compliant, and maintained by Stripe. Building a replacement UI is weeks of work for worse UX. Use the portal.

**Alternative 2: Show only active subscriptions; hide purchase history**
History matters for users resolving "did I buy that?" questions. The three-card layout scales — even a power user rarely has more than a handful of purchases.

**Alternative 3: Key the billing page off an email address instead of session cookie**
Email would require a magic-link auth flow. v1 is auth-free. Session cookie is the best we have; when auth lands, the page reads by user_id.

**Alternative 4: Skip the portal; send users to billing.stripe.com directly**
`billing.stripe.com` without a session id doesn't know who the user is. The `billingPortal.sessions.create` call gives Stripe the customer id so the portal loads pre-personalized.

**Alternative 5: Store the customer id separately on the session cookie row**
Could avoid the subscription query. Also duplicates the customer id across subscriptions + session storage. The `subscriptions.stripe_customer_id` is the source of truth; reading from it is one join away.

The PE7 choice — three-card self-service page + Billing Portal handoff — wins because it ships enterprise-grade account management with minimal bespoke UI and defers when auth lands.

## What could go wrong

**Symptom:** "No subscription on this session" 404
**Cause:** The user is on the billing page without an active subscription. Normal state for Lifetime-only buyers.
**Fix:** Expected. Only subscription-bearing sessions get the portal. One-time purchase history still renders on the page.

**Symptom:** Portal redirects fail with "No configuration for customer"
**Cause:** Stripe's Billing Portal requires a configuration in the dashboard (Settings → Customer portal). Fresh test accounts need a one-time setup.
**Fix:** Dashboard → Settings → Billing → Customer portal → Activate. Pick the features (update payment, cancel, etc.).

**Symptom:** Status pill colors don't match on dark mode
**Cause:** We used `--color-success-50` / `-warning-50` etc. as background and `-700` as foreground. The dark-mode token values need to keep the contrast ratio.
**Fix:** Spot-check dark mode in DevTools. Adjust via tokens.css if a pair falls below WCAG AA.

## Verify

```bash
pnpm check
pnpm build
```
Expected: 0 errors.

Live (requires an active subscription):
```bash
pnpm dev
# /account/billing renders
# Click "Manage in Stripe" -> portal opens
```

## Mistake log — things that went wrong the first time I did this

- **Returned the portal url as JSON instead of `redirect(303, url)`.** The client would have needed JS to navigate. The 303 is the POST-redirect-GET pattern.
- **Passed the session id to the portal instead of the customer id.** Stripe 404'd (session id is ours, not theirs). Correct value: `subscription.stripe_customer_id`.
- **Forgot to activate the portal in the Stripe dashboard.** First portal call errored; confused me for ten minutes. Activated; worked on the next try.
- **Showed `revoked` entitlements in the "Active entitlements" list.** `listEntitlementsForSession` already filters `revokedAt IS NULL`. Confirmed the list is only active.

## Commit this change

```bash
git add src/lib/server/db/billing-queries.ts src/routes/account/billing/
git add curriculum/module-04-money/lesson-055-billing-portal.md
git commit -m "feat(billing): /account/billing with portal handoff + lesson 055"
```

Lesson 056 extends the seed to 12 billing personas so the billing page renders a realistic spread during dev.
