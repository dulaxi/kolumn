import { describe, test, expect, vi } from 'vitest'
import { filterCards } from '../utils/cardFilters'

const today = '2026-03-25'
const yesterday = '2026-03-24'
const tomorrow = '2026-03-26'
const thisWeek = '2026-03-27' // Friday same week

function makeCard(overrides = {}) {
  return {
    id: 'c1',
    priority: 'medium',
    assignee_name: '',
    labels: [],
    due_date: null,
    ...overrides,
  }
}

describe('filterCards', () => {
  // ─── No filters ──────────────────────────────────────────

  test('returns all cards when no filters provided', () => {
    const cards = [makeCard({ id: '1' }), makeCard({ id: '2' })]
    expect(filterCards(cards, {})).toHaveLength(2)
  })

  test('returns all cards when filters is null', () => {
    const cards = [makeCard({ id: '1' })]
    expect(filterCards(cards, null)).toHaveLength(1)
  })

  // ─── Priority filter ─────────────────────────────────────

  test('filters by single priority', () => {
    const cards = [
      makeCard({ id: '1', priority: 'high' }),
      makeCard({ id: '2', priority: 'low' }),
      makeCard({ id: '3', priority: 'high' }),
    ]
    const result = filterCards(cards, { priority: ['high'] })
    expect(result.map((c) => c.id)).toEqual(['1', '3'])
  })

  test('filters by multiple priorities', () => {
    const cards = [
      makeCard({ id: '1', priority: 'high' }),
      makeCard({ id: '2', priority: 'low' }),
      makeCard({ id: '3', priority: 'medium' }),
    ]
    const result = filterCards(cards, { priority: ['high', 'low'] })
    expect(result.map((c) => c.id)).toEqual(['1', '2'])
  })

  test('empty priority array does not filter', () => {
    const cards = [makeCard({ id: '1', priority: 'low' })]
    expect(filterCards(cards, { priority: [] })).toHaveLength(1)
  })

  // ─── Assignee filter ──────────────────────────────────────

  test('filters by exact assignee name', () => {
    const cards = [
      makeCard({ id: '1', assignee_name: 'Alice' }),
      makeCard({ id: '2', assignee_name: 'Bob' }),
    ]
    const result = filterCards(cards, { assignee: 'Alice' })
    expect(result.map((c) => c.id)).toEqual(['1'])
  })

  test('empty assignee string does not filter', () => {
    const cards = [makeCard({ id: '1', assignee_name: 'Alice' })]
    expect(filterCards(cards, { assignee: '' })).toHaveLength(1)
  })

  // ─── Label filter ─────────────────────────────────────────

  test('filters cards that have any matching label', () => {
    const cards = [
      makeCard({ id: '1', labels: [{ text: 'bug', color: 'red' }] }),
      makeCard({ id: '2', labels: [{ text: 'feature', color: 'blue' }] }),
      makeCard({ id: '3', labels: [{ text: 'bug', color: 'red' }, { text: 'urgent', color: 'yellow' }] }),
    ]
    const result = filterCards(cards, { label: ['bug'] })
    expect(result.map((c) => c.id)).toEqual(['1', '3'])
  })

  test('cards with no labels are excluded when label filter active', () => {
    const cards = [
      makeCard({ id: '1', labels: [] }),
      makeCard({ id: '2', labels: [{ text: 'bug', color: 'red' }] }),
    ]
    const result = filterCards(cards, { label: ['bug'] })
    expect(result.map((c) => c.id)).toEqual(['2'])
  })

  test('empty label array does not filter', () => {
    const cards = [makeCard({ id: '1', labels: [] })]
    expect(filterCards(cards, { label: [] })).toHaveLength(1)
  })

  // ─── Due date filter ──────────────────────────────────────

  test('filters overdue cards (past, not today)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25, 12, 0, 0))

    const cards = [
      makeCard({ id: '1', due_date: yesterday }),
      makeCard({ id: '2', due_date: today }),
      makeCard({ id: '3', due_date: tomorrow }),
    ]
    const result = filterCards(cards, { due: 'overdue' })
    expect(result.map((c) => c.id)).toEqual(['1'])

    vi.useRealTimers()
  })

  test('filters cards due today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25, 12, 0, 0))

    const cards = [
      makeCard({ id: '1', due_date: yesterday }),
      makeCard({ id: '2', due_date: today }),
      makeCard({ id: '3', due_date: tomorrow }),
    ]
    const result = filterCards(cards, { due: 'today' })
    expect(result.map((c) => c.id)).toEqual(['2'])

    vi.useRealTimers()
  })

  test('filters cards due this week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25, 12, 0, 0)) // Wednesday

    const cards = [
      makeCard({ id: '1', due_date: '2026-03-20' }), // last Friday — not this week
      makeCard({ id: '2', due_date: today }),
      makeCard({ id: '3', due_date: thisWeek }), // Friday this week
      makeCard({ id: '4', due_date: '2026-04-01' }), // next week
    ]
    const result = filterCards(cards, { due: 'week' })
    expect(result.map((c) => c.id)).toContain('2')
    expect(result.map((c) => c.id)).toContain('3')

    vi.useRealTimers()
  })

  test('filters cards with no due date', () => {
    const cards = [
      makeCard({ id: '1', due_date: null }),
      makeCard({ id: '2', due_date: today }),
    ]
    const result = filterCards(cards, { due: 'none' })
    expect(result.map((c) => c.id)).toEqual(['1'])
  })

  // ─── Combined filters ────────────────────────────────────

  test('combines priority and assignee filters', () => {
    const cards = [
      makeCard({ id: '1', priority: 'high', assignee_name: 'Alice' }),
      makeCard({ id: '2', priority: 'high', assignee_name: 'Bob' }),
      makeCard({ id: '3', priority: 'low', assignee_name: 'Alice' }),
    ]
    const result = filterCards(cards, { priority: ['high'], assignee: 'Alice' })
    expect(result.map((c) => c.id)).toEqual(['1'])
  })
})
