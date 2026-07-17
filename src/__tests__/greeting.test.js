import { describe, test, expect } from 'vitest'
import { getGreetingSlot, pickGreeting, pickKlay, GREETINGS, KLAY_BY_SLOT } from '../utils/greeting'
import { ANIMATIONS } from '../components/klay/klayAnimations'

describe('getGreetingSlot — the one clock everything reads', () => {
  test.each([
    [5, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
    [20, 'evening'],
    [21, 'night'],
    [23, 'night'],
    [0, 'night'],
    [4, 'night'],
  ])('hour %i → %s', (hour, slot) => {
    expect(getGreetingSlot(hour)).toBe(slot)
  })

  test('every hour of the day lands in a slot with words AND a Klay', () => {
    for (let h = 0; h < 24; h++) {
      const slot = getGreetingSlot(h)
      expect(GREETINGS[slot]).toBeDefined()
      expect(KLAY_BY_SLOT[slot]).toBeDefined()
    }
  })
})

describe('KLAY_BY_SLOT — one work scene per greeting line', () => {
  test('every scene maps to an animation that exists in the runtime', () => {
    // Contract with klayAnimations.js: a rename there must fail here,
    // not silently render PixelKlay's idle fallback at 9am.
    for (const [slot, anims] of Object.entries(KLAY_BY_SLOT)) {
      for (const anim of anims) {
        expect(ANIMATIONS[anim], `slot "${slot}" → "${anim}"`).toBeDefined()
      }
    }
  })

  test('lines and scenes stay in lockstep — same slots, same lengths', () => {
    // The pairing guarantee is positional: GREETINGS[slot][i] pairs with
    // KLAY_BY_SLOT[slot][i]. A slot gaining a line without a scene (or
    // vice versa) breaks the day-index arithmetic silently.
    expect(Object.keys(KLAY_BY_SLOT).sort()).toEqual(Object.keys(GREETINGS).sort())
    for (const slot of Object.keys(GREETINGS)) {
      expect(KLAY_BY_SLOT[slot], `slot "${slot}"`).toHaveLength(GREETINGS[slot].length)
    }
  })

  test('the intended roster (decision: dashboard-klay-worksets + freshcolumns-r2)', () => {
    expect(KLAY_BY_SLOT).toEqual({
      morning: ['sweep', 'ship', 'sprout-columns'],
      afternoon: ['push-card', 'flow', 'progress'],
      evening: ['checklist', 'box-lid', 'last-move'],
      night: ['lamplight', 'night-focus', 'moonsleep'],
    })
  })
})

describe('the paired pickers', () => {
  test('pickGreeting returns one of the slot\'s own lines', () => {
    for (const slot of Object.keys(GREETINGS)) {
      expect(GREETINGS[slot]).toContain(pickGreeting(slot))
    }
  })

  test('pickKlay returns one of the slot\'s own scenes', () => {
    for (const slot of Object.keys(KLAY_BY_SLOT)) {
      expect(KLAY_BY_SLOT[slot]).toContain(pickKlay(slot))
    }
  })

  test('today\'s line and today\'s scene sit at the same index', () => {
    // "Ship it" day must show the shipping scene — the whole point of the
    // per-line map. Both pickers mod the same dayIndex() over same-length
    // arrays, so their positions must agree.
    for (const slot of Object.keys(GREETINGS)) {
      const lineIdx = GREETINGS[slot].indexOf(pickGreeting(slot))
      const klayIdx = KLAY_BY_SLOT[slot].indexOf(pickKlay(slot))
      expect(klayIdx, `slot "${slot}"`).toBe(lineIdx)
    }
  })
})
