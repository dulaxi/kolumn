# Onboarding Polish Pass — Design

**Date:** 2026-06-30
**Branch:** development
**Status:** Awaiting user review
**Scope:** Refinement only — no flow/step changes, no new aesthetic direction. Polish the existing 7-step `/onboarding` wizard (`src/pages/OnboardingPage.jsx`).

## Goal

Make the existing onboarding flow feel like one designed object rather than seven separately-built pages. The flow is already well-built (design tokens, good microcopy, custom visuals); this pass fixes cross-step inconsistencies and adds the "finish" affordances a multi-step wizard expects.

## Core architectural change: extract `<StepShell>`

Today every step re-implements its own outer layout, header block, and vertical centering — which is *why* they drifted apart. Introduce one shared wrapper that every step renders inside:

```
<StepShell step={step} onBack={…}>
   ├─ logo (centered — existing markup, lifted into the shell)
   ├─ progress indicator (segmented dots)        ← new (B5)
   ├─ back affordance (conditional)              ← new (B6)
   └─ motion wrapper (fade + slide on step change) ← new (C8)
        └─ {step content}                         ← consistent H1 + centering
```

- Lives in `OnboardingPage.jsx` (same file) as a new component, since the steps are already co-located there.
- Each step component keeps its own *inner* content (form, cards, visuals) but loses its duplicated outer `<div className="min-h-screen…">` / logo / centering wrapper — those move to the shell.
- This fixes A1 (heading scale) and A2 (vertical alignment) **by construction**: there is only one outer layout now.

## Work items

### A. Cross-step consistency
- **A1 — Heading scale:** all step `<h1>` use `text-[32px] font-light font-logo leading-[1.15] tracking-tight`. `PlanStep` drops from `text-[40px]` to `text-[32px]`.
- **A2 — Vertical alignment:** the shell centers content vertically and scrolls when content is taller than the viewport, so tall steps (`plan`, `upsell`) no longer jump relative to short steps.
- **A3 — Radius:** standardize per the CLAUDE.md coherency rule — raised surfaces (cards, panels) → **12px** (`rounded-xl`); buttons → **8px** (`rounded-lg`). Remove the repeated `!rounded-[0.6rem]` button overrides and the `rounded-2xl`/`rounded-3xl` card values. (Button primitive default is NOT changed — that's app-wide and out of scope; we set the radius at the onboarding call sites only.)
- **A4 — Border token:** replace hardcoded `border-[var(--color-sand)]` with `border-[var(--border-default)]` on onboarding cards/panels. Fixes a real dark-mode bug: `--color-sand` is `#3A3937` (stale) while `--border-default` is `#454340` (tuned), so onboarding borders are currently fainter than the rest of the app in dark mode. Light mode is unaffected (both `#E0DBD5`).

### B. Affordances
- **B5 — Progress indicator (segmented dots):** 7 dots under the logo, one per entry in `STEPS`. Dots at/before the current index are filled (`--text-primary`); ahead are hollow (`--border-default`). Lives in `StepShell`. Derived from `STEPS.indexOf(step)`. `aria-hidden` on the dots; pair with an `sr-only` "Step N of 7" for screen readers.
- **B6 — Back affordance:** a quiet top-left chevron + "Back" in the shell. Behavior by step (accounts for the irreversible signup between `details` and `plan`):
  | Step | Back goes to |
  |------|--------------|
  | terms | `/` (landing) |
  | details | terms |
  | **plan** | **hidden** — account was just created at `details`; cannot un-create |
  | upsell | plan |
  | disclaimer | upsell |
  | name | disclaimer |
  | role | name |

  Post-signup steps (upsell→role) only mutate local state / idempotent profile updates, so back among them is safe. `plan` is the single step with no back, because going back to `details` would re-trigger signup (→ "user already registered"). This omission is intentional and documented.
- **B7 — Primitive reuse:** `NameStep` uses the `Input` primitive instead of a hand-rolled `<input>`, matching `DetailsStep`. (The terms checkbox and disclaimer toggle are semantically distinct controls — agreement vs. setting — and stay as-is; unifying them is out of scope.)

### C. Finish
- **C8 — Step transition:** wrap step content in `motion` (`AnimatePresence`, keyed on `step`): enter = opacity 0→1 + translateY 4px→0 over ~180ms; exit = fade only. Gated by `prefers-reduced-motion` (no transform/opacity animation when the user prefers reduced motion). Uses the already-installed `motion` package.
- **C9 — Heading dedup:** `details` heading changes so it doesn't echo `terms`. `terms` keeps "Let's create your account"; `details` → "Choose a password" (specific to that step's actual job). Subcopy adjusts to match.

## Out of scope (explicitly)
- No change to the number, order, or logic of steps.
- No change to the branch logic (free → upsell path, pro → `/upgrade/pro`).
- No change to the `Button` primitive's default radius (app-wide).
- No new copy beyond the C9 dedup.
- No backend / profile-schema changes (training-data + role are still held locally as today).

## Testing
- Existing `src/__tests__/validation.test.jsx` (covers onboarding validation) must still pass.
- Add coverage: progress indicator reflects the current step; back affordance is hidden on `plan` and present elsewhere; `NameStep` renders an `Input`.
- Manual: walk all 7 steps via the dev step-picker in light AND dark mode; confirm no vertical jump between steps, borders match the rest of the app in dark mode, and reduced-motion disables the transition.
- `npm run build` + `npm run lint` clean.

## Risks
- **Centering tall steps:** `plan` (3 cards) and `upsell` (feature grid) can exceed viewport height. The shell must center *and* allow scroll (`min-h` + overflow), or content clips on short screens. Verify at ~700px height.
- **`StepShell` refactor touches all 7 steps at once.** Mitigation: lift the outer wrapper but leave each step's inner content untouched; verify step-by-step via the dev picker.
