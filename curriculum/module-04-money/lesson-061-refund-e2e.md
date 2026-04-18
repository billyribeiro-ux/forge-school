---
number: 61
slug: refund-e2e
title: E2E — refunded persona renders no active entitlement
module: 4
moduleSlug: money
moduleTitle: Money
phase: 4
step: 22
previous: 60
next: 62
estimatedMinutes: 10
filesTouched:
  - tests/e2e/refund-revokes-entitlement.spec.ts
---

## Context

The "refund revokes entitlement" invariant is enforced in the webhook handler (lesson 053). This E2E proves the **UI** side — a user whose purchase was refunded visits `/account/billing` and sees:
- Their refunded payment in purchase history with `status=refunded`
- No row in the "Active entitlements" card

Full end-to-end with a real Stripe dashboard refund requires manual operator action (not automatable). The seed's `lifetime-refunded` persona pre-populates the state this test asserts on.

## The command

Create `tests/e2e/refund-revokes-entitlement.spec.ts`:

```ts
test('refunded purchase persona renders no active entitlement', async ({ page, context }) => {
  await context.addCookies([{
    name: 'forge_session',
    value: 'persona-lifetime-refunded',
    domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax'
  }]);
  await page.goto('/account/billing');

  const history = page.locator('section.card', { hasText: 'Purchase history' });
  await expect(history.getByText('refunded')).toBeVisible();

  const entitlementsCard = page.locator('section.card', { hasText: 'Active entitlements' });
  await expect(entitlementsCard.getByText('No active entitlements.')).toBeVisible();
});
```

Verify:

```bash
pnpm db:reset && pnpm db:seed
pnpm test:e2e
```
Expected: `4 passed`.

## Why we chose this — the PE7 judgment

**Alternative 1: Drive a real refund through the Stripe dashboard + webhook**
Requires operator action (clicking "Refund payment" in the dashboard). Not automatable. The seed + persona approach gives us the SAME end state the webhook would produce.

**Alternative 2: POST a synthetic webhook event with `fetch` to exercise the handler**
Handler-unit tests cover that path (future lesson). This E2E is specifically about the UI displaying the post-refund state correctly.

## What could go wrong

**Symptom:** Test fails because `persona-lifetime-refunded` doesn't exist
**Cause:** Seed wasn't run.
**Fix:** `pnpm db:reset && pnpm db:seed`.

**Symptom:** "No active entitlements" not visible — there IS an entitlement
**Cause:** Persona seed didn't set `revokedAt`. Review seed-personas.ts — the conditional `revokedAt: isFullRefund ? new Date() : null` must fire for full refunds.

## Mistake log

- **Cookie `secure: true` made it not send on http://localhost.** Changed to `secure: false` for the local test.
- **Expected the refund amount to show `$497`, but the card displays `refunded` without an amount.** The purchase-history row shows the payment's `amountCents` as the $ total, not the refund amount. Asserted on status text only.

## Commit

```bash
git add tests/e2e/refund-revokes-entitlement.spec.ts
git add curriculum/module-04-money/lesson-061-refund-e2e.md
git commit -m "feat(e2e): refund revokes entitlement test + lesson 061"
```
