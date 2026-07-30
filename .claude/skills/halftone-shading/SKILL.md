---
name: halftone-shading
description: >-
  Author monochrome halftone / stipple dot-art scenes where dot SIZE and OPACITY
  encode tone, and where every object is shaded PER-ITEM (drawn-in form) rather
  than by a computed scene light. Use this whenever building or editing dotted /
  halftone / ASCII-art / stippled / dithered illustrations and backgrounds —
  especially the Klay FM lo-fi "focus music" frames (window-desk night scene) —
  or any time the goal is a flat cream + ink dot scene that still reads as 3D.
  Trigger even on loose phrasings like "dotted background", "halftone scene",
  "stipple art", "make the dot art look less flat / more 3D", "dot-shaded
  illustration", or anything referencing Klay FM frames. Prefer this over
  hand-rolling dot loops from scratch — it carries the locked grid, size ceiling,
  shading method, and a live tuning tool.
---

# Halftone Shading

A method for drawing scenes as a field of ink dots on a flat cream ground, where
a dot's **size** (and secondarily its **opacity**) carries tone. Born from the
**Klay FM** project — a lo-fi YouTube channel whose frames are a window-desk
night interior in this style (see the [[klay-fm-halftone-settings]] memory and
the `klay` skill for the mascot who stands in the scene).

The whole appeal is *restraint*: sparse, delicate dots, lots of cream showing
through. Heavy blobby dots kill it. This skill exists to keep every frame on the
same grid, under the same size ceiling, shaded the same way.

## The three locked rules

These are what make separate frames feel like one channel. Break them only with a
deliberate reason.

1. **One consistent grid.** Every dot sits on a single fixed spacing (Klay FM uses
   **6px**). Never mix spacings within a frame — consistency of *spacing* is what
   reads as "one texture"; you vary *dot size*, not gap.
2. **A hard dot-size ceiling.** No dot may exceed a max radius (Klay FM: **r ≈
   1.68px**). Tone pushes radius up toward the cap and no further. This is the
   single most important guardrail against the "blobby" failure — enforce it at
   render time with `if (r > MAX_R) r = MAX_R`.
3. **Shading is authored PER ITEM, never computed from a scene light.** Do *not*
   build a lighting engine, a global light falloff, or physically-cast shadow
   smudges across the frame. That approach was tried and explicitly rejected — it
   looks muddy and generic. Instead, each object carries its *own* tone map:
   outlines and the object's shadow-side = big dark dots; its highlight-side =
   small faint dots. Form comes from *within* each item. (Full pattern library:
   `references/technique.md`.)

## Principles (what makes a scene read)

Learned building real scenes — these are as load-bearing as the three rules:

- **Detailed by default.** Author every object with real *form* (a light→shadow
  falloff across it, via `form()` — see `references/technique.md`) plus internal
  detail. Flat silhouettes read as clip-art; a 2-year-old's blob is a flat fill.
- **Monochrome world, color for the subject.** The scene is ink dots on cream;
  **color is reserved** for the living/energy elements — Klay, fire, music notes,
  a flag — drawn as crisp *pixels over* the dots. That contrast is what makes the
  subject pop and the set recede.
- **Density is mood.** "Clean, not messy" = light fills (0.3–0.5) + crisp
  outlines (0.9) + lots of blank cream (a bare sky). "Lush" = full-field texture.
  Choose per scene; don't texture everything by reflex.
- **Hero + supporting cast + depth.** One focal object, others in support, each
  at a different depth (nearer = lower/bigger). A flat row of same-size props
  reads as scattered stickers.

## The render model

Think of a scene as a stack of **layers**, background → foreground. Each layer is
a pure function `tone(x, y) → 0..1` (0 = not in this layer; higher = darker),
sampled on the shared grid. The **topmost** layer that returns non-zero at a
point wins — that's the surface you see there.

Then map that surface's tone to a dot:

```js
let r = (0.6 + tone * 3.4) * layerSize;   // layerSize = per-layer size ceiling
if (r > MAX_R) r = MAX_R;                  // rule 2 — the hard cap
if (r < 0.12) continue;                    // too faint → whitespace
const op = clamp(0.2 + 0.8 * tone, 0.06, 1) * layerOpacity;  // lit→faint, dark→opaque
```

- **`tone` already contains the shading.** Because each item's `tone(x,y)` varies
  *inside* the item (rule 3), the radius/opacity variation renders its form. There
  is no separate light term.
- **`layerSize`** is a per-layer multiplier (also a ceiling — the tuned Klay FM
  values live in the memory). It lets a whole layer read lighter/heavier without
  touching its internal shading.
- **`op` from tone** is what gives the "lighter = small *and* faint" feel within
  an item; `layerOpacity` (default 1) is an optional whole-layer fade.

## Animation

