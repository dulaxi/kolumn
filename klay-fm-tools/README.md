# Klay FM — halftone animation pipeline

Turn a text prompt into a **looping, low-fps, ink-halftone animated scene** on cream, for the
Klay FM lo-fi channel. Three stages, three tools. All output is self-contained HTML you can open
in a browser (no server needed — assets are embedded as data URIs).

## The architecture (why it's split this way)

Each tool does the one thing it's best at:

1. **Look → image model** (Gemini 2.5 Flash Image). Flat 2-3 value grayscale still. Cheap (~4¢).
2. **Motion → video model** (Veo 3.1 Fast, *image-to-video*). Hand it the still as the first frame +
   an *oscillating-only* motion prompt. Keeps the flat style; adds movement. ~$0.60 / 4s clip.
3. **Halftone + loop → browser** (our HTML). Samples each video frame → 3-size ink dots; finds a
   forward loop point; overlays precise sprites (bubbles, later Klay). Free.

Rule of thumb: **generative AI for organic/forgiving motion (kelp, glow), hand-written code for
precise/strict motion (a bird's path, Klay).** Keep Klay hand-authored — models can't hold a
4-color pixel mascot consistent.

## Setup

- Node 18+ (uses global `fetch`).
- API key in `klay-fm-tools/.gemini-key` (one line, gitignored). **Rotate the current key — it was
  exposed in a chat transcript.** Get a new one at aistudio.google.com → Get API key, paste into
  that file. (Or set `GEMINI_API_KEY` env var.)
- The key's Google Cloud project needs **billing enabled** (image gen + Veo are paid; the free tier
  gives 0 image/video via API).

## Stage 1 — generate a flat still

```bash
node gen.mjs "<subject>, <recipe tail>" <name> --embed
```
`--embed` bakes the PNG into painter.html + halftone.html so you can tune the halftone.

**Scene recipe tail** (halftone-friendly + full-frame). Keep this, swap the subject:
> `<subject> in the midground, [foreground elements], [background elements], fills the entire frame
> edge to edge, wide establishing shot, calm and composed, NOT cluttered, flat 2D illustration,
> 2-3 value grayscale, thick clean black outlines, matte, bold simple shapes, no fine texture,
> no gradients, cream background, wide 16:9 composition`

Notes learned:
- Name the **layers explicitly** (midground/foreground/background) or you get a centered floating object.
- Drop "generous negative space" — it makes the subject float like a logo.
- Keep **grey fills / shading** words in — the fills give the halftone its *body*. Pure line-art
  ("minimal, no texture") halftones too light/empty.
- 16:9 is forced by `imageConfig.aspectRatio` in gen.mjs (comes out 1344×768).

## Stage 1b — edit a still (optional)

```bash
node frame.mjs <base.png> "Keep this EXACT scene..., change ONLY ..." <name>
```
Good for small tweaks. Caveat: edits are **conservative** — big changes need a fresh `gen.mjs`.

## Stage 2 — animate the still (image-to-video)

```bash
node veo.mjs "<oscillating motion prompt>" <name> 4 --image=<still>.png
```
- `4` = seconds (~$0.60 at Veo Fast $0.15/s). `--image` = image-to-video (preserves flat style).
- **ONLY prompt oscillating / non-directional motion** so it loops: sway, glow-pulse, flicker,
  shimmer. Explicitly freeze everything else: *"EVERYTHING ELSE is completely frozen and still...
  no drifting, no rising, no directional motion whatsoever."*
- **Directional motion (birds, fish, bubbles rising, Klay walking) does NOT belong in the Veo clip**
  — it can't loop. Do those as code overlays in stage 3.
- `--loop` (sets lastFrame = first frame for a *true* forward loop) is **not supported on Veo Fast**
  (400 "use case not supported"). It needs a higher tier (`veo-3.1-generate-preview`, ~$0.40/s).

## Stage 3 — halftone + loop player

Copy the template, embed the mp4, open it:
```bash
cp template-loop-player.html myscene.html
python3 - <<'PY'
import base64
u='data:video/mp4;base64,'+base64.b64encode(open('myscene.mp4','rb').read()).decode()
h=open('myscene.html').read().replace('__VID__',u,1)   # template still has __VID__? if not, see below
open('myscene.html','w').write(h)
PY
```
> The template already has a specific clip embedded. To reuse it as a blank template, replace its
> existing `data:video/mp4;base64,...` with `__VID__` once, then embed as above. Or just copy an
> existing `*-video.html` and swap its data URI with the regex:
> `re.sub(r"data:video/mp4;base64,[A-Za-z0-9+/=]+", NEWURI, h, count=1)`.

**How the player works** (loop-point detection = free forward loop):
- Buffers every frame (`ImageBitmap`), fingerprints each (downsampled luminance grid).
- Finds the frame that best matches frame 0, loops **forward** 0→that frame (no boomerang).
- Status line shows a **match score**: `<0.03 ✓ clean`, `<0.06 ~ ok`, else `✗ drifts` → that's your
  data on whether the paid first=last model is worth it.
- Renders live while buffering (never blank). Runs at 15fps (choppy lo-fi; tunable 5–30).
- Halftone knobs: Contrast / Floor / Gamma / the two band-split sliders.

**Overlays** (precise, loop-locked): drawn each frame after the base blit, phase = `(k % loopLen)/loopLen`
so they wrap with the loop. Example: bubbles in `oceanbed-video.html` (fade in/out at ends to hide
the wrap). **Klay** goes here next — a hand-authored pixel sprite on a loop-locked path.

## Locked halftone rules (match the 5 hand-built scenes)

- Grid spacing **6px**. Ink `#15130d` on cream `#f5f3ed`.
- **3 exact dot diameters: 1.5 / 2.5 / 3 px** (radii 0.75 / 1.25 / 1.5), chosen by tone band.
- (Earlier continuous formula `r=(0.6+tone*3.4)*size` capped at MAXR is the alt mode in painter.html.)

## Costs (measured)

- Still: ~$0.04. Edit: ~$0.04. Veo Fast 4s clip: ~$0.60.
- **Per finished animated scene ≈ $0.64.** A 20-scene rotation ≈ ~$13.
- Iterate prompts/stills freely (cheap); spend the one video call once the still is right.

## Assets already generated (in `assets/`, don't re-pay)

- Stills: `office.png`, `oceanbed.png`, `castle.png`, `ocean2.png`
- Clips: `officevid.mp4` (office oscillating), `oceanbedvid.mp4` (ocean floor oscillating),
  `castleloop.mp4` (castle i2v), `oceanvid2.mp4` (ocean w/ creatures, oscillating)

## Resume checklist

1. Rotate the API key → paste new one into `klay-fm-tools/.gemini-key`.
2. `node gen.mjs "..." scene --embed` → tune in painter.html.
3. `node veo.mjs "oscillating only..." scene 4 --image=scene.png`.
4. Copy a `*-video.html`, swap in the new mp4 data URI, open in browser, read the match score.
5. Add overlays (bubbles, Klay) for any directional motion.
