# Lesson 010 — Build the fluid typography scale with `clamp()`

**Module:** 1 — Foundation
**Phase:** PE7 Build Order → Phase 1, Step 10
**Previous lesson:** 009 — Build the 9-tier breakpoint scale
**Next lesson:** 011 — Set up the `@layer` cascade
**Estimated time:** 15 minutes
**Files touched:** `src/lib/styles/typography.css`, `src/routes/+layout.svelte`

---

## Context

Fixed font sizes belong to the 2012 era when most reading happened between 1024px and 1440px. In 2026, ForgeSchool readers are simultaneously on 320px-wide iPhone SE screens and 3840px-wide UHD monitors, and they expect the same component to feel balanced at both extremes. A static `font-size: 16px` is too small on the UHD display and often too large on the smallest phone. `@media`-query jumps between 16px / 18px / 20px produce visible size steps as the user resizes, which is jarring.

The right answer in 2026 is **fluid typography** using CSS `clamp(MIN, PREFERRED, MAX)`. The preferred value is a linear interpolation across viewport width, so as the viewport grows, font size grows continuously — no stepping, no media queries, no JavaScript. The `MIN` and `MAX` bounds prevent the size from going absurdly small on tiny screens or absurdly large on ultra-wide monitors.

This lesson produces `src/lib/styles/typography.css` with:
- Font family stacks (sans, serif, mono)
- An 11-step fluid size scale — from `--font-size-xs` (12px → 13px) to `--font-size-6xl` (76px → 96px)
- Line-height, letter-spacing, and font-weight primitives

Every font-size declaration anywhere in this codebase will use `var(--font-size-md)` or similar. Direct `font-size: 18px` declarations will be an anti-pattern we catch in review.

## The command

Create the typography file:

```bash
touch src/lib/styles/typography.css
```

Write `src/lib/styles/typography.css`. The complete file defines font families, the fluid size scale, and the supporting primitives inside `@layer tokens`:

```css
@layer tokens {
  :root {
    /* Font families — system-font stacks for zero network cost */
    --font-sans: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
                 'Helvetica Neue', Arial, 'Noto Sans', sans-serif,
                 'Apple Color Emoji', 'Segoe UI Emoji';
    --font-serif: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
    --font-mono: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas,
                 'Liberation Mono', 'Courier New', monospace;

    /* Fluid size scale — clamp(min, preferred, max)
       preferred grows linearly from 320px → 1536px viewport */
    --font-size-xs:   clamp(0.75rem,  0.7336rem + 0.0822vw, 0.8125rem);   /* 12→13 */
    --font-size-sm:   clamp(0.875rem, 0.8586rem + 0.0822vw, 0.9375rem);   /* 14→15 */
    --font-size-base: clamp(1rem,     0.9671rem + 0.1645vw, 1.125rem);    /* 16→18 */
    --font-size-md:   clamp(1.125rem, 1.0921rem + 0.1645vw, 1.25rem);     /* 18→20 */
    --font-size-lg:   clamp(1.25rem,  1.1842rem + 0.3289vw, 1.5rem);      /* 20→24 */
    --font-size-xl:   clamp(1.5rem,   1.4013rem + 0.4934vw, 1.875rem);    /* 24→30 */
    --font-size-2xl:  clamp(1.875rem, 1.7434rem + 0.6579vw, 2.375rem);    /* 30→38 */
    --font-size-3xl:  clamp(2.375rem, 2.2105rem + 0.8224vw, 3rem);        /* 38→48 */
    --font-size-4xl:  clamp(3rem,     2.8026rem + 0.9868vw, 3.75rem);     /* 48→60 */
    --font-size-5xl:  clamp(3.75rem,  3.4868rem + 1.3158vw, 4.75rem);     /* 60→76 */
    --font-size-6xl:  clamp(4.75rem,  4.4211rem + 1.6447vw, 6rem);        /* 76→96 */

    /* Unitless line heights — scale cleanly with font-size */
    --line-height-tight: 1.1;
    --line-height-snug: 1.25;
    --line-height-normal: 1.5;
    --line-height-relaxed: 1.625;
    --line-height-loose: 1.875;

    /* Letter spacing in em — scales with font-size */
    --letter-spacing-tighter: -0.04em;
    --letter-spacing-tight: -0.02em;
    --letter-spacing-normal: 0;
    --letter-spacing-wide: 0.02em;
    --letter-spacing-wider: 0.04em;
    --letter-spacing-widest: 0.08em;

    /* Weights — match the weights available in system fonts */
    --font-weight-regular: 400;
    --font-weight-medium: 500;
    --font-weight-semibold: 600;
    --font-weight-bold: 700;
  }
}
```

