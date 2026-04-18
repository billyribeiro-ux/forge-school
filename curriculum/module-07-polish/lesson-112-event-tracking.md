---
number: 112
slug: event-tracking
title: Type-safe custom event tracking via Plausible
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 2
previous: 111
next: null
estimatedMinutes: 10
filesTouched:
  - src/lib/analytics/events.ts
  - src/lib/cart/AddToCartButton.svelte
---

## Context

Plausible's page-view tracking covers the top-level traffic story. Product decisions need the funnel: which percentage of visitors who reached `/products` added to cart? How many carts reach checkout? The custom-event API is the missing piece.

The typed `track()` wrapper narrows the event name to a closed union, so typos become type errors. Calls no-op when Plausible isn't loaded (dev, or when the domain isn't configured).

## The command

`src/lib/analytics/events.ts`:

```ts
export type ForgeEvent = 'checkout_started' | 'checkout_completed' | 'subscription_started' | 'lifetime_purchased' | 'coupon_applied' | 'add_to_cart' | 'contact_submitted';

export function track(event: ForgeEvent, props?: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  const fn = (window as { plausible?: (e: string, o?: unknown) => void }).plausible;
  if (typeof fn !== 'function') return;
  props === undefined ? fn(event) : fn(event, { props });
}
```

Wire the first real call in `AddToCartButton`: after `cart.add(item)`, call `track('add_to_cart', { productSlug })`.

```bash
pnpm check && pnpm build
```

## Why we chose this — the PE7 judgment

**Alt 1: Let every component call `window.plausible` directly.** Typos (`chekout_completed`) pollute the dashboard; no single source of truth for event names.
**Alt 2: Use a state-of-the-art analytics abstraction (Segment).** Heavyweight; we don't need fan-out to multiple sinks.
**Alt 3: Server-side event emission via Plausible's API.** Server events require authenticated API calls and miss client-side UX signals. Client + event is the right layer for funnel tracking.

## Verify

Open `/products/forgeschool-lifetime`, click Add-to-cart with the Plausible tracker loaded. Plausible dashboard receives an `add_to_cart` custom event.

## Mistake log

- Forgot the `typeof window === 'undefined'` guard — SSR render crashed.
- Typed `event: string` — defeated the purpose. Tightened to the union.

## Commit

```bash
git add src/lib/analytics/ src/lib/cart/AddToCartButton.svelte
git add curriculum/module-07-polish/lesson-112-event-tracking.md
git commit -m "feat(analytics): typed custom-event tracker + lesson 112"
```
