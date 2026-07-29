# Klay FM — dimensional Klay & the tilt model

Klay is the one spot of **color** in a Klay FM frame (everything else is ink
halftone). This file covers the *Klay FM–specific* dimensional variant and the
one-axis **tilt** renderer. Canonical flat Klay lives in the separate `klay`
skill and is unchanged — this is a channel-only treatment.

## The core idea: tilt by color, not shape

Klay's **silhouette never changes** — same canonical sprite at every angle. A
turn is faked with two cues only:

1. **Eyes slide** toward the direction he's looking.
2. A **darker-color band** grows on the *depth side* (the side turning away).

That's it. No foreshortening, no side-face sticking out, no shape morph — which
would look jagged at this pixel size. One parameter (azimuth) drives both cues.

**Depth-follows-facing rule:** looking **right → depth on the LEFT**; looking
left → depth on the right. Eyes and shadow move in opposite directions (that
opposition is the real-world cue that sells the turn).

Decisions already made, do not re-litigate: **no pitch axis** (vertical tilt was
prototyped and dropped), **no depth on the leaves/tip** (only pot, legs, stem),
**no light top-rim** (depth is shadow only). Depth is a darker shade of each
part's own hue — never a new outline.

## Canonical sizes (from the `klay` skill)

Pot 6 wide × 3 tall (grid cols 3–8), eyes as full-cell squares at **cols 4 & 7**
(row 5), feet at **cols 4 & 7** (row 7), leaves **cols 5–7** (row 2), stem & tip
at **col 6** (rows 3 & 1). At axis 0° the tilt renderer collapses to exactly
this — it *is* canonical Klay at front.

## Per-part depth (locked)

Each part carries its **own** depth amount (a thin box's side is smaller than a
fat one's), scaled by `sin(angle)`:

| Part | depth default | how it shades |
|------|--------------|---------------|
| Pot | **1.6** | one big band sweeps across cols 3–8 (near part shadows first) |
| Legs (each) | **0.6** | each foot gets its own sliver on the depth side |
| Stem | **0.6** | own sliver, dark **olive** |
| Leaves / tip | — | none |

The shade also **deepens** with angle (`lerp` toward a darker tone as `sin`
grows), so both the width *and* the darkness read the turn. Ratio pot:leg ≈
2.7:1 — consistent with the hand-tuned 9px:4px split it came from. Pot 1.6 is
deliberately confident (not 1.3) because his resting pose is *turned toward the
laptop the whole time*, so the depth must read at that everyday angle.

## Using the renderer

`assets/klay-tilt.html` is both the live tuner and the reusable function:

```js
// returns an SVG <rect> string — drop into a <g shape-rendering="crispEdges">
klayTilt(azDeg, { U:18, cx, groundY, potDepth:1.6, legDepth:0.6 })
//   U       = px per coarse cell (Klay FM host frame used ~18)
//   cx      = his feet-center x   groundY = feet-bottom y
```

Rendering notes:
- Give Klay's `<g>` **`shape-rendering="crispEdges"`** and draw each rect ~0.6px
  oversized (the helper does this) to kill anti-alias seams between pixels.
- Klay is a **solid color sprite drawn over** the halftone scene (topmost group,
  above the dot layers), never dotted — the crisp-vs-dots contrast is what makes
  him the subject.
- Things Klay **uses** (laptop, mug) render as **fine/detailed** pixels (half the
  coarse cell), never chunky — and in the prop palette, never mauve.

## Animating

Pick an `azDeg` per frame like any other value. A gentle idle can hold a small
negative axis (turned toward a laptop on his right) and blink; a "look up from
the screen" beat eases axis toward 0 and back. Keep motion low-fps per the
Klay-scarce, lo-fi register (see `motion.md`).
