import { describe, test, expect } from 'vitest'
import { buildColumnMap } from '../utils/columnGrouping'

describe('buildColumnMap', () => {
  test('groups cards by column title across boards', () => {
    const boards = {
      b1: { id: 'b1', icon: 'rocket' },
      b2: { id: 'b2', icon: 'star' },
    }
    const columns = {
      col1: { id: 'col1', board_id: 'b1', title: 'To Do', position: 0 },
      col2: { id: 'col2', board_id: 'b1', title: 'Done', position: 1 },
      col3: { id: 'col3', board_id: 'b2', title: 'To Do', position: 0 },
    }
    const cards = {
      c1: { id: 'c1', column_id: 'col1', position: 0 },
      c2: { id: 'c2', column_id: 'col2', position: 0 },
      c3: { id: 'c3', column_id: 'col3', position: 0 },
    }

    const result = buildColumnMap(columns, boards, cards)

    // 'To Do' should have cards from both boards
    expect(result.get('To Do')).toHaveLength(2)
    expect(result.get('Done')).toHaveLength(1)
  })

  test('preserves column position ordering', () => {
    const boards = { b1: { id: 'b1', icon: 'x' } }
    const columns = {
      col2: { id: 'col2', board_id: 'b1', title: 'Done', position: 1 },
      col1: { id: 'col1', board_id: 'b1', title: 'To Do', position: 0 },
    }
    const cards = {
      c1: { id: 'c1', column_id: 'col1', position: 0 },
      c2: { id: 'c2', column_id: 'col2', position: 0 },
    }

    const result = buildColumnMap(columns, boards, cards)
    const titles = Array.from(result.keys())
    // 'To Do' should come before 'Done' because position 0 < position 1
    expect(titles).toEqual(['To Do', 'Done'])
  })

  test('sorts cards within each group by position', () => {
    const boards = { b1: { id: 'b1', icon: 'x' } }
    const columns = {
      col1: { id: 'col1', board_id: 'b1', title: 'To Do', position: 0 },
    }
    const cards = {
      c2: { id: 'c2', column_id: 'col1', position: 1 },
      c1: { id: 'c1', column_id: 'col1', position: 0 },
    }

    const result = buildColumnMap(columns, boards, cards)
    const todoCards = result.get('To Do')
    expect(todoCards[0].card.id).toBe('c1')
    expect(todoCards[1].card.id).toBe('c2')
  })

  test('includes board icon with each card entry', () => {
    const boards = { b1: { id: 'b1', icon: 'rocket' } }
    const columns = { col1: { id: 'col1', board_id: 'b1', title: 'To Do', position: 0 } }
    const cards = { c1: { id: 'c1', column_id: 'col1', position: 0 } }

    const result = buildColumnMap(columns, boards, cards)
    expect(result.get('To Do')[0].boardIcon).toBe('rocket')
  })

  test('skips columns whose board does not exist', () => {
    const boards = {} // no boards
    const columns = { col1: { id: 'col1', board_id: 'b1', title: 'To Do', position: 0 } }
    const cards = { c1: { id: 'c1', column_id: 'col1', position: 0 } }

    const result = buildColumnMap(columns, boards, cards)
    expect(result.size).toBe(0)
  })

  test('returns empty map for no data', () => {
    const result = buildColumnMap({}, {}, {})
    expect(result.size).toBe(0)
  })
})
