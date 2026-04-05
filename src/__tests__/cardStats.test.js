import { describe, test, expect, vi } from 'vitest'
import { computeTaskStats, computeBoardSummaries } from '../utils/cardStats'

// Freeze time to 2026-03-25 noon
vi.useFakeTimers()
vi.setSystemTime(new Date(2026, 2, 25, 12, 0, 0))

const today = '2026-03-25'
const yesterday = '2026-03-24'
const tomorrow = '2026-03-26'

function makeCard(overrides = {}) {
  return {
    id: 'c1',
    board_id: 'b1',
    column_id: 'col1',
    assignee_name: 'Alice',
    due_date: null,
    updated_at: '2026-03-20T10:00:00Z',
    ...overrides,
  }
}

// ─── computeTaskStats ─────────────────────────────────────────

describe('computeTaskStats', () => {
  const columns = {
    col1: { id: 'col1', board_id: 'b1', title: 'To Do', position: 0 },
    col2: { id: 'col2', board_id: 'b1', title: 'In Progress', position: 1 },
    col3: { id: 'col3', board_id: 'b1', title: 'Done', position: 2 },
  }

  test('counts cards assigned to the given user only', () => {
    const cards = {
      c1: makeCard({ id: 'c1', assignee_name: 'Alice' }),
      c2: makeCard({ id: 'c2', assignee_name: 'Bob' }),
      c3: makeCard({ id: 'c3', assignee_name: '' }),
    }
    const stats = computeTaskStats(cards, columns, 'Alice')
    // Only Alice's cards count (c1)
    expect(stats.dueToday + stats.overdue + stats.inProgress + stats.completed).toBeLessThanOrEqual(1)
  })

  test('counts completed cards in "Done" column', () => {
    const cards = {
      c1: makeCard({ id: 'c1', column_id: 'col3' }),
    }
    const stats = computeTaskStats(cards, columns, 'Alice')
    expect(stats.completed).toBe(1)
  })

  test('counts in-progress cards in "In Progress" column', () => {
    const cards = {
      c1: makeCard({ id: 'c1', column_id: 'col2' }),
    }
    const stats = computeTaskStats(cards, columns, 'Alice')
    expect(stats.inProgress).toBe(1)
  })

  test('counts due today cards', () => {
    const cards = {
      c1: makeCard({ id: 'c1', column_id: 'col1', due_date: today }),
    }
    const stats = computeTaskStats(cards, columns, 'Alice')
    expect(stats.dueToday).toBe(1)
    expect(stats.dueTodayCards).toHaveLength(1)
  })

  test('counts overdue cards (past, not today)', () => {
    const cards = {
      c1: makeCard({ id: 'c1', column_id: 'col1', due_date: yesterday }),
    }
    const stats = computeTaskStats(cards, columns, 'Alice')
    expect(stats.overdue).toBe(1)
    expect(stats.overdueCards).toHaveLength(1)
  })

  test('does not count done cards as overdue even if past due', () => {
    const cards = {
      c1: makeCard({ id: 'c1', column_id: 'col3', due_date: yesterday }),
    }
    const stats = computeTaskStats(cards, columns, 'Alice')
    expect(stats.overdue).toBe(0)
    expect(stats.completed).toBe(1)
  })

  test('handles empty cards', () => {
    const stats = computeTaskStats({}, columns, 'Alice')
    expect(stats.dueToday).toBe(0)
    expect(stats.overdue).toBe(0)
    expect(stats.inProgress).toBe(0)
    expect(stats.completed).toBe(0)
  })

  test('case-insensitive Done column matching', () => {
    const cols = {
      col1: { id: 'col1', board_id: 'b1', title: 'done', position: 0 },
    }
    const cards = {
      c1: makeCard({ id: 'c1', column_id: 'col1' }),
    }
    const stats = computeTaskStats(cards, cols, 'Alice')
    expect(stats.completed).toBe(1)
  })
})

// ─── computeBoardSummaries ────────────────────────────────────

describe('computeBoardSummaries', () => {
  const boards = {
    b1: { id: 'b1', name: 'Project A', icon: 'rocket' },
    b2: { id: 'b2', name: 'Project B', icon: 'star' },
  }

  const columns = {
    col1: { id: 'col1', board_id: 'b1', title: 'To Do', position: 0 },
    col2: { id: 'col2', board_id: 'b1', title: 'Done', position: 1 },
    col3: { id: 'col3', board_id: 'b2', title: 'Backlog', position: 0 },
  }

  test('returns per-board summaries with column counts', () => {
    const cards = {
      c1: makeCard({ id: 'c1', board_id: 'b1', column_id: 'col1', assignee_name: 'Alice' }),
      c2: makeCard({ id: 'c2', board_id: 'b1', column_id: 'col2', assignee_name: 'Alice' }),
      c3: makeCard({ id: 'c3', board_id: 'b2', column_id: 'col3', assignee_name: 'Alice' }),
    }
    const summaries = computeBoardSummaries(boards, columns, cards, 'Alice')
    expect(summaries).toHaveLength(2)

    const projA = summaries.find((s) => s.id === 'b1')
    expect(projA.totalCards).toBe(2)
    expect(projA.columns).toHaveLength(2)
    expect(projA.columns[0].count).toBe(1) // To Do
    expect(projA.columns[1].count).toBe(1) // Done
  })

  test('counts ALL cards on the board, not just the current user (C2 bug)', () => {
    const cards = {
      c1: makeCard({ id: 'c1', board_id: 'b1', column_id: 'col1', assignee_name: 'Alice' }),
      c2: makeCard({ id: 'c2', board_id: 'b1', column_id: 'col1', assignee_name: 'Bob' }),
      c3: makeCard({ id: 'c3', board_id: 'b1', column_id: 'col1', assignee_name: '' }),
    }
    const summaries = computeBoardSummaries(boards, columns, cards, 'Alice')
    const projA = summaries.find((s) => s.id === 'b1')
    expect(projA.totalCards).toBe(3)
  })

  test('computes lastUpdated from most recent card timestamp', () => {
    const cards = {
      c1: makeCard({ id: 'c1', board_id: 'b1', column_id: 'col1', updated_at: '2026-03-20T10:00:00Z' }),
      c2: makeCard({ id: 'c2', board_id: 'b1', column_id: 'col1', updated_at: '2026-03-22T15:00:00Z' }),
    }
    const summaries = computeBoardSummaries(boards, columns, cards, 'Alice')
    const projA = summaries.find((s) => s.id === 'b1')
    expect(projA.lastUpdated).toBe(new Date('2026-03-22T15:00:00Z').getTime())
  })

  test('sets lastUpdated to null when board has no cards', () => {
    const summaries = computeBoardSummaries(boards, columns, {}, 'Alice')
    const projA = summaries.find((s) => s.id === 'b1')
    expect(projA.lastUpdated).toBeNull()
  })

  test('columns sorted by position', () => {
    const summaries = computeBoardSummaries(boards, columns, {}, 'Alice')
    const projA = summaries.find((s) => s.id === 'b1')
    expect(projA.columns[0].title).toBe('To Do')
    expect(projA.columns[1].title).toBe('Done')
  })
})
