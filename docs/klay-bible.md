# KLAY-BIBLE

> **Provenance.** Supplied by the owner on 2026-09-04 as the authoritative
> character reference for Klay. It describes a sprite implementation that is
> **not** the one in `src/components/klay/` — see "Divergence from this repo"
> at the end before acting on it. Recorded verbatim; do not edit the body.

Everything established about Klay's sprites: the rules, the vocabulary, and the
reasoning behind the calls that have already been made. Read before working.

---

## 1. The character

Klay is a squat mossy rock creature with a sprout growing out of his head, two
dark eyes, and two stubby feet. He is drawn in **three-quarter view, facing right**
— the darker mauve strip down his left side is not shadow, it is the **side plane**
of the block you can see because he is turned.

That distinction matters more than it sounds. The body's dark tone is geometry; the
plant's dark tone is lighting, from the upper left. They shade in opposite
directions on purpose. Turn him square-on and the side plane disappears; the plant
keeps its shading, because turning him doesn't move the sun.

---

## 2. Resolution

- Base art is authored on a **12×14 grid** and doubled to **24×28**. Every pixel is
  a 2×2 block.
- There is a **4× detail budget unused** at this size. If Klay is ever redrawn at
  true 24×28, all transform constants halve (`shock` widens by 1, `front` shifts by
  `1 + start`, `isHim` tests `>= 8`). Art and constants must change in lockstep.
- **Props may be drawn at true 24×28.** Chunky character, fine props. A 1px fishing
  rod reads as a rod; the same rod on the 2×2 grid is a staircase. The mismatch
  reads as material difference, not error, as long as the prop is a thin object.
- **Frames may be wider than 24** when a prop needs room. `jam` is 32 wide, the
  fishing set is 48. Keep Klay centred and state the offset (jam is `x - 4`).

## 3. Palette

```
o  #8BA32E  leaf mid            m  #A8969E  body front
l  #C2D64A  leaf light          M  #8F8088  body side plane
O  #617023  leaf dark / stem    k  #1B1B18  EYES ONLY
w  #EDEFE2  white FX            r  #C2566E  heart
d  #33303B  sunglasses lens     b  #5B8FD1  headphones light
                                B  #2E4F7A  headphones dark
```

**`k` is reserved for eyes and nothing else.** Every eye transform is a one-liner
because of this. Sunglasses got `d` and headphones got `b`/`B` specifically so
`blink()` wouldn't erase his gear and `shock()` wouldn't widen it.

Fishing props (not in the shipped file) used `n`/`N`/`q` rod, `y` line, `f`/`F`
fish, `e`/`E` bank, plus `b`/`B` for water.

## 4. Eye vocabulary

Poses are authored with **normal eyes only**. Everything else is derived, so it
works on poses built at runtime.

| State | Call | Look | Use |
|---|---|---|---|
| normal | — | 1×2 logical | default |
| closed | `blink(p)` | flat, eyeless | **blinks only**, 120–160ms |
| lids | `shut(p)` = `droop(shock(p))` | flat 2-wide line | held states: sleep |
| half | `droop(p)` | bottom half kept | tired, straining, wilting |
| wide | `shock(p)` | doubled width | **damage and alarm only** |

Hard rules learned the hard way:

- A blink is the **eyeless** face, not a dash. The dash held long reads as asleep;
  eyeless held long reads as asleep too, but eyeless *short* is the only thing that
  reads as involuntary. 150ms is the sweet spot.
- **Square eyes are not cute.** Do not use `shock()` for excitement, effort or
  surprise-at-something-nice. Big reactions get exclamation marks beside the head,
  sparks, sweat pixels — the face stays intact.
- `shock()` grows each eye **outward from the middle of the face**. Growing them
  both leftward shrinks the gap from 4 columns to 3 and shifts the pair off-centre;
  invisible in three-quarter, obvious front-on. Any future transform that *adds*
  pixels needs the same centre-relative treatment.

## 5. Facings

Three, on one timeline, same durations.

**`front(p)`** — square-on. Touches **body rows only**: drops the `M` side plane,
fills the silhouette edge to edge in flat `m`, and shifts the eyes by however far
that row was inset so they land at `mmmkmmmmkmmm`. It must **not** touch the plant —
the leaves and stem keep their `o`/`O` shading exactly as authored.

**`mirror(p)`** — left-facing. Flips **only his own pixels**: body, side plane,
eyes, and worn gear. `isHim(row)` decides — true if the row contains `d`/`b`/`B`,
or has a contiguous run of `mMkw` at least 16 long.

Everything else holds its authored position: the sprout (position *and* shading),
the heart, the Z, music notes, sparks, the moth, the pebble, the watering can. None
of them are part of which way he's facing. This also means the Z never comes out
backwards, so it needs no redraw.

