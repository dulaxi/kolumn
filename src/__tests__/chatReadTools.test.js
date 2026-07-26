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
      c1: card('c1', 'b1', 'col1', { title: 'Landing page redesign', priority: 'high', due_date: '2020-01-01', description: 'Rework the hero section and pricing table for the launch.', checklist: [{ id: 'i1', text: 'a', done: true }, { id: 'i2', text: 'b', done: false }] }),
      c2: card('c2', 'b1', 'col1', { title: 'Write launch tweet', description: 'mention the landing page', updated_at: '2026-07-24T00:00:00Z' }),
      c3: card('c3', 'b1', 'col2', { title: 'Old landing copy', completed: true }),
      c4: card('c4', 'b2', 'col3', { title: 'Landing A/B test', assignees: ['Sam'], updated_at: '2026-07-23T00:00:00Z' }),
      c5: card('c5', 'b1', 'col1', { title: 'Design atom grid', updated_at: '2026-07-22T00:00:00Z' }),
      c6: card('c6', 'b1', 'col1', { title: 'Archived landing card', archived: true }),
    },
    labels: {
      l1: { id: 'l1', board_id: 'b1', text: 'atoms', color: 'blue', archived_at: null },
      l2: { id: 'l2', board_id: 'b1', text: 'ghost', color: 'red', archived_at: '2026-07-01T00:00:00Z' },
    },
    cardLabels: {
      c5: new Set(['l1']),
      c2: new Set(['l2']),
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
    expect(r.cards.map((c) => c.id)).not.toContain('c6')
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

  test('matches label text at tier 1', async () => {
    const r = await executeTool('search_cards', { query: 'atoms' })
    expect(r.cards.map((c) => c.id)).toEqual(['c5'])
    expect(r.cards[0].labels).toEqual(['atoms'])
  })

  test('label match ranks tier-1, above a description-only match', async () => {
    useBoardStore.setState({
      cards: {
        ...useBoardStore.getState().cards,
        c8: card('c8', 'b1', 'col1', { title: 'Unrelated title', description: 'atoms mentioned here', updated_at: '2026-07-25T00:00:00Z' }),
      },
    })
    const r = await executeTool('search_cards', { query: 'atoms' })
    // c5 carries the /atoms LABEL (tier 1) and must outrank c8's newer
    // description-only hit (tier 2).
    expect(r.cards.map((c) => c.id)).toEqual(['c5', 'c8'])
  })

  test('archived labels never match', async () => {
    const r = await executeTool('search_cards', { query: 'ghost' })
    expect(r.cards).toEqual([])
  })

  test('archived cards excluded from search', async () => {
    const r = await executeTool('search_cards', { query: 'archived landing' })
    expect(r.cards).toEqual([])
    const broad = await executeTool('search_cards', { query: 'landing' })
    expect(broad.cards.map((c) => c.id)).not.toContain('c6')
  })

  test('result fields: assignees always, checklist/description only when present', async () => {
    const r = await executeTool('search_cards', { query: 'landing page redesign' })
    const hit = r.cards[0]
    expect(hit.assignees).toEqual([])
    expect(hit.checklist).toEqual({ done: 1, total: 2 })
    expect(hit.description).toBe('Rework the hero section and pricing table for the launch.')
    const tweet = (await executeTool('search_cards', { query: 'launch tweet' })).cards[0]
    expect(tweet.checklist).toBeUndefined()
    const sam = (await executeTool('search_cards', { query: 'sam' })).cards[0]
    expect(sam.assignees).toEqual(['Sam'])
    expect(sam.description).toBeUndefined()
  })

  test('description snippet truncates at 160 chars', async () => {
    useBoardStore.setState({
      cards: { ...useBoardStore.getState().cards, c7: card('c7', 'b1', 'col1', { title: 'Long desc card', description: 'x'.repeat(300) }) },
    })
    const r = await executeTool('search_cards', { query: 'long desc' })
    expect(r.cards[0].description).toHaveLength(160)
  })
})

describe('summarize_board', () => {
  test('columns in order with counts, totals include overdue', async () => {
    const r = await executeTool('summarize_board', { board: 'Launch' })
    expect(r.ok).toBe(true)
    expect(r.board).toBe('Launch')
    expect(r.columns.map((c) => c.title)).toEqual(['To do', 'Done'])
    expect(r.columns[0].count).toBe(3)
    expect(r.columns[0].cards.map((c) => c.id)).toEqual(['c1', 'c2', 'c5'])
    expect(r.totals).toEqual({ cards: 4, completed: 1, overdue: 1 })
  })

  test('caps cards per column at 15 with truncated flag', async () => {
    const many = {}
    for (let i = 0; i < 18; i++) many[`y${i}`] = card(`y${i}`, 'b1', 'col1', { title: `Y ${i}`, position: i + 10 })
    useBoardStore.setState({ cards: { ...useBoardStore.getState().cards, ...many } })
    const r = await executeTool('summarize_board', { board: 'Launch' })
    expect(r.columns[0].count).toBe(21)
    expect(r.columns[0].cards).toHaveLength(15)
    expect(r.columns[0].truncated).toBe(true)
    expect(r.columns[1].truncated).toBeUndefined()
  })

  test('missing or unknown board errors', async () => {
    expect((await executeTool('summarize_board', {})).ok).toBe(false)
    expect((await executeTool('summarize_board', { board: 'Nope' })).ok).toBe(false)
  })

  test('excludes archived cards from columns and totals', async () => {
    const r = await executeTool('summarize_board', { board: 'Launch' })
    const allIds = r.columns.flatMap((c) => c.cards.map((x) => x.id))
    expect(allIds).not.toContain('c6')
    expect(r.totals.cards).toBe(allIds.length)
  })

  test('per-card labels/assignees/checklist in summaries', async () => {
    const r = await executeTool('summarize_board', { board: 'Launch' })
    const c5row = r.columns.flatMap((c) => c.cards).find((x) => x.id === 'c5')
    expect(c5row.labels).toEqual(['atoms'])
    const c1row = r.columns.flatMap((c) => c.cards).find((x) => x.id === 'c1')
    expect(c1row.checklist).toEqual({ done: 1, total: 2 })
    expect(c1row.assignees).toEqual([])
  })
})
