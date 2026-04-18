# Accessibility audit & policy

WCAG 2.2 AA target. Every public page passes manual + automated checks before ship.

## Automated

- `axe-core` via `@axe-core/playwright` in the E2E suite (lesson 117).
- Lighthouse a11y score ≥ 95 on every public page (Module 7 target).

## Manual

- **Keyboard navigation** — every interactive element reachable via Tab; Shift+Tab reverses. Focus order matches visual order.
- **Focus visibility** — every focusable element has a visible focus ring. We ship a site-wide `:focus-visible` outline in `base.css`.
- **Screen reader** — heading hierarchy (h1 → h2 → h3) is correct per page. Landmarks (`main`, `nav`, `aside`, `footer`) present. Interactive controls have accessible names.
- **Color contrast** — body text ≥ 4.5:1, large text ≥ 3:1, UI controls ≥ 3:1. Verified against both light and dark tokens.
- **Reduced motion** — every animation respects `@media (prefers-reduced-motion: reduce)`. Manually test with DevTools emulation.

## Common patterns enforced

- Every form `<input>` has a visible or `sr-only` `<label>` pointing at its `for={id}`.
- Every link distinguishable from body text by more than color (underline on hover minimum).
- Every image has an `alt` attribute — empty string for decorative, descriptive for informational.
- Icon-only buttons have `aria-label`.
- Status banners use `role="alert"` + `aria-live` appropriately.

## Known edge cases

- `<details>` accordion headings are keyboard-toggleable via space/enter natively — no custom ARIA needed.
- `style:inline-size` animations don't announce as "progress" without explicit `role="progressbar"` — TrialCountdown (lesson 077) uses the role.
