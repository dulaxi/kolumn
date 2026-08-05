---
name: klay-fm
description: Use when building Klay FM channel content — the lo-fi halftone YouTube scenes where a colored pixel Klay is composited over halftoned Veo loop videos. Covers the channel Klay sprite (klay.js), the two-scale Klay/prop model, the draw-prop → rig → composite pipeline, the locked halftone standard, and scene-module anatomy. This is CHANNEL-ONLY and is distinct from the app's canonical `klay` skill.
---

# Klay FM — lo-fi halftone channel

Klay FM is a lo-fi "focus music" YouTube channel (git branch `klay`). Each scene =
a **Veo loop video**, rendered live through a **halftone** filter (grey dots on cream),
with a **colored pixel Klay** composited on top doing something calm. The hook:
*Klay's color is the only color in a grey dot world.*

All working files live in `.superpowers/brainstorm/*/content/` and are served on a
local static server (`python3 -m http.server 8080` from that dir). Author → **render a
PNG and Read it** → then show the user. Never author pixel art blind.

> This skill is **channel-only**. It intentionally diverges from the app's canonical
> `klay` skill (that one says "no shading, 12×11"). Do NOT edit the canonical skill or
> `src/components/klay/` from channel work.

## 1. The channel Klay — `content/klay.js`

Single source of truth for the channel mascot. A **12×14** sprite, 6 colors:

- `o` olive `#8BA32E`, `l` lime `#C2D64A`, `m` mauve `#A8969E`, `k` ink `#1B1B18`
- `M` mauve-**shadow** `#8F8088`, `O` olive-**shadow** `#6b7b2d`  ← front-lit shading

Exports `KLAY = { base, right, left, baseBlink, rightBlink, leftBlink }` plus
`KW=12, KH=14, EYE_ROWS=[7,8], BODY_FILL_ROW=6, HAND=[10,10]`.

**Motion vocabulary — DON'T over-use left/right head-turns.** `klay.js` exports helpers to
compose per-scene variety; he's a plant, so lean on the SPROUT:
- `bob(pose, dy)` — shift the whole sprite vertically (breathing, bounce, perk-up).
- `sway(pose, dx)` — lean just the leaf+stem (sea breeze, musing).
- `lean(pose, dx)` — tip the upper body toward a thing (peering into a scope), feet planted.
- `blinkOf(pose)` — blink any composed pose.
Each scene should pick a DISTINCT combo (e.g. lighthouse = lean-in + perk + sway + breathe;
farm = watering; station = platform glances). Left/right is one option, not the default.

**Pose/lighting model (locked):**
- **Front-lit.** He faces a direction → the FAR side is shadow. `right` pose = eyes
  nudged right + `M` shadow column on the LEFT + `O` on the stem/leaf's left edge.
- **`left` is auto-mirrored** from `right` (`mirror()` reverses each row → shadow flips
  to the right, eyes shift left). Never hand-draw the mirror.
- **Blink is derived** (`blink()` copies `BODY_FILL_ROW` over the two eye rows) — every
  facing gets a matching blink for free.
- Mauve (`m`/`M`) still belongs to Klay alone. Props never use mauve.

## 2. Two-scale model (THE key rule)

