import { describe, test, expect } from 'vitest'
import { getGreetingSlot, pickGreeting, GREETINGS, KLAY_BY_SLOT } from '../utils/greeting'
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

describe('KLAY_BY_SLOT — the mood map', () => {
  test('every slot maps to an animation that exists in the runtime', () => {
    // Contract with klayAnimations.js: a rename there must fail here,
    // not silently render PixelKlay's idle fallback at 9am.
    for (const [slot, anim] of Object.entries(KLAY_BY_SLOT)) {
      expect(ANIMATIONS[anim], `slot "${slot}" → "${anim}"`).toBeDefined()
    }
  })

  test('the intended postures: grow, tap, idle, sleep', () => {
    expect(KLAY_BY_SLOT).toEqual({
      morning: 'grow',
      afternoon: 'tap',
      evening: 'idle',
      night: 'sleep',
    })
  })
})

describe('pickGreeting', () => {
  test('returns one of the slot\'s own lines', () => {
    for (const slot of Object.keys(GREETINGS)) {
      expect(GREETINGS[slot]).toContain(pickGreeting(slot))
    }
  })
})
