# Making a Klay FM frame from a rough sketch

You do **not** need to be an artist. This style is layout-driven: props are
rectangles/regions, and the skill supplies the shading, motion, depth, and Klay.
So a rough sketch that communicates *placement and identity* is enough to
recreate a full frame. You give the composition; the skill gives the craft.

## What a useful sketch has

Boxes and labels beat detail. On a 16:9 rectangle, rough in:
- **Where each object sits** — a box is fine ("window here", "desk here", "shelf
  here"). Overlap/stacking shows depth (nearer = lower/bigger).
- **A label per object** — "window", "mug", "cat", "record player", "plant".
- **Klay** — mark his spot and **which way he faces** (an arrow, or "looking at
  laptop"). Facing sets his tilt + which side gets depth.
- **What he's using / doing**, if anything (types, sips, waters a plant).
- **Which corner the track title goes** (default top-right).
- **Mood** — day/night, rain/clear, warm/cool — one word each.

That's it. Straight lines, stick-figure scrawl, a phone photo of paper — all fine.

## How the sketch becomes a frame

1. **Read the layout** → each labelled object becomes a `STATIC` tone layer,
   placed at the sketched position, depth-staggered on the desk plane.
2. **Rebuild each object in the vocabulary**, not by tracing your lines: a mug →
   `cyl`, a book/frame → `cover`/`bevel`, a lamp/plant/laptop → the matching
   pattern (`references/technique.md`; add a new pattern if it's a new shape).
3. **Shade per-item** (the skill's rule) — no scene lighting.
4. **Motion pass** → pick 2–4 movers implied by the mood (rain, steam, a swaying
   plant, a spinning record) at fps 6 (`references/motion.md`).
5. **Place Klay** via `klayTilt` at the facing you marked; give him the prop he
   uses (fine pixels, prop palette) and an arm if he's interacting
   (`references/klay-tilt.md`).
6. **Title** → the pixel-note + track text in the chosen corner.

Start from `assets/klay-fm-frame.html` (the finished night-desk frame) and edit
the five marked blocks — you're never starting from a blank file.

## What's easy vs. harder

- **Easy / reliable:** boxy props and cozy-room objects — windows, desks,
  shelves, books, mugs, lamps, gadgets, potted plants, framed art, rugs,
  curtains, city/skyline views, weather.
- **Harder (say so up front):** highly organic or intricate subjects (a detailed
  animal, a human face, dense foliage) — doable, but they need a fresh
  hand-authored pattern and a round or two of iteration, and they read best kept
  chunky/simplified rather than realistic.

When a sketch is ambiguous, the move is to **build a first pass and show it in the
browser**, then adjust — same tight visual loop this whole style was built with,
not a long back-and-forth in words.
