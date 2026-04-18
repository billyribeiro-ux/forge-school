---
number: 76
slug: upgrade-prompt
title: Build the UpgradePrompt entitlement-gate component
module: 5
moduleSlug: product
moduleTitle: Product
phase: 5
step: 14
previous: 75
next: null
estimatedMinutes: 10
filesTouched:
  - src/lib/components/entitlement/UpgradePrompt.svelte
---

## Context

When a user attempts to use a Pro feature without the entitlement, we have two UI strategies: redirect them to `/pricing` (via `requireTier`, lesson 075), or render an in-place prompt that explains what they clicked and what tier unlocks it.

The UpgradePrompt is the in-place version. Pure presentational. Takes a `featureName`, optional `href` (defaults to `/pricing`), optional `onDismiss`. Renders a card with a primary CTA and an optional dismiss affordance. Motion via CSS `@keyframes` — respects `prefers-reduced-motion` automatically.

This lesson ships just the component. Module 6 layers it into the nav and course pages.

## The command

`src/lib/components/entitlement/UpgradePrompt.svelte`:

```svelte
<script lang="ts">
  type Props = {
    featureName: string;
    href?: string | undefined;
    onDismiss?: (() => void) | undefined;
  };
  let { featureName, href = '/pricing', onDismiss }: Props = $props();
</script>

<aside class="upgrade-prompt" role="status" aria-live="polite">
  <div class="icon" aria-hidden="true">▲</div>
  <div class="body">
    <h3>Pro feature</h3>
    <p>{featureName} requires a Pro plan.</p>
  </div>
  <div class="actions">
    <a class="cta" {href}>See plans →</a>
    {#if onDismiss !== undefined}
      <button type="button" class="dismiss" aria-label="Dismiss" onclick={() => onDismiss?.()}>×</button>
    {/if}
  </div>
</aside>
```

CSS uses `@keyframes slide-in` + a `prefers-reduced-motion: reduce` media query to disable animation.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alternative 1: Use Motion (motion.dev) for the slide-in.**
Great for complex spring-based gestures. For a 200ms `transform + opacity` reveal, raw CSS keyframes are lighter and one less import to think about. We reach for Motion in lesson 094 for the marketing hero, where the gesture library earns its weight.

**Alternative 2: Modal that blocks the page.**
Hostile UX. The user clicked a Pro-gated feature — they don't need a modal forcing the "buy now" conversation. The aside-card lets them keep browsing while the option sits visible.

**Alternative 3: Bake the component's copy into its API.**
Over-parameterization. `featureName` is the one variable piece; "Pro feature" and "requires a Pro plan" are the canonical copy. If the UpgradePrompt is ever needed for a different tier (e.g., Lifetime-only feature), clone the component with different copy — it's 40 lines.

**Alternative 4: Omit the dismiss button.**
Persistent prompts shame the user. Let them dismiss. The dismissed state can be tracked client-side; lesson 112 wires Plausible to count dismisses vs clicks.

The PE7 choice — **pure component, CSS keyframes, optional dismiss** — wins on weight, clarity, and accessibility.

## What could go wrong

**Symptom:** Animation plays even with reduced-motion on
**Cause:** The `@media (prefers-reduced-motion: reduce)` rule wasn't scoped to `.upgrade-prompt`.
**Fix:** Verify in DevTools with the media-emulation toggle. Rule is `animation: none;` inside the media query.

**Symptom:** Screen reader reads the prompt twice on mount
**Cause:** `aria-live="polite"` + duplicate insertion (e.g., re-rendered via `{#if}`).
**Fix:** Once mounted, the aside isn't re-mounted across navigations. If parent toggles the block, bind the visibility into the prompt (`visible?: boolean`) so the announcement fires once.

**Symptom:** Button click propagates outside the card
**Cause:** No `event.stopPropagation` on the dismiss handler when the card is inside a link.
**Fix:** Avoid nesting the card inside a link — it's wrapped in `<aside>` and the CTA is its own `<a>`.

## Verify

```bash
pnpm check
```

Once wired into a page:

```bash
pnpm dev
# Render <UpgradePrompt featureName="Advanced filters" /> somewhere,
# toggle prefers-reduced-motion in DevTools, confirm animation disables.
```

## Mistake log

- **Initially added `import { animate } from 'motion'`** to do the slide-in. The Stripe-SDK-style named-export path tripped TypeScript (stale `Checkout.SessionCreateParams` bug in a sibling file reminded me to prefer inference-friendly code). Dropped Motion in favor of CSS keyframes; Motion will land in lesson 094.
- **Typed `onDismiss?: () => void`** — broke `exactOptionalPropertyTypes: true` when callers spread `{ onDismiss: maybeUndefined }`. Widened to `(() => void) | undefined`.
- **Used `h3` without a surrounding `section`/`article`** — flags on the a11y linter. Keeping it inside `aside`; the heading level is fine for inline callouts.

## Commit

```bash
git add src/lib/components/entitlement/UpgradePrompt.svelte
git add curriculum/module-05-product/lesson-076-upgrade-prompt.md
git commit -m "feat(components): UpgradePrompt entitlement gate + lesson 076"
```