**Klay draws at 2× (chunky); props draw at 1× (fine = half Klay's pixel).** One flag,
`KSCALE=2`, in the composite's draw loop:

```js
// Klay: chunky
fillRect(KOX + x*KSCALE, KOY + y*KSCALE, KSCALE, KSCALE)
// prop: fine (half Klay's pixel → 4× the detail in the same footprint)
fillRect(propX + x, propY + y, 1, 1)
```

This keeps Klay iconic/blocky while detailed props (watch, briefcase, watering can)
stay small AND hold their detail. The user calls it "splitting each prop pixel into 4."
Everything (Klay + all props + emitted particles like water droplets) lives in one shared
**fine** grid; only Klay is drawn ×KSCALE.

## 3. Prop pipeline: creator → rig → composite

Three browser tools, one hand-off chain. Props are USER-DRAWN, then I place them.

1. **`content/pixel-creator.html`** — user paints a prop on a grid, exports a block:
   `// WxH` + `const P={…}` (letter→hex legend) + `const SPRITE=[ '..hch..', … ]`.
   The legend is the important half — it makes "remake it exactly" a copy-paste.
   (Has ×2/÷2 to change pixel resolution, coarse-guide overlay.)
2. **`content/prop-rig.html`** — user drags the prop against Klay (Klay 2×, prop 1×),
   scales it, and copies an export. **The portable value is the Klay-RELATIVE offset**
   (readout: "rel to Klay (+dx,+dy)"), NOT absolute coords — the rig's Klay sits at
   (6,6); scenes place Klay elsewhere, so ADD the delta. The export does NOT name the
   destination scene/prop → **ASK which scene+prop before applying.**
3. **Composite** — I paste the numbers: `placeAt(PROP_ART, KOX+dx, KOY+dy)`.

`placeAt(art, dx, dy)` = an art block + (x,y) → an overlay dict in canvas coords.

## 4. Locked halftone standard — `content/halftone.js`

Single source of truth for the background filter. `attachVideoHalftone(bgCanvas, video, cfg)`
returns `{render, cfg}` (call `render()` per rAF; `cfg.HP` is the mutable slider target).

- **Dark dots `#15130d` on cream `#f5f3ed`** (non-inverted; inversion reserved as a
  deliberate whole-night-chapter beat only).
- **Frame-anchored 1920×1080**, `SP=9`, radii `[1.125,1.875,2.25]` (dots 2/4/5px),
  opacities `[0.78,0.9,1.0]`, `HP {contrast:1.5, floor:0.14, gamma:1.0, mid:0.34, hi:0.67}`.
- Two hard rules: (a) geometry is anchored to the FRAME, not the window → **preview == export**
  (density is a ratio, ~213 dots across; use `scaleHalftone(cfg,f)` for 1440p/4K); (b) the
  bg canvas must **NEVER** use `image-rendering:pixelated` — dots are circles; pixelated
  squares them on downscale. Only the Klay overlay canvas is pixelated.

## 5. Scene-module anatomy

Each scene = a small ES module + a composite HTML. Pattern (see `farmwater.js`,
`stationklay.js`):

```js
import { P as KP, KLAY } from './klay.js';
export const P = { ...KP, /* prop + particle colors */ };
export const CW, CH, KOX, KOY, KSCALE=2;      // fine canvas + Klay origin/scale
export const /* prop positions via placeAt(...) */;
export const FRAMES = [ { rows: KLAY.right, over: mrg(PROP,…), ms }, … ];  // or KLAY_ANIM + prop layers
```

Composite HTML: `attachVideoHalftone` background + a Klay overlay canvas (`image-rendering:pixelated`,
sized `CW×CH`) drawn each rAF (Klay ×KSCALE, props ×1), draggable + integer-snap resize to
place/size Klay over the scene, `C` toggles halftone sliders. Independent clocks: halftone
per-frame, Klay pose loop (slow, ~5s), particle loop (fast, ~110ms).

Done so far: `farmwater.js` (watering can + droplets), `stationklay.js` (briefcase + pocket
watch, platform glances). Loop videos are `*-loop.mp4` in the content dir.

## 6. Conventions & gotchas

- **Render-verify is mandatory.** Hand-rolled Node PNG encoder (zlib + CRC32, colorType 2)
  renders any sprite/frame-strip to a PNG; Read it before showing the user.
- **Calm pacing:** long idle holds + occasional blink; one gesture per loop. Low fps is the charm.
- **Prop reads come from the meaningful part** — e.g. use a watch's face (drop the dangling
  chain if it clutters when held), aim droplets from the spout tip (a derived point, not the
  rig's prop origin).
- **The prop rig hands off a relative offset; ask which scene it's for** (a station-watch rig
  was once misapplied to farm).
- New poses reshape animations: a commuter *glancing* down a platform (left/right poses) beats
  a fussy arm-raise. Let the sprite's capabilities suggest the gesture.

Related memory: [[klay-fm-canonical-klay]], [[klay-fm-halftone-settings]],
[[klay-fm-pixel-layer]], [[klay-fm-video-pipeline]], [[klay-mascot]].
