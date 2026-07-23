# Upsell Step — Klay's Journey (design)

**Date:** 2026-07-22 · **Branch:** development · **Status:** approved design

## Summary

Redesign the onboarding upsell step (`/onboarding?step=upsell`). The three
feature cards keep their copy and the header + trial CTA stay unchanged. The
hand-built UI-mock visuals (`ChatVisual`, `AgentVisual`, `IntegrationsVisual`)
are replaced by one continuous pixel-art stage spanning the bottom of the
three-card row, with a **single Klay** who walks left→right between three
stations, performing each card's story on arrival.

Decisions made with the user:

1. **One Klay, travels** — a single sprite lives in one card at a time and
   visibly moves on; not three simultaneous instances, not a fixed morphing
   stage.
2. **Klay scenes replace the mocks** — all-pixel-art visuals, one coherent
   style. Vacated cards show resting props, so they read as intentional.
3. **Continuous floor walk** — the three cards share a floor line; Klay
   literally walks across card boundaries. Mobile falls back to fade-out /
   fade-in.

## The journey (state machine)

A small controller cycles:

```
perform(0) → walk(0→1) → perform(1) → walk(1→2) → perform(2) → exit right →
re-enter left → perform(0) → …
```

- **Wrap:** always left→right. After station 2, Klay walks off the right edge
  and re-enters from the left (same clip-at-edge trick the `ship` animation
  uses). No mirrored sprites needed — every scene is LEFT-pose (Klay left,
  props on his right).
- **Dwell:** ≈ 2 loops of the station's scene animation (~6–8s per station).
- **Travel:** ~2s per hop, playing the existing `walk` animation while the
  sprite container translates. Use stepped easing (`steps()`) so the glide
  doesn't read as tweening — low frame rate is the charm.
- **Active card:** subtle emphasis while Klay performs there (tag chip tint /
  visual-area dim on inactive cards). Restrained — no borders lighting up.

## The three scenes

| Card | Animation | Status |
|------|-----------|--------|
| Chat with your boards | `converse` — speech-bubble exchange | exists, reuse |
| Agentic moves | `last-move` — card hops Doing → Done, Klay celebrates | exists, reuse |
| Connect your tools | `connect` — **new**: honey socket on the floor; Klay pushes a copper plug in (reusing the `push-card`/`ship` push grammar); it clicks, a honey spark pops, hold the payoff | to author |

`connect` follows the klay skill workflow: sketch in
`docs/design-mockups/klay-detailed-props.html` (hot-reload studio), port into
`ANIMATIONS` in `src/components/klay/klayAnimations.js`, verify in
`/sandbox/board-skeleton`. Palette rules apply: mauve is Klay's alone; props
use honey/copper/sand/mist/charcoal/cream.

## Empty stations

When Klay is elsewhere, each card shows its scene's **resting props** as a
static fine-grid frame — bubble outline (chat), two mini columns + card
(agentic), socket (tools) — via a small static renderer (`KlayProps`) reusing
the same grid/palette code as `PixelKlay`. Static props crossfade out as Klay
arrives (his animation carries its own animated props) and back in when he
leaves.

## Responsive & accessibility

- **Desktop (md+, 3 columns):** continuous walk as described.
- **Mobile (stacked):** no cross-card walking. Klay fades out at one station
  and fades in at the next; same dwell rhythm.
- **`prefers-reduced-motion`:** no traveling, no looping. Each card shows a
  static frame — Klay standing in card 1, resting props in cards 2–3.
- **A11y:** the stage is decorative (`aria-hidden`) except Klay himself, who
  keeps `role="img"` with a meaningful label ("Klay demonstrating Kolumn Pro
  features").

## Architecture

- **New:** `src/components/klay/KlayJourney.jsx` — journey controller + stage
  strip, absolutely positioned over the card row inside the existing `<ul>`
  container. Measures station targets from the cards' visual slots
  (refs / percent offsets).
- **New animation:** `connect` in `klayAnimations.js`, plus static-props
  rendering support (`KlayProps` or a `static` mode on `PixelKlay`).
- **Changed:** `UpsellStep` in `src/pages/OnboardingPage.jsx` — visual slots
  become station markers; copy, header, and CTA untouched.
- **Deleted:** `ChatVisual`, `AgentVisual`, `IntegrationsVisual`, and
  `VisualFrame` if nothing else uses them.

## Testing

- Vitest with fake timers: journey controller transitions (station order,
  dwell/walk timing, wrap, reduced-motion branch).
- Render test: three cards' copy + both CTAs still present.
- Manual: dev step picker → `?step=upsell`, both themes, desktop + narrow
  viewport, reduced-motion emulation.
