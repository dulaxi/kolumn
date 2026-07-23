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

  it('does not crash when animation switches to a shorter sequence mid-loop', () => {
    vi.useFakeTimers()
    const { container, rerender } = render(<PixelKlay animation="converse" />)
    // converse frame durations: 700, 200, 200, 950, 350, 200, 950, 450ms.
    // Each advance must be its own act() so the passive-effect flush (which
    // schedules the *next* setTimeout) lands before the next advance — a
    // single big advanceTimersByTime only fires the timer that already
    // existed when the act() call started. Four transitions land idx at 4,
    // past walk's 4-frame array (indices 0-3).
    for (let i = 0; i < 4; i++) {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }
    rerender(<PixelKlay animation="walk" />)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
