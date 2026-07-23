import { describe, it, expect } from 'vitest'
import {
  ANIMATIONS,
  UPSELL_REST_PROPS,
  PALETTE,
  COARSE_ROWS,
  COARSE_COLS,
  FINE_COLS,
} from '../components/klay/klayAnimations'

// The journey's station scenes + travel walk, plus `connect` (kept as an
// alternate station-3 scene in the library).
const UPSELL_ANIMATIONS = ['tick-sweep', 'handshake', 'scurry', 'connect']

describe('upsell journey animations', () => {
  it.each(UPSELL_ANIMATIONS)('%s exists with 2-8 frames', (name) => {
    expect(ANIMATIONS[name]).toBeDefined()
    expect(ANIMATIONS[name].length).toBeGreaterThanOrEqual(2)
    expect(ANIMATIONS[name].length).toBeLessThanOrEqual(8)
  })

  it.each(UPSELL_ANIMATIONS)('%s: every frame is a valid coarse grid with sane timing', (name) => {
    for (const f of ANIMATIONS[name]) {
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

  it('resting props sit exactly where their scenes draw them', () => {
    // Static (KlayStatic, resting) and animated (PixelKlay, mid-journey)
    // renders share the same fine-grid canvas — the crossfade between them
    // is only pixel-invisible if the rest prop matches the scene frame the
    // sprite settles on. Pin the coordinates so a future edit to either side
    // can't drift them apart unnoticed.
    // chat rests on converse's "quiet empty bubble" beat (frame index 2).
    expect(UPSELL_REST_PROPS.chat).toEqual(ANIMATIONS.converse[2].hi)
    // agentic rests on tick-sweep's opening beat — the stack all to-do (frame 0).
    expect(UPSELL_REST_PROPS.agentic).toEqual(ANIMATIONS['tick-sweep'][0].hi)
    // tools rests on handshake's opening beat — two nodes, no cable yet (frame 0).
    expect(UPSELL_REST_PROPS.tools).toEqual(ANIMATIONS.handshake[0].hi)
  })
})
