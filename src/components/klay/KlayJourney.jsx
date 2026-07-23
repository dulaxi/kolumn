import { useEffect, useState } from 'react'
import PixelKlay from './PixelKlay'
import { COARSE_COLS } from './klayAnimations'
import { TRAVEL_MS } from './useKlayJourney'

// Duration of the sprite's opacity fade (see the `transition` style below).
// Shared with the stacked-layout travel snap so the reposition can't race
// ahead of (or lag behind) the fade-out.
const FADE_MS = 400

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

  // Passive, not layout: `containerRef` is an ancestor DOM node whose ref
  // attaches after this component's own commit step (React attaches refs
  // bottom-up), so reading it in a useLayoutEffect on first mount would
  // always see `null`. useEffect fires only once the *whole* tree's layout
  // phase — including the ancestor's ref — has completed. The render guard
  // above keeps the sprite unrendered until `layout`/`pos` land, so this
  // stays flash-free either way.
  useEffect(() => {
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
    // Standing still: snap immediately (arrivals fade in via opacity).
    if (!traveling) {
      setPos({ ...target, transition: 'none' })
      return undefined
    }
    if (!layout.row) {
      // Stacked layout: the sprite is already fading out in place (the
      // `hidden` opacity transition below just started). Hold position
      // until that fade completes, then snap to the destination while
      // invisible — so it never visibly teleports mid-fade.
      const fade = setTimeout(() => {
        setPos({ ...target, transition: 'none' })
      }, FADE_MS)
      return () => clearTimeout(fade)
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

  const hidden = layout ? traveling && !layout.row : false
  const animation = reduced ? scenes[0] : traveling ? 'walk' : scenes[station]
  const transition = [pos.transition, `opacity ${FADE_MS}ms ease`].filter((t) => t && t !== 'none').join(', ')

  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{ left: pos.x, top: pos.y, opacity: hidden ? 0 : 1, transition }}
    >
      <PixelKlay animation={animation} paused={reduced} scale={scale} label={label} />
    </div>
  )
}
