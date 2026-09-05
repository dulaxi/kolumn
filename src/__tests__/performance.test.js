import { describe, test, expect } from 'vitest'
import { filterCards } from '../utils/cardFilters'
import { groupCardsByDate } from '../utils/dateUtils'

// Note: No fake timers — performance.now() needs real time.

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
      _labelTexts: i % 4 === 0 ? ['bug'] : [],
      due_date: i % 3 === 0 ? '2026-03-25' : null,
      completed: i % 5 === 0,
      global_task_number: i + 1,
      updated_at: '2026-03-20T10:00:00Z',
    }
  }
  return cards
}


describe('performance', () => {
  test('filterCards with 1000 cards < 50ms', () => {
    const cards = Object.values(generateCards(1000))
    const start = performance.now()
    filterCards(cards, { priority: ['high'], assignee: 'Alice' })
    expect(performance.now() - start).toBeLessThan(50)
  })




  test('groupCardsByDate with 1000 cards < 50ms', () => {
    const cards = generateCards(1000)
    const start = performance.now()
    groupCardsByDate(cards)
    expect(performance.now() - start).toBeLessThan(50)
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

})