Wire it into the root layout after the breakpoint import:

```diff
 import '$lib/styles/tokens.css';
 import '$lib/styles/breakpoints.css';
+import '$lib/styles/typography.css';
```

### The clamp math, derived

For `--font-size-base: clamp(1rem, 0.9671rem + 0.1645vw, 1.125rem)` — 16px at 320px viewport, 18px at 1536px viewport:

1. The slope in px-per-px-of-viewport is `(18 - 16) / (1536 - 320) = 2 / 1216 ≈ 0.001645`.
2. `1vw` equals 1% of viewport width, so 1vw in px is `viewport_px / 100`. The vw coefficient that produces the slope in step 1 is `0.001645 * 100 = 0.1645`.
3. The rem intercept solves `16 = rem_intercept * 16 + 0.1645 * 3.2` at viewport 320, giving `rem_intercept = 0.9671`.

At viewport 320: `0.9671 * 16 + 0.1645 * 3.2 = 15.47 + 0.53 = 16px` ✓
At viewport 1536: `0.9671 * 16 + 0.1645 * 15.36 = 15.47 + 2.53 = 18px` ✓

Below 320 the `1rem` min holds. Above 1536 the `1.125rem` max holds. Between those anchors, the browser linearly interpolates. Every other scale step uses the same formula with different min/max pairs.

Verify:

```bash
pnpm check
pnpm build
```

Expected: 0 errors.

## Why we chose this — the PE7 judgment

**Alternative 1: Fixed rem sizes with no fluid scaling**
Static sizes are simpler and more predictable. On a design tool's fixed canvas (1440px or 1512px) they look fine. On real browsers at arbitrary widths, they produce layouts that are either too dense on small screens or too sparse on large ones. The fluid approach removes the size-tuning problem entirely — one declaration, every viewport.

**Alternative 2: Step-based responsive sizes via `@media` queries**
Declare three sizes at three breakpoints. `font-size: 16px; @media (min-width: 768px) { font-size: 18px; }`. This works but has two costs. First, every font-size declaration triples in length. Second, users resizing the browser window see abrupt jumps at each breakpoint, which feels unpolished. `clamp()` produces continuous, browser-native scaling without ceremony.

**Alternative 3: JavaScript-based font-size scaling on resize**
A ResizeObserver that recomputes font sizes on viewport change. The CSS `clamp()` solution achieves the same result using zero JavaScript and zero runtime cost. JS-based scaling also introduces layout-shift risk during the observer's initial fire. `clamp()` is evaluated by the browser on every repaint; JS scaling is evaluated on observed events — the former is strictly more reliable.

**Alternative 4: Relative units only (`em`, `rem`, `vw`) without `clamp`**
Using raw `vw` for font sizes (`font-size: 2vw`) scales forever — a 3840px display renders the text at 76.8px even when it was tuned for 30px. And at 320px, the same declaration renders at 6.4px — unreadable. `clamp()` provides the floors and ceilings that raw `vw` lacks.

