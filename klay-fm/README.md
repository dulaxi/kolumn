# Klay FM — channel scenes

Lo-fi halftone YouTube channel content: Veo loop videos rendered through a halftone
filter with a colored pixel **Klay** composited on top. See the **`klay-fm`** skill
(`.claude/skills/klay-fm/SKILL.md`) for the full system (sprite, two-scale model,
prop pipeline, halftone standard, scene anatomy).

## Run

```bash
cd klay-fm && python3 -m http.server 8080
```

Then open the composites in a browser:

- `klay-composite-farm.html` — Klay watering (can + droplets)
- `klay-composite-station.html` — commuter (briefcase + pocket watch, platform glances)
- `klay-composite-lighthouse.html` — keeper at a silver/blue tower viewer
- `klay-composite.html` — deer forest (berry basket)

## Files

- **`klay.js`** — canonical channel Klay sprite (12×14, front-lit shading) + poses
  (`base/right/left/*Blink`) + motion helpers (`bob/sway/lean`).
- **`halftone.js`** — locked halftone standard (`attachVideoHalftone`).
- **Scene modules** — `farmwater.js`, `stationklay.js`, `lighthouseklay.js`,
  `berrybasket-calm.js`, `waterdrops.js`.
- **Tools** — `pixel-creator.html` (draw a prop), `prop-rig.html` (position it
  against Klay → copy the Klay-relative offset into a scene).
- **`*-loop.mp4`** — the Veo background loops the composites play.

## Two-scale rule

Klay draws at **2×** (chunky); props draw at **1×** (fine, half Klay's pixel).
Composite draws Klay cells at `KSCALE=2`, props at `1×1`.