Scenes in this style **move** — rain falls, steam rises, clouds drift — alongside
the character. The model extends cleanly: a static layer is `tone(x,y)`, an
animated one is **`tone(x,y,t)`** (t = seconds). Same grid, same cap, same
shading; motion is just tone that reads a clock, and on a fixed grid it reads as
ASCII animation (dots flipping in place). Two things matter: render static layers
**once** and recompute only movers per frame (the performance split), and keep a
tight **motion budget** — only 2–4 things move, everything else is still.
Klay FM's locked pace is deliberately choppy (**fps 6**) so the background shares
the mascot's low-frame-rate charm. Full vocabulary (drift / oscillate / pulse /
cycle / rare), seamless-loop rules, and the render split live in
`references/motion.md`; `assets/anim-template.html` is a working animated frame
and `assets/motion-mixer.html` tunes movers live.

## Palette (Klay FM defaults — swappable)

- Background: **`#f5f3ed`** (warm cream)
- Ink dots: **`#15130d`** (warm near-black)
- Accent (title ♪ only): copper **`#C27A4A`**
- Title: IBM Plex Mono, right-aligned, inside a **knockout box** — a rectangle
  where you skip drawing dots entirely (`if (inside titleBox) continue`), so the
  mono text floats in clean cream. Knockouts are the inverse of a layer: negative
  space you reserve.

For a different scene you can swap bg/ink, but keep the *warm* pairing — cool
cream + cool ink reads clinical. The one spot of real color in a Klay FM frame is
Klay himself (his 4-color sprite), added last, as a solid crisp sprite over the
dots. His Klay FM dimensional/tilt treatment (turn faked by sliding eyes + a
darker color band, not by reshaping) has its own renderer and rules in
`references/klay-tilt.md` + `assets/klay-tilt.html`. Things he *uses* (laptop,
mug) render fine/detailed and in the prop palette, never mauve.

**A complete, editable Klay FM frame** lives in `assets/klay-fm-frame.html`
(halftone night-desk scene + motion pass + tilt-Klay + a fine-pixel MacBook he
types on + the pixel-note title, composed in layer order) — copy it and edit the
five marked blocks to make a new frame; you never start from blank. To build a
frame from a rough user **sketch**, follow `references/from-sketch.md` — this
style is layout-driven, so a labelled box drawing is enough input.

## Authoring workflow

1. **Block the scene as layers.** Start from `assets/scene-kit.html` — the engine
   (dot renderer, cap, knockout title, static/animated loop) plus the **form-shaded
   pattern library** baked in; you just fill the `LAYERS` array (tone functions,
   back→front) and `OVERLAYS` (per-frame draws). Everything above the "▼ SCENE"
   line is the engine you don't touch. (`assets/scene-template.html` is the older,
   library-less version — prefer scene-kit.)
2. **Shade each item from the pattern library.** `references/technique.md` gives
   reusable tone authors — `cyl` (round body), `book`/cover (flat panel), `bevel`
   (window frame / anything with thickness), sphere, cloth, plus knockouts. Reach
   for these instead of inventing per-object math.
3. **Tune density in the mixer.** Open `assets/mixer.html` (same scene, plus a
   live control panel): a global **spacing** slider and per-layer **size** +
   **opacity** sliders, updating live. Dial it until it reads, then hit **Copy
   settings** — it emits JSON you paste back into the scene's config. Size 0 on a
   layer = whitespace (omit it).
4. **Motion pass.** Decide what moves. List every element and pick the 2–4 that
   carry ambient life (`references/motion.md` for the drift/oscillate/pulse/cycle/
   rare vocabulary and seamless-loop rules); give each a `tone(x,y,t)`. Use
   `assets/anim-template.html` (static/animated render split baked in) and tune
   speed/amount live in `assets/motion-mixer.html`. Stay in the locked pace
   (fps 6, slow, sparse) unless the scene needs otherwise.
5. **Verify:** `node --check` the scene's script FIRST — one parse error (e.g.
   `-x**2`, which JS refuses to parse) blanks the entire frame. Then confirm the
   rules held: one spacing, nothing over the cap, no global light.
   Cheap numeric checks (run the scene math in Node): max radius ≤ cap, and no
   declared layer renders **0 dots** — a zero-dot layer is fully occluded by a
   later layer or mis-placed (invisible in the browser, obvious in a dot count).
   Then, for Klay FM, add Klay in his reserved spot (see the `klay` skill) as the
   lone color.

Serve either HTML with any static server, e.g.
`python3 -m http.server 8899 --directory <dir>` and open it — both hot-reload on
save, so iterate in the browser.

## Failure modes (learned the hard way)

- **Blobby / heavy** → dots too big. Check the cap and lower `layerSize`. Delicate
  and sparse is correct even when it feels too subtle up close; it reads at
  video scale.
- **Muddy / generic depth** → you reached for a global light or cast shadows.
  Delete it. Depth must be authored *per item* (rule 3).
- **Texture looks "off" / stripey** → inconsistent spacing, or a layer sampled on a
  different grid. All layers share one spacing.
- **Too clean / mechanical** → add a tiny deterministic jitter to tone
  (`hash(x,y)*0.08`) so edges dither instead of banding. Keep it small.

## When NOT to use this

This is for *dot/halftone* art specifically. For Klay's sprite animation itself
use the `klay` skill; for normal app UI use the Kolumn design system. Don't apply
the dot treatment to functional UI — it's an illustration technique.
