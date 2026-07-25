import { describe, test, expect, beforeEach } from 'vitest'
import { executeTool } from '../lib/toolExecutor'
import { useBoardStore } from '../store/boardStore'

const card = (id, boardId, colId, over) => ({
  id, board_id: boardId, column_id: colId, position: 0, title: id,
  description: '', assignees: [], completed: false, priority: null,
  due_date: null, updated_at: '2026-07-20T00:00:00Z', task_number: 1, ...over,
})

beforeEach(() => {
  useBoardStore.setState({
    boards: { b1: { id: 'b1', name: 'Launch' }, b2: { id: 'b2', name: 'Backlog' } },
    columns: {
      col1: { id: 'col1', board_id: 'b1', title: 'To do', position: 0 },
      col2: { id: 'col2', board_id: 'b1', title: 'Done', position: 1 },
      col3: { id: 'col3', board_id: 'b2', title: 'Ideas', position: 0 },
    },
    cards: {
      c1: card('c1', 'b1', 'col1', { title: 'Landing page redesign', priority: 'high', due_date: '2020-01-01' }),
      c2: card('c2', 'b1', 'col1', { title: 'Write launch tweet', description: 'mention the landing page', updated_at: '2026-07-24T00:00:00Z' }),
      c3: card('c3', 'b1', 'col2', { title: 'Old landing copy', completed: true }),
      c4: card('c4', 'b2', 'col3', { title: 'Landing A/B test', assignees: ['Sam'], updated_at: '2026-07-23T00:00:00Z' }),
    },
  })
})

describe('search_cards', () => {
  test('matches title/description case-insensitively, title matches ranked first', async () => {
    const r = await executeTool('search_cards', { query: 'LANDING' })
    expect(r.ok).toBe(true)
    expect(r.cards.map((c) => c.id)).toEqual(['c4', 'c1', 'c2'])
    expect(r.cards[0]).toMatchObject({ board: 'Backlog', column: 'Ideas' })
  })

  test('excludes completed unless include_completed', async () => {
    expect((await executeTool('search_cards', { query: 'landing' })).cards.map((c) => c.id)).not.toContain('c3')
    expect((await executeTool('search_cards', { query: 'landing', include_completed: true })).cards.map((c) => c.id)).toContain('c3')
  })

  test('board filter is case-insensitive; unknown board errors', async () => {
    const r = await executeTool('search_cards', { query: 'landing', board: 'launch' })
    expect(r.cards.map((c) => c.id)).toEqual(['c1', 'c2'])
    const bad = await executeTool('search_cards', { query: 'x', board: 'Nope' })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('Nope')
  })

  test('matches assignee names', async () => {
    const r = await executeTool('search_cards', { query: 'sam' })
    expect(r.cards.map((c) => c.id)).toEqual(['c4'])
  })

  test('caps at 20 and reports true total', async () => {
    const many = {}
    for (let i = 0; i < 25; i++) many[`x${i}`] = card(`x${i}`, 'b1', 'col1', { title: `Bulk item ${i}` })
    useBoardStore.setState({ cards: { ...useBoardStore.getState().cards, ...many } })
    const r = await executeTool('search_cards', { query: 'bulk item' })
    expect(r.count).toBe(20)
    expect(r.total).toBe(25)
  })

  test('missing query errors', async () => {
    expect((await executeTool('search_cards', {})).ok).toBe(false)
  })
})

describe('summarize_board', () => {
  test('columns in order with counts, totals include overdue', async () => {
    const r = await executeTool('summarize_board', { board: 'Launch' })
    expect(r.ok).toBe(true)
    expect(r.board).toBe('Launch')
    expect(r.columns.map((c) => c.title)).toEqual(['To do', 'Done'])
    expect(r.columns[0].count).toBe(2)
    expect(r.columns[0].cards.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(r.totals).toEqual({ cards: 3, completed: 1, overdue: 1 })
  })

  test('caps cards per column at 15 with truncated flag', async () => {
    const many = {}
    for (let i = 0; i < 18; i++) many[`y${i}`] = card(`y${i}`, 'b1', 'col1', { title: `Y ${i}`, position: i + 10 })
    useBoardStore.setState({ cards: { ...useBoardStore.getState().cards, ...many } })
    const r = await executeTool('summarize_board', { board: 'Launch' })
    expect(r.columns[0].count).toBe(20)
    expect(r.columns[0].cards).toHaveLength(15)
    expect(r.columns[0].truncated).toBe(true)
    expect(r.columns[1].truncated).toBeUndefined()
  })

  test('missing or unknown board errors', async () => {
    expect((await executeTool('summarize_board', {})).ok).toBe(false)
    expect((await executeTool('summarize_board', { board: 'Nope' })).ok).toBe(false)
  })
})
