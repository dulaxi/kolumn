# Halftone Motion — animating scenes

Backgrounds in this style **move** — rain falls, steam rises, clouds drift,
waves roll — alongside whatever character (e.g. Klay) sits in the scene. This
file is the motion counterpart to `technique.md`. Read that first for the static
render model; this adds time.

## Contents
- [The core idea](#the-core-idea) — `tone(x,y,t)`
- [The static / animated split](#the-static--animated-split) — the performance trick
- [Motion budget](#motion-budget) — how many things move
- [Motion vocabulary](#motion-vocabulary) — drift, oscillate, pulse, cycle, rare
- [Seamless loops](#seamless-loops)
- [Locked pace](#locked-pace)

## The core idea

A static layer is `tone(x,y) → 0..1`. **To animate, add a clock:
`tone(x,y,t)`** where `t` is seconds. Any layer whose tone depends on `t`
animates; layers that ignore `t` stay put. Nothing else about the model changes —
same grid, same size ceiling, same per-item shading. Motion is just tone that
reads the time.

Because we're on a fixed dot grid, motion is **grid-locked** — dots flip on and
off / change size in place as the tone field moves through them. That steppy,
cell-by-cell quality *is* the ASCII-animation aesthetic; lean into it, don't
fight it with sub-pixel smoothing.

## The static / animated split

Recomputing every dot every frame is wasteful — most of a scene never moves.
Split the render:

1. **Render all static layers once** to a dot string; drop it in a `<g>` that
   never changes.
2. **Each frame, recompute only the animated layers** (usually a few hundred
   dots) and replace the innerHTML of a second `<g id="anim">`. The static group
   stays untouched in the DOM.

```js
svg.innerHTML = `<g>${staticDots}</g><g id="anim"></g>${titleEl}`;
const an = svg.querySelector('#anim');
let last=0;
function loop(ms){
  const t=ms/1000;
  if(ms-last > 1000/FPS){ last=ms;          // throttle to the scene's fps
    let d='';
    for(let x=SP/2;x<W;x+=SP) for(let y=SP/2;y<H;y+=SP){
      if(inKnockout(x,y)) continue;
      for(const [fn,size] of ANIM){ const tn=fn(x,y,t); if(tn>0){ d+=dot(x,y,tn,size,1); break; } }
    }
    an.innerHTML=d;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

Animated layers draw *over* the static group, so put movers that belong in front
(rain on glass, steam over a mug) in `ANIM`; anything they must appear behind
stays static and just isn't overdrawn. A working example is
`assets/anim-template.html`; tune it live with `assets/motion-mixer.html`.

## Motion budget

**Only 2–4 things move per scene. Everything else is still.** This is the same
restraint as the static rules — a lo-fi frame is calm. A sky full of motion reads
as busy and breaks the focus mood. When you author a scene, do a deliberate
**motion pass**: list every element, then pick the few that carry ambient life
and leave the rest static.

Per-scene examples:
- **Night desk** → rain (drift) + steam (oscillate) + lamp (pulse).
- **Strawberry field** → clouds (drift) + wheat/leaves (oscillate) + rare bird.
- **Ocean** → waves (oscillate) + birds (drift) + rare gull cross.
- **Pool** → ripples (oscillate) + light caustics (pulse).

## Motion vocabulary

Five reusable kinds. Each is a small modification of a layer's tone by `t`.

### drift — translate + wrap (clouds, rain, snow, birds, traffic)
Scroll the tone pattern along an axis; wrap so it's seamless.
```js
// rain: scroll the drop pattern downward
const rain=(x,y,t)=>{ if(!inPane(x,y)||y>=floor)return 0;
  const yy=y+Math.floor(t*SPEED);                 // SPEED px/sec down
  return ((x*3+yy*7)%74)<DENS ? 0.4 : 0; };       // DENS = how many drops
// clouds: shift a soft blob field horizontally, wrap at width
const clouds=(x,y,t)=>{ const xx=((x - t*SPEED)%W+W)%W; return blob(xx,y); };
```

### oscillate — sin sway (waves, ripples, steam, grass, curtains)
Displace or brighten by a sine of position and time. Inherently periodic → loops
for free.
```js
// waves: a horizon band whose height ripples
const waves=(x,y,t)=>{ const surf=BASE + Math.sin(x*0.03 + t*1.2)*AMP;
  return y>surf ? clamp(0.4+(y-surf)*0.02,0.3,0.8) : 0; };
// steam: two columns that wobble side to side as they rise
const steam=(x,y,t)=>{ if(y<top||y>spout)return 0;
  const wob=Math.sin(y*0.25 + t*1.6)*WOB;
  return (near(x,cx+wob,2)||near(x,cx2-wob,2)) ? OP*fade(y) : 0; };
```

### pulse — tone breathes (lamp, embers, fireflies, stars, screens)
Modulate tone up and down with a sine; no movement, just intensity.
```js
const glow=(x,y,t)=>{ const d=dist(x,y,cx,cy); if(d>R)return 0;
  return clamp((1-d/R)*(BASE + AMP*Math.sin(t*SPEED)),0,0.42); };
```

### cycle — slow one-way progress (day→night, tide, candle burning)
A value that ramps across a long period (often the whole video). Usually drives a
*whole scene's* tone/mood rather than one object.
```js
const daylight = 0.5 + 0.5*Math.sin(t * 2*Math.PI / DAY_PERIOD); // 0..1 slow
// feed daylight into sky tone, moon opacity, window warmth, etc.
```

### rare event — occasional punctuation (shooting star, a bird, a blink)
Not constant. Fire on a schedule with long gaps; the surprise is the point. Keep
it deterministic (derive from `floor(t/period)`) so a looped video repeats it
identically.
```js
const shootingStar=(x,y,t)=>{ const cycle=Math.floor(t/12); const local=t%12;
  if(local>1.2)return 0;                          // visible ~1.2s every 12s
  const sx=200+cycle*137%600, sy=90 - local*40;   // streak path (deterministic)
  return dist(x,y,sx+local*260,sy)<6 ? 0.6 : 0; };
```

## Seamless loops

A focus video loops for hours — the seam must be invisible.

- **Every mover must return to its start state after its period.** Drift wraps
  modulo the travel distance; oscillate/pulse use `sin` (already periodic); rare
  events fire on a fixed cycle.
- **Keep periods simple multiples** so the whole scene's loop is the least common
  multiple of its movers and stays short. E.g. make every period divide 8s: the
  master loop is 8s and you render 8s × fps frames, then repeat forever.
- **Derive everything from `t` only** — no `Math.random()` per frame, or the loop
  won't close. Jitter must be a deterministic `hash(x,y)` (position-based, not
  time-based) so texture is stable frame to frame.

## Locked pace

Klay FM's tuned motion (feels natural, not busy — this is the reference pace for
new scenes; adjust per scene but stay in this register):

```json
{"fps":6,
 "rain":{"speed":10,"dens":2,"len":402,"size":0.65},
 "steam":{"speed":16,"wob":4,"op":0.7,"size":0.3},
 "lamp":{"speed":6.5,"amp":0.4,"size":0.3}}
```

The big one is **`fps:6`** — deliberately choppy so the background shares the
mascot's low-frame-rate charm instead of looking like smooth video behind a pixel
character. Movers are slow and sparse. When in doubt, make it slower and quieter
than feels right up close; it reads correctly at video scale and over long
watching.
