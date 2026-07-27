import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest'
import { groupCards } from '../lib/cardRailGroups'

const boards = {
  b1: { id: 'b1', name: 'Launch' },
  b2: { id: 'b2', name: 'Backlog' },
}
const columns = {
  col1: { id: 'col1', board_id: 'b1', title: 'In progress' },
  col2: { id: 'col2', board_id: 'b2', title: 'In progress' },
  col3: { id: 'col3', board_id: 'b1', title: 'Done' },
}
const ctx = { boards, columns }

const card = (id, extra = {}) => ({ id, title: id, board_id: 'b1', column_id: 'col1', ...extra })

describe('groupCards — mentioned', () => {
  test('returns a single null-label group with cards in input order', () => {
    const cards = [card('a'), card('b')]
    expect(groupCards(cards, 'mentioned', ctx)).toEqual([
      { key: 'mentioned', label: null, cards },
    ])
  })

  test('unknown mode falls back to mentioned', () => {
    const cards = [card('a')]
    expect(groupCards(cards, 'bogus', ctx)[0].label).toBeNull()
  })
})

describe('groupCards — board', () => {
  test('sections by board, ordered by first appearance, cards keep input order', () => {
    const cards = [
      card('a', { board_id: 'b2' }),
      card('b', { board_id: 'b1' }),
      card('c', { board_id: 'b2' }),
    ]
    const groups = groupCards(cards, 'board', ctx)
    expect(groups.map((g) => g.label)).toEqual(['Backlog', 'Launch'])
    expect(groups[0].cards.map((c) => c.id)).toEqual(['a', 'c'])
    expect(groups[1].cards.map((c) => c.id)).toEqual(['b'])
  })

  test('cards with a missing board fall into a trailing Unknown board section', () => {
    const cards = [card('a', { board_id: 'gone' }), card('b', { board_id: 'b1' })]
    const groups = groupCards(cards, 'board', ctx)
    expect(groups.map((g) => g.label)).toEqual(['Launch', 'Unknown board'])
    expect(groups[1].cards.map((c) => c.id)).toEqual(['a'])
  })
})

describe('groupCards — column', () => {
  test('merges same-titled columns across boards into one section', () => {
    const cards = [
      card('a', { column_id: 'col1' }),
      card('b', { column_id: 'col2', board_id: 'b2' }),
      card('c', { column_id: 'col3' }),
    ]
    const groups = groupCards(cards, 'column', ctx)
    expect(groups.map((g) => g.label)).toEqual(['In progress', 'Done'])
    expect(groups[0].cards.map((c) => c.id)).toEqual(['a', 'b'])
  })

  test('cards with a missing column fall into a trailing No column section', () => {
    const cards = [card('a', { column_id: 'gone' }), card('b')]
    const groups = groupCards(cards, 'column', ctx)
    expect(groups.map((g) => g.label)).toEqual(['In progress', 'No column'])
  })
})

describe('groupCards — due', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    // Local noon, July 15 2026 — buckets are computed against local midnight.
    vi.setSystemTime(new Date(2026, 6, 15, 12, 0, 0))
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  test('buckets in fixed order regardless of mention order', () => {
    const cards = [
      card('later', { due_date: '2026-07-23' }),
      card('none', {}),
      card('doneOld', { due_date: '2026-07-01', completed: true }),
      card('today', { due_date: '2026-07-15' }),
      card('week', { due_date: '2026-07-22' }), // today + 7 → still This week
      card('overdue', { due_date: '2026-07-14' }),
    ]
    const groups = groupCards(cards, 'due', ctx)
    expect(groups.map((g) => g.label)).toEqual([
      'Overdue', 'Today', 'This week', 'Later', 'No date', 'Completed',
    ])
    expect(groups.map((g) => g.cards.map((c) => c.id))).toEqual([
      ['overdue'], ['today'], ['week'], ['later'], ['none'], ['doneOld'],
    ])
  })

  test('completed always wins over date, and empty buckets are omitted', () => {
    const cards = [card('a', { due_date: '2026-07-10', completed: true })]
    const groups = groupCards(cards, 'due', ctx)
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Completed')
  })

  test('cards in the same bucket keep mention order', () => {
    const cards = [
      card('x', { due_date: '2026-07-16' }),
      card('y', { due_date: '2026-07-20' }),
    ]
    const groups = groupCards(cards, 'due', ctx)
    expect(groups[0].label).toBe('This week')
    expect(groups[0].cards.map((c) => c.id)).toEqual(['x', 'y'])
  })
})
