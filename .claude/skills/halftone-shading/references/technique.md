# Halftone Shading — Technique & Pattern Library

Deeper reference for the `halftone-shading` skill. Read the SKILL.md first for the
three rules and the render model; this file is the *how* of authoring per-item
tone.

## Contents
- [The mental model](#the-mental-model)
- [Tone convention](#tone-convention)
- [Pattern library](#pattern-library) — cyl, cover, bevel, sphere, disc, drape, pillow, spines, glow, edge/outline, knockout
- [Dithering & jitter](#dithering--jitter)
- [Building a scene](#building-a-scene)
- [Tuning with the mixer](#tuning-with-the-mixer)

## The mental model

You are not "drawing pixels" and you are not "simulating light." You are writing,
for every object, a function that answers: *at point (x,y) inside me, how dark is
my surface here?* — where "dark" already bakes in the object's form (its rounded
side, its lit edge, its cast-into-itself shadow). The render loop turns that
darkness into a dot's size and opacity. All the artistry is in the tone function.

Why per-item and not a scene light? A global light produces *physically plausible*
but *visually muddy* results — everything shades the same way, cast shadows smear
across the frame, and the delicate dot texture turns to sludge. Authoring form per
object is how illustrators and pixel artists have always worked: you decide each
object reads as round/flat/thick, and you draw that conviction in. It's less
"correct" and far more legible.

## Tone convention

`tone ∈ [0,1]`, returned by each layer's function. `0` = "not part of this layer"
(transparent — a lower layer or cream shows through). Higher = darker = bigger,
more opaque dot.

Rough vocabulary that keeps a scene coherent:
- `0.95` — outlines, deepest creases, an object's contact edge
- `0.75–0.9` — core shadow side / thick frame faces
- `0.45–0.65` — mid surface
- `0.28–0.4` — highlight bands, lit faces, distant/background fills
- `<0.15` — near-cream whisper (wall paper texture, glass)

Pick an implied light *direction* and keep it consistent across every object (Klay
FM: soft light from upper-left, so tops/left faces are lighter, bottoms/right
faces darker). This is a *convention you hand-apply*, not a computed source.

## Pattern library

Each is a pure `(x,y,...bbox) → tone`. Compose them; a prop is often several.

### form — 3D roundness (the quality unlock — read this first)

Crude vs. drawn is almost entirely **form-shading**: instead of a flat fill or a
one-way gradient, compute a **surface normal** at each point and light it against
a fixed implied light (upper-left-front). That makes the dots grow/shrink along
the curve, so a ball looks like a ball. This is per-*object* lighting (a
consistent implied direction you author), **not** the forbidden global scene
light.

```js
// darkness from a surface normal (nx,ny,nz), implied light upper-left-front
function form(nx,ny,nz){ const lam=clamp(nx*-0.5+ny*-0.55+nz*0.67,-0.25,1); return clamp(0.9-lam*0.95,0.04,0.95); }
// sphere: normal is the position on the unit hemisphere; add a reflected-light
// rim on the shadow side (d2>0.72 && ny>0.2) — that rim is what reads as "round".
```

Three more rules that separate skilled from crude, learned the hard way:
1. **Curved solids need a visible cap.** A cylinder/cone/mug reads flat until you
   add the **elliptical top/base face** — that ellipse is the 3D tell.
2. **Organic things = shaded blob-unions + texture.** A tree/cloud is a union of
   circles, each form-shaded (lighter toward its lit side) plus a `hash` speckle.
3. **Repetition reads as craft.** Grooves (`sin` of radius), masonry (offset
   brick grid), flutes (`sin` of angle) — regular detail looks *made*, not blobby.

**The refined, form-shaded primitives — `sphere`, `cylV`, `cone`, `isoBox`,
`mug`, `tree`, `cloud`, `record`, `wall`/`stoneFace`, plus `cover`/`bevel` — ship
as working code in `assets/scene-kit.html`.** Copy from there rather than
re-deriving; the older flat versions below are kept only as minimal reference.

### edge / outline
The shared primitive — a dark border makes any shape read.
```js
const edge=(x,y,x0,y0,x1,y1,t=3)=>rect(x,y,x0,y0,x1,y1)&&
  (near(x,x0,t)||near(x,x1,t)||near(y,y0,t)||near(y,y1,t));
// inside a tone fn: if(edge(...)) return 0.95;
```

### cyl — a round body (mug, cup, bottle, Klay's pot)
Highlight column a third of the way across, darkening toward the far side and the
base. This single trick is what makes something read as a cylinder.
```js
function cyl(x,y,x0,y0,x1,y1){
  if(!rect(x,y,x0,y0,x1,y1))return 0;
  if(edge(x,y,x0,y0,x1,y1))return 0.95;
  const u=(x-x0)/(x1-x0), v=(y-y0)/(y1-y0);
  return clamp(0.4 + 0.5*Math.abs(u-0.3) + v*0.18, 0.2, 0.9);
}
```
Move the `0.3` to shift the highlight; raise the `0.5` for a glossier, rounder read.

### cover — a flat lit panel (book cover, card, sign, door)
Light top face (a "page" or bevel), a highlight band just under it, then a gentle
darkening toward the base so it isn't a dead flat fill.
```js
function cover(x,y,x0,y0,x1,y1){
  if(!rect(x,y,x0,y0,x1,y1))return 0;
  if(edge(x,y,x0,y0,x1,y1))return 0.95;
  if(y<y0+6) return near(x,(x0+x1)/2,20)?0.3:0.38;   // top face
  const v=(y-y0-6)/((y1-y0)-6);
  if(v<0.14) return 0.35;                              // highlight band
  return clamp(0.5 + v*0.28, 0.4, 0.85);              // face, darker low
}
```

### bevel — anything with thickness (window frame, monitor, picture frame)
Two nested rectangles: outer edge catches light (0.5), inner edge is the deepest
shadow (0.95), the face between is mid (0.78). Reads as a raised, chunky border.
```js
// inside a frame layer, given outer (x0..x1) and inner (ix0..ix1):
if(near(x,ix0,4)||near(x,ix1,4)||near(y,iy0,4)||near(y,iy1,4)) return 0.95; // inner
if(near(x,x0,4)||near(x,x1,4)||near(y,y0,4)||near(y,y1,4)) return 0.5;      // outer
return 0.78;                                                                 // face
```

### sphere / dome (moon, ball, bulb)
Radial: darkest at the rim, lighter toward an offset highlight. For a crescent
moon, subtract a shifted disc (see the `moon` layer in the template).
```js
function dome(x,y,cx,cy,R){ const d=dist(x,y,cx,cy); if(d>R)return 0;
  const hl=dist(x,y,cx-R*0.35,cy-R*0.35);            // highlight offset up-left
  return clamp(0.35 + (d/R)*0.5 - (1-hl/(R*1.6))*0.15, 0.15, 0.9); }
```

### drape / cloth (blanket, curtain, rug)
Use a low-frequency `sin` across the surface to make soft folds — brighter on fold
crests, darker in troughs.
```js
function cloth(x,y,x0,y0,x1,y1){ if(!rect(x,y,x0,y0,x1,y1))return 0;
  const fold=Math.sin((x-x0)*0.08)*0.5+0.5;          // 0..1 across
  return clamp(0.45 + (1-fold)*0.35, 0.3, 0.85); }
```

### disc / tabletop (a round top seen in perspective)
`cyl` is a body from the side and `dome` is a frontal sphere — neither is a
horizontal round surface (table top, plate, stool seat, cup opening). Model it as
an ellipse with a darker front rim so it reads as a lid tilted toward you.
```js
function disc(x,y,cx,cy,rx,ry){
  const e=((x-cx)/rx)**2+((y-cy)/ry)**2; if(e>1)return 0;
  if(e>0.82)return 0.95;                              // rim
  return clamp(0.4 + (y-cy)/ry*0.22, 0.28, 0.72);    // front (lower) edge darker
}
```

### pillow / soft-rect (cushion, upholstered panel, rounded button)
A rounded *square* — `dome` is too circular. A flat-ish center with corners
clipped by distance and a soft darkening toward the edges.
```js
function pillow(x,y,x0,y0,x1,y1,rad=10){
  if(!rect(x,y,x0,y0,x1,y1))return 0;
  const cxL=clamp(x,x0+rad,x1-rad), cyL=clamp(y,y0+rad,y1-rad);
  if(dist(x,y,cxL,cyL)>rad)return 0;                 // clipped corner → outside
  const u=(x-x0)/(x1-x0), v=(y-y0)/(y1-y0);
  return clamp(0.4 + Math.abs(u-0.45)*0.3 + v*0.2, 0.28, 0.85);
}
```

### spines (a shelf/row of upright books)
The `books` template layer is a small horizontal *stack* of flat covers. A
bookshelf is many *vertical* spines of varying height and darkness. Give each book
a deterministic tone and height from its index so the row has rhythm without
randomness that would crawl during animation.
```js
// bay: x0..x1 across a shelf, floorY = shelf surface, each book ~bw wide
function spines(x,y,x0,x1,floorY,bw=10){
  if(x<x0||x>x1||y>floorY)return 0;
  const i=Math.floor((x-x0)/bw);
  const h=44 + (i*53%40);                             // varied height
  const top=floorY-h; if(y<top)return 0;
  if(near(x,x0+i*bw,1)||near(y,top,2))return 0.9;     // gap line + top edge
  return clamp(0.4 + (i*37%50)/100, 0.35, 0.85);      // per-book darkness
}
```

### glow / emissive (a lit lamp shade, a screen, embers)
The tone convention (low tone = light) already tells you *how* to draw the lit
thing: a **faint interior + a dark rim**, so it reads as glowing rather than
white. The subtlety is the *halo* it throws — and **where it sits in the layer
stack**. A halo is a faint low-tone region around the source; put its layer **above
the background but below every solid foreground object**, so it spills only onto
bare wall and never paints a falloff across other props. That ordering is the
whole trick — it keeps "glow" from decaying into the forbidden global-light look.
```js
// lamp shade: dark crown, brightening to a light bottom rim (the opening)
['lampshade',(x,y)=>{ if(!rect(x,y,x0,y0,x1,y1))return 0;
  if(near(y,y0,4))return 0.9; const v=(y-y0)/(y1-y0); return clamp(0.75-v*0.5,0.2,0.85); }, size],
// halo: a faint disc, placed in the stack right after the wall/background only
['halo',(x,y)=>{ const d=dist(x,y,cx,cy); return d<120 ? clamp(0.14-(d/120)*0.14,0,0.14) : 0; }, size],
```

### knockout — reserved negative space (title box, Klay's spot)
Not a tone function — a region you *skip* in the render loop so cream shows
through cleanly:
```js
if(rect(x,y, box.x0,box.y0,box.x1,box.y1)) continue;
```
Use for the mono title and to reserve where a colored element (Klay) will be drawn
on top later.

**For a text knockout, measure the text — never hardcode the rectangle.** A fixed
box leaves a big empty cream slab that reads as "out of bounds," and it breaks the
moment the title length changes. Render the `<text>` offscreen, read its
`getBBox()`, and pad lightly (~14px x, ~9px y):
```js
function measureBox(markup,padX=14,padY=9){
  const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('width',W);s.setAttribute('height',H);
  s.style.cssText='position:absolute;left:-9999px;top:0';
  s.innerHTML=markup; document.body.appendChild(s);
  const b=s.querySelector('text').getBBox(); document.body.removeChild(s);
  return {x0:b.x-padX,y0:b.y-padY,x1:b.x+b.width+padX,y1:b.y+b.height+padY};
}
const TITLEBOX=measureBox(titleEl);   // hugs the text at any length
```
(A reserved *shape* knockout like Klay's spot can stay a fixed rect — only text
needs measuring.)

## Dithering & jitter

A pure tone field bands into clean arcs that look mechanical. Add a *small*
deterministic jitter so dot edges dither like hand-stipple:
```js
function hash(x,y){const s=Math.sin(x*12.9898+y*78.233)*43758.5453;return s-Math.floor(s);}
tone = clamp(tone + (hash(x,y)-0.5)*0.06, 0, 1);   // ±0.03 — keep it subtle
```
Deterministic (same x,y → same value) matters: for animation, jitter must be
stable frame-to-frame or the whole scene will crawl.

## Building a scene

1. **Silhouette first.** Get every object's bounding rectangle placed and reading
   as flat fills (`return 0.6`). Composition before shading.
2. **Add form** one object at a time with the patterns above. Keep the light
   direction consistent.
3. **Separate touching objects** with a hard dark line between them (the book
   stack uses `if(near(y,528,2)) return 0.9`) so they don't merge into a blob.
4. **Reserve knockouts** for the title and any colored overlay.
5. **Background stays faint** — wall ~0.08, glass/sky ~0.12. Depth comes from
   foreground objects being darker/heavier than the ground, not from the ground
   competing.
6. **A full-bleed background is safe** — you do *not* need to carve holes in the
   wall layer for the window, desk, etc. Because the render uses topmost-layer-wins,
   a `wall` that simply returns `0.08` everywhere is fully occluded wherever a
   later layer draws. Only mask the background when you deliberately want cream to
   show through (a knockout). Don't over-engineer background masks.
7. **Watch for dead (fully-occluded) layers.** It's easy to author a layer that a
   later layer completely covers (e.g. a chair arm hidden behind a draped blanket)
   — it renders **zero dots** and is invisible in the browser, so you won't notice
   it's wrong. When verifying, count dots per layer (trivial in Node): any declared
   layer with 0 dots is either fully occluded or mis-placed. Fix or delete it.

## Tuning with the mixer

`assets/mixer.html` samples the same layers but adds sliders. Order of operations:
first get the *shapes and shading* right in the tone functions (the mixer can't
fix a badly-formed mug), then use the mixer only to balance *density* — which
layers sit forward (heavier size), which recede (lighter/faint), what global
spacing. `Copy settings` emits the JSON; drop it into `scene-template.html`'s
`CFG` to bake it. Remember the ceiling: the mixer respects `MAX_R`, so pushing a
size slider past the cap does nothing — that's intended.