Consequence: the feet don't flip either, so the mirrored walk lifts the same foot.
That's consistent with the plant not swapping its lean.

## 6. Drawn exceptions

Derive by default. These could not be:

- `FRONT_SHADES_UP / MID / DOWN` — glasses sit on the silhouette.
- `FRONT_JAM_A–D` — front-on both ear cups go to the edges symmetrically.
- `MIRROR_JAM_A–D` — the band crosses both silhouette and sprout in the same rows,
  so no row-level rule can split them. Rig flips, plant stays, note travels with the
  gear; where the flipped rail lands on the leaf cluster the rail wins.
- `HURT_WOBBLE` — one eye shut, one open. No symmetric transform produces it.
- Fish needs two drawings, horizontal for the leap and vertical for the hang. A 90°
  rotation can't be derived.

## 7. Timing

`F(pose, ms)` — durations, never a frame rate, because a blink has to be short while
its neighbours are long.

- Blink 120–160ms. Walk step 120ms. Impact frames 80–130ms.
- Idle beats 600–900ms. Sleep 900ms.
- Reactions are **short**; the length goes into the nothing around them. The 16s
  fishing loop is ~9.5s of waiting and 1.6s of struggle.
- Long loops need a **fake-out**. The false nibble is what makes the real bite land
  and what makes nine seconds of waiting feel intentional rather than dead.
- Scatter blinks through still stretches or they read as frozen.

## 8. Shipped animations (18, ×3 facings)

`idle` `blink` `walk` `look` `shades` `jam` `dazed` `jump` `sprout` `hurt` `sleep`
`alert` `cheer` `bloom` `moth` `balance` `water` `poof`

One-shots: `jump` `sprout` `hurt` `alert` `bloom` `water` `poof`. Rest loop.

## 9. Procedural props

For props with geometry — rods, lines, arcs, ripples — **don't hand-author strings**.
Build the frame with helpers: `line()` Bresenham, `curve()` quadratic bezier for
bend, `blit()` for sub-art. The 45-frame fishing loop is ~30 lines of coordinates
plus five Klay poses and two fish. Retiming a swing is editing numbers.

Keep a rod's tip on a **fixed radius** from its grip point across every frame, or it
stops reading as one rigid object.

## 10. Known debt

- `SEQ`, `SEQ_FRONT`, `SEQ_MIRROR` are three parallel objects with identical
  timings. Should collapse to `STYLES` + `OVERRIDE` + `poseIn(style, name)` so a new
  facing is one function instead of a fourth table.
- Props are baked into pose rows. Every mirroring headache came from this. Moving
  them to positioned layers (`over(pose, at(HEART, x, y))`) is the structural fix.
- Klay has no arms. Props are tucked at his silhouette edge with an implied grip.
  A visible hold needs a stub arm on the base sprite.
- The front pose keeps the plant offset right of the body's centre, so he reads as
  very slightly still turned. Deliberate for now.

---

## Divergence from this repo (recorded 2026-09-04, not part of the bible)

`src/components/klay/klayAnimations.js` implements a **different, Kolumn-specific
Klay**. Verified against the code, not assumed:

| | Bible | `src/components/klay/` |
|---|---|---|
| Grid | 12×14, doubled to 24×28 | `COARSE_COLS 12` × `COARSE_ROWS 11`, fine 24×22 |
| Body | `m` front + `M` side plane (three-quarter) | `m` only — flat, no side plane |
| Leaves | `o` mid, `l` light, `O` dark/stem | `o`, `l` only — no `O` |
| Facings | 3 (`front`, `mirror`, default) | none — no `front`/`mirror` in the file |
| Animations | 18 | 28 |
| Reserved `k` | eyes only | eyes only (holds) |

Shared animation names: `blink`, `idle`, `look`, `sleep`, `walk`.
Bible-only: `alert balance bloom cheer dazed hurt jam jump moth poof shades sprout water`.
Repo-only: `agentic blueprint chat checklist connect converse delight deliver duo
flow grow handshake hop lamplight moonsleep progress scurry ship sit sweep tap
tools wilt` — these are Kolumn workflow scenes with no counterpart in the bible.

**Consequence for the marketing site:** the 34 Klay Open Graph images in
`public/og/` render the repo's flat sprite, not the bible's shaded three-quarter
one. They are regenerable in one command (`npm run og`) once it is decided which
Klay is canonical here.

**Open question for the owner:** port the bible's sprite and its `front`/`mirror`
facings into this repo, or treat the repo's flat 12×11 Klay as an intentional
Kolumn variant and correct the bible's scope note instead. Do not silently
converge them; the repo's 23 unique animations are real work.
