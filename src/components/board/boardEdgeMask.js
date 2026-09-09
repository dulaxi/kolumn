// Which edges of the board fade, and the mask that does it.
//
// The board is masked rather than veiled: content genuinely fades to
// transparent, so the page shows through it. A gradient overlay painted in the
// page colour would wash the last column instead of dissolving it — that is
// the vignette the marketing template previews got rid of.
//
// Only an edge with more board beyond it fades. Scrolled to the far right, the
// right fade lifts, so the final column is never dimmed for no reason; a board
// narrow enough to fit entirely has no fade at all.

// Width is the only lever a linear mask has: a shorter ramp is both less
// spread AND less dimming, since any given pixel sits further along the
// gradient and stays more opaque.
//
// It went 56 → 24 → 16 while the strip still stopped short of the screen —
// the fade was landing on a column already sliced by the page padding, so any
// width read as too much. With the strip full-bleed there is real board under
// the fade and it can afford to be wider again.
export const FADE_WIDTH = '32px'

// 1px of slack: scrollLeft is fractional at some zoom levels and device pixel
// ratios, so a strict comparison never quite reaches the maximum and leaves
// the right fade stuck on when you are already at the end.
const SLACK = 1

export function boardScrollEdges({ scrollLeft, scrollWidth, clientWidth }) {
  const max = scrollWidth - clientWidth
  if (max <= SLACK) return { start: false, end: false }
  return {
    start: scrollLeft > SLACK,
    end: scrollLeft < max - SLACK,
  }
}

export function edgeMask({ start, end }, fade = FADE_WIDTH) {
  if (start && end) {
    return `linear-gradient(to right, transparent 0, black ${fade}, black calc(100% - ${fade}), transparent 100%)`
  }
  if (end) return `linear-gradient(to right, black calc(100% - ${fade}), transparent 100%)`
  if (start) return `linear-gradient(to right, transparent 0, black ${fade})`
  // No mask at all rather than an all-black one: masking a scrolling element
  // promotes it to its own layer, and there is no reason to pay that when
  // nothing is being faded.
  return undefined
}
