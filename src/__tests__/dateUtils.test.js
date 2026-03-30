import { describe, test, expect } from 'vitest'
import { addRecurrenceInterval, groupCardsByDate, getCardsForDate } from '../utils/dateUtils'

// ─── addRecurrenceInterval ────────────────────────────────────

describe('addRecurrenceInterval', () => {
  test('adds days', () => {
    const date = new Date(2026, 2, 25) // March 25
    const result = addRecurrenceInterval(date, 3, 'days')
    expect(result.getDate()).toBe(28)
    expect(result.getMonth()).toBe(2)
  })

  test('adds months', () => {
    const date = new Date(2026, 2, 25) // March 25
    const result = addRecurrenceInterval(date, 2, 'months')
    expect(result.getMonth()).toBe(4) // May
    expect(result.getDate()).toBe(25)
  })

  test('handles month overflow when adding days', () => {
    const date = new Date(2026, 2, 30) // March 30
    const result = addRecurrenceInterval(date, 5, 'days')
    expect(result.getMonth()).toBe(3) // April
    expect(result.getDate()).toBe(4)
  })

  test('handles end-of-month when adding months', () => {
    const date = new Date(2026, 0, 31) // Jan 31
    const result = addRecurrenceInterval(date, 1, 'months')
    // date-fns addMonths clamps to Feb 28
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(28)
  })

  test('defaults to days for unknown unit', () => {
    const date = new Date(2026, 2, 25)
    const result = addRecurrenceInterval(date, 1, 'weeks') // not handled → falls through to addDays
    expect(result.getDate()).toBe(26) // adds 1 day
  })
})

// ─── groupCardsByDate ─────────────────────────────────────────

describe('groupCardsByDate', () => {
  test('groups cards by due_date', () => {
    const cards = {
      c1: { id: 'c1', due_date: '2026-03-25' },
      c2: { id: 'c2', due_date: '2026-03-25' },
      c3: { id: 'c3', due_date: '2026-03-26' },
    }
    const map = groupCardsByDate(cards)
    expect(map['2026-03-25']).toHaveLength(2)
    expect(map['2026-03-26']).toHaveLength(1)
  })

  test('skips cards with no due_date', () => {
    const cards = {
      c1: { id: 'c1', due_date: null },
      c2: { id: 'c2', due_date: '2026-03-25' },
    }
    const map = groupCardsByDate(cards)
    expect(Object.keys(map)).toEqual(['2026-03-25'])
  })

  test('returns empty object for empty cards', () => {
    expect(groupCardsByDate({})).toEqual({})
  })
})

// ─── getCardsForDate ──────────────────────────────────────────

describe('getCardsForDate', () => {
  const cardsByDate = {
    '2026-03-25': [{ id: 'c1' }, { id: 'c2' }],
  }

  test('returns cards for a matching date', () => {
    const day = new Date(2026, 2, 25)
    expect(getCardsForDate(cardsByDate, day)).toHaveLength(2)
  })

  test('returns empty array for date with no cards', () => {
    const day = new Date(2026, 2, 26)
    expect(getCardsForDate(cardsByDate, day)).toEqual([])
  })

  test('returns empty array when day is null', () => {
    expect(getCardsForDate(cardsByDate, null)).toEqual([])
  })
})
