# Upsell Klay Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the upsell step's three hand-built UI-mock visuals with a single animated pixel-art Klay who walks a continuous floor across the three feature cards, performing each card's story on arrival.

**Architecture:** A journey clock (`useKlayJourney` hook) cycles perform → travel around 3 stations. A sprite overlay (`KlayJourney`) measures station anchor boxes inside the card row and positions one `PixelKlay` over them — CSS `left` transition with `steps()` easing for the walk on desktop, opacity fade when the cards are stacked. Each card shows static "resting props" (`KlayStatic`) while Klay is elsewhere. One new sprite animation (`connect`) is added to the Klay library.

**Tech Stack:** React 19, Vitest + @testing-library/react (jsdom), existing Klay sprite system (`src/components/klay/`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-22-upsell-klay-journey-design.md`

## Global Constraints

- **Klay palette rules:** mauve (`m`) is Klay's alone — props use honey/copper/sand/mist/charcoal/cream/lime. Klay is never drawn at fine resolution. 150–600ms per frame (payoff holds may go to ~1300ms), no tweening of sprite frames.
- **Colors:** CSS `var(--token)` only, no new hex codes outside `klayAnimations.js`'s existing `PALETTE`.
- **Icons:** `@phosphor-icons/react` only.
- **Copy freeze:** card tags/titles/bodies, header, and CTA copy are unchanged from the current `UpsellStep`.
- **Commits:** conventional with scope, e.g. `feat(klay):`, `feat(onboarding):`.
- **Verification:** `npm run test` (Vitest, single run), `npm run lint`, `npm run build` must pass at the end of every task.

---

### Task 1: `connect` animation + upsell resting props in the Klay library

**Files:**
- Modify: `src/components/klay/klayAnimations.js` (props block ~line 164–179, `ANIMATIONS` map end ~line 441)
- Modify: `docs/design-mockups/klay-detailed-props.html` (add studio sketch)
- Test: `src/__tests__/klayAnimations.test.js` (new)

**Interfaces:**
- Consumes: existing `frame`, `hi`, `merge`, `bar`, `LEFT`, `LEFT_DOWN`, `LEFT_UP`, `LEFT_ARM`, `LEFT_EYES`, `BUB_M`, `CARD` from `klayAnimations.js`.
- Produces: `ANIMATIONS.connect` (6 frames) and a new named export `UPSELL_REST_PROPS = { chat, agentic, tools }`, each value a sparse fine-grid layer (`{ rowIndex: '24-char string' }`) consumable by `KlayStatic` (Task 2).

- [ ] **Step 1: Sketch `connect` in the design studio**

Open `docs/design-mockups/klay-detailed-props.html`, find an existing `A(...)`/animation entry that uses the push grammar (`ship` or `push-card`), copy it as a new `connect` entry using the frame data from Step 4 below, then serve and eyeball it:

```bash
python3 -m http.server 8899 --directory docs/design-mockups
# open http://localhost:8899/klay-detailed-props.html
```

Iterate on the pixel positions in the studio until the push → click → spark → payoff beat reads. Carry any adjustments into Step 4's frame data. (The studio entry stays in the file as the design record.)

- [ ] **Step 2: Write the failing test**

Create `src/__tests__/klayAnimations.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  ANIMATIONS,
  UPSELL_REST_PROPS,
  PALETTE,
  COARSE_ROWS,
  COARSE_COLS,
  FINE_COLS,
} from '../components/klay/klayAnimations'

describe('connect animation', () => {
  it('exists with 4-8 frames', () => {
    expect(ANIMATIONS.connect).toBeDefined()
    expect(ANIMATIONS.connect.length).toBeGreaterThanOrEqual(4)
    expect(ANIMATIONS.connect.length).toBeLessThanOrEqual(8)
  })

  it('every frame is a valid coarse grid with sane timing', () => {
    for (const f of ANIMATIONS.connect) {
      expect(f.map).toHaveLength(COARSE_ROWS)
      for (const row of f.map) expect(row.length).toBeLessThanOrEqual(COARSE_COLS)
      expect(f.ms).toBeGreaterThanOrEqual(150)
      expect(f.ms).toBeLessThanOrEqual(1300)
    }
  })
})

describe('palette reservation — mauve is Klay-only', () => {
  it('no animation uses mauve (m) in the fine prop layer', () => {
    for (const [name, frames] of Object.entries(ANIMATIONS)) {
      for (const f of frames) {
        if (!f.hi) continue
        for (const row of Object.values(f.hi)) {
          expect(row, `animation "${name}" has mauve in a prop row`).not.toMatch(/m/)
        }
      }
    }
  })
})