**Alternative 5: Utopia.fyi or a third-party fluid-typography generator**
Tools like [Utopia](https://utopia.fyi/) generate fluid clamp scales automatically. For a design system at scale, they're excellent. For a single project, generating the 11 values by hand takes 10 minutes, produces a file that is fully understood by the author, and eliminates a dependency on an external tool's decisions. If ForgeSchool ships a design-token generator in year 3, we can regenerate this file from Utopia — the CSS custom property API is unchanged.

The PE7 choice — hand-derived `clamp()` values in a single file — wins because it is zero-dependency, fully understood by the author, and produces the exact scale ForgeSchool wants.

## What could go wrong

**Symptom:** Text appears enormous at 320px viewport, tiny at 1920px
**Cause:** The `clamp()` arguments are in the wrong order. `clamp(MIN, PREFERRED, MAX)` — `MIN` must be the smallest value, `MAX` the largest. Swapping them produces reversed scaling.
**Fix:** Check each declaration. If `MIN > MAX`, swap them and re-verify both anchors.

**Symptom:** Font size appears to grow even above 1536px viewport
**Cause:** The `MAX` value was set too high, or the preferred expression overshoots the declared `MAX` before `MAX` kicks in.
**Fix:** Substitute the 1536 anchor into the preferred expression and confirm the result equals the `MAX`. If the preferred result exceeds `MAX` at 1536px, the `vw` coefficient is too large.

**Symptom:** Lighthouse flags "accessible text size" violations on small phones
**Cause:** A step below `--font-size-sm` is being used for body text. The minimum body text size should be 14-16px; 12px (`--font-size-xs`) is for meta text, timestamps, badges — not paragraphs.
**Fix:** Audit body-text usage and upgrade to `--font-size-sm` or `--font-size-base`. Keep `--font-size-xs` reserved for non-content labels.

**Symptom:** Line heights look cramped after applying a fluid font-size
**Cause:** Line heights were specified with absolute units (`line-height: 24px`) instead of unitless numbers (`line-height: 1.5`).
**Fix:** Use the `--line-height-*` primitives. Unitless line heights scale with font-size; absolute line heights do not.

## Verify

```bash
# All 11 scale steps defined
grep -c "^\s*--font-size-" src/lib/styles/typography.css
```

Expected: `11`

```bash
# Each uses clamp()
grep -c "clamp(" src/lib/styles/typography.css
```

Expected: `11`

```bash
# Typography is imported in the root layout
grep 'typography.css' src/routes/+layout.svelte
```

Expected: `import '$lib/styles/typography.css';`

```bash
pnpm check
pnpm build
```

Expected: 0 errors, clean build.

**Live-browser check:** Open the dev server. In DevTools, inspect `body` and resize the window from 320 to 1536 pixels wide. Computed `font-size` on elements using `--font-size-base` should interpolate smoothly from ~16px to ~18px.

## Mistake log — things that went wrong the first time I did this

- **First pass used `0.9474rem + 0.2632vw` for `--font-size-base`.** Checked both anchors by hand: 16px at 320 ✓, but 19.2px at 1536 ✗ (overshot the 18px max, which meant `MAX` clamped earlier than 1536). Re-derived from the linear-interpolation formula. Landed on `0.9671rem + 0.1645vw`. Verified both anchors match their target values to 2 decimal places.
- **Tried to express the preferred as pure `vw` without a rem component.** `font-size: clamp(1rem, 1.17vw, 1.125rem)` seemed simpler. But at 320px viewport, 1.17vw = 3.74px — way below the 16px min, so the scale sticks to min all the way until 1.17vw ≥ 16, which requires a 1367px viewport. Fluid growth barely happens inside normal viewport widths. The rem-plus-vw form is the only one that produces continuous growth across the full range.
- **Skipped the min line-height of 1.1.** Body text used 1.5 everywhere. On display headings (`--font-size-5xl`, `--font-size-6xl`), 1.5 line-height produces enormous vertical gaps — the 96px display text at 1.5 is 144px line box. Added `--line-height-tight: 1.1` and `--line-height-snug: 1.25`. Display headings use tight; body text stays at normal.
- **Used pixel letter-spacing values.** `letter-spacing: -0.5px` doesn't scale with the fluid font-size. Switched to em units (`-0.02em`), which scales proportionally — a 60px heading at `-0.02em` has 1.2px of negative tracking; the same heading at 76px has 1.52px. The visual tension stays proportional.

## Commit this change

```bash
git add src/lib/styles/typography.css src/routes/+layout.svelte
git add curriculum/module-01-foundation/lesson-010-fluid-typography.md
git commit -m "feat(typography): add fluid clamp() type scale + lesson 010"
```

With the typography scale in place, the design-system chassis is complete: colors, breakpoints, type. Lesson 011 assembles everything into an explicit `@layer` cascade so the order of CSS precedence is deterministic and auditable.
