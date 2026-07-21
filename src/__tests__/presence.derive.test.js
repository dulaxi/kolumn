import { describe, test, expect } from 'vitest'
import { derivePresence, othersOf, othersOnCard } from '../store/presence'

const m = (user_id, card_id = null) => ({ user_id, name: user_id, color: 'bg-[#C2D64A]', icon: null, card_id })

describe('derivePresence', () => {
  test('flattens presence state into members + byCard', () => {
    const state = { u1: [m('u1', 'c1')], u2: [m('u2', null)] }
    const { members, byCard } = derivePresence(state)
    expect(members.map((x) => x.user_id).sort()).toEqual(['u1', 'u2'])
    expect(byCard.c1.map((x) => x.user_id)).toEqual(['u1'])
    expect(byCard.c2).toBeUndefined()
  })

  test('dedups multiple tabs by user_id, preferring an entry with a card', () => {
    const state = { u1: [m('u1', null), m('u1', 'c9')] }
    const { members, byCard } = derivePresence(state)
    expect(members).toHaveLength(1)
    expect(byCard.c9.map((x) => x.user_id)).toEqual(['u1'])
  })

  test('othersOf / othersOnCard exclude self', () => {
    const { members, byCard } = derivePresence({ me: [m('me', 'c1')], u2: [m('u2', 'c1')] })
    expect(othersOf(members, 'me').map((x) => x.user_id)).toEqual(['u2'])
    expect(othersOnCard(byCard, 'c1', 'me').map((x) => x.user_id)).toEqual(['u2'])
    expect(othersOnCard(byCard, 'c1', 'me').length).toBe(1)
  })

  test('empty state is safe', () => {
    expect(derivePresence({})).toEqual({ members: [], byCard: {} })
    expect(othersOnCard({}, 'nope', 'me')).toEqual([])
  })
})
