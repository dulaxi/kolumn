import { describe, test, expect } from 'vitest'
import { reorderSameColumn, moveBetweenColumns, calcNewCardPosition, calcGlobalTaskNumber } from '../utils/positioning'

function makeCard(id, position, columnId = 'col1') {
  return { id, position, column_id: columnId }
}

// ─── reorderSameColumn ────────────────────────────────────────

describe('reorderSameColumn', () => {
  test('moves card forward (index 0 → 2)', () => {
    const cards = [makeCard('a', 0), makeCard('b', 1), makeCard('c', 2)]
    const result = reorderSameColumn(cards, 0, 2)
    expect(result.map((c) => c.id)).toEqual(['b', 'c', 'a'])
    // Positions should be sequential
    result.forEach((c, i) => expect(c.position).toBe(i))
  })

  test('moves card backward (index 2 → 0)', () => {
    const cards = [makeCard('a', 0), makeCard('b', 1), makeCard('c', 2)]
    const result = reorderSameColumn(cards, 2, 0)
    expect(result.map((c) => c.id)).toEqual(['c', 'a', 'b'])
    result.forEach((c, i) => expect(c.position).toBe(i))
  })

  test('no-op when fromIndex === toIndex', () => {
    const cards = [makeCard('a', 0), makeCard('b', 1)]
    const result = reorderSameColumn(cards, 1, 1)
    expect(result.map((c) => c.id)).toEqual(['a', 'b'])
  })

  test('handles single card', () => {
    const cards = [makeCard('a', 0)]
    const result = reorderSameColumn(cards, 0, 0)
    expect(result.map((c) => c.id)).toEqual(['a'])
  })

  test('preserves other card properties', () => {
    const cards = [
      { id: 'a', position: 0, column_id: 'col1', title: 'Task A' },
      { id: 'b', position: 1, column_id: 'col1', title: 'Task B' },
    ]
    const result = reorderSameColumn(cards, 0, 1)
    expect(result[0].title).toBe('Task B')
    expect(result[1].title).toBe('Task A')
  })
})

// ─── moveBetweenColumns ───────────────────────────────────────

describe('moveBetweenColumns', () => {
  test('moves card from one column to another', () => {
    const fromCards = [makeCard('a', 0, 'col1'), makeCard('b', 1, 'col1')]
    const toCards = [makeCard('c', 0, 'col2')]

    const { newFromCards, newToCards } = moveBetweenColumns(fromCards, toCards, 0, 1, 'col2')

    // 'a' removed from fromCards
    expect(newFromCards.map((c) => c.id)).toEqual(['b'])
    expect(newFromCards[0].position).toBe(0)

    // 'a' inserted at index 1 in toCards
    expect(newToCards.map((c) => c.id)).toEqual(['c', 'a'])
    expect(newToCards[0].position).toBe(0)
    expect(newToCards[1].position).toBe(1)
    expect(newToCards[1].column_id).toBe('col2')
  })

  test('moves card to empty column', () => {
    const fromCards = [makeCard('a', 0, 'col1'), makeCard('b', 1, 'col1')]
    const toCards = []

    const { newFromCards, newToCards } = moveBetweenColumns(fromCards, toCards, 0, 0, 'col2')

    expect(newFromCards.map((c) => c.id)).toEqual(['b'])
    expect(newToCards.map((c) => c.id)).toEqual(['a'])
    expect(newToCards[0].column_id).toBe('col2')
  })

  test('moves card to beginning of target column', () => {
    const fromCards = [makeCard('a', 0, 'col1')]
    const toCards = [makeCard('b', 0, 'col2'), makeCard('c', 1, 'col2')]

    const { newFromCards, newToCards } = moveBetweenColumns(fromCards, toCards, 0, 0, 'col2')

    expect(newFromCards).toEqual([])
    expect(newToCards.map((c) => c.id)).toEqual(['a', 'b', 'c'])
    newToCards.forEach((c, i) => expect(c.position).toBe(i))
  })

  test('resets completed to false on moved card', () => {
    const fromCards = [{ ...makeCard('a', 0, 'col1'), completed: true }]
    const toCards = []

    const { newToCards } = moveBetweenColumns(fromCards, toCards, 0, 0, 'col2')
    expect(newToCards[0].completed).toBe(false)
  })

  test('reindexes remaining fromCards', () => {
    const fromCards = [makeCard('a', 0, 'col1'), makeCard('b', 1, 'col1'), makeCard('c', 2, 'col1')]
    const toCards = []

    const { newFromCards } = moveBetweenColumns(fromCards, toCards, 1, 0, 'col2')

    expect(newFromCards.map((c) => c.id)).toEqual(['a', 'c'])
    expect(newFromCards[0].position).toBe(0)
    expect(newFromCards[1].position).toBe(1)
  })
})

// ─── calcNewCardPosition ──────────────────────────────────────

describe('calcNewCardPosition', () => {
  test('returns 0 for empty column', () => {
    expect(calcNewCardPosition([])).toBe(0)
  })

  test('returns count of existing cards', () => {
    const cards = [makeCard('a', 0), makeCard('b', 1)]
    expect(calcNewCardPosition(cards)).toBe(2)
  })
})

// ─── calcGlobalTaskNumber ─────────────────────────────────────

describe('calcGlobalTaskNumber', () => {
  test('returns 1 for empty cards', () => {
    expect(calcGlobalTaskNumber({})).toBe(1)
  })

  test('returns max + 1', () => {
    const cards = {
      c1: { id: 'c1', global_task_number: 5 },
      c2: { id: 'c2', global_task_number: 12 },
      c3: { id: 'c3', global_task_number: 3 },
    }
    expect(calcGlobalTaskNumber(cards)).toBe(13)
  })

  test('handles cards missing global_task_number', () => {
    const cards = {
      c1: { id: 'c1' },
      c2: { id: 'c2', global_task_number: 7 },
    }
    expect(calcGlobalTaskNumber(cards)).toBe(8)
  })
})
