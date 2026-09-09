import { describe, test, expect } from 'vitest'
import { boardScrollEdges, edgeMask, FADE_WIDTH } from '../components/board/boardEdgeMask'

// The board's columns used to be sliced flat at the viewport edge. They now
// fade, but only where there is more board to reach — a fade over the last
// column with nothing behind it is the washed-out vignette the marketing
// template previews were stripped of.

describe('boardScrollEdges', () => {
  test('a board that fits entirely fades on neither side', () => {
    expect(boardScrollEdges({ scrollLeft: 0, scrollWidth: 800, clientWidth: 800 }))
      .toEqual({ start: false, end: false })
  })

  test('at the far left, only the right edge fades', () => {
    expect(boardScrollEdges({ scrollLeft: 0, scrollWidth: 2000, clientWidth: 800 }))
      .toEqual({ start: false, end: true })
  })

  test('mid-scroll, both edges fade', () => {
    expect(boardScrollEdges({ scrollLeft: 400, scrollWidth: 2000, clientWidth: 800 }))
      .toEqual({ start: true, end: true })
  })

  test('at the far right, the right fade lifts so the last column is not dimmed', () => {
    expect(boardScrollEdges({ scrollLeft: 1200, scrollWidth: 2000, clientWidth: 800 }))
      .toEqual({ start: true, end: false })
  })

  test('a fractional scrollLeft still counts as the end', () => {
    // scrollLeft is fractional at some zoom levels and device pixel ratios, so
    // a strict comparison never reaches the maximum and the fade sticks on.
    expect(boardScrollEdges({ scrollLeft: 1199.4, scrollWidth: 2000, clientWidth: 800 }).end)
      .toBe(false)
  })

  test('one pixel of overflow does not count as scrollable', () => {
    expect(boardScrollEdges({ scrollLeft: 0, scrollWidth: 801, clientWidth: 800 }))
      .toEqual({ start: false, end: false })
  })
})

describe('edgeMask', () => {
  test('no mask at all when nothing fades', () => {
    // Not an all-black mask: masking a scrolling element promotes it to its
    // own layer, which is not worth paying for when nothing is faded.
    expect(edgeMask({ start: false, end: false })).toBeUndefined()
  })

  test('fades the right edge when there is more board that way', () => {
    expect(edgeMask({ start: false, end: true })).toBe(
      `linear-gradient(to right, black calc(100% - ${FADE_WIDTH}), transparent 100%)`,
    )
  })

  // The left edge meets the sidebar rather than the void, so a clean cut there
  // reads as content passing under the panel. A fade would also only ever mean
  // "what you already scrolled past", and would leave the boundary crisp at
  // rest but soft after scrolling.
  test('never fades the left edge, however far you have scrolled', () => {
    expect(edgeMask({ start: true, end: false })).toBeUndefined()
    const midScroll = edgeMask({ start: true, end: true })
    expect(midScroll).toBe(
      `linear-gradient(to right, black calc(100% - ${FADE_WIDTH}), transparent 100%)`,
    )
    expect(midScroll).not.toContain(`transparent 0`)
  })

  test('fades to transparent, never to a colour', () => {
    // A gradient in the page colour would paint over the last column instead
    // of dissolving it — the vignette this deliberately is not.
    const mask = edgeMask({ start: true, end: true })
    expect(mask).toContain('transparent')
    expect(mask).not.toMatch(/#|rgb|var\(/)
  })
})
