---
number: 111
slug: plausible
title: Wire Plausible analytics (opt-in, cookie-less)
module: 7
moduleSlug: polish
moduleTitle: Polish
phase: 7
step: 1
previous: 110
next: null
estimatedMinutes: 10
filesTouched:
  - src/lib/components/marketing/Plausible.svelte
  - src/routes/+layout.svelte
---

## Context

Plausible is privacy-first: no cookies, no personal data, no cross-site tracking, and GDPR / CCPA / PECR compliant out of the box. Loading is gated on `PUBLIC_PLAUSIBLE_DOMAIN` being non-empty — dev environments skip the script entirely.

## The command

`src/lib/components/marketing/Plausible.svelte`:

```svelte
<script lang="ts">
  import { PUBLIC_PLAUSIBLE_DOMAIN } from '$env/static/public';
  const domain = PUBLIC_PLAUSIBLE_DOMAIN;
</script>
{#if domain !== ''}
  <svelte:head>
    <script defer data-domain={domain} src="https://plausible.io/js/script.js"></script>
  </svelte:head>
{/if}
```

`src/routes/+layout.svelte` — mount `<Plausible />` next to `<CartPersistence />`.

```bash
pnpm check && pnpm build
```

## Why we chose this — the PE7 judgment

**Alt 1: Google Analytics.** Invasive, cookie-heavy, requires a consent banner in many jurisdictions.
**Alt 2: Self-hosted Plausible.** Possible; adds infra burden. The hosted version is cheap and keeps your data under Plausible's EU-hosted compliance umbrella.
**Alt 3: Load unconditionally.** Dev sessions would pollute analytics with junk hits.

## Verify

`pnpm build`. Inspect the built HTML — the script is present only when `PUBLIC_PLAUSIBLE_DOMAIN` is set.

## Mistake log

- Dropped `defer` — tracker blocked first paint on slow connections. Added back.
- Used the `<script>` tag outside `<svelte:head>` — SvelteKit injected it in `<body>` which still works but breaks the mental model.

## Commit

```bash
git add src/lib/components/marketing/Plausible.svelte src/routes/+layout.svelte
git add curriculum/module-07-polish/lesson-111-plausible.md
git commit -m "feat(analytics): Plausible integration + lesson 111"
```
