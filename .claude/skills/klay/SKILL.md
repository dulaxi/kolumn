---
name: klay
description: Use when creating, editing, or animating Klay — Kolumn's pixel mascot — including new animations, expressions, poses, props, or wiring Klay into app UI. Covers the sprite format, palette rules, and authoring workflow. Character source of truth is docs/klay-bible.md.
---

# Klay — Kolumn's pixel mascot

> **Character source of truth is `docs/klay-bible.md`.** Read it before any
> character work. It describes Klay as a squat mossy rock creature in
> three-quarter view with a side plane, three facings and an 18-animation
> vocabulary. **The sprite in this repo is a different, flatter variant** —
> 12×11, no side plane, no facings, 28 Kolumn-specific animations. That
> divergence is documented at the end of the bible and is unresolved. This
> file describes what is actually in `src/components/klay/`; where the two
> disagree, the bible wins on character and this file wins on the code. Named Klay (Kolumn + clay, the Clawd naming
recipe). He is the product metaphor made visible: something small, growing
into shape.

## Non-negotiable rules

1. **Mauve (`m`) belongs to Klay alone.** Props, scenery, and effects NEVER
   use mauve — they use honey/copper/sand/mist/charcoal/cream/lime. This is
   palette reservation: Klay must pop in any scene.
2. **Klay himself is 4 colors**: olive `o`, lime `l`, mauve `m`, ink `k`.
   No shading on Klay, no outline.
3. **Mixed resolution**: Klay lives on the coarse grid (12×11, chunky
   pixels); props render on the fine grid (24×22, half-size pixels) so
   they're legible. Never draw Klay at fine resolution.
4. **Low frame rate is the charm**: 2–5 frames per animation, 150–600ms per
   frame. Do not smooth, tween, or exceed ~6fps. Motion reads through pose
   changes, not interpolation.
5. His eyes are knockout-style ink pixels; expressions come from eye rows,
   blush, sprout posture (it can bend, grow, wilt, fly off), feet, and
   body shifts (BASE/DOWN/UP1) — not from new anatomy.

## Palette (hex)

| char | color | role |
|------|-------|------|
| `o` | #8BA32E olive | Klay stem |
| `l` | #C2D64A lime | Klay leaves + rare prop accents |
| `m` | #A8969E mauve | **Klay pot only** |
| `k` | #1B1B18 ink | Klay eyes |
| `w` | #FDFBF7 cream | props |
| `h` | #D4A843 honey | props |
| `c` | #C27A4A copper | props |
| `s` | #E0DBD5 sand | props |
| `K` | #5C5C57 charcoal | prop shading |
| `S` | #C4BFB8 mist | prop shading |

## Sprite format

Frames are string grids; each char is a pixel, `.` = transparent.
Coarse rows are 12 chars × 11 rows. Klay's anatomy in BASE pose:
sprout rows y1–3 (tip `l`, leaves `lll`, stem `o`), pot rows y4–6
(cols 3–8), eyes in y5, feet y7. Poses BASE / DOWN (1px lower) / UP1
(1px higher) express bobbing and jumps.

Props go in a sparse `hi` object: `{ fineRowIndex: '24-char string' }`,
drawn at half-pixel size after (in front of) the coarse layer.

## Where things live

- **Runtime source of truth**: `src/components/klay/klayAnimations.js`
  (palette, poses, eye/blush constants, `frame()` helper, ANIMATIONS map)
  and `src/components/klay/PixelKlay.jsx` (`<PixelKlay animation="tap" scale={8} />`).
- **Design studio (browser, hot-reload)**: `docs/design-mockups/klay-detailed-props.html`
  — 42 reference animations in the canonical style. Serve with
  `python3 -m http.server 8899 --directory docs/design-mockups`.
- **More references**: `potto-animations.html` (the core 12),
  `klay-100.html` (100 expression/motion ideas, coarse-prop era).
- Decision history: `pixel-cute-round.html` → `pixel-frog-bunny.html`
  (S6 = standing Klay, S2 = sitting/feetless Klay for tiny/static uses).

## Authoring workflow for a new animation

1. Sketch frames in the design studio page first (copy an existing `A(...)`
   entry in `klay-detailed-props.html`, edit the strings, save — browser
   hot-reloads). Iterate until the motion reads.
2. Port the frames into `ANIMATIONS` in `klayAnimations.js` using
   `frame(BASE|DOWN|UP1, coarseOverrides, hiRows, ms)`. Reuse `EYES.*` and
   `BLUSH` constants instead of retyping rows.
3. Timing sanity: total loop 0.8–2.5s; hold the "resolution" frame longest
   (e.g. hop's landing, grow's bloom).
4. Verify in the app: add a `<PixelKlay animation="yourname" />` specimen to
   `src/pages/BoardSkeletonSandbox.jsx` (dev-only, /sandbox/board-skeleton)
   and look at it. Both themes.
5. Accessibility: `PixelKlay` renders `role="img"` + `aria-label` — give
   meaningful labels when the animation carries meaning ("Klay celebrating").

## Usage guidance

Klay appears in *rare, meaningful* moments — route loader, empty states,
404, celebrations — not on every surface. Loading = `grow` or `tap`;
success = `hop`; error = `wilt`; long-idle = `sleep`. Keep him scarce so he
stays special. Words next to Klay use the letter-wave treatment
(`LetterWave`, tone="typing") — see `TypingIndicator.jsx`.