describe('UPSELL_REST_PROPS', () => {
  it('has a resting scene per station', () => {
    expect(Object.keys(UPSELL_REST_PROPS).sort()).toEqual(['agentic', 'chat', 'tools'])
  })

  it('rows are valid fine-grid strings using prop palette chars only', () => {
    for (const [station, layer] of Object.entries(UPSELL_REST_PROPS)) {
      for (const [y, row] of Object.entries(layer)) {
        expect(+y).toBeGreaterThanOrEqual(0)
        expect(+y).toBeLessThan(COARSE_ROWS * 2)
        expect(row.length).toBeLessThanOrEqual(FINE_COLS)
        for (const ch of row) {
          expect('.' + Object.keys(PALETTE).join(''), `station "${station}"`).toContain(ch)
        }
        expect(row, `station "${station}" uses mauve`).not.toMatch(/m/)
      }
    }
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/__tests__/klayAnimations.test.js`
Expected: FAIL — `UPSELL_REST_PROPS` is not exported and `ANIMATIONS.connect` is undefined.

- [ ] **Step 4: Implement in `klayAnimations.js`**

Add to the props block (after the `MOON` const, ~line 179):

```js
// Upsell journey: honey wall socket (slots on its left face) + copper plug.
const SOCKET = ['hhhh', 'Khhh', 'hhhh', 'Khhh', 'hhhh']
const PLUG = ['ccK', 'ccc', 'ccK'] // charcoal prongs face the socket
const PLUG_IN = ['cc', 'cc', 'cc'] // prongs seated — flush with the socket
const SPARK = ['h.h', '.h.', 'h.h']
```

Add to `ANIMATIONS` (after the `tier-team` entry, before the closing `}`):

```js
  // ── Upsell journey set ───────────────────────────────────────────────
  // Station 3 of the onboarding upsell: Klay pushes a copper plug into a
  // honey socket — click, spark, payoff hold. Push grammar from ship/push-card.
  connect: [
    frame(LEFT, { 4: LEFT_ARM }, merge(hi(PLUG, 13, 12), hi(SOCKET, 20, 11)), 650),
    frame(LEFT_DOWN, { 5: LEFT_ARM }, merge(hi(PLUG, 15, 12), hi(SOCKET, 20, 11)), 350),
    frame(LEFT, { 4: LEFT_ARM }, merge(hi(PLUG, 17, 12), hi(SOCKET, 20, 11)), 350),
    frame(LEFT, { 5: LEFT_EYES.right }, merge(hi(PLUG_IN, 18, 12), hi(SOCKET, 20, 11), hi(SPARK, 17, 8)), 320),
    frame(LEFT_UP, { 4: LEFT_EYES.right }, merge(hi(PLUG_IN, 18, 12), hi(SOCKET, 20, 11)), 350),
    frame(LEFT, { 5: LEFT_EYES.closed }, merge(hi(PLUG_IN, 18, 12), hi(SOCKET, 20, 11)), 1100),
  ],
```

Add the resting-props export after the `ANIMATIONS` map's closing `}`:

```js
// Resting props for the upsell journey stations — what each card shows while
// Klay performs elsewhere. Rendered statically by KlayStatic on the same
// fine-grid canvas, so they sit exactly where the animated scenes put them.
export const UPSELL_REST_PROPS = {
  chat: hi(BUB_M, 13, 5), // quiet empty bubble
  agentic: merge(bar(13, 5), bar(20, 5), hi(CARD, 13, 9)), // Doing/Done columns, card still in Doing
  tools: hi(SOCKET, 20, 11), // unplugged socket
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/klayAnimations.test.js`
Expected: PASS (all 5 tests).

- [ ] **Step 6: Full verification + commit**

```bash
npm run test && npm run lint
git add src/components/klay/klayAnimations.js src/__tests__/klayAnimations.test.js docs/design-mockups/klay-detailed-props.html
git commit -m "feat(klay): connect animation + upsell resting props"
```

---

### Task 2: `KlayStatic` renderer + `paused` prop on `PixelKlay`

**Files:**
- Create: `src/components/klay/KlayStatic.jsx`
- Modify: `src/components/klay/PixelKlay.jsx`
- Test: `src/__tests__/KlayStatic.test.jsx` (new)

**Interfaces:**
- Consumes: `PALETTE`, `COARSE_COLS`, `COARSE_ROWS` from `klayAnimations.js`; sparse `hi` layers like `UPSELL_REST_PROPS.chat` (Task 1).
- Produces: `<KlayStatic hi={layer} scale={7} className="" />` — a still `aria-hidden` SVG on the same canvas size as `PixelKlay` (`COARSE_COLS*scale × COARSE_ROWS*scale`). `<PixelKlay paused />` — freezes on frame 0, no timers.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/KlayStatic.test.jsx`:

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act, cleanup } from '@testing-library/react'
import KlayStatic from '../components/klay/KlayStatic'
import PixelKlay from '../components/klay/PixelKlay'
import { COARSE_COLS, COARSE_ROWS } from '../components/klay/klayAnimations'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('KlayStatic', () => {
  it('renders one half-pixel rect per colored fine pixel, on the PixelKlay canvas size', () => {
    const scale = 8
    const { container } = render(<KlayStatic hi={{ 3: 'hh..c', 4: '.s' }} scale={scale} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', String(COARSE_COLS * scale))
    expect(svg).toHaveAttribute('height', String(COARSE_ROWS * scale))
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg.querySelectorAll('rect')).toHaveLength(4) // h,h,c + s — dots skipped
  })
})

describe('PixelKlay paused', () => {
  it('stays on frame 0 while paused', () => {
    vi.useFakeTimers()
    const { container } = render(<PixelKlay animation="walk" paused />)
    const before = container.querySelector('svg').innerHTML
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(container.querySelector('svg').innerHTML).toBe(before)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/KlayStatic.test.jsx`
Expected: FAIL — `KlayStatic` module does not exist; the paused test fails because frames advance.

- [ ] **Step 3: Implement `KlayStatic.jsx`**

```jsx
import { PALETTE, COARSE_COLS, COARSE_ROWS } from './klayAnimations'

/**
 * KlayStatic — renders a sparse fine-grid prop layer (the `hi` shape from
 * klayAnimations frames) as a still SVG on the same canvas PixelKlay uses,
 * so static props line up exactly with where animated scenes draw them.
 * Decorative by definition: a station's resting props while Klay is away.
 */
export default function KlayStatic({ hi, scale = 8, className = '' }) {
  const half = scale / 2
  const rects = []
  for (const yStr in hi) {
    const y = +yStr
    ;[...hi[yStr]].slice(0, COARSE_COLS * 2).forEach((ch, x) => {
      const fill = PALETTE[ch]
      if (fill) rects.push(<rect key={`f${x}-${y}`} x={x * half} y={y * half} width={half} height={half} fill={fill} />)
    })
  }
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={COARSE_COLS * scale}
      height={COARSE_ROWS * scale}
      style={{ shapeRendering: 'crispEdges', display: 'block' }}
    >
      {rects}
    </svg>
  )
}
```

- [ ] **Step 4: Add `paused` to `PixelKlay.jsx`**

Change the signature (line 17) and the timer effect (lines 25–29):

```jsx
export default function PixelKlay({ animation = 'idle', scale = 8, playOnce = false, paused = false, label = 'Klay', className = '' }) {
```

```jsx
  useEffect(() => {
    if (paused) return undefined // freeze on the current frame
    if (playOnce && idx >= frames.length - 1) return undefined // rest on the last frame
    const timer = setTimeout(() => setIdx((i) => (i + 1) % frames.length), frames[idx].ms)
    return () => clearTimeout(timer)
  }, [idx, frames, playOnce, paused])
```

Also update the doc comment's prop list to mention `paused`: `` `paused`: freeze on the current frame (reduced-motion rendering). ``

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/KlayStatic.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Full verification + commit**

```bash
npm run test && npm run lint
git add src/components/klay/KlayStatic.jsx src/components/klay/PixelKlay.jsx src/__tests__/KlayStatic.test.jsx
git commit -m "feat(klay): KlayStatic prop renderer + paused prop on PixelKlay"
```

---

### Task 3: `useKlayJourney` hook

**Files:**
- Create: `src/components/klay/useKlayJourney.js`
- Test: `src/__tests__/useKlayJourney.test.js` (new)

**Interfaces:**
- Consumes: `window.matchMedia` (mocked in `src/__tests__/setup.js`, `matches: false` by default).
- Produces: `useKlayJourney(stationCount, { dwellMs?, travelMs? }) → { station: number, phase: 'perform' | 'travel', reduced: boolean }`. During `'travel'`, `station` is the **destination**. Named exports `DWELL_MS = 7000`, `TRAVEL_MS = 2000`.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/useKlayJourney.test.js`:

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useKlayJourney, { DWELL_MS, TRAVEL_MS } from '../components/klay/useKlayJourney'

afterEach(() => {
  vi.useRealTimers()
})

describe('useKlayJourney', () => {
  it('starts performing at station 0', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useKlayJourney(3))
    expect(result.current).toMatchObject({ station: 0, phase: 'perform', reduced: false })
  })

  it('cycles perform → travel → perform and wraps 2 → 0', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useKlayJourney(3))

    act(() => vi.advanceTimersByTime(DWELL_MS))
    expect(result.current).toMatchObject({ station: 1, phase: 'travel' })

    act(() => vi.advanceTimersByTime(TRAVEL_MS))
    expect(result.current).toMatchObject({ station: 1, phase: 'perform' })

    act(() => vi.advanceTimersByTime(DWELL_MS))
    expect(result.current).toMatchObject({ station: 2, phase: 'travel' })
    act(() => vi.advanceTimersByTime(TRAVEL_MS))
    act(() => vi.advanceTimersByTime(DWELL_MS))
    expect(result.current).toMatchObject({ station: 0, phase: 'travel' })
  })

  it('honors custom timing options', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useKlayJourney(3, { dwellMs: 100, travelMs: 50 }))
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toMatchObject({ station: 1, phase: 'travel' })
    act(() => vi.advanceTimersByTime(50))
    expect(result.current).toMatchObject({ station: 1, phase: 'perform' })
  })

  it('parks at station 0 with no timers under prefers-reduced-motion', () => {
    vi.useFakeTimers()
    window.matchMedia.mockImplementationOnce((query) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const { result } = renderHook(() => useKlayJourney(3))
    expect(result.current).toMatchObject({ station: 0, phase: 'perform', reduced: true })
    act(() => vi.advanceTimersByTime(DWELL_MS * 5))
    expect(result.current).toMatchObject({ station: 0, phase: 'perform' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/useKlayJourney.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the hook**

Create `src/components/klay/useKlayJourney.js`:

```js
import { useEffect, useRef, useState } from 'react'

export const DWELL_MS = 7000 // ≈ 2 loops of a station scene
export const TRAVEL_MS = 2000 // one walk between adjacent stations

/**
 * useKlayJourney — the journey clock for the upsell step. Cycles
 * perform → travel around `stationCount` stations, forever. During
 * 'travel', `station` is the destination. Under prefers-reduced-motion the
 * journey parks at station 0 ('perform') and sets no timers.
 */
export default function useKlayJourney(stationCount, { dwellMs = DWELL_MS, travelMs = TRAVEL_MS } = {}) {
  const reduced = useRef(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current
  const [state, setState] = useState({ station: 0, phase: 'perform' })

  useEffect(() => {
    if (reduced) return undefined
    const ms = state.phase === 'perform' ? dwellMs : travelMs
    const timer = setTimeout(() => {
      setState((s) =>
        s.phase === 'perform'
          ? { station: (s.station + 1) % stationCount, phase: 'travel' }
          : { station: s.station, phase: 'perform' }
      )
    }, ms)
    return () => clearTimeout(timer)
  }, [state, stationCount, dwellMs, travelMs, reduced])

  return { ...state, reduced }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/useKlayJourney.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Full verification + commit**

```bash
npm run test && npm run lint
git add src/components/klay/useKlayJourney.js src/__tests__/useKlayJourney.test.js
git commit -m "feat(klay): useKlayJourney journey clock"
```

---

### Task 4: `KlayJourney` sprite overlay

**Files:**
- Create: `src/components/klay/KlayJourney.jsx`
- Test: `src/__tests__/KlayJourney.test.jsx` (new)

**Interfaces:**
- Consumes: `journey` from `useKlayJourney` (Task 3), `PixelKlay` with `paused` (Task 2), `TRAVEL_MS` from `useKlayJourney`, `COARSE_COLS`/`COARSE_ROWS` from `klayAnimations.js`.
- Produces: `<KlayJourney journey={journey} containerRef={ref} stationRefs={[ref, ref, ref]} scenes={['converse', 'last-move', 'connect']} scale={7} label="…" />` — an absolutely positioned sprite inside `containerRef`'s element (which must be `position: relative`). Each `stationRefs[i]` must point at an anchor box sized exactly `COARSE_COLS*scale × COARSE_ROWS*scale` (the same canvas `KlayStatic` renders at that station).

**Behavior spec:**
- Measures anchor offsets relative to the container on mount and window resize.
- Row layout (all anchors at the same y): traveling slides `left` with `steps()` easing while playing `walk`; the wrap (last station → 0) slides off the right edge, snaps to just left of the container, and walks in.
- Stacked layout (anchors at different y): traveling hides the sprite (opacity 0) and snaps position; it fades back in on arrival.
- Performing plays `scenes[station]`; reduced motion renders `scenes[0]` paused at station 0.

- [ ] **Step 1: Write the failing test**

jsdom has no real layout — every `getBoundingClientRect()` is a zero rect, which measures as "row layout, all targets at 0,0". The test therefore covers rendering and animation selection, not geometry (geometry is verified visually in Task 6).

Create `src/__tests__/KlayJourney.test.jsx`:

```jsx
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { createRef, useRef } from 'react'
import KlayJourney from '../components/klay/KlayJourney'

afterEach(cleanup)

const SCENES = ['converse', 'last-move', 'connect']

function Harness({ journey }) {
  const containerRef = useRef(null)
  const stationRefs = useRef([createRef(), createRef(), createRef()]).current
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {stationRefs.map((ref, i) => (
        <div key={i} ref={ref} />
      ))}
      <KlayJourney
        journey={journey}
        containerRef={containerRef}
        stationRefs={stationRefs}
        scenes={SCENES}
        label="Klay demonstrating Kolumn Pro features"
      />
    </div>
  )
}

describe('KlayJourney', () => {
  it('renders an accessible Klay sprite while performing', () => {
    render(<Harness journey={{ station: 0, phase: 'perform', reduced: false }} />)
    expect(screen.getByRole('img', { name: 'Klay demonstrating Kolumn Pro features' })).toBeInTheDocument()
  })

  it('renders while traveling (walk phase)', () => {
    render(<Harness journey={{ station: 1, phase: 'travel', reduced: false }} />)
    expect(screen.getByRole('img', { name: 'Klay demonstrating Kolumn Pro features' })).toBeInTheDocument()
  })

  it('renders when reduced motion parks the journey', () => {
    render(<Harness journey={{ station: 0, phase: 'perform', reduced: true }} />)
    expect(screen.getByRole('img', { name: 'Klay demonstrating Kolumn Pro features' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/KlayJourney.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `KlayJourney.jsx`**

```jsx
import { useEffect, useLayoutEffect, useState } from 'react'
import PixelKlay from './PixelKlay'
import { COARSE_COLS, COARSE_ROWS } from './klayAnimations'
import { TRAVEL_MS } from './useKlayJourney'

/**
 * KlayJourney — the traveling upsell sprite. Absolutely positioned inside
 * `containerRef`'s element (must be position: relative); walks between the
 * `stationRefs` anchor boxes when they sit in one row, fades between them
 * when the cards are stacked. Each anchor must be sized to the PixelKlay
 * canvas (COARSE_COLS*scale × COARSE_ROWS*scale) so sprite and KlayStatic
 * props align pixel-for-pixel.
 *
 * `journey`: state from useKlayJourney ({ station, phase, reduced }).
 * `scenes`: ANIMATIONS key per station, e.g. ['converse', 'last-move', 'connect'].
 */
export default function KlayJourney({ journey, containerRef, stationRefs, scenes, scale = 7, label = 'Klay' }) {
  const spriteW = COARSE_COLS * scale
  const { station, phase, reduced } = journey
  const traveling = phase === 'travel' && !reduced
  const isWrap = traveling && station === 0

  const [layout, setLayout] = useState(null) // { targets: [{x, y}], row, width }
  const [pos, setPos] = useState(null) // { x, y, transition }

  useLayoutEffect(() => {
    const measure = () => {
      const c = containerRef.current
      if (!c) return
      const cRect = c.getBoundingClientRect()
      const rects = stationRefs.map((r) => r.current?.getBoundingClientRect())
      if (rects.some((r) => !r)) return
      const targets = rects.map((r) => ({ x: r.left - cRect.left, y: r.top - cRect.top }))
      const row = targets.every((t) => Math.abs(t.y - targets[0].y) < 2)
      setLayout({ targets, row, width: cRect.width })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [containerRef, stationRefs])

  useEffect(() => {
    if (!layout) return undefined
    const target = layout.targets[station]
    // Stacked layout or standing still: snap (arrivals fade in via opacity).
    if (!layout.row || !traveling) {
      setPos({ ...target, transition: 'none' })
      return undefined
    }
    if (!isWrap) {
      setPos({ ...target, transition: `left ${TRAVEL_MS}ms steps(14)` })
      return undefined
    }
    // Wrap: slide off the right edge, snap to just left of the container,
    // then walk in — always left→right, so no mirrored sprites needed.
    const half = TRAVEL_MS / 2
    setPos({ x: layout.width + 8, y: target.y, transition: `left ${half}ms steps(8)` })
    const snap = setTimeout(() => {
      setPos({ x: -spriteW - 8, y: target.y, transition: 'none' })
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setPos({ ...target, transition: `left ${half}ms steps(8)` }))
      )
    }, half)
    return () => clearTimeout(snap)
  }, [layout, station, traveling, isWrap, spriteW])

  if (!layout || !pos) return null

  const hidden = traveling && !layout.row
  const animation = reduced ? scenes[0] : traveling ? 'walk' : scenes[station]
  const transition = [pos.transition, 'opacity 400ms ease'].filter((t) => t && t !== 'none').join(', ')

  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{ left: pos.x, top: pos.y, opacity: hidden ? 0 : 1, transition }}
    >
      <PixelKlay animation={animation} paused={reduced} scale={scale} label={label} />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/KlayJourney.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Full verification + commit**

```bash
npm run test && npm run lint
git add src/components/klay/KlayJourney.jsx src/__tests__/KlayJourney.test.jsx
git commit -m "feat(klay): KlayJourney traveling sprite overlay"
```

---

### Task 5: Rewire `UpsellStep` — extract to its own file, delete the old visuals

**Files:**
- Create: `src/components/UpsellStep.jsx`
- Modify: `src/pages/OnboardingPage.jsx` (remove `UpsellStep` ~line 589–682, `VisualFrame`/`ChatVisual`/`AgentVisual`/`IntegrationsVisual` ~line 684–796, unused imports; add `UpsellStep` import)
- Test: `src/__tests__/UpsellStep.test.jsx` (new)

**Interfaces:**
- Consumes: `useKlayJourney` (Task 3), `KlayJourney` (Task 4), `KlayStatic` (Task 2), `UPSELL_REST_PROPS`, `COARSE_COLS`, `COARSE_ROWS` (Task 1), existing `Button`.
- Produces: `<UpsellStep onTryPro={fn} onSkip={fn} />` — same public API `OnboardingPage` already uses. Copy, header, and CTA identical to today.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/UpsellStep.test.jsx`:

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import UpsellStep from '../components/UpsellStep'

afterEach(cleanup)

describe('UpsellStep', () => {
  it('keeps the three feature cards and header copy', () => {
    render(<UpsellStep onTryPro={() => {}} onSkip={() => {}} />)
    expect(screen.getByText('Get more out of Kolumn with Pro')).toBeInTheDocument()
    expect(screen.getByText('Chat with your boards')).toBeInTheDocument()
    expect(screen.getByText('Agentic moves')).toBeInTheDocument()
    expect(screen.getByText('Connect your tools')).toBeInTheDocument()
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
  })

  it('wires both CTAs', () => {
    const onTryPro = vi.fn()
    const onSkip = vi.fn()
    render(<UpsellStep onTryPro={onTryPro} onSkip={onSkip} />)
    fireEvent.click(screen.getByRole('button', { name: /get pro free for 1 week/i }))
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onTryPro).toHaveBeenCalledTimes(1)
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('renders one traveling Klay and three resting-prop stages', () => {
    const { container } = render(<UpsellStep onTryPro={() => {}} onSkip={() => {}} />)
    expect(screen.getByRole('img', { name: 'Klay demonstrating Kolumn Pro features' })).toBeInTheDocument()
    // three station anchors, each with a static props svg
    expect(container.querySelectorAll('[data-klay-station]')).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/UpsellStep.test.jsx`
Expected: FAIL — `src/components/UpsellStep.jsx` does not exist.

- [ ] **Step 3: Create `src/components/UpsellStep.jsx`**

```jsx
import { createRef, useRef } from 'react'
import { Lightning, ArrowRight } from '@phosphor-icons/react'
import { addDays, format } from 'date-fns'
import Button from './ui/Button'
import KlayStatic from './klay/KlayStatic'
import KlayJourney from './klay/KlayJourney'
import useKlayJourney from './klay/useKlayJourney'
import { UPSELL_REST_PROPS, COARSE_COLS, COARSE_ROWS } from './klay/klayAnimations'

const KLAY_SCALE = 7
const KLAY_W = COARSE_COLS * KLAY_SCALE
const KLAY_H = COARSE_ROWS * KLAY_SCALE

const FEATURES = [
  {
    tag: 'For thinking',
    title: 'Chat with your boards',
    body: 'Plan sprints, draft cards, break goals into checklists.',
    rest: UPSELL_REST_PROPS.chat,
  },
  {
    tag: 'For complex work',
    title: 'Agentic moves',
    body: 'Move, complete, and update columns in one sentence.',
    rest: UPSELL_REST_PROPS.agentic,
  },
  {
    tag: 'For your stack',
    comingSoon: true,
    title: 'Connect your tools',
    body: 'Google Calendar, Slack, Notion, and your code.',
    rest: UPSELL_REST_PROPS.tools,
  },
]

const SCENES = ['converse', 'last-move', 'connect']

/**
 * The onboarding Pro upsell. One Klay walks a continuous floor across the
 * three feature cards (KlayJourney), performing each card's scene; vacated
 * cards show their resting props (KlayStatic). Reduced motion parks him at
 * the first card, static.
 */
export default function UpsellStep({ onTryPro, onSkip }) {
  const trialEnd = format(addDays(new Date(), 7), 'MMMM d')
  const journey = useKlayJourney(FEATURES.length)
  const containerRef = useRef(null)
  const stationRefs = useRef(FEATURES.map(() => createRef())).current
  // Klay stands at a station only while performing there — during travel
  // every card shows its resting props (his walk carries no props).
  const klayAt = journey.phase === 'perform' ? journey.station : null

  return (
    <div className="flex w-full flex-1 flex-col items-center gap-9 px-4 py-10">
      <header className="flex flex-col gap-2 text-center max-w-2xl">
        <h1 className="text-[32px] font-[425] text-[var(--text-primary)] font-logo leading-[1.15] tracking-tight">
          Get more out of Kolumn with Pro
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Claude on every board, automations, and your tools — connected.
        </p>
      </header>

      <div ref={containerRef} className="relative w-full max-w-[900px]">
        <ul
          role="list"
          className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--color-sand)] border border-[var(--color-sand)] bg-[var(--surface-card)] rounded-3xl overflow-hidden shadow-sm list-none p-0 m-0"
        >
          {FEATURES.map((f, i) => {
            const active = klayAt === i
            return (
              <li key={f.title} className="flex flex-col overflow-hidden">
                <div className="flex flex-col p-6 pb-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-xs font-medium border transition-colors duration-500 ${
                        active
                          ? 'border-[var(--accent-lime)]/40 bg-[var(--accent-lime-wash)] text-[var(--text-primary)]'
                          : 'border-[var(--color-sand)] bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {f.tag}
                    </span>
                    {f.comingSoon && (
                      <span className="inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide border border-[var(--color-sand)] text-[var(--text-muted)]">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <h2 className="text-[var(--text-primary)] mt-4 text-base font-semibold">{f.title}</h2>
                  <p className="text-[var(--text-secondary)] mt-2 text-sm leading-normal">{f.body}</p>
                </div>
                <div
                  className={`relative h-[170px] w-full overflow-hidden mt-2 transition-opacity duration-500 ${
                    active ? 'opacity-100' : 'opacity-70'
                  }`}
                  aria-hidden="true"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle, color-mix(in srgb, var(--text-primary) 12%, transparent) 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to bottom, var(--surface-card) 0%, transparent 40%)',
                    }}
                  />
                  <div
                    ref={stationRefs[i]}
                    data-klay-station={i}
                    className="absolute left-1/2 bottom-3 -translate-x-1/2"
                    style={{ width: KLAY_W, height: KLAY_H }}
                  >
                    <KlayStatic
                      hi={f.rest}
                      scale={KLAY_SCALE}
                      className={`transition-opacity duration-500 ${active ? 'opacity-0' : 'opacity-100'}`}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <KlayJourney
          journey={journey}
          containerRef={containerRef}
          stationRefs={stationRefs}
          scenes={SCENES}
          scale={KLAY_SCALE}
          label="Klay demonstrating Kolumn Pro features"
        />
      </div>

      <div className="mx-auto flex w-full max-w-[450px] flex-col items-center gap-3">
        <Button type="button" size="xl" onClick={onTryPro} className="w-full">
          <Lightning size={16} weight="fill" className="mr-2 shrink-0" />
          Get Pro free for 1 week
          <ArrowRight size={16} className="ml-2 shrink-0" />
        </Button>
        <p className="text-xs text-[var(--text-muted)]">Free until {trialEnd}. Cancel anytime.</p>
        <Button type="button" variant="ghost" size="xl" onClick={onSkip} className="w-full">
          Skip
        </Button>
      </div>
    </div>
  )
}
```

Note: `PixelKlay` is not imported here — the sprite renders inside `KlayJourney`; this file only needs `KlayStatic`, `KlayJourney`, and the hook.

- [ ] **Step 4: Rewire `OnboardingPage.jsx`**

1. Add `import UpsellStep from '../components/UpsellStep'` next to the `PlanPicker` import.
2. Delete the whole `UpsellStep` function (lines 589–682) and the `VisualFrame`, `ChatVisual`, `AgentVisual`, `IntegrationsVisual` functions (lines 684–796).
3. Remove now-unused imports from the `@phosphor-icons/react` block: `ChatCircleDots`, `PuzzlePiece`, `GoogleLogo`, `SlackLogo`, `NotionLogo`, `Code`, `ListChecks`, `CheckSquare`, `CheckCircle`, `X`. For each remaining candidate (`Lightning`, `ArrowRight`, and the date-fns `addDays`/`format`), grep the file first — remove only if `UpsellStep` was its sole user (`Kanban`, `EyeSlash`, `ArrowCounterClockwise`, `CaretDown`, `GraduationCap` are used by other steps — keep them). ESLint will catch any you miss.
4. The `{step === 'upsell' && (<UpsellStep …/>)}` render site (line 301–303) is unchanged.

Verify nothing else referenced the deleted components:

```bash
grep -rn "ChatVisual\|AgentVisual\|IntegrationsVisual\|VisualFrame" src/
```

Expected: no matches.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/UpsellStep.test.jsx`
Expected: PASS (3 tests).

Run the full suite to catch anything that imported the deleted internals: `npm run test`
Expected: PASS.

- [ ] **Step 6: Full verification + commit**

```bash
npm run lint && npm run build
git add src/components/UpsellStep.jsx src/pages/OnboardingPage.jsx src/__tests__/UpsellStep.test.jsx
git commit -m "feat(onboarding): upsell step redesigned around a traveling Klay"
```

---

### Task 6: Sandbox specimen + visual verification

**Files:**
- Modify: `src/pages/BoardSkeletonSandbox.jsx:74` (add `'connect'` to the specimen list)

**Interfaces:**
- Consumes: `ANIMATIONS.connect` (Task 1) via the existing `<PixelKlay>` specimen row.
- Produces: nothing new — this task is verification.

- [ ] **Step 1: Add the `connect` specimen**

In `src/pages/BoardSkeletonSandbox.jsx` line 74, extend the specimen list:

```jsx
{['idle', 'tap', 'hop', 'grow', 'wilt', 'converse', 'blueprint', 'duo', 'connect'].map((name) => (
```

- [ ] **Step 2: Visual verification in the browser**

```bash
npm run dev
```

Then verify each of the following, in **both light and dark themes** (toggle via Settings → Preferences):

1. `http://localhost:5173/sandbox/board-skeleton` — the `connect` specimen: push → click → spark → payoff reads at 7×; no mauve in the socket/plug.
2. `http://localhost:5173/onboarding?step=upsell` (use the dev step picker if redirected), desktop width:
   - Klay performs `converse` in card 1, walks the floor across the card divider into card 2 (`last-move`), then card 3 (`connect`), exits right, re-enters left.
   - Vacated cards show resting props (bubble / columns+card / socket); the active card's props are hidden and its tag chip tints lime.
   - Walk easing looks stepped, not smooth.
3. Narrow the window below `md` (cards stacked): Klay fades out/in between cards instead of walking; position lands inside the active card.
4. Reduced motion (DevTools → Rendering → emulate `prefers-reduced-motion: reduce`, then reload): Klay stands static in card 1; cards 2–3 show resting props; nothing animates.
5. Resize the window at desktop width mid-journey: Klay re-anchors onto the stations (no drift).

- [ ] **Step 3: Fix what doesn't read, then re-verify**

Expected trouble spots: `KLAY_SCALE` vs the 170px stage (if Klay crowds the card, drop to 6), the sprite's `bottom-3` floor alignment vs the static props, dark-theme legibility of the sand/mist props. Adjust in `UpsellStep.jsx` / `klayAnimations.js` and re-check.

- [ ] **Step 4: Full verification + commit**

```bash
npm run test && npm run lint && npm run build
git add src/pages/BoardSkeletonSandbox.jsx
git commit -m "feat(klay): connect specimen in sandbox; upsell journey visually verified"
```

---

## Self-Review Notes

- **Spec coverage:** journey state machine → Task 3; scenes incl. new `connect` → Task 1; resting props → Tasks 1–2; continuous walk + wrap + mobile fade + reduced motion → Task 4; card rewire, emphasis, deletions → Task 5; a11y label → Tasks 4–5; manual verification incl. themes/mobile/reduced-motion → Task 6.
- **Types:** `journey = { station, phase: 'perform'|'travel', reduced }` used identically in Tasks 3, 4, 5. `UPSELL_REST_PROPS.{chat,agentic,tools}` (Task 1) consumed in Task 5. `scenes` array `['converse', 'last-move', 'connect']` in Tasks 4–5.
- **Known jsdom limits:** geometry (walking path, wrap) is untestable in jsdom; covered explicitly by Task 6's manual checklist.
