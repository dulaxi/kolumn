# Onboarding checklist card — design

**Date:** 2026-07-23
**Status:** approved (brainstorm session)

## What

A claude.ai-style "Get started" checklist card in the sidebar for new users:
three steps with title + one-line subtitle, a progress bar, per-step
completion state, and a hover-revealed dismiss (X). Teaches the core loop —
board → card → AI — then gets out of the way.

## Placement & visibility

- Rendered by `Sidebar.jsx` directly above `<SidebarBottom>`, desktop +
  expanded sidebar only (hidden on the collapsed rail and mobile drawer).
- Visible only when **all** of:
  - `profile.created_at` ≥ `SHIP_DATE` (single shared constant in
    `src/constants/onboarding.js`, imported by both the component and
    `authStore`; set to the deploy date so existing users never see it)
  - `onboarding_steps.dismissed` is unset
  - at least one of the three steps is incomplete
- Disappears automatically the moment the third step completes (no
  celebration state in v1).

## Items

| key | Title | Subtitle | Click action |
|-----|-------|----------|--------------|
| `board` | Create your first board | Or poke at the Welcome board we made you | navigate `/boards`, fire `kolumn:create-board` |
| `card` | Add a card | Click + New task in any column | navigate `/boards` |
| `ai` | Ask the AI | Type what you want done into the bar on any board | navigate `/boards` |

Completed items render with a lime `CheckCircle` (weight=fill) instead of the
empty circle, text muted. No strikethrough.

## Data

- Migration `2026-07-23-onboarding-steps.sql`: add
  `profiles.onboarding_steps jsonb not null default '{}'`.
- Shape: `{ board?: iso, card?: iso, ai?: iso, dismissed?: iso }` —
  timestamps, not booleans, for later funnel analysis.
- `authStore.markOnboardingStep(key)`:
  - no-op if the key is already set, or if `profile.created_at` < SHIP_DATE
    (old accounts never write)
  - for the three step keys only: also no-op when `dismissed` is set
    (writing `dismissed` itself is always allowed and naturally idempotent)
  - optimistic local merge + `updateProfile` persist.
- Dismiss = `markOnboardingStep('dismissed')` via the X button (permanent).

## Completion wiring (store-level hooks)

- `boardsSlice.addBoard` → `markOnboardingStep('board')`
- `cardsSlice.addCard` → `markOnboardingStep('card')`
- Pill submit (`QuickAddBar` LLM path — not the comma fast-path) →
  `markOnboardingStep('ai')`
- The tour-board seeder (`seedOnboardingBoard.js`) inserts via raw Supabase
  calls and never passes through these store actions, so seeding cannot
  mark steps. No exclusion flag needed.

## Styling (Kolumn tokens)

- Card: `bg-[var(--surface-card)]`, 1px `--color-sand` border, `rounded-xl`,
  shadow `0 4px 24px rgba(27,27,24,0.10)`, `p-3`, wrapped in `px-2 pb-2`.
- Header: "Get started" 12px medium + `n / 3` counter in `font-mono` 12px
  `--text-muted` (matches the pill/toast mono register).
- Progress: 4px track `--surface-raised`, fill `--accent-lime-dark`,
  `transition-[width]`.
- Rows: 13px `--text-primary` title, 12px `--text-secondary` subtitle,
  hover `--surface-raised`; done rows: lime filled CheckCircle, both lines
  `--text-muted`.
- Dismiss X: absolute top-right, hidden until card hover
  (`group`/`group-hover`), board clear-button recipe (`p-1 rounded
  hover:bg-[var(--surface-hover)] text-[var(--text-muted)]`, Phosphor X 3.5).

## Testing

- Vitest: visibility predicate (ship-date gate, dismissed, all-done) and
  `markOnboardingStep` no-op rules (already set / dismissed / old account).
- Manual: fresh-account pass in the browser; verify each hook fires once and
  the card disappears on the third completion.

## Out of scope (v1)

- Mobile/collapsed-rail presentation
- Celebration/complete state
- Retroactive credit for actions taken before ship date
- PostHog funnel events (timestamps in jsonb keep the door open)
