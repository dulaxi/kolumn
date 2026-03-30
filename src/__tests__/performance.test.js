import { describe, test, expect, vi } from 'vitest'
import { filterCards } from '../utils/cardFilters'
import { computeTaskStats, computeBoardSummaries } from '../utils/cardStats'
import { buildColumnMap } from '../utils/columnGrouping'
import { reorderSameColumn, moveBetweenColumns } from '../utils/positioning'
import { groupCardsByDate } from '../utils/dateUtils'

// Note: No fake timers — performance.now() needs real time.
// Date-dependent utils (computeTaskStats) use real current date which is fine for perf testing.

function generateCards(count) {
  const cards = {}
  for (let i = 0; i < count; i++) {
    cards[`c${i}`] = {
      id: `c${i}`,
      board_id: `b${i % 5}`,
      column_id: `col${i % 10}`,
      position: i,
      title: `Task ${i}`,
      priority: ['low', 'medium', 'high'][i % 3],
      assignee_name: ['Alice', 'Bob', 'Charlie'][i % 3],
      labels: i % 4 === 0 ? [{ text: 'bug', color: 'red' }] : [],
      due_date: i % 3 === 0 ? '2026-03-25' : null,
      completed: i % 5 === 0,
      global_task_number: i + 1,
      updated_at: '2026-03-20T10:00:00Z',
    }
  }
  return cards
}

function generateColumns(count) {
  const columns = {}
  for (let i = 0; i < count; i++) {
    columns[`col${i}`] = {
      id: `col${i}`,
      board_id: `b${i % 5}`,
      title: ['To Do', 'In Progress', 'Review', 'Done', 'Backlog'][i % 5],
      position: i % 5,
    }
  }
  return columns
}

describe('performance', () => {
  test('filterCards with 1000 cards < 50ms', () => {
    const cards = Object.values(generateCards(1000))
    const start = performance.now()
    filterCards(cards, { priority: ['high'], assignee: 'Alice' })
    expect(performance.now() - start).toBeLessThan(50)
  })

  test('computeTaskStats with 1000 cards < 50ms', () => {
    const cards = generateCards(1000)
    const columns = generateColumns(10)
    const start = performance.now()
    computeTaskStats(cards, columns, 'Alice')
    expect(performance.now() - start).toBeLessThan(50)
  })

  test('computeBoardSummaries with 1000 cards < 100ms', () => {
    const cards = generateCards(1000)
    const columns = generateColumns(50)
    const boards = {}
    for (let i = 0; i < 5; i++) boards[`b${i}`] = { id: `b${i}`, name: `Board ${i}` }
    const start = performance.now()
    computeBoardSummaries(boards, columns, cards, 'Alice')
    expect(performance.now() - start).toBeLessThan(100)
  })

  test('buildColumnMap with 500 cards < 50ms', () => {
    const cards = generateCards(500)
    const columns = generateColumns(10)
    const boards = {}
    for (let i = 0; i < 5; i++) boards[`b${i}`] = { id: `b${i}`, icon: 'star' }
    const start = performance.now()
    buildColumnMap(columns, boards, cards)
    expect(performance.now() - start).toBeLessThan(50)
  })

  test('groupCardsByDate with 1000 cards < 50ms', () => {
    const cards = generateCards(1000)
    const start = performance.now()
    groupCardsByDate(cards)
    expect(performance.now() - start).toBeLessThan(50)
  })

  test('reorderSameColumn with 200 cards < 10ms', () => {
    const cards = Array.from({ length: 200 }, (_, i) => ({ id: `c${i}`, position: i }))
    const start = performance.now()
    reorderSameColumn(cards, 0, 199)
    expect(performance.now() - start).toBeLessThan(10)
  })

  test('moveBetweenColumns with 200-card columns < 10ms', () => {
    const from = Array.from({ length: 200 }, (_, i) => ({ id: `a${i}`, position: i, column_id: 'col1' }))
    const to = Array.from({ length: 200 }, (_, i) => ({ id: `b${i}`, position: i, column_id: 'col2' }))
    const start = performance.now()
    moveBetweenColumns(from, to, 0, 100, 'col2')
    expect(performance.now() - start).toBeLessThan(10)
  })

  test('filterCards handles 2000 cards within budget', () => {
    const cards = Object.values(generateCards(2000))
    const filter = { priority: ['high'] }
    const start = performance.now()
    const result = filterCards(cards, filter)
    expect(performance.now() - start).toBeLessThan(100)
    // Every 3rd card has priority 'high' (i%3===2)
    expect(result.length).toBeGreaterThan(0)
  })

  test('computeTaskStats returns correct counts on large dataset', () => {
    const cards = generateCards(1000)
    const columns = generateColumns(10)
    const stats = computeTaskStats(cards, columns, 'Alice')

    // Alice is every 3rd card (i%3===0), so ~334 cards
    // Due dates: every 3rd card has due_date = today
    // Columns: col0=To Do, col1=In Progress, col2=Review, col3=Done, col4=Backlog
    expect(stats.dueToday + stats.overdue + stats.inProgress + stats.completed).toBeGreaterThan(0)
    expect(stats.completed).toBeGreaterThan(0)
  })
})
